import {
  AbsoluteFill,
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

export const Scene2MeetQuotr: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo circle scales in
  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 180 } });

  // "Meet" fades in
  const meetOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const meetX = interpolate(frame, [15, 35], [-30, 0], { extrapolateRight: "clamp" });

  // "Quotr" slides in
  const quotrOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const quotrX = interpolate(frame, [30, 50], [30, 0], { extrapolateRight: "clamp" });

  // Tagline
  const tagOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [60, 80], [20, 0], { extrapolateRight: "clamp" });

  // Subtle background gradient pulse
  const bgHue = interpolate(frame, [0, 150], [159, 165], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, hsl(${bgHue}, 100%, 8%) 0%, #0f172a 70%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
      }}
    >
      {/* Floating accent circle */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,178,0.08) 0%, transparent 70%)",
          transform: `scale(${logoScale})`,
        }}
      />

      {/* Logo mark */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 28,
          background: "linear-gradient(135deg, #00FFB2, #00CC8E)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale})`,
          boxShadow: "0 0 60px rgba(0,255,178,0.3)",
          marginBottom: 40,
        }}
      >
        <span
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.04em",
          }}
        >
          Q
        </span>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
        <span
          style={{
            fontSize: 80,
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
            opacity: meetOpacity,
            transform: `translateX(${meetX}px)`,
            letterSpacing: "-0.02em",
          }}
        >
          Meet
        </span>
        <span
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "white",
            opacity: quotrOpacity,
            transform: `translateX(${quotrX}px)`,
            letterSpacing: "-0.04em",
          }}
        >
          Quotr
        </span>
      </div>

      <p
        style={{
          fontSize: 28,
          color: "#00FFB2",
          marginTop: 24,
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}
      >
        Talk to your business. It talks back.
      </p>
    </AbsoluteFill>
  );
};
