// src/tools/gotoSlide.js — the goto_slide tool: declaration + handler together.
import { Type } from "@google/genai";
import { slides } from "../deck";

export const declaration = {
  name: "goto_slide",
  description: "Show a specific slide in the on-screen deck, by its 0-based index.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER, description: "0-based index of the slide to display" },
    },
    required: ["index"],
  },
};

// runs when the model calls goto_slide. deps = { setCurrentSlide, log, session }.
// return value becomes the tool response sent back to the model.
export function handler(args, { setCurrentSlide, log }) {
  const wanted = args?.index ?? 0;
  const idx = Math.max(0, Math.min(wanted, slides.length - 1));
  log(`🧭 goto_slide(${wanted}) -> slide ${idx + 1}`);
  setCurrentSlide(idx);
  return { result: "ok" };
}
