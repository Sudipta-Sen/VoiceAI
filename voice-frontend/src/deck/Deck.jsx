// src/Deck.jsx — shows the current slide. Pure display: renders whatever
// `current` index it's told to; navigation logic lives in the parent.
export default function Deck({ slides, current }) {
  const slide = slides[current];
  return (
    <div style={{ maxWidth: 720, margin: "0 auto 24px" }}>
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg, #ffffff 0%, #f4f6ff 100%)",
        border: "1px solid #e6e8f0",
        borderRadius: 16,
        padding: "40px 44px",
        minHeight: 320,
        boxShadow: "0 10px 30px rgba(30,41,99,0.10)",
        overflow: "hidden",
      }}>
        {/* accent bar across the top */}
        <div style={{ position: "absolute", top: 0, left: 0, height: 6, width: "100%",
                      background: "linear-gradient(90deg,#4f46e5,#8b5cf6)" }} />

        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1,
                      textTransform: "uppercase", color: "#8b90a6", marginBottom: 12 }}>
          Slide {current + 1} of {slides.length}
        </div>

        <h2 style={{ margin: "0 0 20px", fontSize: 32, lineHeight: 1.2,
                     color: "#1e2340", fontWeight: 700 }}>
          {slide.title}
        </h2>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {slide.bullets.map((b, i) => (
            <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start",
                                 fontSize: 19, lineHeight: 1.5, color: "#3a3f5c", marginBottom: 14 }}>
              <span style={{ color: "#4f46e5", fontWeight: 700, marginTop: 1 }}>▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* progress dots — active one stretches */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
        {slides.map((_, i) => (
          <span key={i} style={{
            width: i === current ? 22 : 8, height: 8, borderRadius: 4,
            background: i === current ? "#4f46e5" : "#d2d5e4", transition: "all .2s",
          }} />
        ))}
      </div>

      <div style={{ textAlign: "center", color: "#9aa0b8", fontSize: 13, marginTop: 10 }}>
        use ← / → to navigate
      </div>
    </div>
  );
}
