import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Problem } from "./scenes/Scene1Problem";
import { Scene2MeetQuotr } from "./scenes/Scene2MeetQuotr";
import { Scene3CreateQuote } from "./scenes/Scene3CreateQuote";
import { Scene4SendQuote } from "./scenes/Scene4SendQuote";
import { Scene5ConvertJob } from "./scenes/Scene5ConvertJob";
import { Scene6AutoChase } from "./scenes/Scene6AutoChase";
import { Scene7Closing } from "./scenes/Scene7Closing";

const TRANSITION = 20;

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene1Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene2MeetQuotr />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />
        <TransitionSeries.Sequence durationInFrames={450}>
          <Scene3CreateQuote />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />
        <TransitionSeries.Sequence durationInFrames={300}>
          <Scene4SendQuote />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />
        <TransitionSeries.Sequence durationInFrames={300}>
          <Scene5ConvertJob />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />
        <TransitionSeries.Sequence durationInFrames={300}>
          <Scene6AutoChase />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />
        <TransitionSeries.Sequence durationInFrames={210}>
          <Scene7Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
