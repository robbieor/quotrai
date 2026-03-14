import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, eachMonthOfInterval, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface JobStatusMetric {
  status: string;
  count: number;
  percentage: number;
}

export interface QuoteConversionMetric {
  status: string;
  count: number;
  percentage: number;
  value: number;
}

export interface TopCustomer {
  name: string;
  jobs: number;
  revenue: number;
}

export interface ReportStats {
  totalRevenue: number;
  averageJobValue: number;
  totalCustomers: number;
  jobsCompleted: number;
  outstandingTotal: number;
  outstandingPending: number;
  outstandingOverdue: number;
}

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

function getDateRangeFilter(dateRange: DateRange | undefined): DateRangeFilter {
  const now = new Date();
  if (dateRange?.from && dateRange?.to) {
    return { from: startOfDay(dateRange.from), to: endOfDay(dateRange.to) };
  }
  // Default: last 6 months
  return { from: subMonths(startOfMonth(now), 5), to: now };
}

export function useReportStats(dateRange: DateRange | undefined) {
  const filter = getDateRangeFilter(dateRange);
  
  return useQuery({
    queryKey: ["report-stats", filter.from.toISOString(), filter.to.toISOString()],
    queryFn: async (): Promise<ReportStats> => {
      const fromDate = filter.from.toISOString().split("T")[0];
      const toDate = filter.to.toISOString().split("T")[0];

      // Fetch paid invoices in date range
      const { data: paidInvoices } = await supabase
        .from("invoices")
        .select("total")
        .eq("status", "paid")
        .gte("issue_date", fromDate)
        .lte("issue_date", toDate);

      // Fetch completed jobs in date range for average value
      const { data: completedJobs } = await supabase
        .from("jobs")
        .select("estimated_value, updated_at")
        .eq("status", "completed")
        .gte("updated_at", filter.from.toISOString())
        .lte("updated_at", filter.to.toISOString());

      // Fetch customers created in date range
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .gte("created_at", filter.from.toISOString())
        .lte("created_at", filter.to.toISOString());

      // Fetch outstanding invoices (pending + overdue) - not date filtered
      const { data: outstandingInvoices } = await supabase
        .from("invoices")
        .select("total, status, due_date")
        .in("status", ["pending", "draft"]);

      const totalRevenue = paidInvoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
      
      const jobValues = completedJobs?.filter(j => j.estimated_value != null).map(j => Number(j.estimated_value)) || [];
      const averageJobValue = jobValues.length > 0 ? jobValues.reduce((a, b) => a + b, 0) / jobValues.length : 0;

      const today = new Date().toISOString().split("T")[0];
      const outstandingTotal = outstandingInvoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
      const outstandingPending = outstandingInvoices
        ?.filter(inv => inv.due_date >= today)
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
      const outstandingOverdue = outstandingInvoices
        ?.filter(inv => inv.due_date < today)
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;

      return {
        totalRevenue,
        averageJobValue,
        totalCustomers: customers?.length || 0,
        jobsCompleted: completedJobs?.length || 0,
        outstandingTotal,
        outstandingPending,
        outstandingOverdue,
      };
    },
  });
}

export function useMonthlyRevenue(dateRange: DateRange | undefined) {
  const filter = getDateRangeFilter(dateRange);
  
  return useQuery({
    queryKey: ["monthly-revenue", filter.from.toISOString(), filter.to.toISOString()],
    queryFn: async (): Promise<MonthlyRevenue[]> => {
      // Get all months in the range
      const months = eachMonthOfInterval({ start: filter.from, end: filter.to });
      const result: MonthlyRevenue[] = [];

      for (const monthDate of months) {
        const monthStart = startOfMonth(monthDate);
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
        
        const { data: invoices } = await supabase
          .from("invoices")
          .select("total")
          .eq("status", "paid")
          .gte("issue_date", monthStart.toISOString().split("T")[0])
          .lt("issue_date", nextMonth.toISOString().split("T")[0]);

        const revenue = invoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
        
        result.push({
          month: format(monthDate, "MMM yy"),
          revenue,
        });
      }

      return result;
    },
  });
}

export function useJobStatusMetrics(dateRange: DateRange | undefined) {
  const filter = getDateRangeFilter(dateRange);
  
  return useQuery({
    queryKey: ["job-status-metrics", filter.from.toISOString(), filter.to.toISOString()],
    queryFn: async (): Promise<JobStatusMetric[]> => {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("status, created_at")
        .gte("created_at", filter.from.toISOString())
        .lte("created_at", filter.to.toISOString());

      if (!jobs || jobs.length === 0) {
        return [];
      }

      const statusCounts: Record<string, number> = {};
      jobs.forEach((job) => {
        statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
      });

      const total = jobs.length;
      const statusLabels: Record<string, string> = {
        pending: "Pending",
        scheduled: "Scheduled",
        in_progress: "In Progress",
        completed: "Completed",
        cancelled: "Cancelled",
      };

      return Object.entries(statusCounts).map(([status, count]) => ({
        status: statusLabels[status] || status,
        count,
        percentage: Math.round((count / total) * 100),
      }));
    },
  });
}

export function useQuoteConversionMetrics(dateRange: DateRange | undefined) {
  const filter = getDateRangeFilter(dateRange);
  
  return useQuery({
    queryKey: ["quote-conversion-metrics", filter.from.toISOString(), filter.to.toISOString()],
    queryFn: async (): Promise<QuoteConversionMetric[]> => {
      const { data: quotes } = await supabase
        .from("quotes")
        .select("status, total, created_at")
        .gte("created_at", filter.from.toISOString())
        .lte("created_at", filter.to.toISOString());

      if (!quotes || quotes.length === 0) {
        return [];
      }

      const statusData: Record<string, { count: number; value: number }> = {};
      quotes.forEach((quote) => {
        if (!statusData[quote.status]) {
          statusData[quote.status] = { count: 0, value: 0 };
        }
        statusData[quote.status].count += 1;
        statusData[quote.status].value += Number(quote.total) || 0;
      });

      const total = quotes.length;
      const statusLabels: Record<string, string> = {
        draft: "Draft",
        sent: "Sent",
        accepted: "Accepted",
        declined: "Declined",
      };

      return Object.entries(statusData).map(([status, data]) => ({
        status: statusLabels[status] || status,
        count: data.count,
        percentage: Math.round((data.count / total) * 100),
        value: data.value,
      }));
    },
  });
}

export function useTopCustomers(dateRange: DateRange | undefined) {
  const filter = getDateRangeFilter(dateRange);
  
  return useQuery({
    queryKey: ["top-customers", filter.from.toISOString(), filter.to.toISOString()],
    queryFn: async (): Promise<TopCustomer[]> => {
      // Get all customers
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name");

      if (!customers || customers.length === 0) {
        return [];
      }

      // Get jobs in date range
      const { data: jobs } = await supabase
        .from("jobs")
        .select("customer_id, created_at")
        .gte("created_at", filter.from.toISOString())
        .lte("created_at", filter.to.toISOString());

      // Get paid invoices in date range
      const { data: invoices } = await supabase
        .from("invoices")
        .select("customer_id, total, issue_date")
        .eq("status", "paid")
        .gte("issue_date", filter.from.toISOString().split("T")[0])
        .lte("issue_date", filter.to.toISOString().split("T")[0]);

      const customerStats: Record<string, { name: string; jobs: number; revenue: number }> = {};

      customers.forEach((customer) => {
        customerStats[customer.id] = {
          name: customer.name,
          jobs: 0,
          revenue: 0,
        };
      });

      jobs?.forEach((job) => {
        if (customerStats[job.customer_id]) {
          customerStats[job.customer_id].jobs += 1;
        }
      });

      invoices?.forEach((invoice) => {
        if (customerStats[invoice.customer_id]) {
          customerStats[invoice.customer_id].revenue += Number(invoice.total) || 0;
        }
      });

      return Object.values(customerStats)
        .filter((c) => c.jobs > 0 || c.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });
}
