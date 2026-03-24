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

export const Scene5ConvertJob: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // User message
  const msg = "Convert to job and send invoice";
  const typedChars = Math.min(
    msg.length,
    Math.floor(interpolate(frame, [5, 40], [0, msg.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
  );
  const userOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  // AI response
  const aiOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" });

  // 3 status cards stagger in
  const cards = [
    { icon: "📋", label: "Job Created", detail: "J-0092 · Scheduled for Thursday", delay: 90 },
    { icon: "📄", label: "Invoice Sent", detail: "INV-0067 · €1,300.00", delay: 130 },
    { icon: "💳", label: "Payment Tracking", detail: "Due in 14 days · Auto-reminders on", delay: 170 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 60%, hsl(159, 30%, 7%) 0%, ${NAVY} 70%)`,
        fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 120px",
        gap: 40,
      }}
    >
      {/* Chat area */}
      <div style={{ maxWidth: 700, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ opacity: userOpacity, alignSelf: "flex-end", maxWidth: 480 }}>
          <div
            style={{
              background: "rgba(0,255,178,0.1)",
              border: "1px solid rgba(0,255,178,0.2)",
              borderRadius: "20px 20px 6px 20px",
              padding: "14px 22px",
            }}
          >
            <p style={{ fontSize: 22, color: "white", margin: 0 }}>"{msg.slice(0, typedChars)}"</p>
          </div>
        </div>

        {frame >= 55 && (
          <div style={{ opacity: aiOpacity }}>
            <div
              style={{
                background: "rgba(30,41,59,0.8)",
                border: `1px solid ${BORDER}`,
                borderRadius: "6px 20px 20px 20px",
                padding: "14px 22px",
              }}
            >
              <p style={{ fontSize: 20, color: "white", margin: 0 }}>
                ✅ Done. Here's what I set up:
              </p>
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
          const cardOpacity = interpolate(frame, [card.delay, card.delay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: "28px 24px",
                opacity: cardOpacity,
                transform: `scale(${cardScale}) translateY(${interpolate(cardScale, [0, 1], [20, 0])}px)`,
                transformOrigin: "bottom center",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{card.icon}</div>
              <p style={{ fontSize: 18, color: "white", fontWeight: 700, margin: "0 0 6px 0" }}>
                {card.label}
              </p>
              <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>{card.detail}</p>

              {/* Check mark */}
              {frame >= card.delay + 30 && (
                <div
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(0,255,178,0.1)",
                    borderRadius: 8,
                    padding: "4px 12px",
                    opacity: interpolate(frame, [card.delay + 30, card.delay + 40], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  <span style={{ color: TEAL, fontSize: 14, fontWeight: 700 }}>✓ Complete</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
