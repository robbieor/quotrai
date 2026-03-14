import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UsageSnapshot {
  id: string;
  team_id: string;
  period_start: string;
  period_end: string;
  minutes_used: number;
  minutes_limit: number;
  george_voice_seats: number;
  created_at: string;
}

export function useGeorgeUsageHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['george-usage-history', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (!profile?.team_id) return [];

      const { data, error } = await supabase
        .from('george_usage_snapshots')
        .select('*')
        .eq('team_id', profile.team_id)
        .order('period_end', { ascending: false })
        .limit(12);

      if (error) throw error;
      return (data || []) as UsageSnapshot[];
    },
    enabled: !!user,
  });
}
