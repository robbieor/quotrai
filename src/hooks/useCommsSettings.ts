import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

export interface CommsSettings {
  id: string;
  team_id: string;
  visit_reminder_enabled: boolean;
  visit_reminder_hours: number;
  quote_followup_enabled: boolean;
  quote_followup_days: number;
  job_complete_enabled: boolean;
  job_complete_hours: number;
  on_my_way_enabled: boolean;
  enquiry_ack_enabled: boolean | null;
  review_request_enabled: boolean | null;
  review_request_hours: number | null;
  invoice_reminder_enabled: boolean;
  invoice_reminder_days: number;
  payment_receipt_enabled: boolean;
}

export function useCommsSettings() {
  const { profile } = useProfile();
  const teamId = profile?.team_id;
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["comms-settings", teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const { data, error } = await supabase
        .from("comms_settings")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;

      // Auto-create if missing
      if (!data) {
        const { data: created, error: createError } = await supabase
          .from("comms_settings")
          .insert({ team_id: teamId })
          .select()
          .single();
        if (createError) throw createError;
        return created as CommsSettings;
      }

      return data as CommsSettings;
    },
    enabled: !!teamId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<CommsSettings>) => {
      if (!teamId) throw new Error("No team");
      const { data, error } = await supabase
        .from("comms_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("team_id", teamId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comms-settings", teamId] });
    },
  });

  return { settings, isLoading, updateSettings };
}
