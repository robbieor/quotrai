import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, eachMonthOfInterval, format, startOfDay, endOfDay, subMonths } from "date-fns";
import { DateRange } from "react-day-picker";

export interface RevenueVsExpense {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface QuoteFunnelStage {
  stage: string;
  count: number;
  value: number;
  percentage: number;
}

export interface JobPerformanceMetric {
  metric: string;
  value: number;
  fullMark: number;
}

export interface MonthlyJobTrend {
  month: string;
  completed: number;
  cancelled: number;
  inProgress: number;
}

function getDateRangeFilter(dateRange: DateRange | undefined) {
  const now = new Date();
  if (dateRange?.from && dateRange?.to) {
    return { from: startOfDay(dateRange.from), to: endOfDay(dateRange.to) };
  }
  return { from: subMonths(startOfMonth(now), 5), to: now };
}

export function useRevenueVsExpenses(dateRange: DateRange | undefined) {
  const filter = getDateRangeFilter(dateRange);

  return useQuery({
    queryKey: ["revenue-vs-expenses", filter.from.toISOString(), filter.to.toISOString()],
    queryFn: async (): Promise<RevenueVsExpense[]> => {
      const months = eachMonthOfInterval({ start: filter.from, end: filter.to });
      const result: RevenueVsExpense[] = [];

      for (const monthDate of months) {
        const monthStart = startOfMonth(monthDate);
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

        // Get revenue from paid invoices
        const { data: invoices } = await supabase
          .from("invoices")
          .select("total")
          .eq("status", "paid")
          .gte("issue_date", monthStart.toISOString().split("T")[0])
          .lt("issue_date", nextMonth.toISOString().split("T")[0]);

        // Get expenses
        const { data: expenses } = await supabase
          .from("expenses")
          .select("amount")
          .gte("expense_date", monthStart.toISOString().split("T")[0])
          .lt("expense_date", nextMonth.toISOString().split("T")[0]);

        const revenue = invoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
        const expenseTotal = expenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0;

        result.push({
          month: format(monthDate, "MMM yy"),
          revenue,
          expenses: expenseTotal,
          profit: revenue - expenseTotal,
        });
      }

      return result;
    },
  });
}

export function useQuoteFunnel(dateRange: DateRange | undefined) {
  const filter = getDateRangeFilter(dateRange);

  return useQuery({
    queryKey: ["quote-funnel", filter.from.toISOString(), filter.to.toISOString()],
    queryFn: async (): Promise<QuoteFunnelStage[]> => {
      const { data: quotes } = await supabase
        .from("quotes")
        .select("status, total")
        .gte("created_at", filter.from.toISOString())
        .lte("created_at", filter.to.toISOString());

      if (!quotes || quotes.length === 0) {
        return [];
      }

      const statusOrder = ["draft", "sent", "accepted"];
      const statusLabels: Record<string, string> = {
        draft: "Created",
        sent: "Sent to Client",
        accepted: "Won",
      };

      const totals: Record<string, { count: number; value: number }> = {
        draft: { count: 0, value: 0 },
        sent: { count: 0, value: 0 },
        accepted: { count: 0, value: 0 },
      };

      // Count cumulative (all quotes start as draft, some progress to sent, fewer to accepted)
      quotes.forEach((quote) => {
        const value = Number(quote.total) || 0;
        // All quotes count in "Created"
        totals.draft.count += 1;
        totals.draft.value += value;
        
        // Sent and accepted count in "Sent"
        if (quote.status === "sent" || quote.status === "accepted") {
          totals.sent.count += 1;
          totals.sent.value += value;
        }
        
        // Only accepted count in "Won"
        if (quote.status === "accepted") {
          totals.accepted.count += 1;
          totals.accepted.value += value;
        }
      });

      const maxCount = totals.draft.count || 1;

      return statusOrder.map((status) => ({
        stage: statusLabels[status],
        count: totals[status].count,
        value: totals[status].value,
        percentage: Math.round((totals[status].count / maxCount) * 100),
      }));
    },
  });
}

export function useJobPerformance(dateRange: DateRange | undefined) {
  const filter = getDateRangeFilter(dateRange);

  return useQuery({
    queryKey: ["job-performance", filter.from.toISOString(), filter.to.toISOString()],
    queryFn: async (): Promise<JobPerformanceMetric[]> => {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("status, estimated_value, created_at")
        .gte("created_at", filter.from.toISOString())
        .lte("created_at", filter.to.toISOString());

      if (!jobs || jobs.length === 0) {
        return [];
      }

      const total = jobs.length;
      const completed = jobs.filter((j) => j.status === "completed").length;
      const scheduled = jobs.filter((j) => j.status === "scheduled").length;
      const inProgress = jobs.filter((j) => j.status === "in_progress").length;
      const cancelled = jobs.filter((j) => j.status === "cancelled").length;
      const withValue = jobs.filter((j) => j.estimated_value != null).length;

      // Normalize to 100 scale
      return [
        { metric: "Completion Rate", value: Math.round((completed / total) * 100), fullMark: 100 },
        { metric: "Scheduling Rate", value: Math.round((scheduled / total) * 100), fullMark: 100 },
        { metric: "Active Rate", value: Math.round((inProgress / total) * 100), fullMark: 100 },
        { metric: "Value Coverage", value: Math.round((withValue / total) * 100), fullMark: 100 },
        { metric: "Success Rate", value: Math.round(((total - cancelled) / total) * 100), fullMark: 100 },
      ];
    },
  });
}

export function useMonthlyJobTrends(dateRange: DateRange | undefined) {
  const filter = getDateRangeFilter(dateRange);

  return useQuery({
    queryKey: ["monthly-job-trends", filter.from.toISOString(), filter.to.toISOString()],
    queryFn: async (): Promise<MonthlyJobTrend[]> => {
      const months = eachMonthOfInterval({ start: filter.from, end: filter.to });
      const result: MonthlyJobTrend[] = [];

      for (const monthDate of months) {
        const monthStart = startOfMonth(monthDate);
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

        const { data: jobs } = await supabase
          .from("jobs")
          .select("status")
          .gte("created_at", monthStart.toISOString())
          .lt("created_at", nextMonth.toISOString());

        const completed = jobs?.filter((j) => j.status === "completed").length || 0;
        const cancelled = jobs?.filter((j) => j.status === "cancelled").length || 0;
        const inProgress = jobs?.filter((j) => j.status === "in_progress" || j.status === "scheduled").length || 0;

        result.push({
          month: format(monthDate, "MMM yy"),
          completed,
          cancelled,
          inProgress,
        });
      }

      return result;
    },
  });
}
