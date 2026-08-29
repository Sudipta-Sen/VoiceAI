// src/slides.js — the deck. Hardcoded array of { title, bullets }.
// Topic: "How this voice app works" (self-referential demo).
export const slides = [
  {
    title: "How This Voice App Works",
    bullets: [
      "A browser AI that narrates a slide deck out loud",
      "You can speak to it, interrupt it, and ask questions",
      "Built on Google's Gemini Live API — a 2-day prototype",
    ],
  },
  {
    title: "The Big Picture",
    bullets: [
      "The browser talks DIRECTLY to Gemini over a WebSocket",
      "A thin FastAPI backend only mints a short-lived token",
      "React renders the slides and handles the audio",
    ],
  },
  {
    title: "Keeping the API Key Safe",
    bullets: [
      "The secret key never reaches the browser",
      "The backend trades it for an ephemeral (short-lived) token",
      "Two clocks: ~1 min to connect, ~30 min to run",
    ],
  },
  {
    title: "The Audio Loop",
    bullets: [
      "Your mic is captured as 16 kHz PCM and streamed up",
      "Gemini replies with 24 kHz audio, streamed back down",
      "The SDK runs the session; we handle mic + playback",
    ],
  },
  {
    title: "Barge-in: Interrupting the AI",
    bullets: [
      "When you start talking, the model stops generating",
      "The client flushes queued audio so it goes quiet at once",
      "This is the #1 reason voice demos feel broken",
    ],
  },
  {
    title: "Agentic Slide Navigation",
    bullets: [
      "The model has a goto_slide tool + a table of contents",
      "Your spoken question triggers a slide change",
      "Then it narrates what's actually on screen",
    ],
  },
];
