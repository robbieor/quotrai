import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutomationSuggestion {
  id: string;
  team_id: string;
  pattern_key: string;
  title: string;
  description: string;
  evidence: Record<string, any>;
  confidence: number;
  status: "pending" | "enabled" | "dismissed";
  created_at: string;
}

export interface TeamAutomation {
  id: string;
  team_id: string;
  pattern_key: string;
  name: string;
  trigger_config: Record<string, any>;
  action_config: Record<string, any>;
  enabled: boolean;
  preview_mode: boolean;
  run_count: number;
  created_at: string;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  ran_at: string;
  target_table: string | null;
  target_id: string | null;
  action: string;
  preview: boolean;
  success: boolean;
  error: string | null;
}

export function useSuggestions() {
  return useQuery({
    queryKey: ["automation-suggestions"],
    queryFn: async (): Promise<AutomationSuggestion[]> => {
      const { data, error } = await supabase
        .from("automation_suggestions")
        .select("*")
        .eq("status", "pending")
        .order("confidence", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AutomationSuggestion[];
    },
  });
}

export function useActiveAutomations() {
  return useQuery({
    queryKey: ["team-automations"],
    queryFn: async (): Promise<TeamAutomation[]> => {
      const { data, error } = await supabase
        .from("team_automations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamAutomation[];
    },
  });
}

export function useAutomationRuns(automationId: string | null) {
  return useQuery({
    queryKey: ["automation-runs", automationId],
    enabled: !!automationId,
    queryFn: async (): Promise<AutomationRun[]> => {
      const { data, error } = await supabase
        .from("automation_runs")
        .select("*")
        .eq("automation_id", automationId!)
        .order("ran_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AutomationRun[];
    },
  });
}

const DEFAULT_CONFIG: Record<string, { trigger: any; action: any; name: string }> = {
  quote_followup: {
    name: "Auto-follow-up on sent quotes",
    trigger: { days_after_sent: 3 },
    action: { channel: "email", template: "followup" },
  },
  overdue_chase: {
    name: "Auto-chase overdue invoices",
    trigger: { days_after_due: 1 },
    action: { channel: "email", template: "overdue_reminder" },
  },
  recurring_customer: {
    name: "Flag recurring customers",
    trigger: { jobs_in_90d: 3 },
    action: { channel: "ui", behavior: "flag" },
  },
  auto_convert_to_job: {
    name: "Auto-convert accepted quotes",
    trigger: { on_status: "accepted" },
    action: { behavior: "create_job" },
  },
};

export function useEnableSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: AutomationSuggestion) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const cfg = DEFAULT_CONFIG[s.pattern_key] ?? {
        name: s.title,
        trigger: {},
        action: {},
      };
      const { error: insertError } = await supabase.from("team_automations").insert({
        team_id: s.team_id,
        pattern_key: s.pattern_key,
        name: cfg.name,
        trigger_config: cfg.trigger,
        action_config: cfg.action,
        enabled: true,
        preview_mode: true,
        created_by: u.user.id,
      });
      if (insertError) throw insertError;

      const { error: upError } = await supabase
        .from("automation_suggestions")
        .update({ status: "enabled" })
        .eq("id", s.id);
      if (upError) throw upError;
    },
    onSuccess: () => {
      toast.success("Automation enabled in preview mode");
      qc.invalidateQueries({ queryKey: ["automation-suggestions"] });
      qc.invalidateQueries({ queryKey: ["team-automations"] });
    },
    onError: (e: any) => toast.error(e?.message || "Couldn't enable automation"),
  });
}

export function useDismissSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_suggestions")
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["automation-suggestions"] }),
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { id: string; field: "enabled" | "preview_mode"; value: boolean }) => {
      const { error } = await supabase
        .from("team_automations")
        .update({ [a.field]: a.value })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-automations"] }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_automations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Automation removed");
      qc.invalidateQueries({ queryKey: ["team-automations"] });
    },
  });
}
