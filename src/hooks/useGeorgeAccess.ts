import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";

export interface GeorgeAccessState {
  hasVoiceAccess: boolean;
  isOwner: boolean;
  voiceMinutesUsed: number;
  voiceMinutesLimit: number;
  remainingMinutes: number;
  isMinutesExhausted: boolean;
  resetDate: string | null;
  georgeVoiceSeats: number;
  canUseVoice: boolean;
  accessMessage: string | null;
}

export interface TeamGeorgeUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
  has_george_voice: boolean;
  george_voice_added_at: string | null;
}

export function useGeorgeAccess() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["teamGeorgeData", profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return null;

      const { data: team, error } = await supabase
        .from("teams")
        .select("id, george_voice_minutes_used, george_voice_seats, george_usage_reset_date")
        .eq("id", profile.team_id)
        .single();

      if (error) throw error;
      return team;
    },
    enabled: !!profile?.team_id,
  });

  const { data: isOwner = false } = useQuery({
    queryKey: ["isTeamOwner", profile?.team_id, user?.id],
    queryFn: async () => {
      if (!profile?.team_id || !user?.id) return false;

      const { data, error } = await supabase
        .from("team_memberships")
        .select("role")
        .eq("team_id", profile.team_id)
        .eq("user_id", user.id)
        .single();

      if (error) return false;
      return data?.role === "owner";
    },
    enabled: !!profile?.team_id && !!user?.id,
  });

  // TESTING MODE: Grant voice access to all authenticated users
  const TESTING_MODE = true;
  
  const hasVoiceAccess = TESTING_MODE || (profile?.has_george_voice ?? false);
  const georgeVoiceSeats = teamData?.george_voice_seats ?? (TESTING_MODE ? 1 : 0);
  const voiceMinutesUsed = Number(teamData?.george_voice_minutes_used ?? 0);
  const voiceMinutesLimit = TESTING_MODE ? 999 : georgeVoiceSeats * 60; // 60 mins per seat, unlimited in testing
  const remainingMinutes = Math.max(0, voiceMinutesLimit - voiceMinutesUsed);
  const isMinutesExhausted = !TESTING_MODE && voiceMinutesLimit > 0 && remainingMinutes <= 0;

  // User can use voice if they have access AND minutes remain (always true in testing mode)
  const canUseVoice = hasVoiceAccess && !isMinutesExhausted;

  // Generate access message for UI
  let accessMessage: string | null = null;
  if (!TESTING_MODE) {
    if (!hasVoiceAccess) {
      if (isOwner) {
        accessMessage = "Voice not enabled. Enable in Settings → Team.";
      } else {
        accessMessage = "Voice not enabled for your account. Ask your admin to enable Foreman AI voice.";
      }
    } else if (isMinutesExhausted) {
      const resetDate = teamData?.george_usage_reset_date 
        ? new Date(teamData.george_usage_reset_date).toLocaleDateString() 
        : "next month";
      accessMessage = `Team voice minutes exhausted. Resets on ${resetDate}.`;
    }
  }

  return {
    hasVoiceAccess,
    isOwner,
    voiceMinutesUsed,
    voiceMinutesLimit,
    remainingMinutes,
    isMinutesExhausted,
    resetDate: teamData?.george_usage_reset_date ?? null,
    georgeVoiceSeats,
    canUseVoice,
    accessMessage,
    isLoading: profileLoading || teamLoading,
  };
}

export function useTeamGeorgeUsers() {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ["teamGeorgeUsers", profile?.team_id],
    queryFn: async (): Promise<TeamGeorgeUser[]> => {
      if (!profile?.team_id) return [];

      const { data, error } = await supabase.rpc("get_team_george_users", {
        target_team_id: profile.team_id,
      });

      if (error) throw error;
      return (data as TeamGeorgeUser[]) || [];
    },
    enabled: !!profile?.team_id,
  });
}
