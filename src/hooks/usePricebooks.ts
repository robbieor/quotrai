import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface Pricebook {
  id: string;
  team_id: string;
  name: string;
  supplier_name: string | null;
  source_type: string;
  source_url: string | null;
  trade_type: string | null;
  item_count: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePricebooks() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const teamId = profile?.team_id;

  const { data: pricebooks, isLoading } = useQuery({
    queryKey: ["pricebooks", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("team_pricebooks" as any)
        .select("*")
        .eq("team_id", teamId)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as Pricebook[];
    },
    enabled: !!teamId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pricebooks", teamId] });

  const createPricebook = useMutation({
    mutationFn: async (pb: Omit<Pricebook, "id" | "team_id" | "created_at" | "updated_at" | "item_count">) => {
      if (!teamId) throw new Error("No team");
      const { data, error } = await supabase
        .from("team_pricebooks" as any)
        .insert({ ...pb, team_id: teamId })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Pricebook;
    },
    onSuccess: () => { invalidate(); toast.success("Pricebook created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePricebook = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Pricebook> & { id: string }) => {
      const { error } = await supabase
        .from("team_pricebooks" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Pricebook updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePricebook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_pricebooks" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Pricebook deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateItemCount = async (pricebookId: string) => {
    if (!teamId) return;
    const { count } = await supabase
      .from("team_catalog_items" as any)
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("pricebook_id", pricebookId);
    await supabase
      .from("team_pricebooks" as any)
      .update({ item_count: count || 0 })
      .eq("id", pricebookId);
    invalidate();
  };

  return { pricebooks: pricebooks || [], isLoading, createPricebook, updatePricebook, deletePricebook, updateItemCount };
}
