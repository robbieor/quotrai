import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Lead {
  id: string;
  team_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  source: string | null;
  description: string | null;
  status: string;
  priority: string | null;
  estimated_value: number | null;
  customer_id: string | null;
  job_id: string | null;
  quote_id: string | null;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadInsert = Omit<Lead, "id" | "team_id" | "created_at" | "updated_at">;

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadInsert) => {
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...lead, team_id: teamId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead created");
    },
    onError: (e) => toast.error("Failed to create lead: " + e.message),
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated");
    },
    onError: (e) => toast.error("Failed to update lead: " + e.message),
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
    },
    onError: (e) => toast.error("Failed to delete lead: " + e.message),
  });
}
