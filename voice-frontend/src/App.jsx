import { useState, useRef } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { MODEL, API_VERSION, TOKEN_URL } from "./config";

export default function App() {
  const [status, setStatus] = useState("idle");
  const [logs, setLogs] = useState([]);
  const sessionRef = useRef(null);   // holds the live session so other code can reach it

  function log(msg) {
    console.log(msg);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${msg}`]);
  }

  async function handleStart() {
    setStatus("connecting");
    log("Start clicked — fetching token…");
    try {
      // 1) fresh ephemeral token from OUR backend (fetched on click — the 1-min clock)
      const res = await fetch(TOKEN_URL);
      const { token } = await res.json();
      log("Got token: " + token.slice(0, 25) + "…");

      // 2) a Gemini client that authenticates with the TOKEN (never the API key)
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: API_VERSION },
      });

      // 3) open the live session and wire the four lifecycle callbacks (WebSocket)
      sessionRef.current = await ai.live.connect({
        model: MODEL,
        config: { responseModalities: [Modality.AUDIO] }, // reply me in speech
        callbacks: {
          onopen:    ()  => { log("🔊 Live session OPENED"); setStatus("connected ✅"); },
          onmessage: (m) => { log("msg: " + JSON.stringify(m).slice(0, 90)); },
          onerror:   (e) => { log("ERROR: " + (e.message || e)); setStatus("error ❌"); },
          onclose:   (e) => { log("closed: " + (e.reason || "")); setStatus("closed"); },
        },
      });
    } catch (err) {
      log("CONNECT ERROR: " + err.message);
      setStatus("error ❌");
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Voice Slide Presenter</h1>
      <button onClick={handleStart}>Start</button>
      <p>Status: {status}</p>
      <pre style={{ background: "#111", color: "#0f0", padding: 12,
                    height: 240, overflow: "auto", borderRadius: 6 }}>
        {logs.join("\n") || "(logs will appear here)"}
      </pre>
    </div>
  );
}
