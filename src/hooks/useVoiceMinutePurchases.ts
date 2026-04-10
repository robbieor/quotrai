import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

export interface VoiceMinutePurchase {
  id: string;
  team_id: string;
  user_id: string;
  minutes_purchased: number;
  amount_paid: number;
  currency: string;
  stripe_session_id: string | null;
  status: string;
  purchased_at: string;
}

export function useVoiceMinutePurchases() {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ["voiceMinutePurchases", profile?.team_id],
    queryFn: async (): Promise<VoiceMinutePurchase[]> => {
      if (!profile?.team_id) return [];

      const { data, error } = await supabase
        .from("voice_minute_purchases")
        .select("*")
        .eq("team_id", profile.team_id)
        .order("purchased_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as VoiceMinutePurchase[];
    },
    enabled: !!profile?.team_id,
  });
}
