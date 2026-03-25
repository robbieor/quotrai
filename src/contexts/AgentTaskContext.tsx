import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowStep } from "@/hooks/useAgentWorkflow";

export type TaskStatus = "idle" | "started" | "running" | "success" | "error" | "cancelled";

interface SuccessAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

export interface AgentTask {
  id: string;
  type: string;
  label: string;
  steps: WorkflowStep[];
  status: TaskStatus;
  currentStepIndex: number;
  completedSteps: Set<string>;
  failedStep: { id: string; error: string } | null;
  successMessage?: string;
  successActions?: SuccessAction[];
  createdAt: Date;
  /** Whether this task is driven by backend realtime updates */
  backendDriven?: boolean;
}

interface AgentTaskContextType {
  activeTask: AgentTask | null;
  taskHistory: AgentTask[];
  isMinimised: boolean;
  /** Start a frontend-driven task (cosmetic steps) */
  startTask: (type: string, label: string, steps: WorkflowStep[]) => string;
  /** Start a backend-driven task via run-task edge function */
  startBackendTask: (
    type: string,
    label: string,
    steps: { step_key: string; label: string }[],
    inputPayload: Record<string, unknown>,
    mode?: "preview" | "live"
  ) => Promise<string | null>;
  completeStep: (stepId: string) => Promise<void>;
  failStep: (stepId: string, error: string) => Promise<void>;
  completeTask: (successMessage: string, actions?: SuccessAction[]) => void;
  cancelTask: () => void;
  retryTask: () => void;
  toggleMinimise: () => void;
  dismissTask: () => void;
}

const AgentTaskContext = createContext<AgentTaskContextType | null>(null);

const MIN_STEP_DISPLAY_MS = 400;

export function AgentTaskProvider({ children }: { children: ReactNode }) {
  const [activeTask, setActiveTask] = useState<AgentTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<AgentTask[]>([]);
  const [isMinimised, setIsMinimised] = useState(false);
  const stepStartTime = useRef<number>(0);
  const dbTaskId = useRef<string | null>(null);

  // ─── DB persist for frontend-driven tasks ──────────────────
  const persistTask = useCallback(async (task: AgentTask) => {
    if (task.backendDriven) return; // backend tasks manage their own DB state
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      await supabase.from("agent_tasks").upsert({
        id: task.id,
        user_id: userData.user.id,
        task_type: task.type,
        steps: task.steps as any,
        status: task.status,
        current_step_index: task.currentStepIndex,
        completed_steps: Array.from(task.completedSteps),
        failed_step: task.failedStep as any,
        success_message: task.successMessage || null,
        updated_at: new Date().toISOString(),
      } as any);
    } catch (err) {
      console.error("[AgentTask] DB persist error:", err);
    }
  }, []);

  // ─── Load running tasks on mount (cross-device resume) ─────
  useEffect(() => {
    const loadRunningTasks = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data } = await supabase
          .from("agent_tasks")
          .select("*")
          .eq("user_id", userData.user.id)
          .eq("status", "running")
          .order("created_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const row = data[0];
          dbTaskId.current = row.id;

          // Check if it has task_steps (backend-driven)
          const { data: stepRows } = await supabase
            .from("task_steps")
            .select("*")
            .eq("task_id", row.id)
            .order("sort_order", { ascending: true });

          const isBackendDriven = stepRows && stepRows.length > 0;
          const steps = isBackendDriven
            ? stepRows.map((s: any) => ({ id: s.step_key, label: s.label }))
            : ((row.steps as any) || []);

          const completedSteps = isBackendDriven
            ? new Set(stepRows.filter((s: any) => s.status === "complete").map((s: any) => s.step_key))
            : new Set(row.completed_steps || []);

          const failedStepRow = isBackendDriven
            ? stepRows.find((s: any) => s.status === "error")
            : null;

          const currentIndex = isBackendDriven
            ? Math.max(0, stepRows.findIndex((s: any) => s.status === "running" || s.status === "pending"))
            : (row.current_step_index || 0);

          setActiveTask({
            id: row.id,
            type: row.task_type,
            label: row.task_type,
            steps,
            status: row.status as TaskStatus,
            currentStepIndex: currentIndex,
            completedSteps,
            failedStep: failedStepRow
              ? { id: failedStepRow.step_key, error: failedStepRow.error_message || "Error" }
              : (row.failed_step as any),
            successMessage: row.success_message || undefined,
            createdAt: new Date(row.created_at!),
            backendDriven: isBackendDriven,
          });
        }
      } catch (err) {
        console.error("[AgentTask] Load error:", err);
      }
    };
    loadRunningTasks();
  }, []);

  // ─── Realtime: subscribe to task_steps for backend-driven tasks ─
  useEffect(() => {
    if (!activeTask?.backendDriven || !activeTask?.id) return;

    const channel = supabase
      .channel(`task-steps-${activeTask.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "task_steps",
          filter: `task_id=eq.${activeTask.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          setActiveTask((prev) => {
            if (!prev || prev.id !== row.task_id) return prev;

            const completed = new Set(prev.completedSteps);
            if (row.status === "complete") completed.add(row.step_key);

            const failedStep =
              row.status === "error"
                ? { id: row.step_key, error: row.error_message || "Error" }
                : prev.failedStep;

            // Find current step index
            const stepIdx = prev.steps.findIndex((s) => s.id === row.step_key);
            const currentStepIndex =
              row.status === "running"
                ? stepIdx
                : row.status === "complete"
                  ? Math.min(stepIdx + 1, prev.steps.length - 1)
                  : prev.currentStepIndex;

            return {
              ...prev,
              completedSteps: completed,
              currentStepIndex,
              failedStep,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTask?.id, activeTask?.backendDriven]);

  // ─── Realtime: subscribe to agent_tasks for status changes ─
  useEffect(() => {
    if (!activeTask?.backendDriven || !activeTask?.id) return;

    const channel = supabase
      .channel(`agent-task-status-${activeTask.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_tasks",
          filter: `id=eq.${activeTask.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.status === "success" || row.status === "error") {
            setActiveTask((prev) => {
              if (!prev) return null;
              const allCompleted =
                row.status === "success"
                  ? new Set(prev.steps.map((s) => s.id))
                  : prev.completedSteps;
              return {
                ...prev,
                status: row.status as TaskStatus,
                completedSteps: allCompleted,
                successMessage: row.success_message || prev.successMessage,
                failedStep: row.error_message
                  ? { id: "unknown", error: row.error_message }
                  : prev.failedStep,
              };
            });

            if (row.status === "success") {
              setTimeout(() => setIsMinimised(true), 8000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTask?.id, activeTask?.backendDriven]);

  // ─── Frontend-driven helpers (unchanged) ───────────────────

  const waitMinDisplay = useCallback(async () => {
    const elapsed = Date.now() - stepStartTime.current;
    if (elapsed < MIN_STEP_DISPLAY_MS) {
      await new Promise((r) => setTimeout(r, MIN_STEP_DISPLAY_MS - elapsed));
    }
  }, []);

  const startTask = useCallback(
    (type: string, label: string, steps: WorkflowStep[]): string => {
      const id = crypto.randomUUID();
      stepStartTime.current = Date.now();
      const task: AgentTask = {
        id,
        type,
        label,
        steps,
        status: "running",
        currentStepIndex: 0,
        completedSteps: new Set(),
        failedStep: null,
        createdAt: new Date(),
        backendDriven: false,
      };
      setActiveTask(task);
      setIsMinimised(false);
      persistTask(task);
      return id;
    },
    [persistTask]
  );

  const startBackendTask = useCallback(
    async (
      type: string,
      label: string,
      steps: { step_key: string; label: string }[],
      inputPayload: Record<string, unknown>,
      mode: "preview" | "live" = "preview"
    ): Promise<string | null> => {
      try {
        // Optimistically show the task in UI
        const tempId = crypto.randomUUID();
        const workflowSteps = steps.map((s) => ({ id: s.step_key, label: s.label }));
        setActiveTask({
          id: tempId,
          type,
          label,
          steps: workflowSteps,
          status: "running",
          currentStepIndex: 0,
          completedSteps: new Set(),
          failedStep: null,
          createdAt: new Date(),
          backendDriven: true,
        });
        setIsMinimised(false);

        // Call edge function
        const { data, error } = await supabase.functions.invoke("run-task", {
          body: {
            task_type: type,
            mode,
            steps: steps.map((s, i) => ({ ...s, sort_order: i })),
            input_payload: inputPayload,
          },
        });

        if (error) throw error;
        if (!data?.task_id) throw new Error("No task_id returned");

        // Replace temp ID with real task ID so realtime subscriptions work
        setActiveTask((prev) =>
          prev
            ? { ...prev, id: data.task_id }
            : null
        );
        dbTaskId.current = data.task_id;
        return data.task_id;
      } catch (err) {
        console.error("[AgentTask] Backend task start error:", err);
        setActiveTask((prev) =>
          prev
            ? {
                ...prev,
                status: "error" as TaskStatus,
                failedStep: {
                  id: steps[0]?.step_key || "unknown",
                  error: err instanceof Error ? err.message : "Failed to start task",
                },
              }
            : null
        );
        return null;
      }
    },
    []
  );

  const completeStep = useCallback(
    async (stepId: string) => {
      await waitMinDisplay();
      setActiveTask((prev) => {
        if (!prev) return null;
        const completed = new Set(prev.completedSteps);
        completed.add(stepId);
        const nextIndex = prev.currentStepIndex + 1;
        const isLast = nextIndex >= prev.steps.length;
        stepStartTime.current = Date.now();
        return {
          ...prev,
          completedSteps: completed,
          currentStepIndex: isLast ? prev.currentStepIndex : nextIndex,
          status: (isLast ? "success" : "running") as TaskStatus,
        };
      });
    },
    [waitMinDisplay]
  );

  // Persist on state changes (frontend-driven only)
  useEffect(() => {
    if (activeTask && activeTask.status !== "idle" && !activeTask.backendDriven) {
      persistTask(activeTask);
    }
  }, [activeTask?.status, activeTask?.currentStepIndex, persistTask]);

  const failStep = useCallback(
    async (stepId: string, error: string) => {
      await waitMinDisplay();
      setActiveTask((prev) =>
        prev
          ? { ...prev, failedStep: { id: stepId, error }, status: "error" as TaskStatus }
          : null
      );
    },
    [waitMinDisplay]
  );

  const completeTask = useCallback((successMessage: string, actions?: SuccessAction[]) => {
    setActiveTask((prev) => {
      if (!prev) return null;
      const allCompleted = new Set(prev.steps.map((s) => s.id));
      return {
        ...prev,
        completedSteps: allCompleted,
        status: "success" as TaskStatus,
        successMessage,
        successActions: actions,
      };
    });
    setTimeout(() => setIsMinimised(true), 8000);
  }, []);

  const cancelTask = useCallback(() => {
    if (activeTask) {
      setTaskHistory((prev) => [...prev, { ...activeTask, status: "cancelled" as TaskStatus }]);
    }
    setActiveTask(null);
    dbTaskId.current = null;
  }, [activeTask]);

  const retryTask = useCallback(() => {
    setActiveTask((prev) => {
      if (!prev) return null;
      stepStartTime.current = Date.now();
      return {
        ...prev,
        status: "running" as TaskStatus,
        currentStepIndex: 0,
        completedSteps: new Set(),
        failedStep: null,
        successMessage: undefined,
        successActions: undefined,
      };
    });
  }, []);

  const toggleMinimise = useCallback(() => {
    setIsMinimised((prev) => !prev);
  }, []);

  const dismissTask = useCallback(() => {
    if (activeTask) {
      setTaskHistory((prev) => [...prev, activeTask]);
    }
    setActiveTask(null);
    setIsMinimised(false);
    dbTaskId.current = null;
  }, [activeTask]);

  return (
    <AgentTaskContext.Provider
      value={{
        activeTask,
        taskHistory,
        isMinimised,
        startTask,
        startBackendTask,
        completeStep,
        failStep,
        completeTask,
        cancelTask,
        retryTask,
        toggleMinimise,
        dismissTask,
      }}
    >
      {children}
    </AgentTaskContext.Provider>
  );
}

export function useAgentTask() {
  const ctx = useContext(AgentTaskContext);
  if (!ctx) throw new Error("useAgentTask must be used within AgentTaskProvider");
  return ctx;
}
