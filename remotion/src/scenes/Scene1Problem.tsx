import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Manrope";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});

export const Scene1Problem: React.FC = () => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 150], [1, 1.08], { extrapolateRight: "clamp" });
  const overlayOpacity = interpolate(frame, [0, 30], [0.3, 0.75], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(frame, [20, 45], [40, 0], { extrapolateRight: "clamp" });
  const subOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [50, 70], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img
          src={staticFile("images/frustrated-tradie.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: `rgba(15, 23, 42, ${overlayOpacity})` }} />

      {/* Teal accent line at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, transparent, #00FFB2, transparent)",
          opacity: interpolate(frame, [40, 60], [0, 0.8], { extrapolateRight: "clamp" }),
        }}
      />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily }}>
        <div style={{ opacity: textOpacity, transform: `translateY(${textY}px)`, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "-0.04em",
              textShadow: "0 2px 40px rgba(0,0,0,0.5)",
              WebkitFontSmoothing: "antialiased",
            }}
          >
            Too many apps.
          </h1>
        </div>
        <div style={{ opacity: subOpacity, transform: `translateY(${subY}px)`, textAlign: "center", marginTop: 12 }}>
          <h2
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: "#00FFB2",
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "-0.04em",
              textShadow: "0 0 60px rgba(0,255,178,0.4)",
              WebkitFontSmoothing: "antialiased",
            }}
          >
            Too much admin.
          </h2>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
