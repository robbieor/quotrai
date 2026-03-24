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
const CARD_BG = "#1e293b";
const BORDER = "#334155";
const RED = "#ef4444";
const AMBER = "#f59e0b";

export const Scene6AutoChase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Invoice card appears
  const cardOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: "clamp" });

  // Status changes: "Sent" → "Overdue" → "Reminder Sent"
  const isOverdue = frame >= 60;
  const reminderSent = frame >= 140;

  const overdueOpacity = interpolate(frame, [60, 75], [0, 1], { extrapolateRight: "clamp" });
  const overdueShake = isOverdue && frame < 90
    ? Math.sin((frame - 60) * 0.8) * interpolate(frame, [60, 90], [4, 0], { extrapolateRight: "clamp" })
    : 0;

  // Reminder notification slides in
  const reminderScale = reminderSent
    ? spring({ frame: frame - 140, fps, config: { damping: 15 } })
    : 0;

  // "Get paid without chasing" text
  const headlineOpacity = interpolate(frame, [200, 225], [0, 1], { extrapolateRight: "clamp" });
  const headlineY = interpolate(frame, [200, 225], [30, 0], { extrapolateRight: "clamp" });

  // Timeline dots
  const timelineDots = [
    { label: "Sent", frame: 20, color: TEAL },
    { label: "7 days", frame: 60, color: AMBER },
    { label: "Overdue", frame: 90, color: RED },
    { label: "Auto-reminded", frame: 140, color: TEAL },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, hsl(159, 20%, 6%) 0%, ${NAVY} 70%)`,
        fontFamily,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
        padding: "60px 120px",
      }}
    >
      {/* Left: Invoice card */}
      <div
        style={{
          flex: "0 0 420px",
          opacity: cardOpacity,
          transform: `translateY(${cardY}px) translateX(${overdueShake}px)`,
        }}
      >
        <div
          style={{
            background: CARD_BG,
            borderRadius: 20,
            border: `1px solid ${isOverdue && !reminderSent ? RED : BORDER}`,
            overflow: "hidden",
            boxShadow: isOverdue && !reminderSent
              ? "0 0 30px rgba(239,68,68,0.2)"
              : "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ padding: "24px 28px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Invoice</p>
                <p style={{ fontSize: 24, color: "white", margin: "4px 0 0 0", fontWeight: 800 }}>INV-0067</p>
              </div>
              <div
                style={{
                  background: isOverdue && !reminderSent ? "rgba(239,68,68,0.15)" : reminderSent ? "rgba(0,255,178,0.15)" : "rgba(245,158,11,0.15)",
                  border: `1px solid ${isOverdue && !reminderSent ? "rgba(239,68,68,0.3)" : reminderSent ? "rgba(0,255,178,0.3)" : "rgba(245,158,11,0.3)"}`,
                  borderRadius: 10,
                  padding: "5px 14px",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isOverdue && !reminderSent ? RED : reminderSent ? TEAL : AMBER,
                  }}
                >
                  {reminderSent ? "Reminded" : isOverdue ? "Overdue" : "Pending"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ padding: "20px 28px" }}>
            <p style={{ fontSize: 16, color: "#94a3b8", margin: 0 }}>Mrs. Patterson</p>
            <p style={{ fontSize: 15, color: "#64748b", margin: "4px 0 16px 0" }}>EV Charger Installation</p>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
              <span style={{ fontSize: 15, color: "#94a3b8" }}>Total</span>
              <span style={{ fontSize: 28, color: "white", fontWeight: 800 }}>€1,300.00</span>
            </div>
          </div>
        </div>

        {/* Reminder notification */}
        {reminderScale > 0 && (
          <div
            style={{
              marginTop: 16,
              background: "rgba(0,255,178,0.08)",
              border: "1px solid rgba(0,255,178,0.2)",
              borderRadius: 14,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              transform: `scale(${reminderScale})`,
              transformOrigin: "top center",
            }}
          >
            <span style={{ fontSize: 24 }}>🔔</span>
            <div>
              <p style={{ fontSize: 14, color: "white", margin: 0, fontWeight: 600 }}>Payment reminder sent</p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0 0" }}>Automatic follow-up — no action needed</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Timeline + headline */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 40 }}>
        {/* Timeline */}
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div
            style={{
              position: "absolute",
              left: 11,
              top: 0,
              bottom: 0,
              width: 2,
              background: BORDER,
            }}
          />

          {timelineDots.map((dot, i) => {
            const dotOpacity = interpolate(frame, [dot.frame, dot.frame + 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const dotScale = frame >= dot.frame
              ? spring({ frame: frame - dot.frame, fps, config: { damping: 15 } })
              : 0;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 28,
                  opacity: dotOpacity,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: dot.color,
                    transform: `scale(${dotScale})`,
                    boxShadow: `0 0 12px ${dot.color}40`,
                    flexShrink: 0,
                    marginLeft: -5,
                  }}
                />
                <span style={{ fontSize: 18, color: "white", fontWeight: 600 }}>{dot.label}</span>
              </div>
            );
          })}
        </div>

        {/* Headline */}
        <div style={{ opacity: headlineOpacity, transform: `translateY(${headlineY}px)` }}>
          <h2 style={{ fontSize: 48, color: "white", fontWeight: 800, margin: 0, lineHeight: 1.2, letterSpacing: "-0.03em" }}>
            Get paid
          </h2>
          <h2 style={{ fontSize: 48, color: TEAL, fontWeight: 800, margin: 0, lineHeight: 1.2, letterSpacing: "-0.03em" }}>
            without chasing.
          </h2>
        </div>
      </div>
    </AbsoluteFill>
  );
};
