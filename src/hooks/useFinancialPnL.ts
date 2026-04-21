import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PnLPeriod = "this_month" | "last_month" | "quarter" | "ytd" | "custom";

export interface PnLData {
  period: { from: string; to: string; label: string };
  revenue: {
    cash: number;
    billed: number;
    paymentsCount: number;
    invoicesCount: number;
  };
  costs: {
    materials: number;
    labour: number;
    labourHours: number;
    labourRate: number;
    expenses: number;
    expensesCount: number;
    total: number;
  };
  expensesByCategory: { category: string; amount: number; count: number }[];
  profit: { net: number; marginPct: number };
}

export function useFinancialPnL(period: PnLPeriod = "this_month", fromDate?: string, toDate?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["financial-pnl", period, fromDate, toDate],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("financial-pnl", {
        body: { period, fromDate, toDate },
      });
      if (error) throw error;
      return data as PnLData;
    },
  });
}
