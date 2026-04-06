import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface SupplierSetting {
  id: string;
  team_id: string;
  supplier_name: string;
  discount_percent: number;
  default_markup_percent: number;
  created_at: string;
  updated_at: string;
}

export function useSupplierSettings() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const teamId = profile?.team_id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["supplier-settings", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("team_supplier_settings" as any)
        .select("*")
        .eq("team_id", teamId)
        .order("supplier_name");
      if (error) throw error;
      return (data || []) as unknown as SupplierSetting[];
    },
    enabled: !!teamId,
  });

  const upsertSetting = useMutation({
    mutationFn: async (s: { supplier_name: string; discount_percent: number; default_markup_percent: number }) => {
      if (!teamId) throw new Error("No team");
      const { error } = await supabase
        .from("team_supplier_settings" as any)
        .upsert(
          { team_id: teamId, ...s, updated_at: new Date().toISOString() },
          { onConflict: "team_id,supplier_name" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-settings", teamId] });
      toast.success("Supplier settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSetting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_supplier_settings" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-settings", teamId] });
      toast.success("Supplier removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getSettingForSupplier = (supplierName: string): SupplierSetting | undefined => {
    return (settings || []).find(s => s.supplier_name.toLowerCase() === supplierName.toLowerCase());
  };

  return { settings: settings || [], isLoading, upsertSetting, deleteSetting, getSettingForSupplier };
}
