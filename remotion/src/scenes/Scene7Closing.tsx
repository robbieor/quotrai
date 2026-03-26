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
  weights: ["400", "700", "800"],
  subsets: ["latin"],
});

const TEAL = "#00FFB2";
const NAVY = "#0f172a";

export const Scene7Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const photoScale = interpolate(frame, [0, 210], [1.05, 1], { extrapolateRight: "clamp" });
  const overlayOpacity = interpolate(frame, [0, 30], [0.25, 0.7], { extrapolateRight: "clamp" });
  const h1Opacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp" });
  const h1Y = interpolate(frame, [15, 40], [30, 0], { extrapolateRight: "clamp" });
  const subOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [40, 60], [20, 0], { extrapolateRight: "clamp" });
  const logoScale = frame >= 70 ? spring({ frame: frame - 70, fps, config: { damping: 15 } }) : 0;
  const ctaOpacity = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = interpolate(frame, [0, 210], [0, Math.PI * 4]);
  const glowOpacity = 0.12 + 0.06 * Math.sin(glowPulse);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${photoScale})` }}>
        <Img src={staticFile("images/relaxed-tradie.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: `rgba(6, 13, 26, ${overlayOpacity})` }} />

      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(0,255,178,${glowOpacity}) 0%, transparent 60%)`,
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      }} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily, WebkitFontSmoothing: "antialiased" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ opacity: h1Opacity, transform: `translateY(${h1Y}px)` }}>
            <h1 style={{ fontSize: 72, fontWeight: 800, color: "white", margin: 0, lineHeight: 1.15, letterSpacing: "-0.04em", textShadow: "0 2px 40px rgba(0,0,0,0.5)" }}>
              Run your business.
            </h1>
          </div>
          <div style={{ opacity: subOpacity, transform: `translateY(${subY}px)` }}>
            <h2 style={{ fontSize: 72, fontWeight: 800, color: TEAL, margin: "8px 0 0 0", lineHeight: 1.15, letterSpacing: "-0.04em", textShadow: "0 0 60px rgba(0,255,178,0.4)" }}>
              Without the stress.
            </h2>
          </div>

          <div style={{ marginTop: 48, transform: `scale(${logoScale})`, display: "inline-flex", alignItems: "center", gap: 16 }}>
            <Img src={staticFile("images/foreman-logo.png")} style={{ width: 68, height: 68, borderRadius: 16, filter: "drop-shadow(0 0 30px rgba(0,255,178,0.4))" }} />
            <span style={{ fontSize: 44, fontWeight: 800, color: "white", letterSpacing: "-0.04em", textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>Foreman</span>
          </div>

          <div style={{ opacity: ctaOpacity, marginTop: 28 }}>
            <span style={{ fontSize: 24, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: "0.03em" }}>
              Try Foreman free for 30 days
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
