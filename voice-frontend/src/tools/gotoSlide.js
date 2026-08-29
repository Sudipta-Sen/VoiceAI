// src/tools/gotoSlide.js — the goto_slide tool: declaration + handler together.
import { Type } from "@google/genai";
import { slides } from "../deck";

export const declaration = {
  name: "goto_slide",
  description:
    "Show a specific slide in the on-screen deck. Use the slide NUMBER as shown to the user (the first slide is 1).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      slide: { type: Type.INTEGER, description: "1-based slide number to display (1 = first slide)" },
    },
    required: ["slide"],
  },
};

// deps = { setCurrentSlide, log, session }
export function handler(args, { setCurrentSlide, log }) {
  const wanted = args?.slide ?? 1;                                   // 1-based, as the user sees it
  const idx = Math.max(0, Math.min(wanted - 1, slides.length - 1));  // -> 0-based array index
  log(`🧭 goto_slide(slide ${wanted}) -> showing slide ${idx + 1}`);
  setCurrentSlide(idx);
  return { result: "ok" };
}
