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

export const Scene3CreateQuote: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: User message types in (frames 0–60)
  const userMsg = "Create a quote for EV charger install";
  const typedChars = Math.min(
    userMsg.length,
    Math.floor(interpolate(frame, [10, 55], [0, userMsg.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
  );
  const typedText = userMsg.slice(0, typedChars);
  const cursorVisible = frame < 60 && Math.floor(frame / 8) % 2 === 0;

  const userBubbleOpacity = interpolate(frame, [5, 15], [0, 1], { extrapolateRight: "clamp" });

  // Phase 2: AI thinking indicator (frames 60–90)
  const thinkingOpacity = interpolate(frame, [60, 70], [0, 1], { extrapolateRight: "clamp" }) *
    interpolate(frame, [85, 95], [1, 0], { extrapolateRight: "clamp" });

  // Phase 3: Quote card appears (frames 90–)
  const cardScale = frame >= 90 ? spring({ frame: frame - 90, fps, config: { damping: 20, stiffness: 180 } }) : 0;
  const cardOpacity = interpolate(frame, [90, 105], [0, 1], { extrapolateRight: "clamp" });

  // Line items stagger in
  const lineItems = [
    { desc: "7kW EV Charger Unit", qty: "1", price: "€650.00" },
    { desc: "Installation Labour (4hrs)", qty: "1", price: "€320.00" },
    { desc: "Cable & Trunking", qty: "1", price: "€85.00" },
    { desc: "Consumer Unit Upgrade", qty: "1", price: "€245.00" },
  ];

  // Total reveal
  const totalOpacity = interpolate(frame, [200, 220], [0, 1], { extrapolateRight: "clamp" });

  // Status badge
  const badgeScale = frame >= 230 ? spring({ frame: frame - 230, fps, config: { damping: 12 } }) : 0;

  // Floating particles
  const p1Y = interpolate(frame, [0, 450], [0, -80]);
  const p2Y = interpolate(frame, [0, 450], [0, -120]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 30% 50%, hsl(159, 40%, 6%) 0%, ${NAVY} 70%)`,
        fontFamily,
      }}
    >
      {/* Floating accents */}
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 200,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: TEAL,
          opacity: 0.3,
          transform: `translateY(${p1Y}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 150,
          bottom: 200,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: TEAL,
          opacity: 0.2,
          transform: `translateY(${p2Y}px)`,
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 60,
          padding: "80px 120px",
          height: "100%",
          alignItems: "center",
        }}
      >
        {/* Left: Chat interaction */}
        <div style={{ flex: "0 0 580px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* User bubble */}
          <div
            style={{
              opacity: userBubbleOpacity,
              alignSelf: "flex-end",
              maxWidth: 480,
            }}
          >
            <div
              style={{
                background: "rgba(0,255,178,0.1)",
                border: `1px solid rgba(0,255,178,0.2)`,
                borderRadius: "20px 20px 6px 20px",
                padding: "16px 24px",
              }}
            >
              <p style={{ fontSize: 22, color: "white", margin: 0, lineHeight: 1.5 }}>
                "{typedText}
                {cursorVisible && <span style={{ color: TEAL }}>|</span>}"
              </p>
            </div>
          </div>

          {/* Thinking dots */}
          {thinkingOpacity > 0 && (
            <div style={{ opacity: thinkingOpacity, display: "flex", gap: 6, paddingLeft: 8 }}>
              {[0, 1, 2].map((i) => {
                const dotScale = interpolate(
                  (frame + i * 5) % 30,
                  [0, 15, 30],
                  [0.6, 1, 0.6]
                );
                return (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: TEAL,
                      opacity: 0.5,
                      transform: `scale(${dotScale})`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* AI response */}
          {frame >= 90 && (
            <div
              style={{
                opacity: cardOpacity,
                transform: `scale(${cardScale})`,
                transformOrigin: "top left",
              }}
            >
              <div
                style={{
                  background: "rgba(30,41,59,0.8)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "6px 20px 20px 20px",
                  padding: "16px 24px",
                }}
              >
                <p style={{ fontSize: 20, color: "white", margin: 0, lineHeight: 1.5 }}>
                  ✅ Quote <span style={{ color: TEAL, fontWeight: 700 }}>Q-0048</span> created
                </p>
                <p style={{ fontSize: 16, color: "#94a3b8", margin: "8px 0 0 0" }}>
                  EV Charger Installation — Mrs. Patterson
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quote card */}
        <div
          style={{
            flex: 1,
            opacity: cardOpacity,
            transform: `scale(${Math.min(cardScale, 1)}) translateY(${interpolate(cardScale, [0, 1], [30, 0])}px)`,
            transformOrigin: "top center",
          }}
        >
          <div
            style={{
              background: CARD_BG,
              borderRadius: 20,
              border: `1px solid ${BORDER}`,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            {/* Quote header */}
            <div
              style={{
                padding: "24px 32px",
                borderBottom: `1px solid ${BORDER}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Quote
                </p>
                <p style={{ fontSize: 28, color: "white", margin: "4px 0 0 0", fontWeight: 800 }}>
                  Q-0048
                </p>
              </div>
              {badgeScale > 0 && (
                <div
                  style={{
                    background: "rgba(0,255,178,0.15)",
                    border: "1px solid rgba(0,255,178,0.3)",
                    borderRadius: 12,
                    padding: "6px 16px",
                    transform: `scale(${badgeScale})`,
                  }}
                >
                  <span style={{ fontSize: 14, color: TEAL, fontWeight: 700 }}>Draft</span>
                </div>
              )}
            </div>

            {/* Line items */}
            <div style={{ padding: "20px 32px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 60px 100px",
                  gap: "0",
                  fontSize: 13,
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  paddingBottom: 12,
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <span>Item</span>
                <span style={{ textAlign: "center" }}>Qty</span>
                <span style={{ textAlign: "right" }}>Price</span>
              </div>

              {lineItems.map((item, i) => {
                const itemDelay = 120 + i * 20;
                const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 15], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const itemX = interpolate(frame, [itemDelay, itemDelay + 15], [20, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });

                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 60px 100px",
                      padding: "14px 0",
                      borderBottom: `1px solid rgba(51,65,85,0.5)`,
                      opacity: itemOpacity,
                      transform: `translateX(${itemX}px)`,
                    }}
                  >
                    <span style={{ fontSize: 16, color: "white", fontWeight: 500 }}>{item.desc}</span>
                    <span style={{ fontSize: 16, color: "#94a3b8", textAlign: "center" }}>{item.qty}</span>
                    <span style={{ fontSize: 16, color: "white", textAlign: "right", fontWeight: 600 }}>{item.price}</span>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div
              style={{
                padding: "20px 32px",
                borderTop: `2px solid ${BORDER}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: totalOpacity,
              }}
            >
              <span style={{ fontSize: 18, color: "#94a3b8", fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: 32, color: TEAL, fontWeight: 800 }}>€1,300.00</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
