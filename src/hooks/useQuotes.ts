import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { getCurrencyFromCountry } from "@/utils/currencyUtils";

export type Quote = Tables<"quotes"> & {
  customer: { name: string; email?: string | null; country_code?: string | null } | null;
  job: { id: string; title: string } | null;
  quote_items: Tables<"quote_items">[];
};

export type QuoteItem = Tables<"quote_items">;
export type QuoteItemInsert = Omit<TablesInsert<"quote_items">, "quote_id">;

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      // Paginated fetch to avoid the 1000-row default limit
      const PAGE_SIZE = 1000;
      let allData: Quote[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("quotes")
          .select(`
            *,
            customer:customers(name, country_code),
            job:jobs!quotes_job_id_fkey(id, title),
            quote_items(*)
          `)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        allData = allData.concat((data || []) as Quote[]);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      return allData;
    },
  });
}

export function useQuote(id: string | null) {
  return useQuery({
    queryKey: ["quotes", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          customer:customers(name, country_code),
          job:jobs!quotes_job_id_fkey(id, title),
          quote_items(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Quote;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quote,
      items,
    }: {
      quote: Omit<TablesInsert<"quotes">, "team_id" | "display_number">;
      items: QuoteItemInsert[];
    }) => {
      // Get team_id
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      // Generate quote number atomically (prevents race conditions)
      const { data: quoteNumber, error: numError } = await supabase.rpc(
        "generate_quote_number" as any,
        { p_team_id: teamId }
      );
      if (numError) throw numError;

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity || 1) * (item.unit_price || 0), 0);
      const taxRate = quote.tax_rate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      // Get customer country for currency
      const { data: customer } = await supabase
        .from("customers")
        .select("country_code")
        .eq("id", quote.customer_id)
        .single();
      const currency = getCurrencyFromCountry(customer?.country_code);

      // Create quote
      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          ...quote,
          team_id: teamId,
          display_number: quoteNumber,
          subtotal,
          tax_amount: taxAmount,
          total,
          currency,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote items
      if (items.length > 0) {
        const itemsWithQuoteId = items.map((item) => ({
          ...item,
          quote_id: newQuote.id,
          total_price: (item.quantity || 1) * (item.unit_price || 0),
        }));

        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(itemsWithQuoteId);

        if (itemsError) throw itemsError;
      }

      return newQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create quote: " + error.message);
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      quote,
      items,
    }: {
      id: string;
      quote: TablesUpdate<"quotes">;
      items: QuoteItemInsert[];
    }) => {
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity || 1) * (item.unit_price || 0), 0);
      const taxRate = quote.tax_rate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      // Update quote
      const { error: quoteError } = await supabase
        .from("quotes")
        .update({
          ...quote,
          subtotal,
          tax_amount: taxAmount,
          total,
        })
        .eq("id", id);

      if (quoteError) throw quoteError;

      // Delete existing items and recreate
      const { error: deleteError } = await supabase
        .from("quote_items")
        .delete()
        .eq("quote_id", id);

      if (deleteError) throw deleteError;

      // Create new items
      if (items.length > 0) {
        const itemsWithQuoteId = items.map((item) => ({
          ...item,
          quote_id: id,
          total_price: (item.quantity || 1) * (item.unit_price || 0),
        }));

        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(itemsWithQuoteId);

        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update quote: " + error.message);
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete items first
      const { error: itemsError } = await supabase
        .from("quote_items")
        .delete()
        .eq("quote_id", id);

      if (itemsError) throw itemsError;

      // Delete quote
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete quote: " + error.message);
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Tables<"quotes">["status"] }) => {
      const { error } = await supabase
        .from("quotes")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      // Auto-create job when quote is accepted
      if (status === "accepted") {
        try {
          const { data: quote } = await supabase
            .from("quotes")
            .select("*, customer:customers(name)")
            .eq("id", id)
            .single();

          if (quote) {
            // Check if a job already exists for THIS quote
            const { data: existingJobs } = await (supabase
              .from("jobs")
              .select("id")
              .eq("quote_id", id)
              .limit(1) as any);

            if (existingJobs && existingJobs.length > 0) {
              console.log("Job already exists for this quote, skipping auto-create");
            } else {
              const jobPayload: Record<string, unknown> = {
                title: `Job from Quote ${quote.display_number}`,
                customer_id: quote.customer_id,
                team_id: quote.team_id,
                status: "scheduled",
                estimated_value: quote.total,
                description: quote.notes || undefined,
                quote_id: id,
              };

              await (supabase.from("jobs").insert(jobPayload as any) as any);

              toast.success("Job auto-created from accepted quote");
              queryClient.invalidateQueries({ queryKey: ["jobs"] });
            }
          }
        } catch (jobErr) {
          console.warn("Auto-create job failed:", jobErr);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });
}
