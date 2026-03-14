import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecurringInvoice {
  id: string;
  team_id: string;
  customer_id: string;
  frequency: string;
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  auto_send: boolean;
  tax_rate: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer: { name: string } | null;
  recurring_invoice_items: RecurringInvoiceItem[];
}

export interface RecurringInvoiceItem {
  id: string;
  recurring_invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export function useRecurringInvoices() {
  return useQuery({
    queryKey: ["recurring-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_invoices")
        .select(`*, customer:customers(name), recurring_invoice_items(*)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RecurringInvoice[];
    },
  });
}

export function useCreateRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      schedule,
      items,
    }: {
      schedule: {
        customer_id: string;
        frequency: string;
        next_run_date: string;
        auto_send?: boolean;
        tax_rate?: number;
        notes?: string;
      };
      items: { description: string; quantity: number; unit_price: number }[];
    }) => {
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      const { data: newSchedule, error: scheduleError } = await supabase
        .from("recurring_invoices")
        .insert({ ...schedule, team_id: teamId })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      if (items.length > 0) {
        const itemsWithId = items.map((item) => ({
          ...item,
          recurring_invoice_id: newSchedule.id,
        }));
        const { error: itemsError } = await supabase
          .from("recurring_invoice_items")
          .insert(itemsWithId);
        if (itemsError) throw itemsError;
      }

      return newSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success("Recurring invoice schedule created");
    },
    onError: (error) => {
      toast.error("Failed to create schedule: " + error.message);
    },
  });
}

export function useUpdateRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      schedule,
      items,
    }: {
      id: string;
      schedule: {
        customer_id?: string;
        frequency?: string;
        next_run_date?: string;
        is_active?: boolean;
        auto_send?: boolean;
        tax_rate?: number;
        notes?: string;
      };
      items?: { description: string; quantity: number; unit_price: number }[];
    }) => {
      const { error: updateError } = await supabase
        .from("recurring_invoices")
        .update(schedule)
        .eq("id", id);

      if (updateError) throw updateError;

      if (items) {
        await supabase.from("recurring_invoice_items").delete().eq("recurring_invoice_id", id);
        if (items.length > 0) {
          const itemsWithId = items.map((item) => ({
            ...item,
            recurring_invoice_id: id,
          }));
          const { error: itemsError } = await supabase
            .from("recurring_invoice_items")
            .insert(itemsWithId);
          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success("Recurring invoice updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });
}

export function useDeleteRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success("Recurring invoice deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });
}

export function useToggleRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("recurring_invoices")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success("Schedule updated");
    },
  });
}
