import { useState, useCallback, useRef } from "react";

export interface WorkflowStep {
  id: string;
  label: string;
}

export interface WorkflowState {
  currentStepIndex: number;
  completedSteps: Set<string>;
  failedStep: { id: string; error: string } | null;
  isComplete: boolean;
  isRunning: boolean;
}

const MIN_STEP_DISPLAY_MS = 400;

export function useAgentWorkflow(steps: WorkflowStep[]) {
  const [state, setState] = useState<WorkflowState>({
    currentStepIndex: -1,
    completedSteps: new Set(),
    failedStep: null,
    isComplete: false,
    isRunning: false,
  });

  const stepStartTime = useRef<number>(0);

  const waitMinDisplay = useCallback(async () => {
    const elapsed = Date.now() - stepStartTime.current;
    if (elapsed < MIN_STEP_DISPLAY_MS) {
      await new Promise((r) => setTimeout(r, MIN_STEP_DISPLAY_MS - elapsed));
    }
  }, []);

  const startWorkflow = useCallback(() => {
    stepStartTime.current = Date.now();
    setState({
      currentStepIndex: 0,
      completedSteps: new Set(),
      failedStep: null,
      isComplete: false,
      isRunning: true,
    });
  }, []);

  const completeStep = useCallback(
    async (id: string) => {
      await waitMinDisplay();
      setState((prev) => {
        const completed = new Set(prev.completedSteps);
        completed.add(id);
        const nextIndex = prev.currentStepIndex + 1;
        const isComplete = nextIndex >= steps.length;
        stepStartTime.current = Date.now();
        return {
          ...prev,
          completedSteps: completed,
          currentStepIndex: isComplete ? prev.currentStepIndex : nextIndex,
          isComplete,
          isRunning: !isComplete,
        };
      });
    },
    [steps.length, waitMinDisplay]
  );

  const failStep = useCallback(
    async (id: string, error: string) => {
      await waitMinDisplay();
      setState((prev) => ({
        ...prev,
        failedStep: { id, error },
        isRunning: false,
      }));
    },
    [waitMinDisplay]
  );

  const reset = useCallback(() => {
    setState({
      currentStepIndex: -1,
      completedSteps: new Set(),
      failedStep: null,
      isComplete: false,
      isRunning: false,
    });
  }, []);

  return { startWorkflow, completeStep, failStep, reset, state };
}
