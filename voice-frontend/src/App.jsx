import { useState } from "react";

export default function App() {
  const [status, setStatus] = useState("idle");
  const [logs, setLogs] = useState([]);

  // log to BOTH the browser console and the on-screen panel
  function log(msg) {
    console.log(msg);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${msg}`]);
  }

  async function handleStart() {
    setStatus("connecting");
    log("Start clicked — fetching token…");
    try {
      const res = await fetch("http://localhost:8000/token");
      const data = await res.json();
      log("Got ephemeral token: " + data.token.slice(0, 25) + "…");
      setStatus("token ready ✅");
    } catch (err) {
      log("ERROR: " + err.message);
      setStatus("error ❌");
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Voice Slide Presenter</h1>
      <button onClick={handleStart}>Start</button>
      <p>Status: {status}</p>
      <pre style={{ background: "#111", color: "#0f0", padding: 12,
                    height: 220, overflow: "auto", borderRadius: 6 }}>
        {logs.join("\n") || "(logs will appear here)"}
      </pre>
    </div>
  );
}