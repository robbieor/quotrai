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

export const Scene4SendQuote: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const msg = "Send it to the client";
  const typedChars = Math.min(
    msg.length,
    Math.floor(interpolate(frame, [5, 35], [0, msg.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
  );
  const userOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const aiOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp" });
  const aiScale = frame >= 50 ? spring({ frame: frame - 50, fps, config: { damping: 20 } }) : 0;

  const envelopeScale = frame >= 80 ? spring({ frame: frame - 80, fps, config: { damping: 12, stiffness: 100 } }) : 0;
  const envelopeX = interpolate(frame, [80, 130], [0, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const envelopeOpacity = interpolate(frame, [110, 130], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const sentScale = frame >= 140 ? spring({ frame: frame - 140, fps, config: { damping: 10 } }) : 0;
  const statusOpacity = interpolate(frame, [160, 180], [0, 1], { extrapolateRight: "clamp" });
  const docOpacity = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" });
  const docY = interpolate(frame, [100, 120], [40, 0], { extrapolateRight: "clamp" });

  // Step label
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }) *
    interpolate(frame, [80, 95], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #060d1a 0%, #0a1628 50%, #0d1b30 100%)`,
        fontFamily,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
        padding: "80px 120px",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Accent glow */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,178,0.05) 0%, transparent 60%)", right: "15%", top: "20%" }} />

      {/* Step indicator */}
      <div style={{ position: "absolute", top: 48, left: 120, opacity: labelOpacity, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,255,178,0.15)", border: "1px solid rgba(0,255,178,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: TEAL }}>2</div>
        <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Send Quote</span>
      </div>

      {/* Left: Chat */}
      <div style={{ flex: "0 0 500px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, opacity: userOpacity }}>
          <Img src={staticFile("images/foreman-logo.png")} style={{ width: 32, height: 32, borderRadius: 8 }} />
          <span style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>George · Foreman AI</span>
        </div>

        <div style={{ opacity: userOpacity, alignSelf: "flex-end", maxWidth: 400 }}>
          <div style={{ background: "rgba(0,255,178,0.08)", border: "1px solid rgba(0,255,178,0.2)", borderRadius: "20px 20px 6px 20px", padding: "16px 24px" }}>
            <p style={{ fontSize: 23, color: "white", margin: 0, fontWeight: 500 }}>"{msg.slice(0, typedChars)}"</p>
          </div>
        </div>

        {frame >= 50 && (
          <div style={{ opacity: aiOpacity, transform: `scale(${aiScale})`, transformOrigin: "top left" }}>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px 20px 20px 20px", padding: "16px 24px" }}>
              <p style={{ fontSize: 21, color: "white", margin: 0, fontWeight: 500 }}>
                ✅ Quote sent to <span style={{ color: TEAL, fontWeight: 700 }}>mrs.patterson@email.com</span>
              </p>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", margin: "8px 0 0 0" }}>
                Branded PDF attached. She can approve with one click.
              </p>
            </div>
          </div>
        )}

        <div style={{ opacity: statusOpacity, display: "flex", gap: 12, alignItems: "center", paddingLeft: 8, marginTop: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: TEAL, boxShadow: "0 0 12px rgba(0,255,178,0.5)" }} />
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>Waiting for client approval</span>
        </div>
      </div>

      {/* Right: White document */}
      <div style={{ flex: 1, opacity: docOpacity, transform: `translateY(${docY}px)` }}>
        <div style={{ background: "white", borderRadius: 16, padding: "40px", maxWidth: 500, boxShadow: "0 25px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <Img src={staticFile("images/foreman-logo.png")} style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontWeight: 700 }}>Your Company Ltd</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 22, color: NAVY, margin: 0, fontWeight: 800, letterSpacing: "-0.02em" }}>QUOTE</p>
              <p style={{ fontSize: 14, color: "#94a3b8", margin: "4px 0 0 0", fontWeight: 600 }}>Q-0048</p>
            </div>
          </div>

          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: 16 }}>
            {["7kW EV Charger Unit", "Installation Labour", "Cable & Trunking", "Consumer Unit Upgrade"].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                <span style={{ color: "#334155", fontWeight: 500 }}>{item}</span>
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{["€650", "€320", "€85", "€245"][i]}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 12, borderTop: "2px solid #0f172a" }}>
            <span style={{ fontSize: 16, color: NAVY, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 24, color: NAVY, fontWeight: 800 }}>€1,300.00</span>
          </div>

          {sentScale > 0 && (
            <div style={{ marginTop: 20, textAlign: "center", transform: `scale(${sentScale})` }}>
              <span style={{ background: "#ecfdf5", color: "#059669", fontWeight: 700, fontSize: 14, padding: "8px 24px", borderRadius: 24, border: "1px solid #a7f3d0" }}>
                ✉️ Delivered
              </span>
            </div>
          )}
        </div>
      </div>

      {frame >= 80 && frame <= 130 && (
        <div style={{ position: "absolute", left: "40%", top: "45%", fontSize: 48, transform: `translateX(${envelopeX}px) scale(${envelopeScale})`, opacity: envelopeOpacity }}>
          ✉️
        </div>
      )}
    </AbsoluteFill>
  );
};
