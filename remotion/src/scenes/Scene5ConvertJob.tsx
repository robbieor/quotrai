import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Manrope";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

const TEAL = "#00FFB2";
const NAVY = "#0f172a";

export const Scene5ConvertJob: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const msg = "Convert to job and send invoice";
  const typedChars = Math.min(
    msg.length,
    Math.floor(interpolate(frame, [5, 40], [0, msg.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
  );
  const userOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const aiOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" });

  const cards = [
    { icon: "📋", label: "Job Created", detail: "J-0092 · Scheduled for Thursday", delay: 90 },
    { icon: "📄", label: "Invoice Sent", detail: "INV-0067 · €1,300.00", delay: 130 },
    { icon: "💳", label: "Payment Tracking", detail: "Due in 14 days · Auto-reminders on", delay: 170 },
  ];

  // Step label
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }) *
    interpolate(frame, [80, 95], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #060d1a 0%, #0a1628 50%, #0d1b30 100%)`,
        fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 120px",
        gap: 40,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Step indicator */}
      <div style={{ position: "absolute", top: 48, left: 120, opacity: labelOpacity, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,255,178,0.15)", border: "1px solid rgba(0,255,178,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: TEAL }}>3</div>
        <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Convert & Invoice</span>
      </div>

      {/* Chat area */}
      <div style={{ maxWidth: 700, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: userOpacity }}>
          <Img src={staticFile("images/foreman-logo.png")} style={{ width: 28, height: 28, borderRadius: 7 }} />
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>George · Foreman AI</span>
        </div>

        <div style={{ opacity: userOpacity, alignSelf: "flex-end", maxWidth: 480 }}>
          <div style={{ background: "rgba(0,255,178,0.08)", border: "1px solid rgba(0,255,178,0.2)", borderRadius: "20px 20px 6px 20px", padding: "14px 22px" }}>
            <p style={{ fontSize: 22, color: "white", margin: 0, fontWeight: 500 }}>"{msg.slice(0, typedChars)}"</p>
          </div>
        </div>

        {frame >= 55 && (
          <div style={{ opacity: aiOpacity }}>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px 20px 20px 20px", padding: "14px 22px" }}>
              <p style={{ fontSize: 20, color: "white", margin: 0, fontWeight: 500 }}>✅ Done. Here's what I set up:</p>
            </div>
          </div>
        )}
      </div>

      {/* Status cards */}
      <div style={{ display: "flex", gap: 24, maxWidth: 900, width: "100%" }}>
        {cards.map((card, i) => {
          const cardScale = frame >= card.delay
            ? spring({ frame: frame - card.delay, fps, config: { damping: 15, stiffness: 180 } })
            : 0;
          const cardOpacity = interpolate(frame, [card.delay, card.delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: "white",
                borderRadius: 16,
                padding: "28px 24px",
                opacity: cardOpacity,
                transform: `scale(${cardScale}) translateY(${interpolate(cardScale, [0, 1], [20, 0])}px)`,
                transformOrigin: "bottom center",
                boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{card.icon}</div>
              <p style={{ fontSize: 18, color: NAVY, fontWeight: 800, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>{card.label}</p>
              <p style={{ fontSize: 14, color: "#64748b", margin: 0, fontWeight: 500 }}>{card.detail}</p>

              {frame >= card.delay + 30 && (
                <div style={{
                  marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#ecfdf5", borderRadius: 8, padding: "4px 12px",
                  border: "1px solid #a7f3d0",
                  opacity: interpolate(frame, [card.delay + 30, card.delay + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }}>
                  <span style={{ color: "#059669", fontSize: 14, fontWeight: 700 }}>✓ Complete</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
