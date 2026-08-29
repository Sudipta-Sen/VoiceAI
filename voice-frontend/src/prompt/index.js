// src/prompt/index.js — builds the system instruction from systemPrompt.md + the deck.
import basePrompt from "./systemPrompt.md?raw";
import { slides } from "../deck";

// full deck reference: 1-based number, title, and bullets — so the model can
// narrate accurately and jump to the right slide.
const deck = slides
  .map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.bullets.map((b) => `   - ${b}`).join("\n")}`)
  .join("\n\n");

export const SYSTEM_INSTRUCTION =
  `${basePrompt.trim()}\n\n` +
  `Here is the full deck (slide number, title, and bullets):\n\n${deck}`;
