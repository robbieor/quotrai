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
}

interface AgentTaskContextType {
  activeTask: AgentTask | null;
  taskHistory: AgentTask[];
  isMinimised: boolean;
  startTask: (type: string, label: string, steps: WorkflowStep[]) => string;
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

  // Persist task to DB for cross-device
  const persistTask = useCallback(async (task: AgentTask) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase.from("agent_tasks").upsert({
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
      }).select().single();

      if (data) dbTaskId.current = data.id;
    } catch (err) {
      console.error("[AgentTask] DB persist error:", err);
    }
  }, []);

  // Load any running tasks on mount (cross-device resume)
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
          setActiveTask({
            id: row.id,
            type: row.task_type,
            label: row.task_type,
            steps: (row.steps as any) || [],
            status: row.status as TaskStatus,
            currentStepIndex: row.current_step_index || 0,
            completedSteps: new Set(row.completed_steps || []),
            failedStep: row.failed_step as any,
            successMessage: row.success_message || undefined,
            createdAt: new Date(row.created_at),
          });
        }
      } catch (err) {
        console.error("[AgentTask] Load error:", err);
      }
    };
    loadRunningTasks();
  }, []);

  // Subscribe to realtime updates for cross-device sync
  useEffect(() => {
    const channel = supabase
      .channel("agent-tasks-sync")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "agent_tasks" }, (payload) => {
        const row = payload.new as any;
        if (activeTask && row.id === activeTask.id) {
          setActiveTask(prev => prev ? {
            ...prev,
            status: row.status as TaskStatus,
            currentStepIndex: row.current_step_index || 0,
            completedSteps: new Set(row.completed_steps || []),
            failedStep: row.failed_step as any,
            successMessage: row.success_message || undefined,
          } : null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeTask?.id]);

  const waitMinDisplay = useCallback(async () => {
    const elapsed = Date.now() - stepStartTime.current;
    if (elapsed < MIN_STEP_DISPLAY_MS) {
      await new Promise(r => setTimeout(r, MIN_STEP_DISPLAY_MS - elapsed));
    }
  }, []);

  const startTask = useCallback((type: string, label: string, steps: WorkflowStep[]): string => {
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
    };
    setActiveTask(task);
    setIsMinimised(false);
    persistTask(task);
    return id;
  }, [persistTask]);

  const completeStep = useCallback(async (stepId: string) => {
    await waitMinDisplay();
    setActiveTask(prev => {
      if (!prev) return null;
      const completed = new Set(prev.completedSteps);
      completed.add(stepId);
      const nextIndex = prev.currentStepIndex + 1;
      const isLast = nextIndex >= prev.steps.length;
      stepStartTime.current = Date.now();
      const updated = {
        ...prev,
        completedSteps: completed,
        currentStepIndex: isLast ? prev.currentStepIndex : nextIndex,
        status: (isLast ? "success" : "running") as TaskStatus,
      };
      return updated;
    });
  }, [waitMinDisplay]);

  // Persist on state changes
  useEffect(() => {
    if (activeTask && activeTask.status !== "idle") {
      persistTask(activeTask);
    }
  }, [activeTask?.status, activeTask?.currentStepIndex, persistTask]);

  const failStep = useCallback(async (stepId: string, error: string) => {
    await waitMinDisplay();
    setActiveTask(prev => prev ? {
      ...prev,
      failedStep: { id: stepId, error },
      status: "error" as TaskStatus,
    } : null);
  }, [waitMinDisplay]);

  const completeTask = useCallback((successMessage: string, actions?: SuccessAction[]) => {
    setActiveTask(prev => {
      if (!prev) return null;
      const allCompleted = new Set(prev.steps.map(s => s.id));
      return {
        ...prev,
        completedSteps: allCompleted,
        status: "success" as TaskStatus,
        successMessage,
        successActions: actions,
      };
    });
    // Auto-minimise after 8 seconds
    setTimeout(() => setIsMinimised(true), 8000);
  }, []);

  const cancelTask = useCallback(() => {
    if (activeTask) {
      setTaskHistory(prev => [...prev, { ...activeTask, status: "cancelled" as TaskStatus }]);
    }
    setActiveTask(null);
    dbTaskId.current = null;
  }, [activeTask]);

  const retryTask = useCallback(() => {
    setActiveTask(prev => {
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
    setIsMinimised(prev => !prev);
  }, []);

  const dismissTask = useCallback(() => {
    if (activeTask) {
      setTaskHistory(prev => [...prev, activeTask]);
    }
    setActiveTask(null);
    setIsMinimised(false);
    dbTaskId.current = null;
  }, [activeTask]);

  return (
    <AgentTaskContext.Provider value={{
      activeTask,
      taskHistory,
      isMinimised,
      startTask,
      completeStep,
      failStep,
      completeTask,
      cancelTask,
      retryTask,
      toggleMinimise,
      dismissTask,
    }}>
      {children}
    </AgentTaskContext.Provider>
  );
}

export function useAgentTask() {
  const ctx = useContext(AgentTaskContext);
  if (!ctx) throw new Error("useAgentTask must be used within AgentTaskProvider");
  return ctx;
}
