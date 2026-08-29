// src/tools/index.js — the tool registry.
// To add a tool: create a file next to this one, then add it to `registry` below.
import * as gotoSlide from "./gotoSlide";

const registry = [gotoSlide];

// declarations for the live config:  config.tools = tools
export const tools = [{ functionDeclarations: registry.map((t) => t.declaration) }];

// name -> handler lookup
const handlers = Object.fromEntries(registry.map((t) => [t.declaration.name, t.handler]));

// route an incoming toolCall to the right handler(s) and reply to the model
export function handleToolCall(toolCall, deps) {
  const responses = [];
  for (const fc of toolCall.functionCalls) {
    const fn = handlers[fc.name];
    const response = fn ? (fn(fc.args, deps) ?? { result: "ok" }) : { error: "unknown tool" };
    responses.push({ id: fc.id, name: fc.name, response });
  }
  // one reply for the whole batch — the model waits for this
  deps.session?.sendToolResponse({ functionResponses: responses });
}
