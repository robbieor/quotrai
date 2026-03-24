import {
  AbsoluteFill,
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
const RED = "#ef4444";
const AMBER = "#f59e0b";

export const Scene6AutoChase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: "clamp" });

  const isOverdue = frame >= 60;
  const reminderSent = frame >= 140;

  const overdueShake = isOverdue && frame < 90
    ? Math.sin((frame - 60) * 0.8) * interpolate(frame, [60, 90], [4, 0], { extrapolateRight: "clamp" })
    : 0;

  const reminderScale = reminderSent ? spring({ frame: frame - 140, fps, config: { damping: 15 } }) : 0;
  const headlineOpacity = interpolate(frame, [200, 225], [0, 1], { extrapolateRight: "clamp" });
  const headlineY = interpolate(frame, [200, 225], [30, 0], { extrapolateRight: "clamp" });

  // Step label
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }) *
    interpolate(frame, [50, 65], [1, 0], { extrapolateRight: "clamp" });

  const timelineDots = [
    { label: "Invoice sent", frame: 20, color: TEAL },
    { label: "7 days — no payment", frame: 60, color: AMBER },
    { label: "Overdue", frame: 90, color: RED },
    { label: "Auto-reminder sent", frame: 140, color: TEAL },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #060d1a 0%, #0a1628 50%, #0d1b30 100%)`,
        fontFamily,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
        padding: "60px 120px",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Step indicator */}
      <div style={{ position: "absolute", top: 48, left: 120, opacity: labelOpacity, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,255,178,0.15)", border: "1px solid rgba(0,255,178,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: TEAL }}>4</div>
        <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Get Paid</span>
      </div>

      {/* Left: White invoice card */}
      <div style={{ flex: "0 0 420px", opacity: cardOpacity, transform: `translateY(${cardY}px) translateX(${overdueShake}px)` }}>
        <div
          style={{
            background: "white",
            borderRadius: 16,
            border: isOverdue && !reminderSent ? `2px solid ${RED}` : "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: isOverdue && !reminderSent ? `0 0 40px rgba(239,68,68,0.15)` : "0 25px 80px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ padding: "24px 28px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>Invoice</p>
                <p style={{ fontSize: 26, color: NAVY, margin: "4px 0 0 0", fontWeight: 800, letterSpacing: "-0.03em" }}>INV-0067</p>
              </div>
              <div style={{
                background: isOverdue && !reminderSent ? "#fef2f2" : reminderSent ? "#ecfdf5" : "#fffbeb",
                border: `1px solid ${isOverdue && !reminderSent ? "#fecaca" : reminderSent ? "#a7f3d0" : "#fde68a"}`,
                borderRadius: 10, padding: "5px 14px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isOverdue && !reminderSent ? RED : reminderSent ? "#059669" : AMBER }}>
                  {reminderSent ? "Reminded" : isOverdue ? "Overdue" : "Pending"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ padding: "20px 28px" }}>
            <p style={{ fontSize: 16, color: "#1e293b", margin: 0, fontWeight: 600 }}>Mrs. Patterson</p>
            <p style={{ fontSize: 15, color: "#94a3b8", margin: "4px 0 16px 0", fontWeight: 500 }}>EV Charger Installation</p>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              <span style={{ fontSize: 15, color: "#64748b", fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: 30, color: NAVY, fontWeight: 800, letterSpacing: "-0.02em" }}>€1,300.00</span>
            </div>
          </div>
        </div>

        {reminderScale > 0 && (
          <div style={{
            marginTop: 16, background: "rgba(0,255,178,0.06)", border: "1px solid rgba(0,255,178,0.2)",
            borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
            transform: `scale(${reminderScale})`, transformOrigin: "top center",
          }}>
            <span style={{ fontSize: 24 }}>🔔</span>
            <div>
              <p style={{ fontSize: 14, color: "white", margin: 0, fontWeight: 700 }}>Payment reminder sent</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "2px 0 0 0" }}>Automatic follow-up — no action needed</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Timeline + headline */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ position: "relative", paddingLeft: 28 }}>
          <div style={{ position: "absolute", left: 13, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.08)" }} />

          {timelineDots.map((dot, i) => {
            const dotOpacity = interpolate(frame, [dot.frame, dot.frame + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const dotScale = frame >= dot.frame ? spring({ frame: frame - dot.frame, fps, config: { damping: 15 } }) : 0;

            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30, opacity: dotOpacity }}>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", background: dot.color,
                  transform: `scale(${dotScale})`, boxShadow: `0 0 16px ${dot.color}50`,
                  flexShrink: 0, marginLeft: -5,
                }} />
                <span style={{ fontSize: 20, color: "white", fontWeight: 700 }}>{dot.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ opacity: headlineOpacity, transform: `translateY(${headlineY}px)` }}>
          <h2 style={{ fontSize: 52, color: "white", fontWeight: 800, margin: 0, lineHeight: 1.15, letterSpacing: "-0.04em" }}>
            Get paid
          </h2>
          <h2 style={{ fontSize: 52, color: TEAL, fontWeight: 800, margin: 0, lineHeight: 1.15, letterSpacing: "-0.04em", textShadow: "0 0 60px rgba(0,255,178,0.3)" }}>
            without chasing.
          </h2>
        </div>
      </div>
    </AbsoluteFill>
  );
};
