import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 7 scenes at 30fps = ~60 seconds
// Scene durations: 150 + 150 + 450 + 300 + 300 + 300 + 210 = 1860
// 6 transitions × 20 frames = 120 frames overlap
// Total: 1860 - 120 = 1740 frames ≈ 58 seconds
export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={1740}
    fps={30}
    width={1920}
    height={1080}
  />
);
