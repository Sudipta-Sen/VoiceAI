# VoiceAI — AI Voice Slide Presenter

A browser-based AI that **presents a slide deck out loud** and holds a real
conversation about it. Click **Start** and it greets you, walks through the slides
one by one (~1–2 min each), and pauses to take questions. Ask something by voice and
it answers — flipping to the relevant slide on its own — and you can **interrupt it
mid-sentence** at any time. If you stay quiet, it moves on to the next slide.

Built on **Google's Gemini Live API** (native speech-to-speech over a WebSocket),
with a **React + Vite** frontend and a deliberately thin **Python + FastAPI** backend
whose only job is to hand the browser a short-lived token.

> This is a learning prototype. For the full design and rationale, see
> [`DECISIONS.md`](./DECISIONS.md) and the visual [`Architecture.html`](./Architecture.html).

---

## Features

- 🎙️ Hands-free voice presentation of a hardcoded slide deck
- 🧭 Agentic slide navigation — your spoken questions drive the slides (function calling)
- ✋ Barge-in — interrupt the AI and it stops instantly
- ⏱️ Auto-advance after a configurable pause when you have no questions
- 🔒 API key never reaches the browser (ephemeral tokens)

## How it works (in one breath)

The **browser** talks directly to the Gemini Live API over a WebSocket: your mic
streams up, the model's speech streams back, and a `goto_slide` **tool call** flips
the deck. The **backend** only mints a short-lived ephemeral token so the real API
key stays server-side.

---

## Prerequisites

- **Node.js** 20.19+ or 22+ (Vite 8) and npm
- **Python** 3.10+
- A **Google Gemini API key** (free tier is enough — see below)
- **Headphones** strongly recommended (so the AI doesn't hear itself and self-interrupt)

### Get a Gemini API key

1. Go to [aistudio.google.com](https://aistudio.google.com) → **Get API key**.
2. Create a key. The **free tier** is sufficient for this prototype.

> Note: a consumer **Gemini app subscription** (Gemini Advanced) does **not** grant
> API access — the developer API is a separate, free-to-start track.

---

## Setup

### 1. Clone

```bash
git clone https://github.com/Sudipta-Sen/VoiceAI.git
cd VoiceAI
```

### 2. Backend (Python + FastAPI)

From the repo root:

```bash
python -m venv venv
# activate it:
source venv/bin/activate          # macOS / Linux / WSL
# venv\Scripts\activate           # Windows (PowerShell/CMD)

pip install -r requirements.txt
```

Create a `.env` file in the repo root with your key:

```bash
echo "GEMINI_API_KEY=your-key-here" > .env
```

### 3. Frontend (React + Vite)

```bash
cd voice-frontend
npm install
cd ..
```

---

## Running it

You need **two terminals** — one for each server.

**Terminal 1 — backend** (from the repo root, with the venv activated):

```bash
uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
cd voice-frontend
npm run dev
```

Then open **http://localhost:5173**, put your **headphones on**, and click **Start**.
Allow microphone access when the browser asks.

> Quick check: with the backend running, `curl http://localhost:8000/token` should
> return `{"token":"auth_tokens/..."}`.

---

## Using it

- **Start** → the AI greets you and begins presenting slide 1.
- **Ask a question** any time (by voice) — it answers and jumps to the right slide.
- **Interrupt** it mid-sentence — it stops immediately.
- Say **"no" / "go ahead"** to move on, or just stay silent — after a short pause it
  advances on its own. Arrow keys (← / →) also move slides manually.

---

## Configuration

Everything you'd normally tweak lives in a few files:

| What | Where |
| --- | --- |
| Model, API version, backend URL, auto-advance wait | `voice-frontend/src/config.js` |
| The AI's persona & behavior (the prompt) | `voice-frontend/src/prompt/systemPrompt.md` |
| The slide deck content | `voice-frontend/src/deck/slides.js` |
| The `goto_slide` tool | `voice-frontend/src/tools/gotoSlide.js` |

For example, change `PROCEED_WAIT_MS` in `config.js` to adjust the silence timeout,
or edit `systemPrompt.md` to change how the AI presents.

---

## Project structure

```
VoiceAI/
├─ main.py                # FastAPI backend — mints the ephemeral token (GET /token)
├─ requirements.txt       # Python deps
├─ .env                   # GEMINI_API_KEY (you create this; git-ignored)
├─ DECISIONS.md           # design decisions & rationale
├─ Architecture.html      # visual architecture reference
└─ voice-frontend/        # React + Vite app
   └─ src/
      ├─ App.jsx          # audio loop, playback, barge-in, pacing timer
      ├─ config.js        # tweakable settings
      ├─ deck/            # slides data + Deck component
      ├─ prompt/          # systemPrompt.md + assembler
      └─ tools/           # goto_slide declaration + handler
```

---

## Troubleshooting

- **It hears itself / keeps interrupting** → use headphones. Speakers feed the AI's
  own voice back into the mic.
- **Connection fails right after Start** → the Live model is in preview; the model
  string or API version may have changed. Check `MODEL` / `API_VERSION` in
  `voice-frontend/src/config.js`.
- **CORS error in the browser console** → make sure the backend is running on port
  8000 and the frontend on 5173 (the backend allow-lists `http://localhost:5173`).
- **`KeyError: GEMINI_API_KEY` / auth errors** → the `.env` isn't loaded; run
  `uvicorn` from the repo root where `.env` lives, and confirm the key is valid.

---

## Tech stack

- **Voice:** Google Gemini Live API (WebSocket, native audio, function calling)
- **Frontend:** React 19 + Vite, `@google/genai` browser SDK, Web Audio API
- **Backend:** Python + FastAPI + `google-genai`
