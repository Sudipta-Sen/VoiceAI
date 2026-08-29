# VoiceAI — Architectural Choices & Decision Log

_A living record of every significant decision on this project: what we chose, why,
and what we traded away. Update this as decisions change._

**Project:** browser-based AI voice app that narrates a 5–6 slide deck, answers spoken
questions, auto-navigates slides, and can be interrupted mid-sentence.
**Nature:** 2-day learning prototype (first time building a voice system) — decisions
optimize for *learning speed and low friction*, not production robustness.
**Last updated:** 2026-08-28

---

## D1 — Voice provider: Google Gemini Live API (not OpenAI Realtime API)

**Decision.** Use Google's Gemini Live API as the speech-to-speech voice layer.

**Why.**
- I already have premium access to Google's ecosystem.
- The Gemini Developer API has a **free tier** reachable with an API key from Google
  AI Studio — no credit card needed — which is enough to experiment for a 2-day
  prototype. OpenAI's Realtime API would require adding billing/credits first.
- Feature parity for what this build needs: native-audio speech-to-speech,
  server-side voice-activity detection, barge-in/interruption, and function calling
  are all supported.

**Tradeoffs.**
- Gemini's realtime models are **preview** and change fast; exact model strings and
  SDK syntax must be checked against current Google docs.
- Smaller ecosystem of realtime examples/tutorials than OpenAI's — fewer copy-paste
  references when stuck.
- Forces WebSocket transport (see D2); no WebRTC option.

**Note on the "premium = higher limits" assumption (worth being precise about).**
I leaned toward Gemini partly on the belief that being a paid/premium Gemini user
gives higher limits than OpenAI. Correction so we plan capacity accurately: a
**consumer Gemini subscription (Google One AI Premium / "Gemini Advanced") does NOT
grant or raise developer _API_ limits** — it only covers the Gemini chat app. API
usage runs on a separate track (a Google AI Studio API key) with its own **free tier**
and a **paid tier** unlocked by enabling billing on the API project. So:
- The subscription isn't what makes this cheap or high-limit — the **free API tier**
  is what we're relying on, and it's plenty for prototyping.
- If we hit rate/session limits on the free tier, the fix is enabling billing on the
  API project (paid tier), **not** the consumer subscription.
- Net: the decision to use Gemini still stands (ecosystem fit + free tier), just for
  the accurate reason.

---

## D2 — Transport: browser-direct WebSocket via the @google/genai SDK (not WebRTC)

**Decision.** The browser connects straight to the Gemini Live API over a WebSocket,
using Google's official `@google/genai` browser SDK. The backend stays out of the
audio path.

**Why.**
- Gemini Live is **WebSocket-only** — there is no WebRTC option, so this is
  effectively forced by D1.
- Browser-direct keeps latency low and the backend thin.
- The SDK handles mic capture, audio encoding, playback, and VAD, so we don't
  hand-roll raw audio.

**Tradeoffs.**
- Our original plan favored WebRTC specifically to avoid raw-PCM sample-rate/audio
  bugs. On WebSocket we rely on the SDK to manage that; if we ever drop below the SDK
  we'd own those audio-format details ourselves.
- WebRTC provides echo cancellation "for free" from the browser's media stack. With
  WebSocket audio, watch for the model hearing its own output (echo) and mic feedback
  — especially without headphones.

---

## D3 — Backend: Python + FastAPI, deliberately thin

**Decision.** A minimal FastAPI backend whose only jobs are (1) hold the secret API
key and mint short-lived ephemeral tokens, and (2) define the agent's instructions +
tools. One or two endpoints total.

**Why.**
- Python is my stronger language; FastAPI is async (matches the SDK) and quick to
  stand up.
- A thin backend means fewer moving parts to learn and debug in a 2-day window.

**Tradeoffs.**
- Two languages in the stack (Python backend, JS frontend); a Node/Express backend
  would keep it all JS. Accepted for language comfort.
- Thin backend pushes most logic into the browser — fine for a prototype, but not how
  a production system would be structured (more would be brokered server-side).

---

## D4 — Auth: ephemeral tokens; API key never reaches the browser

**Decision.** The backend mints a short-lived ephemeral token with the `google-genai`
SDK; the browser connects using only that token. The real API key lives only in the
server's `.env`.

**Why.**
- Hard security rule: if the API key reached the browser, anyone could copy it from
  DevTools and run up usage.
- Ephemeral tokens are the SDK's supported way to authenticate a client without
  exposing the key.

**Tradeoffs / gotchas.**
- Gemini tokens have **two clocks**: `new_session_expire_time` (~1 min — window to
  *start* a connection) and `expire_time` (~30 min — how long a started session may
  run). The browser must connect within ~1 minute of fetching a token → fetch it on
  the "Start" click, not at page load.
- Slightly more plumbing than embedding a key (which we would never do anyway).

---

## D5 — Frontend: React + Vite

**Decision.** React app scaffolded with Vite, using the `@google/genai` browser SDK
for the audio session and to receive tool calls.

**Why.** Fast dev server and a familiar component model for rendering slides and
reacting to state changes (current slide, connection status, transcript).

**Tradeoffs.** React is more than a 6-slide prototype strictly needs; chosen for
familiarity and because slide state + live events map cleanly onto component state.

---

## D6 — Slides hardcoded as a `slides[]` array

**Decision.** The deck is a hardcoded array of `{ title, bullets, image? }`. No
dynamic slide generation unless added later as a stretch goal.

**Why.** The learning goal is the *voice + navigation* system, not a CMS. Hardcoding
removes an entire axis of complexity.

**Tradeoffs.** Not reusable for arbitrary decks; changing content means editing code.
Intentional and acceptable for the prototype.

---

## D7 — Agentic slide navigation = function calling

**Decision.** Give the model a `goto_slide(index)` tool plus a table-of-contents of
the deck in its instructions. The model calls the tool to change slides, and after any
change we push the new slide's content back into the session.

**Why.** Function calling is the clean, model-driven way to let spoken questions drive
the UI; re-injecting slide content keeps "as you can see here…" accurate.

**Tradeoffs / risks.** Thrashing — the model jumping slides on every utterance — is
the main risk; needs prompt tuning and possibly debouncing.

---

## D8 — Gate mic/audio behind a "Start" button

**Decision.** No audio capture or playback until the user clicks Start.

**Why.** Browsers block autoplay/mic access until a user gesture; it's also the
natural moment to fetch a fresh ephemeral token (see D4).

**Tradeoffs.** One extra click before the demo begins — negligible, and standard for
voice apps.

---

## D9 — Audio formats are fixed by Gemini; we own the browser audio I/O

**Decision / constraint.** The Live API dictates the raw audio formats, and the
browser-side mic capture and playback are ours to implement.

**The formats (non-negotiable — set by the API).**
- **Input (mic → model):** raw 16-bit PCM, **16 kHz**, mono, little-endian.
- **Output (model → speakers):** raw 16-bit PCM, **24 kHz**, little-endian.

**Where the SDK's job ends.** Google's own browser example hand-writes the mic
capture and playback with the **Web Audio API**. So the `@google/genai` SDK manages
the **session and the WebSocket protocol** for us, but it does **not** capture the
mic or play audio — that plumbing is still ours to write.

**Implication / the classic bug.** The input path must resample the mic (usually
44.1/48 kHz by default) down to **16 kHz PCM** before sending; the output path must
play **24 kHz PCM**. A sample-rate mismatch is the #1 source of "chipmunk" / garbled
/ silent audio. Keep the two rates straight: **16 kHz up, 24 kHz down.**

**Why "chipmunk" — the mechanism.** A sample rate is just a *clock*: a label
saying "run through these samples at N per second." The samples themselves
carry no timing — the rate tells the player how fast to consume them. Get the
label wrong and the audio plays at the wrong speed, and speed and pitch move
together (like spinning a record at the wrong RPM):
- Consumed **faster** than it was recorded → shorter, **higher-pitched,
  sped-up** → the classic chipmunk.
- Consumed **slower** → longer, **deep and draggy**.

Same samples, different clock. In this app the risk sits on both legs:
- **Output (what you actually hear as chipmunk):** Gemini's audio is 24 kHz.
  `createBuffer(1, len, 24000)` must say exactly 24000. Declare it 48000 and
  the browser races through the samples in half the time → high and fast.
- **Input (shows up as garbled, not cute):** if we capture at 48 kHz but label
  it `rate=16000`, the *claimed* rate doesn't match the data, and the model
  mis-reads the timing → distorted, poorly-recognized speech. Fix: pin the
  AudioContext to 16 kHz so the data genuinely *is* 16 kHz.

---

## Technical note — the Live session is event-driven (callbacks, not request/response)

Unlike a normal HTTP call, you don't "call and await a reply." The session is a
long-lived WebSocket, so you register **callbacks** — four functions the SDK invokes
when things happen:
- `onopen` — socket ready
- `onmessage` — data arrived
- `onerror` — something failed
- `onclose` — session ended

**Connection step flow:** fetch token → build the client → `ai.live.connect(...)` →
watch `onopen` fire.

---

## Step 2C — Mic capture: the mental model

**The problem.** The mic does not hand us "16 kHz PCM." The browser gives **Float32
samples** (−1..1) at the *hardware* rate (usually 48 kHz). Gemini requires **16 kHz,
16-bit integer PCM**. So every audio chunk must be: (1) resampled to 16 kHz, (2)
converted Float32 → Int16, (3) base64-encoded, (4) sent.

**How each piece is handled.**
- **Resample:** create the `AudioContext` with `{ sampleRate: 16000 }` so the *browser*
  resamples the mic down to 16 kHz for us — no hand-written resampling math.
- **Float → Int16:** clamp each sample to [−1, 1], scale into the Int16 range,
  base64-encode the bytes.
- **Send:** `session.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } })`.
- **Receive (round trip):** Gemini's audio comes back in
  `serverContent.modelTurn.parts[].inlineData.data` (base64, 24 kHz); `turnComplete`
  marks the end of a reply, `interrupted` marks a barge-in.

**Pipeline:** mic → 16 kHz AudioContext → ScriptProcessorNode chunks →
Float32→Int16→base64 → `sendRealtimeInput`.

**The audio graph (how the pipeline is actually wired).** Web Audio works by
connecting processing *nodes* into a chain; audio flows through and we tap it
midway. `startMic()` builds:

    mic → [MediaStreamSource] → [ScriptProcessor] → destination (speakers)
                                      │
                                      └──> onaudioprocess fires per chunk
                                           (measure level + encode + send)

- **MediaStreamSource** — entry point; wraps the mic stream into the graph.
- **ScriptProcessor(4096,1,1)** — hands our JS raw samples in 4096-sample
  mono chunks via `onaudioprocess`.
- **destination** — the speakers. It outputs silence here, BUT the connection
  is mandatory: a ScriptProcessor only runs `onaudioprocess` if it's connected
  to an output. Omit `processor.connect(ctx.destination)` and the callback
  never fires — dead meter, nothing sent, no error. (#1 silent failure here.)

## Audio encoding: mic → Gemini format

The browser mic and the Gemini Live API speak different audio "dialects."
`floatTo16BitPCMBase64()` is the translator. The pipeline:

```
Float32 decimals  →  16-bit integers  →  raw bytes  →  base64 text
   (what the mic         (what Gemini      (the actual      (safe to send
```
Why each hop:
- Float32 → Int16: Gemini wants 16-bit PCM. Clamp to [-1,1] first, or a
  stray >1 sample silently overflows the Int16 range and flips to a glitch.
- Int16 → bytes: same memory, new lens (Uint8Array on int16.buffer — NOT
  a copy). Dropping `.buffer` silently corrupts the audio.
- bytes → base64: the channel expects text, not raw binary. ~33% larger,
  fine for short mic chunks.

## Step 2C — Classic mistakes to stay ahead of
- **Mic permission prompt.** The first "Start" click triggers Chrome's mic prompt —
  must **Allow**. A block shows up as a `NotAllowedError` and a dead level meter
  (fix: address-bar mic icon → allow → reload).
- **Use headphones.** Without them, the speakers feed back into the mic and the model
  "hears itself" and interrupts/babbles. `echoCancellation: true` helps; headphones
  are the real fix for testing.
- **Sample-rate mismatch = the #1 audio bug.** If the context is not pinned to 16 kHz,
  you send (e.g.) 48 kHz data *labelled* 16 kHz → chipmunk / garbled. We pin it and
  log the actual rate; if it is not 16000, that is the culprit.
- **ScriptProcessorNode is deprecated** (but runs everywhere). Chosen for
  simplicity/readability in the prototype; the non-deprecated upgrade is an
  **AudioWorklet** (off-main-thread, smoother) at the cost of a second file.
- **The "silent connection" is load-bearing.** `processor.connect(ctx.destination)`
  looks pointless (it only outputs silence) but without it `onaudioprocess`
  never fires. Everything *looks* wired, meter's dead, nothing reaches Gemini,
  no error thrown. If capture is silent, check this line first.
- **Clamp before scaling, or you get a silent glitch.** A sample that sneaks
  past 1.0 (browser noise-suppression/gain can overshoot) times 32767 exceeds
  the Int16 ceiling, overflows, and *flips* to a negative value → an audible
  pop, with **no error thrown**. `Math.max(-1, Math.min(1, x))` prevents it.
- **`new Uint8Array(int16.buffer)` — the `.buffer` is load-bearing.** It's a
  second *lens* onto the same memory (reads it as bytes), not a copy. Drop
  `.buffer` and JS copies the integer *values* into single bytes → corrupted
  audio, silently. Same memory, new lens = right; copy the numbers = wrong.

---

## Open questions / to decide later
- **Deck topic** — still to pick.
- **Exact Live model string** — using the current preview native-audio model; confirm
  against Google docs when we connect (preview names change).
- **Echo/feedback handling** — revisit once audio is flowing (see D2 tradeoff).
