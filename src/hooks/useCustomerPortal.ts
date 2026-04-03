import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerPortalData {
  customer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  quotes: Array<{
    id: string;
    display_number: string;
    status: string;
    total: number;
    valid_until: string | null;
    created_at: string;
  }>;
  invoices: Array<{
    id: string;
    display_number: string;
    status: string;
    total: number;
    balance_due: number;
    due_date: string;
    created_at: string;
    portal_token: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string | null;
    display_number: string;
  }>;
}

export function useCustomerPortalData() {
  return useQuery({
    queryKey: ["customer-portal-data"],
    queryFn: async () => {
      // Get customer account for current user
      const { data: account, error: accountError } = await supabase
        .from("customer_accounts")
        .select("customer_id, customers(id, name, email)")
        .single();

      if (accountError) throw accountError;

      const customerId = account.customer_id;

      // Fetch quotes, invoices, and payments in parallel
      const [quotesRes, invoicesRes] = await Promise.all([
        supabase
          .from("quotes")
          .select("id, display_number, status, total, valid_until, created_at")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("id, display_number, status, total, balance_due, due_date, created_at, portal_token")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
      ]);

      if (quotesRes.error) throw quotesRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      // Get invoice IDs to fetch payments
      const invoiceIds = invoicesRes.data?.map((i) => i.id) || [];
      
      let payments: CustomerPortalData["payments"] = [];
      if (invoiceIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("id, amount, payment_date, payment_method, invoice_id")
          .in("invoice_id", invoiceIds)
          .order("payment_date", { ascending: false });

        if (paymentsError) throw paymentsError;

        // Map payments with invoice numbers
        const invoiceMap = new Map(invoicesRes.data?.map((i) => [i.id, i.display_number]));
        payments = (paymentsData || []).map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          payment_date: p.payment_date,
          payment_method: p.payment_method,
          display_number: invoiceMap.get(p.invoice_id) || "",
        }));
      }

      return {
        customer: account.customers as CustomerPortalData["customer"],
        quotes: (quotesRes.data || []).map((q) => ({ ...q, total: Number(q.total) })),
        invoices: (invoicesRes.data || []).map((i) => ({ ...i, total: Number(i.total), balance_due: Number((i as any).balance_due ?? i.total) })),
        payments,
      } as CustomerPortalData;
    },
  });
}

export function useIsCustomer() {
  return useQuery({
    queryKey: ["is-customer"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_customer");
      if (error) throw error;
      return data as boolean;
    },
  });
}
