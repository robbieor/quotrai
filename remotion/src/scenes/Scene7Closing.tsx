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

  // Photo scale (Ken Burns)
  const photoScale = interpolate(frame, [0, 210], [1.05, 1], { extrapolateRight: "clamp" });

  // Dark overlay
  const overlayOpacity = interpolate(frame, [0, 30], [0.2, 0.65], { extrapolateRight: "clamp" });

  // Headline
  const h1Opacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp" });
  const h1Y = interpolate(frame, [15, 40], [30, 0], { extrapolateRight: "clamp" });

  // Subtitle
  const subOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [40, 60], [20, 0], { extrapolateRight: "clamp" });

  // Logo appears
  const logoScale = frame >= 70 ? spring({ frame: frame - 70, fps, config: { damping: 15 } }) : 0;

  // "Try Quotr" text
  const ctaOpacity = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" });

  // Subtle glow pulse
  const glowPulse = interpolate(frame, [0, 210], [0, Math.PI * 4]);
  const glowOpacity = 0.15 + 0.05 * Math.sin(glowPulse);

  return (
    <AbsoluteFill>
      {/* Background photo */}
      <AbsoluteFill style={{ transform: `scale(${photoScale})` }}>
        <Img
          src={staticFile("images/relaxed-tradie.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Overlay */}
      <AbsoluteFill style={{ backgroundColor: `rgba(15, 23, 42, ${overlayOpacity})` }} />

      {/* Teal glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(0,255,178,${glowOpacity}) 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          fontFamily,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ opacity: h1Opacity, transform: `translateY(${h1Y}px)` }}>
            <h1
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: "white",
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: "-0.03em",
              }}
            >
              Run your business.
            </h1>
          </div>
          <div style={{ opacity: subOpacity, transform: `translateY(${subY}px)` }}>
            <h2
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: TEAL,
                margin: "8px 0 0 0",
                lineHeight: 1.2,
                letterSpacing: "-0.03em",
              }}
            >
              Without the stress.
            </h2>
          </div>

          {/* Logo */}
          <div
            style={{
              marginTop: 48,
              transform: `scale(${logoScale})`,
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${TEAL}, #00CC8E)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 40px rgba(0,255,178,0.3)`,
              }}
            >
              <span style={{ fontSize: 32, fontWeight: 800, color: NAVY }}>Q</span>
            </div>
            <span style={{ fontSize: 40, fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>
              Quotr
            </span>
          </div>

          {/* CTA text */}
          <div style={{ opacity: ctaOpacity, marginTop: 24 }}>
            <span
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              Try Quotr free for 30 days
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
