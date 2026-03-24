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
  const { fps } = useVideoConfig();

  // Slow zoom on photo
  const scale = interpolate(frame, [0, 150], [1, 1.08], {
    extrapolateRight: "clamp",
  });

  // Darken overlay fades in
  const overlayOpacity = interpolate(frame, [0, 30], [0.3, 0.7], {
    extrapolateRight: "clamp",
  });

  // Text fades up
  const textOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [20, 45], [40, 0], {
    extrapolateRight: "clamp",
  });

  // Subtitle
  const subOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [50, 70], [20, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
        }}
      >
        <Img
          src={staticFile("images/frustrated-tradie.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>

      {/* Dark overlay */}
      <AbsoluteFill
        style={{
          backgroundColor: `rgba(15, 23, 42, ${overlayOpacity})`,
        }}
      />

      {/* Text */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          fontFamily,
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            Too many apps.
          </h1>
        </div>
        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            textAlign: "center",
            marginTop: 16,
          }}
        >
          <h2
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#00FFB2",
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            Too much admin.
          </h2>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
