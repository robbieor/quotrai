import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format, addDays, differenceInDays } from "date-fns";

export interface DashboardMetrics {
  activeJobs: number;
  activeJobsTrend: number;
  revenueMTD: number;
  revenueGoal: number;
  outstandingAmount: number;
  outstandingCount: number;
  pendingQuotesAmount: number;
  pendingQuotesCount: number;
}

export interface JobDueThisWeek {
  id: string;
  client: string;
  job: string;
  date: string;
  value: number | null;
}

export interface OverdueInvoice {
  id: string;
  client: string;
  invoiceNumber: string;
  amount: number;
  daysOverdue: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
}

export interface JobStatusData {
  status: string;
  count: number;
  color: string;
}

export interface RecentActivity {
  id: string;
  type: "job_created" | "invoice_sent" | "payment_received" | "quote_sent";
  description: string;
  timestamp: string;
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastWeekStart = addDays(now, -7);
      const weekEnd = addDays(now, 7);

      const [jobsResult, quotesResult, invoicesResult] = await Promise.all([
        supabase.from("jobs").select("id, status, scheduled_date, created_at"),
        supabase.from("quotes").select("id, status, total"),
        supabase.from("invoices").select("id, status, total, due_date, issue_date"),
      ]);

      if (jobsResult.error) throw jobsResult.error;
      if (quotesResult.error) throw quotesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;

      const jobs = jobsResult.data || [];
      const quotes = quotesResult.data || [];
      const invoices = invoicesResult.data || [];

      // Active jobs (pending, scheduled, in_progress)
      const activeJobs = jobs.filter((j) =>
        ["pending", "scheduled", "in_progress"].includes(j.status)
      );

      // Jobs created this week vs last week for trend
      const jobsThisWeek = jobs.filter((j) => {
        const created = new Date(j.created_at);
        return created >= lastWeekStart;
      });
      const jobsLastWeek = jobs.filter((j) => {
        const created = new Date(j.created_at);
        return created >= addDays(lastWeekStart, -7) && created < lastWeekStart;
      });
      const activeJobsTrend = jobsThisWeek.length - jobsLastWeek.length;

      // Revenue MTD from paid invoices
      const paidInvoicesThisMonth = invoices.filter((inv) => {
        if (inv.status !== "paid") return false;
        const issueDate = new Date(inv.issue_date);
        return issueDate >= monthStart && issueDate <= monthEnd;
      });
      const revenueMTD = paidInvoicesThisMonth.reduce(
        (sum, inv) => sum + (Number(inv.total) || 0),
        0
      );

      // Outstanding invoices (pending or overdue but not paid)
      const outstandingInvoices = invoices.filter((inv) =>
        ["pending", "overdue"].includes(inv.status)
      );
      const outstandingAmount = outstandingInvoices.reduce(
        (sum, inv) => sum + (Number(inv.total) || 0),
        0
      );

      // Pending quotes
      const pendingQuotes = quotes.filter((q) => q.status === "sent");
      const pendingQuotesAmount = pendingQuotes.reduce(
        (sum, q) => sum + (Number(q.total) || 0),
        0
      );

      // Revenue goal - estimate based on last 3 months average
      const threeMonthsAgo = subMonths(monthStart, 3);
      const pastPaidInvoices = invoices.filter((inv) => {
        if (inv.status !== "paid") return false;
        const issueDate = new Date(inv.issue_date);
        return issueDate >= threeMonthsAgo && issueDate < monthStart;
      });
      const pastRevenue = pastPaidInvoices.reduce(
        (sum, inv) => sum + (Number(inv.total) || 0),
        0
      );
      const revenueGoal = Math.max(pastRevenue / 3, revenueMTD * 1.2, 10000);

      return {
        activeJobs: activeJobs.length,
        activeJobsTrend,
        revenueMTD,
        revenueGoal,
        outstandingAmount,
        outstandingCount: outstandingInvoices.length,
        pendingQuotesAmount,
        pendingQuotesCount: pendingQuotes.length,
      } as DashboardMetrics;
    },
  });
}

export function useJobsDueThisWeek() {
  return useQuery({
    queryKey: ["dashboard-jobs-due-week"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          scheduled_date,
          estimated_value,
          customer:customers(name)
        `)
        .gte("scheduled_date", today)
        .lte("scheduled_date", nextWeek)
        .in("status", ["pending", "scheduled", "in_progress"])
        .order("scheduled_date", { ascending: true })
        .limit(10);

      if (error) throw error;

      return (data || []).map((job) => ({
        id: job.id,
        client: (job.customer as { name: string } | null)?.name || "Unknown",
        job: job.title,
        date: job.scheduled_date,
        value: job.estimated_value,
      })) as JobDueThisWeek[];
    },
  });
}

export function useOverdueInvoices() {
  return useQuery({
    queryKey: ["dashboard-overdue-invoices"],
    queryFn: async () => {
      const today = new Date();

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          total,
          due_date,
          customer:customers(name)
        `)
        .in("status", ["pending", "overdue"])
        .lt("due_date", format(today, "yyyy-MM-dd"))
        .order("due_date", { ascending: true })
        .limit(10);

      if (error) throw error;

      return (data || []).map((inv) => ({
        id: inv.id,
        client: (inv.customer as { name: string } | null)?.name || "Unknown",
        invoiceNumber: inv.invoice_number,
        amount: Number(inv.total) || 0,
        daysOverdue: differenceInDays(today, new Date(inv.due_date)),
      })) as OverdueInvoice[];
    },
  });
}

export function useRevenueChart() {
  return useQuery({
    queryKey: ["dashboard-revenue-chart"],
    queryFn: async () => {
      const now = new Date();
      const sixMonthsAgo = subMonths(startOfMonth(now), 5);

      const { data, error } = await supabase
        .from("invoices")
        .select("total, issue_date")
        .eq("status", "paid")
        .gte("issue_date", format(sixMonthsAgo, "yyyy-MM-dd"));

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, number> = {};
      for (let i = 0; i < 6; i++) {
        const month = subMonths(now, 5 - i);
        const key = format(month, "MMM");
        monthlyData[key] = 0;
      }

      (data || []).forEach((inv) => {
        const month = format(new Date(inv.issue_date), "MMM");
        if (month in monthlyData) {
          monthlyData[month] += Number(inv.total) || 0;
        }
      });

      return Object.entries(monthlyData).map(([month, revenue]) => ({
        month,
        revenue,
      })) as RevenueDataPoint[];
    },
  });
}

export function useJobStatusChart() {
  return useQuery({
    queryKey: ["dashboard-job-status-chart"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("status");

      if (error) throw error;

      const statusCounts: Record<string, number> = {};
      (data || []).forEach((job) => {
        statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
      });

      const statusColors: Record<string, string> = {
        scheduled: "hsl(221, 83%, 53%)",
        in_progress: "hsl(38, 92%, 50%)",
        completed: "hsl(142, 71%, 45%)",
        pending: "hsl(262, 83%, 58%)",
        cancelled: "hsl(0, 84%, 60%)",
      };

      const statusLabels: Record<string, string> = {
        scheduled: "Scheduled",
        in_progress: "In Progress",
        completed: "Completed",
        pending: "Pending",
        cancelled: "Cancelled",
      };

      return Object.entries(statusCounts).map(([status, count]) => ({
        status: statusLabels[status] || status,
        count,
        color: statusColors[status] || "hsl(220, 9%, 46%)",
      })) as JobStatusData[];
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["dashboard-recent-activity"],
    queryFn: async () => {
      const sevenDaysAgo = format(addDays(new Date(), -7), "yyyy-MM-dd");

      const [jobsResult, invoicesResult, quotesResult, paymentsResult] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, title, created_at, customer:customers(name)")
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("invoices")
          .select("id, display_number, created_at, status, customer:customers(name)")
          .in("status", ["pending", "overdue"])
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("quotes")
          .select("id, display_number, created_at, status, customer:customers(name)")
          .eq("status", "sent")
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("payments")
          .select("id, amount, created_at, invoice:invoices(display_number, customer:customers(name))")
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const activities: RecentActivity[] = [];

      // Add jobs
      (jobsResult.data || []).forEach((job) => {
        activities.push({
          id: `job-${job.id}`,
          type: "job_created",
          description: `Job "${job.title}" created for ${(job.customer as { name: string } | null)?.name || "Unknown"}`,
          timestamp: job.created_at,
        });
      });

      // Add invoices
      (invoicesResult.data || []).forEach((inv: any) => {
        activities.push({
          id: `invoice-${inv.id}`,
          type: "invoice_sent",
          description: `Invoice ${inv.display_number} sent to ${inv.customer?.name || "Unknown"}`,
          timestamp: inv.created_at,
        });
      });

      // Add quotes
      (quotesResult.data || []).forEach((quote: any) => {
        activities.push({
          id: `quote-${quote.id}`,
          type: "quote_sent",
          description: `Quote ${quote.display_number} sent to ${quote.customer?.name || "Unknown"}`,
          timestamp: quote.created_at,
        });
      });

      // Add payments
      (paymentsResult.data || []).forEach((payment: any) => {
        const invoice = payment.invoice as { display_number: string; customer: { name: string } | null } | null;
        activities.push({
          id: `payment-${payment.id}`,
          type: "payment_received",
          description: `Payment of ${Number(payment.amount).toLocaleString()} received for ${invoice?.display_number || "invoice"}`,
          timestamp: payment.created_at,
        });
      });

      // Sort by timestamp and take top 10
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
  });
}
