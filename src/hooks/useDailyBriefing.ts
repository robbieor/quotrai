import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BriefingContent {
  headline: string;
  priorities: { title: string; impact: string; action: string }[];
  revenue_at_risk: string;
  workforce: string;
  overnight: string;
  metrics_snapshot: Record<string, number | string>;
}

export function useDailyBriefing() {
  return useQuery({
    queryKey: ["daily-briefing"],
    queryFn: async (): Promise<BriefingContent> => {
      const { data, error } = await supabase.functions.invoke("generate-briefing", {
        body: {},
      });
      if (error) throw error;
      return data.content as BriefingContent;
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useRefreshBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-briefing", {
        body: { force: true },
      });
      if (error) throw error;
      return data.content as BriefingContent;
    },
    onSuccess: (data) => {
      qc.setQueryData(["daily-briefing"], data);
    },
  });
}

export interface TeamBenchmarks {
  trade_type: string;
  country: string;
  team: {
    close_rate: number;
    avg_quote_value: number;
    paid_on_time_rate: number;
    quote_count: number;
    invoice_count: number;
  };
  peer: {
    trade_type?: string;
    country?: string;
    team_count?: number;
    close_rate_median?: number;
    close_rate_p25?: number;
    close_rate_p75?: number;
    avg_quote_value_median?: number;
    paid_on_time_median?: number;
  };
}

export function useTeamBenchmarks(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-benchmarks", teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<TeamBenchmarks> => {
      const { data, error } = await supabase.rpc("get_team_benchmarks", {
        _team_id: teamId!,
      });
      if (error) throw error;
      return data as unknown as TeamBenchmarks;
    },
    staleTime: 1000 * 60 * 60,
  });
}
