import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Payment {
  id: string;
  invoice_id: string;
  team_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert {
  invoice_id: string;
  amount: number;
  payment_date?: string;
  payment_method?: string | null;
  notes?: string | null;
}

export function usePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!invoiceId,
  });
}

export function useCreatePayment(onXeroSync?: (id: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      const { data, error } = await supabase
        .from("payments")
        .insert({ ...payment, team_id: teamId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments", data.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Payment recorded successfully");
      onXeroSync?.(data.id);
    },
    onError: (error) => {
      toast.error("Failed to record payment: " + error.message);
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
      return { invoiceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments", data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete payment: " + error.message);
    },
  });
}

export function useTotalPaid(invoiceId: string | undefined) {
  const { data: payments } = usePayments(invoiceId);
  
  const totalPaid = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  
  return totalPaid;
}
