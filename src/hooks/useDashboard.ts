import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, isToday, isTomorrow, addDays } from "date-fns";

export interface DashboardStats {
  activeJobsCount: number;
  jobsDueThisWeek: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  pendingQuotesCount: number;
  pendingQuotesValue: number;
  revenueThisMonth: number;
  paidInvoicesCount: number;
}

export interface RecentJob {
  id: string;
  title: string;
  customer_name: string;
  status: string;
  estimated_value: number | null;
}

export interface ScheduledJob {
  id: string;
  title: string;
  customer_name: string;
  scheduled_date: string;
  scheduled_time: string | null;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const weekEnd = addDays(now, 7);

      // Fetch all data in parallel
      const [
        jobsResult,
        customersResult,
        quotesResult,
        invoicesResult,
      ] = await Promise.all([
        supabase.from("jobs").select("id, status, scheduled_date"),
        supabase.from("customers").select("id, created_at"),
        supabase.from("quotes").select("id, status, total"),
        supabase.from("invoices").select("id, status, total, issue_date"),
      ]);

      if (jobsResult.error) throw jobsResult.error;
      if (customersResult.error) throw customersResult.error;
      if (quotesResult.error) throw quotesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;

      const jobs = jobsResult.data || [];
      const customers = customersResult.data || [];
      const quotes = quotesResult.data || [];
      const invoices = invoicesResult.data || [];

      // Calculate active jobs (pending, scheduled, in_progress)
      const activeJobs = jobs.filter((j) => 
        ["pending", "scheduled", "in_progress"].includes(j.status)
      );

      // Jobs due this week
      const jobsDueThisWeek = jobs.filter((j) => {
        if (!j.scheduled_date) return false;
        const date = new Date(j.scheduled_date);
        return date >= now && date <= weekEnd;
      });

      // New customers this month
      const newCustomersThisMonth = customers.filter((c) => {
        const created = new Date(c.created_at);
        return created >= monthStart && created <= monthEnd;
      });

      // Pending quotes and their total value
      const pendingQuotes = quotes.filter((q) => q.status === "sent");
      const pendingQuotesValue = pendingQuotes.reduce(
        (sum, q) => sum + (Number(q.total) || 0),
        0
      );

      // Paid invoices this month
      const paidInvoicesThisMonth = invoices.filter((inv) => {
        if (inv.status !== "paid") return false;
        const issueDate = new Date(inv.issue_date);
        return issueDate >= monthStart && issueDate <= monthEnd;
      });

      const revenueThisMonth = paidInvoicesThisMonth.reduce(
        (sum, inv) => sum + (Number(inv.total) || 0),
        0
      );

      return {
        activeJobsCount: activeJobs.length,
        jobsDueThisWeek: jobsDueThisWeek.length,
        totalCustomers: customers.length,
        newCustomersThisMonth: newCustomersThisMonth.length,
        pendingQuotesCount: pendingQuotes.length,
        pendingQuotesValue,
        revenueThisMonth,
        paidInvoicesCount: paidInvoicesThisMonth.length,
      } as DashboardStats;
    },
  });
}

export function useRecentJobs() {
  return useQuery({
    queryKey: ["dashboard-recent-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          status,
          estimated_value,
          customer:customers(name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map((job) => ({
        id: job.id,
        title: job.title,
        customer_name: (job.customer as { name: string } | null)?.name || "Unknown",
        status: job.status,
        estimated_value: job.estimated_value,
      })) as RecentJob[];
    },
  });
}

export function useUpcomingSchedule() {
  return useQuery({
    queryKey: ["dashboard-upcoming-schedule"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          scheduled_date,
          scheduled_time,
          customer:customers(name)
        `)
        .gte("scheduled_date", today)
        .lte("scheduled_date", nextWeek)
        .in("status", ["pending", "scheduled", "in_progress"])
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true })
        .limit(5);

      if (error) throw error;

      return (data || []).map((job) => ({
        id: job.id,
        title: job.title,
        customer_name: (job.customer as { name: string } | null)?.name || "Unknown",
        scheduled_date: job.scheduled_date,
        scheduled_time: job.scheduled_time,
      })) as ScheduledJob[];
    },
  });
}

export function formatScheduleDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

export function formatScheduleTime(timeStr: string | null): string {
  if (!timeStr) return "All day";
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}
