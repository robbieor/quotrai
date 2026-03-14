import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, SkipForward, SkipBack, Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoStep } from "@/config/demoWalkthrough";

interface DemoOverlayProps {
  currentStep: DemoStep | null;
  currentStepIndex: number;
  totalSteps: number;
  isNarrating: boolean;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
  onPlayAll: () => void;
}

export function DemoOverlay({
  currentStep,
  currentStepIndex,
  totalSteps,
  isNarrating,
  onNext,
  onPrev,
  onStop,
  onPlayAll,
}: DemoOverlayProps) {
  if (!currentStep) return null;

  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none">
      {/* Narration indicator */}
      {isNarrating && (
        <div className="flex justify-center mb-3 pointer-events-none">
          <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
            <Volume2 className="h-4 w-4" />
            <span className="text-sm font-medium">George is speaking…</span>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className="pointer-events-auto mx-auto max-w-2xl mb-6 px-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 space-y-3">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
              {currentStepIndex + 1}/{totalSteps}
            </span>
            <Progress value={progress} className="flex-1 h-1.5" />
          </div>

          {/* Current narration text */}
          <p className="text-sm text-foreground leading-relaxed line-clamp-2">
            {currentStep.narration}
          </p>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Exit
            </Button>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrev}
                disabled={currentStepIndex === 0 || isNarrating}
                className="h-8 w-8"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="default"
                size="icon"
                onClick={onPlayAll}
                disabled={isNarrating}
                className="h-10 w-10 rounded-full"
              >
                <Play className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                disabled={currentStepIndex >= totalSteps - 1 || isNarrating}
                className="h-8 w-8"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-xs text-muted-foreground capitalize font-medium">
              {currentStep.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
