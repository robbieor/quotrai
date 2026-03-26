import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface PriceBookItem {
  id: string;
  team_id: string;
  item_name: string;
  supplier_name: string | null;
  category: string | null;
  unit: string;
  cost_price: number;
  sell_price: number;
  last_updated: string;
  created_at: string;
}

export function usePriceBook() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const teamId = profile?.team_id;

  const { data: items, isLoading } = useQuery({
    queryKey: ["price-book", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("supplier_price_book" as any)
        .select("*")
        .eq("team_id", teamId)
        .order("item_name");
      if (error) throw error;
      return (data || []) as unknown as PriceBookItem[];
    },
    enabled: !!teamId,
  });

  const addItem = useMutation({
    mutationFn: async (item: Omit<PriceBookItem, "id" | "team_id" | "created_at" | "last_updated">) => {
      if (!teamId) throw new Error("No team");
      const { error } = await supabase
        .from("supplier_price_book" as any)
        .insert({ ...item, team_id: teamId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-book", teamId] });
      toast.success("Item added to price book");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PriceBookItem> & { id: string }) => {
      const { error } = await supabase
        .from("supplier_price_book" as any)
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-book", teamId] });
      toast.success("Item updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplier_price_book" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-book", teamId] });
      toast.success("Item removed");
    },
    onError: (e) => toast.error(e.message),
  });

  const searchItems = async (query: string): Promise<PriceBookItem[]> => {
    if (!teamId || !query || query.length < 2) return [];
    const { data, error } = await supabase
      .from("supplier_price_book" as any)
      .select("*")
      .eq("team_id", teamId)
      .ilike("item_name", `%${query}%`)
      .limit(10);
    if (error) return [];
    return (data || []) as unknown as PriceBookItem[];
  };

  return { items: items || [], isLoading, addItem, updateItem, deleteItem, searchItems };
}
