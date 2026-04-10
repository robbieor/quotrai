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

export const Scene2MeetForeman: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 180 } });
  const meetOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const meetX = interpolate(frame, [15, 35], [-30, 0], { extrapolateRight: "clamp" });
  const foremanOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const foremanX = interpolate(frame, [30, 50], [30, 0], { extrapolateRight: "clamp" });
  const tagOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [60, 80], [20, 0], { extrapolateRight: "clamp" });

  const ringRotation = interpolate(frame, [0, 150], [0, 90], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 45%, #0a1628 0%, #060d1a 100%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: "2px solid transparent",
          background: `conic-gradient(from ${ringRotation}deg, transparent 0%, rgba(0,255,178,0.15) 25%, transparent 50%, rgba(0,255,178,0.08) 75%, transparent 100%)`,
          transform: `scale(${logoScale})`,
          opacity: 0.6,
        }}
      />

      <div style={{ transform: `scale(${logoScale})`, marginBottom: 40 }}>
        <Img
          src={staticFile("images/foreman-logo.png")}
          style={{
            width: 130,
            height: 130,
            borderRadius: 30,
            objectFit: "contain",
            filter: `drop-shadow(0 0 50px rgba(0,255,178,0.5))`,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
        <span
          style={{
            fontSize: 82,
            fontWeight: 400,
            color: "rgba(255,255,255,0.6)",
            opacity: meetOpacity,
            transform: `translateX(${meetX}px)`,
            letterSpacing: "-0.02em",
          }}
        >
          Meet
        </span>
        <span
          style={{
            fontSize: 100,
            fontWeight: 800,
            color: "white",
            opacity: quotrOpacity,
            transform: `translateX(${quotrX}px)`,
            letterSpacing: "-0.05em",
            textShadow: "0 0 80px rgba(0,255,178,0.2)",
          }}
        >
          Foreman
        </span>
      </div>

      <p
        style={{
          fontSize: 30,
          color: TEAL,
          marginTop: 28,
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
          fontWeight: 700,
          letterSpacing: "0.01em",
          textShadow: "0 0 40px rgba(0,255,178,0.3)",
        }}
      >
        Your AI office manager.
      </p>
    </AbsoluteFill>
  );
};
