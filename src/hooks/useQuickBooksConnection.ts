import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export function useQuickBooksConnection() {
  const { profile } = useProfile();
  const teamId = profile?.team_id;
  const queryClient = useQueryClient();

  const connection = useQuery({
    queryKey: ["quickbooks-connection", teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const { data, error } = await (supabase as any)
        .from("quickbooks_connections")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        team_id: string;
        realm_id: string;
        company_name: string | null;
        token_expires_at: string;
        created_at: string;
      } | null;
    },
    enabled: !!teamId,
  });

  const connect = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("No team");
      const { data, error } = await supabase.functions.invoke("quickbooks-auth", {
        body: { team_id: teamId },
      });
      if (error) throw error;
      return data.auth_url as string;
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("No team");
      const { error } = await (supabase as any)
        .from("quickbooks_connections")
        .delete()
        .eq("team_id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quickbooks-connection"] });
    },
  });

  return { connection, connect, disconnect, teamId };
}
