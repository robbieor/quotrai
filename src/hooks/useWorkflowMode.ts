import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type WorkflowMode = "simple" | "standard" | "advanced";

/**
 * Returns the user's workflow mode (simple / standard / advanced).
 * This determines dashboard layout density and checklist priorities.
 */
export function useWorkflowMode() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["workflow-mode", user?.id],
    queryFn: async (): Promise<WorkflowMode> => {
      if (!user?.id) return "standard";
      const { data: profile } = await supabase
        .from("profiles")
        .select("workflow_mode")
        .eq("id", user.id)
        .single();
      return (profile?.workflow_mode as WorkflowMode) || "standard";
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  });

  const mode = data ?? "standard";

  return {
    mode,
    isLoading,
    isSimple: mode === "simple",
    isStandard: mode === "standard",
    isAdvanced: mode === "advanced",
  };
}

/**
 * Determines workflow mode from onboarding answers.
 */
export function computeWorkflowMode(answers: {
  sendsQuotes: boolean;
  tracksJobs: boolean;
  teamSize: string;
  priority: string;
}): WorkflowMode {
  const { sendsQuotes, tracksJobs, teamSize, priority } = answers;

  // Advanced: larger teams or wants insights/control
  if (teamSize === "medium" || teamSize === "large") return "advanced";

  // Simple: doesn't quote, doesn't track jobs, just wants to get paid
  if (!sendsQuotes && !tracksJobs) return "simple";
  if (!sendsQuotes && priority === "get_paid_faster") return "simple";

  // Standard: everyone else
  return "standard";
}
