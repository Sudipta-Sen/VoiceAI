// src/config.js
// Central place for values you tweak without touching component code.
// Nothing secret lives here (no API key), so this file is safe to commit.

// Gemini Live model — preview name, may change; verify in Google AI Studio.
export const MODEL = "gemini-3.1-flash-live-preview";

// API surface the ephemeral token is bound to (try "v1alpha" if connect fails).
export const API_VERSION = "v1beta";

// Our backend's token endpoint.
export const TOKEN_URL = "http://localhost:8000/token";

// How long to wait (ms) for a question after each slide before auto-advancing.
export const PROCEED_WAIT_MS = 5000;
