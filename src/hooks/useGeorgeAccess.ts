import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useUserRole } from "./useUserRole";

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
  const { profile, isLoading: profileLoading } = useProfile();
  const { isOwner, isOwnerOrManager, isLoading: roleLoading } = useUserRole();

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

  const TESTING_MODE = false;

  const hasLegacyVoiceAccess = Boolean(profile?.has_george_voice);
  const hasVoiceAccess = TESTING_MODE || isOwnerOrManager || hasLegacyVoiceAccess;
  const georgeVoiceSeats = teamData?.george_voice_seats ?? (TESTING_MODE ? 1 : 0);
  const voiceMinutesUsed = Number(teamData?.george_voice_minutes_used ?? 0);
  const voiceMinutesLimit = TESTING_MODE
    ? 999
    : georgeVoiceSeats > 0
      ? georgeVoiceSeats * 60
      : hasVoiceAccess
        ? 60
        : 0;
  const remainingMinutes = Math.max(0, voiceMinutesLimit - voiceMinutesUsed);
  const isMinutesExhausted = !TESTING_MODE && voiceMinutesLimit > 0 && remainingMinutes <= 0;
  const canUseVoice = hasVoiceAccess && !isMinutesExhausted;

  let accessMessage: string | null = null;
  if (!TESTING_MODE) {
    if (!hasVoiceAccess) {
      if (isOwner) {
        accessMessage = "Voice is not active on this account yet.";
      } else {
        accessMessage = "Voice is not active for this account yet. Ask your admin to enable it.";
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
    isLoading: profileLoading || roleLoading || teamLoading,
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
