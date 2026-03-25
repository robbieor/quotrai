import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PortalQuote {
  id: string;
  display_number: string;
  status: string;
  valid_until: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  team: {
    name: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export interface PortalInvoice {
  id: string;
  display_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  team: {
    name: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export function usePortalQuote(token: string | null) {
  return useQuery({
    queryKey: ["portal-quote", token],
    queryFn: async (): Promise<PortalQuote | null> => {
      if (!token) return null;

      const { data, error } = await supabase.rpc("get_quote_by_portal_token", {
        token,
      });

      if (error) throw error;
      return data as unknown as PortalQuote | null;
    },
    enabled: !!token,
  });
}

export function usePortalInvoice(token: string | null) {
  return useQuery({
    queryKey: ["portal-invoice", token],
    queryFn: async (): Promise<PortalInvoice | null> => {
      if (!token) return null;

      const { data, error } = await supabase.rpc("get_invoice_by_portal_token", {
        token,
      });

      if (error) throw error;
      return data as unknown as PortalInvoice | null;
    },
    enabled: !!token,
  });
}

export function useAcceptQuoteFromPortal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("accept_quote_from_portal", {
        token,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; quote_id?: string; invoice_number?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to accept quote");
      }

      // Send notification email (fire and forget - don't block on this)
      if (result.quote_id) {
        supabase.functions.invoke("send-quote-notification", {
          body: {
            quoteId: result.quote_id,
            action: "accepted",
            invoiceNumber: result.invoice_number,
          },
        }).catch((err) => console.error("Failed to send notification:", err));
      }
      
      return result;
    },
    onSuccess: (data, token) => {
      queryClient.invalidateQueries({ queryKey: ["portal-quote", token] });
      toast.success(`Quote accepted! Invoice ${data.invoice_number} has been created.`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeclineQuoteFromPortal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, reason }: { token: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("decline_quote_from_portal", {
        token,
        decline_reason: reason || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; quote_id?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to decline quote");
      }

      // Send notification email (fire and forget - don't block on this)
      if (result.quote_id) {
        supabase.functions.invoke("send-quote-notification", {
          body: {
            quoteId: result.quote_id,
            action: "declined",
            declineReason: reason,
          },
        }).catch((err) => console.error("Failed to send notification:", err));
      }
      
      return result;
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ["portal-quote", token] });
      toast.success("Quote has been declined");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
