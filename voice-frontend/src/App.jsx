import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { MODEL, API_VERSION, TOKEN_URL } from "./config";
import { Deck, slides } from "./deck";
import { SYSTEM_INSTRUCTION } from "./prompt";
import { tools, handleToolCall } from "./tools";

export default function App() {
  const [status, setStatus] = useState("idle");
  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState(0);          // mic input level 0..1
  const sessionRef = useRef(null);                // the live session
  const audioRef = useRef({ ctx: null, stream: null, processor: null });

  // --- playback (output) state ---
  const outCtxRef = useRef(null);     // 24 kHz AudioContext for Gemini's audio
  const nextStartRef = useRef(0);     // when the next chunk should start (seconds)
  const sourcesRef = useRef([]);      // scheduled sources, so barge-in can stop them
  const [currentSlide, setCurrentSlide] = useState(0);   // which slide is showing

  // keyboard nav: left/right arrows move slides (works with OR without voice)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight") setCurrentSlide((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft")  setCurrentSlide((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function log(msg) {
    console.log(msg);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${msg}`]);
  }

  // ---------- MIC (input): Float32 -> base64 16-bit PCM ----------
  function floatTo16BitPCMBase64(float32) {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function startMic() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    const ctx = new AudioContext({ sampleRate: 16000 });
    await ctx.resume();
    log("🎙️ mic on — context rate: " + ctx.sampleRate + " Hz");
    if (ctx.sampleRate !== 16000) log("⚠️ rate is not 16000 — tell me");
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      setLevel(Math.min(1, Math.sqrt(sum / input.length) * 4));
      const b64 = floatTo16BitPCMBase64(input);
      sessionRef.current?.sendRealtimeInput({
        audio: { data: b64, mimeType: "audio/pcm;rate=16000" },
      });
    };
    source.connect(processor);
    processor.connect(ctx.destination);
    audioRef.current = { ctx, stream, processor };
  }

  // ---------- PLAYBACK (output): base64 24-kHz PCM -> speakers ----------
  function base64ToFloat32(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
    return float32;
  }

  function playChunk(b64) {
    const ctx = outCtxRef.current;
    if (!ctx) return;
    const float32 = base64ToFloat32(b64);
    if (float32.length === 0) return;
    const buffer = ctx.createBuffer(1, float32.length, 24000);   // mono, 24 kHz
    buffer.copyToChannel(float32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    // schedule back-to-back so chunks play gaplessly
    const start = Math.max(ctx.currentTime, nextStartRef.current);
    src.start(start);
    nextStartRef.current = start + buffer.duration;
    sourcesRef.current.push(src);
    src.onended = () => {
      sourcesRef.current = sourcesRef.current.filter((s) => s !== src);
    };
  }

  // barge-in: stop everything queued and reset the cursor
  function stopPlayback() {
    for (const s of sourcesRef.current) { try { s.stop(); } catch {} }
    sourcesRef.current = [];
    nextStartRef.current = 0;
  }

  async function handleStart() {
    setStatus("connecting");
    log("Start clicked — fetching token…");
    try {
      // playback context (24 kHz) — created on the Start user gesture
      outCtxRef.current = new AudioContext({ sampleRate: 24000 });
      nextStartRef.current = 0;

      const res = await fetch(TOKEN_URL);
      const { token } = await res.json();
      log("Got token: " + token.slice(0, 25) + "…");

      const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: API_VERSION } });

      sessionRef.current = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools,
        },
        callbacks: {
          onopen: () => { log("🔊 Live session OPENED"); setStatus("connected ✅"); },
          onmessage: (m) => {
            if (m.setupComplete) log("setupComplete");

            // control loop: hand any tool call to the tools module
            if (m.toolCall) {
              handleToolCall(m.toolCall, { session: sessionRef.current, setCurrentSlide, log });
            }
            const c = m.serverContent;
            if (c?.modelTurn?.parts) {
              for (const part of c.modelTurn.parts) {
                if (part.inlineData) playChunk(part.inlineData.data);   // <- now PLAYS
                if (part.text) log("💬 " + part.text);
              }
            }
            if (c?.interrupted) { log("⛔ interrupted — flushing playback"); stopPlayback(); }
            if (c?.turnComplete) log("✅ turnComplete");
          },
          onerror: (e) => { log("ERROR: " + (e.message || e)); setStatus("error ❌"); },
          onclose: (e) => { log("closed: " + (e.reason || "")); setStatus("closed"); },
        },
      });

      await startMic();
      log("Speak now — say “hello” 👋 (headphones on!)");
    } catch (err) {
      log("CONNECT ERROR: " + err.message);
      setStatus("error ❌");
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Voice Slide Presenter</h1>
      <Deck slides={slides} current={currentSlide} />
      <button onClick={handleStart}>Start</button>
      <p>Status: {status}</p>
      <div style={{ height: 10, width: 300, background: "#333", borderRadius: 5, margin: "8px 0" }}>
        <div style={{ height: "100%", width: `${level * 100}%`, background: "#0f0", borderRadius: 5 }} />
      </div>
      <pre style={{ background: "#111", color: "#0f0", padding: 12,
                    height: 240, overflow: "auto", borderRadius: 6 }}>
        {logs.join("\n") || "(logs will appear here)"}
      </pre>
    </div>
  );
}
