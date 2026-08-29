// src/prompt/index.js — builds the system instruction from systemPrompt.md + the deck.
import basePrompt from "./systemPrompt.md?raw";
import { slides } from "../deck";

const toc = slides.map((s, i) => `  ${i}: ${s.title}`).join("\n");

export const SYSTEM_INSTRUCTION =
  `${basePrompt.trim()}\n\n` +
  `The deck slides are (index: title):\n${toc}`;
