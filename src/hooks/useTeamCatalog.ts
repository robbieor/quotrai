import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface CatalogItem {
  id: string;
  team_id: string;
  source_id: string | null;
  item_name: string;
  supplier_name: string | null;
  supplier_sku: string | null;
  manufacturer: string | null;
  category: string | null;
  subcategory: string | null;
  trade_type: string | null;
  unit: string;
  website_price: number | null;
  discount_percent: number;
  cost_price: number;
  markup_percent: number;
  sell_price: number;
  image_url: string | null;
  is_favourite: boolean;
  last_used_at: string | null;
  created_at: string;
  last_updated: string;
}

export interface CatalogFilters {
  search?: string;
  trade_type?: string;
  category?: string;
  subcategory?: string;
  supplier_name?: string;
  favourites_only?: boolean;
  pricebook_id?: string;
}

export function useTeamCatalog(filters: CatalogFilters = {}) {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const teamId = profile?.team_id;

  const { data: items, isLoading } = useQuery({
    queryKey: ["team-catalog", teamId, filters],
    queryFn: async () => {
      if (!teamId) return [];
      let q = supabase
        .from("team_catalog_items" as any)
        .select("*")
        .eq("team_id", teamId)
        .order("item_name");

      if (filters.trade_type) q = q.eq("trade_type", filters.trade_type);
      if (filters.category) q = q.eq("category", filters.category);
      if (filters.subcategory) q = q.eq("subcategory", filters.subcategory);
      if (filters.supplier_name) q = q.eq("supplier_name", filters.supplier_name);
      if (filters.favourites_only) q = q.eq("is_favourite", true);
      if (filters.search && filters.search.length >= 2) {
        q = q.or(`item_name.ilike.%${filters.search}%,supplier_sku.ilike.%${filters.search}%,manufacturer.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CatalogItem[];
    },
    enabled: !!teamId,
  });

  // Get unique values for filter sidebar
  const filterOptions = useQuery({
    queryKey: ["team-catalog-filters", teamId],
    queryFn: async () => {
      if (!teamId) return { trade_types: [], categories: [], subcategories: [], suppliers: [] };
      const { data } = await supabase
        .from("team_catalog_items" as any)
        .select("trade_type, category, subcategory, supplier_name")
        .eq("team_id", teamId);
      const rows = (data || []) as any[];
      return {
        trade_types: [...new Set(rows.map(r => r.trade_type).filter(Boolean))] as string[],
        categories: [...new Set(rows.map(r => r.category).filter(Boolean))] as string[],
        subcategories: [...new Set(rows.map(r => r.subcategory).filter(Boolean))] as string[],
        suppliers: [...new Set(rows.map(r => r.supplier_name).filter(Boolean))] as string[],
      };
    },
    enabled: !!teamId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["team-catalog"] });
    queryClient.invalidateQueries({ queryKey: ["team-catalog-filters"] });
  };

  const addItem = useMutation({
    mutationFn: async (item: Omit<CatalogItem, "id" | "team_id" | "created_at" | "last_updated" | "is_favourite" | "last_used_at">) => {
      if (!teamId) throw new Error("No team");
      const { error } = await supabase
        .from("team_catalog_items" as any)
        .insert({ ...item, team_id: teamId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item added to catalog"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CatalogItem> & { id: string }) => {
      const { error } = await supabase
        .from("team_catalog_items" as any)
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_catalog_items" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleFavourite = useMutation({
    mutationFn: async ({ id, is_favourite }: { id: string; is_favourite: boolean }) => {
      const { error } = await supabase
        .from("team_catalog_items" as any)
        .update({ is_favourite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  return {
    items: items || [],
    isLoading,
    filterOptions: filterOptions.data || { trade_types: [], categories: [], subcategories: [], suppliers: [] },
    addItem,
    updateItem,
    deleteItem,
    toggleFavourite,
  };
}
