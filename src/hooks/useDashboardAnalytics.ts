import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { format, differenceInDays, subMonths, subDays, startOfMonth, endOfMonth, addDays } from "date-fns";

// Job type keyword matching utility
const JOB_TYPE_KEYWORDS: Record<string, string[]> = {
  "Plumbing & Heating": ["plumb", "boiler", "heating", "radiator", "pipe", "water", "leak", "tap", "shower", "bathroom"],
  "Electrical": ["electri", "wiring", "socket", "fuse", "light", "switch", "rewire", "circuit"],
  "Carpentry": ["carpent", "wood", "door", "window", "cabinet", "shelf", "deck", "fence"],
  "Painting & Decorating": ["paint", "decorat", "wallpaper", "plaster", "render"],
  "Roofing": ["roof", "gutter", "slate", "tile", "chimney", "flashing"],
  "General Maintenance": ["repair", "fix", "maintain", "service", "inspect", "general"],
  "Landscaping": ["garden", "landscape", "lawn", "tree", "paving", "driveway"],
  "HVAC": ["hvac", "air con", "ventilat", "duct", "heat pump"],
};

function matchJobType(title: string): string {
  const lower = title.toLowerCase();
  for (const [type, keywords] of Object.entries(JOB_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return "Other";
}

export function useAvailableJobTypes() {
  return Object.keys(JOB_TYPE_KEYWORDS).concat("Other");
}

export interface ControlHeaderData {
  totalOverdue: number;
  overdueCount: number;
  quotesNeedFollowUp: number;
  quotesFollowUpValue: number;
  stuckJobs: number;
  aiRecommendation: string;
}

export interface KPIData {
  cashCollectedMTD: number;
  cashCollectedCount: number;
  outstandingAR: number;
  outstandingARCount: number;
  overdue30Plus: number;
  overdue30PlusCount: number;
  revenueMTD: number;
  revenueLastMonth: number;
  revenueChangePercent: number;
  activeJobs: number;
  stuckJobs: number;
}

export interface ActionAlert {
  id: string;
  severity: "critical" | "warning" | "opportunity";
  message: string;
  value: string;
  rawValue?: number;
  isCurrency?: boolean;
  href: string;
}

export interface JobAtRisk {
  id: string;
  title: string;
  customer: string;
  status: string;
  daysInStage: number;
  value: number;
}

export interface InvoiceAtRisk {
  id: string;
  customer: string;
  totalDue: number;
  oldestInvoice: string;
  daysOverdue: number;
  riskScore: "high" | "medium" | "low";
}

export interface QuoteFunnelData {
  created: number;
  sent: number;
  won: number;
  lost: number;
  createdValue: number;
  sentValue: number;
  wonValue: number;
  lostValue: number;
  avgDaysToWin: number;
  staleQuotes: number;
}

export interface CustomerProfitData {
  id: string;
  name: string;
  revenue: number;
  jobCount: number;
  invoiceCount: number;
}

export function useDashboardAnalytics() {
  const { dateRange, customerId, staffId, jobType, segment, crossFilter, filterQueryKey } = useDashboardFilters();

  return useQuery({
    queryKey: ["dashboard-analytics", ...filterQueryKey],
    queryFn: async () => {
      const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
      const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

      let jobsQuery = supabase.from("jobs").select("id, title, status, scheduled_date, created_at, updated_at, estimated_value, customer_id, customer:customers(name)");
      let invoicesQuery = supabase.from("invoices").select("id, invoice_number, status, total, balance_due, issue_date, due_date, customer_id, customer:customers(name)");
      let quotesQuery = supabase.from("quotes").select("id, quote_number, status, total, created_at, updated_at, customer_id, customer:customers(name)");
      let paymentsQuery = supabase.from("payments").select("id, amount, payment_date, created_at, invoice_id, invoice:invoices(invoice_number, customer_id, issue_date, customer:customers(name))");

      if (fromDate) {
        jobsQuery = jobsQuery.gte("created_at", fromDate);
        invoicesQuery = invoicesQuery.gte("issue_date", fromDate);
        quotesQuery = quotesQuery.gte("created_at", fromDate);
        paymentsQuery = paymentsQuery.gte("payment_date", fromDate);
      }
      if (toDate) {
        jobsQuery = jobsQuery.lte("created_at", `${toDate}T23:59:59`);
        invoicesQuery = invoicesQuery.lte("issue_date", toDate);
        quotesQuery = quotesQuery.lte("created_at", `${toDate}T23:59:59`);
        paymentsQuery = paymentsQuery.lte("payment_date", toDate);
      }
      if (customerId) {
        jobsQuery = jobsQuery.eq("customer_id", customerId);
        invoicesQuery = invoicesQuery.eq("customer_id", customerId);
        quotesQuery = quotesQuery.eq("customer_id", customerId);
      }

      let staffJobIds: Set<string> | null = null;
      if (staffId && staffId !== "all" && staffId !== "overloaded" && staffId !== "underperforming") {
        const { data: timeEntries } = await supabase
          .from("time_entries").select("job_id").eq("user_id", staffId);
        staffJobIds = new Set((timeEntries || []).map((te: any) => te.job_id).filter(Boolean));
      }

      const [jobsResult, invoicesResult, quotesResult, paymentsResult] = await Promise.all([
        jobsQuery, invoicesQuery, quotesQuery, paymentsQuery,
      ]);

      if (jobsResult.error) throw jobsResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (quotesResult.error) throw quotesResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      let jobs = (jobsResult.data || []) as any[];
      let invoices = (invoicesResult.data || []) as any[];
      let quotes = (quotesResult.data || []) as any[];
      let payments = (paymentsResult.data || []) as any[];

      if (jobType) {
        jobs = jobs.filter((j) => matchJobType(j.title) === jobType);
      }
      if (staffJobIds) {
        jobs = jobs.filter((j) => staffJobIds!.has(j.id));
      }
      if (crossFilter) {
        if (crossFilter.dimension === "month") {
          jobs = jobs.filter((j) => format(new Date(j.created_at), "MMM yy") === crossFilter.value);
          invoices = invoices.filter((i) => format(new Date(i.issue_date), "MMM yy") === crossFilter.value);
          quotes = quotes.filter((q) => format(new Date(q.created_at), "MMM yy") === crossFilter.value);
        } else if (crossFilter.dimension === "jobStatus") {
          jobs = jobs.filter((j) => j.status === crossFilter.value);
        } else if (crossFilter.dimension === "customer") {
          const cid = crossFilter.value;
          jobs = jobs.filter((j) => j.customer_id === cid);
          invoices = invoices.filter((i) => i.customer_id === cid);
          quotes = quotes.filter((q) => q.customer_id === cid);
        }
      }

      // === SEGMENT FILTERING (production-grade logic) ===
      const now = new Date();
      if (segment === "high_risk") {
        // High Risk = overdue 30+ days OR balance_due > 1000 OR stuck jobs 7+ days
        // Build set of high-risk customer IDs
        const highRiskCustomerIds = new Set<string>();

        // Invoices: overdue 30+ OR high balance
        invoices.forEach((i) => {
          const balanceDue = Number(i.balance_due) || (Number(i.total) || 0);
          const daysOverdue = differenceInDays(now, new Date(i.due_date));
          if (balanceDue > 0 && (daysOverdue > 30 || balanceDue > 1000)) {
            highRiskCustomerIds.add(i.customer_id);
          }
        });

        // Jobs: stuck 7+ days
        jobs.forEach((j) => {
          if (["pending", "scheduled", "in_progress"].includes(j.status)) {
            if (differenceInDays(now, new Date(j.updated_at || j.created_at)) > 7) {
              highRiskCustomerIds.add(j.customer_id);
            }
          }
        });

        // Filter ALL datasets to high-risk customers
        jobs = jobs.filter((j) => highRiskCustomerIds.has(j.customer_id));
        invoices = invoices.filter((i) => highRiskCustomerIds.has(i.customer_id));
        quotes = quotes.filter((q) => highRiskCustomerIds.has(q.customer_id));
        payments = payments.filter((p) => {
          const inv = p.invoice as any;
          return inv && highRiskCustomerIds.has(inv.customer_id);
        });

      } else if (segment === "top_customers") {
        // Top Customers = by collected cash (payments), not invoiced
        // Sum payments per customer
        const cashByCustomer: Record<string, number> = {};
        payments.forEach((p) => {
          const inv = p.invoice as any;
          if (inv?.customer_id) {
            cashByCustomer[inv.customer_id] = (cashByCustomer[inv.customer_id] || 0) + (Number(p.amount) || 0);
          }
        });

        // Take top 10 or top 20% (whichever is more)
        const sorted = Object.entries(cashByCustomer).sort((a, b) => b[1] - a[1]);
        const cutoff = Math.max(10, Math.ceil(sorted.length * 0.2));
        const topSet = new Set(sorted.slice(0, cutoff).map(([id]) => id));

        jobs = jobs.filter((j) => topSet.has(j.customer_id));
        invoices = invoices.filter((i) => topSet.has(i.customer_id));
        quotes = quotes.filter((q) => topSet.has(q.customer_id));
        payments = payments.filter((p) => {
          const inv = p.invoice as any;
          return inv && topSet.has(inv.customer_id);
        });

      } else if (segment === "jobs_at_risk") {
        // Jobs at Risk = stuck 7+ days, OR nearing deadline (within 3 days), OR stale 14+ days
        const atRiskJobIds = new Set<string>();
        const atRiskCustomerIds = new Set<string>();

        jobs.forEach((j) => {
          if (!["pending", "scheduled", "in_progress"].includes(j.status)) return;
          const daysSinceUpdate = differenceInDays(now, new Date(j.updated_at || j.created_at));
          const deadlineImminent = j.scheduled_date && differenceInDays(new Date(j.scheduled_date), now) <= 3 && differenceInDays(new Date(j.scheduled_date), now) >= 0;

          if (daysSinceUpdate > 7 || deadlineImminent) {
            atRiskJobIds.add(j.id);
            atRiskCustomerIds.add(j.customer_id);
          }
        });

        jobs = jobs.filter((j) => atRiskJobIds.has(j.id));
        // Also filter invoices/quotes to these customers for context
        invoices = invoices.filter((i) => atRiskCustomerIds.has(i.customer_id));
        quotes = quotes.filter((q) => atRiskCustomerIds.has(q.customer_id));

      } else if (segment === "recent") {
        // Recent Activity = last 7 days of meaningful changes
        const sevenDaysAgo = subDays(now, 7);
        jobs = jobs.filter((j) => new Date(j.created_at) >= sevenDaysAgo || new Date(j.updated_at || j.created_at) >= sevenDaysAgo);
        invoices = invoices.filter((i) => new Date(i.issue_date) >= sevenDaysAgo);
        quotes = quotes.filter((q) => new Date(q.created_at) >= sevenDaysAgo);
        payments = payments.filter((p) => new Date(p.payment_date || p.created_at) >= sevenDaysAgo);
      }


      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // === CORE METRICS ===
      const activeJobs = jobs.filter((j) => ["pending", "scheduled", "in_progress"].includes(j.status));
      const paidInvoices = invoices.filter((i) => i.status === "paid");
      const outstandingInvoices = invoices.filter((i) => ["pending", "overdue"].includes(i.status));

      // Build payment totals per invoice for accurate balance_due
      const paymentsByInvoice: Record<string, number> = {};
      payments.forEach((p) => {
        const iid = p.invoice_id;
        paymentsByInvoice[iid] = (paymentsByInvoice[iid] || 0) + (Number(p.amount) || 0);
      });

      // Outstanding AR = total - payments received (accounts for partial payments)
      const outstandingAmount = outstandingInvoices.reduce((s, i) => {
        const paid = paymentsByInvoice[i.id] || 0;
        return s + Math.max(0, (Number(i.total) || 0) - paid);
      }, 0);

      // Cash collected MTD (payments this month)
      const paymentsMTD = payments.filter((p) => {
        const d = new Date(p.payment_date || p.created_at);
        return d >= monthStart && d <= monthEnd;
      });
      const cashCollectedMTD = paymentsMTD.reduce((s, p) => s + (Number(p.amount) || 0), 0);

      // Revenue MTD (invoiced this month — all non-cancelled/draft invoices by issue_date)
      const invoicedThisMonth = invoices.filter((i) => {
        if (["cancelled", "draft"].includes(i.status)) return false;
        const d = new Date(i.issue_date);
        return d >= monthStart && d <= monthEnd;
      });
      const revenueMTD = invoicedThisMonth.reduce((s, i) => s + (Number(i.total) || 0), 0);

      // Revenue last month (same logic)
      const invoicedLastMonth = invoices.filter((i) => {
        if (["cancelled", "draft"].includes(i.status)) return false;
        const d = new Date(i.issue_date);
        return d >= lastMonthStart && d <= lastMonthEnd;
      });
      const revenueLastMonth = invoicedLastMonth.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const revenueChangePercent = revenueLastMonth > 0
        ? ((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100
        : revenueMTD > 0 ? 100 : 0;

      // 30+ day overdue (using balance_due, not total)
      const overdue30Plus = outstandingInvoices.filter((i) => differenceInDays(now, new Date(i.due_date)) > 30);
      const overdue30PlusAmount = overdue30Plus.reduce((s, i) => {
        const paid = paymentsByInvoice[i.id] || 0;
        return s + Math.max(0, (Number(i.total) || 0) - paid);
      }, 0);

      // All overdue (balance_due aware)
      const allOverdue = outstandingInvoices.filter((i) => {
        const balanceDue = Math.max(0, (Number(i.total) || 0) - (paymentsByInvoice[i.id] || 0));
        return differenceInDays(now, new Date(i.due_date)) > 0 && balanceDue > 0;
      });
      const totalOverdue = allOverdue.reduce((s, i) => {
        const paid = paymentsByInvoice[i.id] || 0;
        return s + Math.max(0, (Number(i.total) || 0) - paid);
      }, 0);

      // Stuck jobs (using updated_at for actual stage duration, not created_at)
      const stuckJobs = activeJobs.filter((j) => {
        const daysSinceUpdate = differenceInDays(now, new Date(j.updated_at || j.created_at));
        return daysSinceUpdate > 7;
      });

      // Quotes needing follow-up (sent > 7 days ago — uses "declined" not "rejected")
      const staleQuotes = quotes.filter((q) => {
        if (q.status !== "sent") return false;
        return differenceInDays(now, new Date(q.created_at)) > 7;
      });
      const staleQuotesValue = staleQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);

      // Pending quotes
      const pendingQuotes = quotes.filter((q) => q.status === "sent");
      const pendingQuotesAmount = pendingQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);

      // Revenue goal
      const threeMonthsAgo = subMonths(monthStart, 3);
      const pastPaid = invoices.filter((inv) => {
        if (inv.status !== "paid") return false;
        const d = new Date(inv.issue_date);
        return d >= threeMonthsAgo && d < monthStart;
      });
      const pastRevenue = pastPaid.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const revenueGoal = Math.max(pastRevenue / 3, revenueMTD * 1.2, 1);

      // Job trend
      const lastWeekStart = addDays(now, -7);
      const jobsThisWeek = jobs.filter((j) => new Date(j.created_at) >= lastWeekStart).length;
      const jobsLastWeek = jobs.filter((j) => {
        const d = new Date(j.created_at);
        return d >= addDays(lastWeekStart, -7) && d < lastWeekStart;
      }).length;

      // === CONTROL HEADER ===
      let aiRecommendation = "All clear — keep going.";
      if (totalOverdue > 0 && staleQuotes.length > 0) {
        aiRecommendation = "Chase overdue invoices and follow up on stale quotes to recover cash flow.";
      } else if (totalOverdue > 0) {
        aiRecommendation = `You have uncollected cash — send reminders on ${allOverdue.length} overdue invoice${allOverdue.length > 1 ? "s" : ""}.`;
      } else if (staleQuotes.length > 0) {
        aiRecommendation = `${staleQuotes.length} quote${staleQuotes.length > 1 ? "s" : ""} sent over a week ago with no response — follow up today.`;
      } else if (stuckJobs.length > 0) {
        aiRecommendation = `${stuckJobs.length} job${stuckJobs.length > 1 ? "s" : ""} haven't progressed in 7+ days — check in with your team.`;
      }

      const controlHeader: ControlHeaderData = {
        totalOverdue,
        overdueCount: allOverdue.length,
        quotesNeedFollowUp: staleQuotes.length,
        quotesFollowUpValue: staleQuotesValue,
        stuckJobs: stuckJobs.length,
        aiRecommendation,
      };

      // === KPI DATA ===
      const kpi: KPIData = {
        cashCollectedMTD,
        cashCollectedCount: paymentsMTD.length,
        outstandingAR: outstandingAmount,
        outstandingARCount: outstandingInvoices.length,
        overdue30Plus: overdue30PlusAmount,
        overdue30PlusCount: overdue30Plus.length,
        revenueMTD,
        revenueLastMonth,
        revenueChangePercent,
        activeJobs: activeJobs.length,
        stuckJobs: stuckJobs.length,
      };

      // === ACTION ALERTS ===
      const actionAlerts: ActionAlert[] = [];

      if (overdue30Plus.length > 0) {
        actionAlerts.push({
          id: "critical-overdue-30",
          severity: "critical",
          message: `${overdue30Plus.length} invoice${overdue30Plus.length > 1 ? "s" : ""} overdue 30+ days`,
          value: "",
          rawValue: overdue30PlusAmount,
          isCurrency: true,
          href: "/invoices?status=overdue",
        });
      }

      const overdue60 = outstandingInvoices.filter((i) => differenceInDays(now, new Date(i.due_date)) > 60);
      if (overdue60.length > 0) {
        const overdue60Amount = overdue60.reduce((s, i) => s + (Number(i.total) || 0), 0);
        actionAlerts.push({
          id: "critical-overdue-60",
          severity: "critical",
          message: `${overdue60.length} invoice${overdue60.length > 1 ? "s" : ""} overdue 60+ days — escalate`,
          value: "",
          rawValue: overdue60Amount,
          isCurrency: true,
          href: "/invoices?status=overdue",
        });
      }

      if (staleQuotes.length > 0) {
        actionAlerts.push({
          id: "warning-stale-quotes",
          severity: "warning",
          message: `${staleQuotes.length} quote${staleQuotes.length > 1 ? "s" : ""} not followed up in 7+ days`,
          value: "",
          rawValue: staleQuotesValue,
          isCurrency: true,
          href: "/quotes?status=sent",
        });
      }

      if (stuckJobs.length > 0) {
        const stuckValue = stuckJobs.reduce((s, j) => s + (Number(j.estimated_value) || 0), 0);
        actionAlerts.push({
          id: "warning-stuck-jobs",
          severity: "warning",
          message: `${stuckJobs.length} job${stuckJobs.length > 1 ? "s" : ""} stuck in same stage 7+ days`,
          value: "",
          rawValue: stuckValue,
          isCurrency: true,
          href: "/jobs?status=in_progress",
        });
      }

      const conversionRate = pendingQuotes.length > 0 || quotes.filter((q) => q.status === "accepted").length > 0
        ? (quotes.filter((q) => q.status === "accepted").length / Math.max(quotes.filter((q) => ["sent", "accepted", "declined"].includes(q.status)).length, 1)) * 100
        : 0;
      if (conversionRate > 60) {
        actionAlerts.push({
          id: "opp-high-conversion",
          severity: "opportunity",
          message: `Quote win rate at ${conversionRate.toFixed(0)}% — consider raising prices`,
          value: `${conversionRate.toFixed(0)}%`,
          href: "/quotes",
        });
      }

      const nextWeek = addDays(now, 7);
      const twoWeeks = addDays(now, 14);
      const nextWeekJobs = jobs.filter((j) => {
        if (!j.scheduled_date) return false;
        const d = new Date(j.scheduled_date);
        return d >= nextWeek && d <= twoWeeks && ["pending", "scheduled", "in_progress"].includes(j.status);
      });
      if (nextWeekJobs.length === 0 && activeJobs.length > 0) {
        actionAlerts.push({
          id: "opp-schedule-gap",
          severity: "opportunity",
          message: "No jobs scheduled next week — fill the gap",
          value: `${pendingQuotes.length} pending quotes`,
          href: "/jobs?status=scheduled",
        });
      }

      // === REVENUE CHART DATA (multi-series) ===
      const revenueByMonth: Record<string, { revenue: number; cash: number; overdue: number }> = {};
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(now, i);
        const key = format(m, "MMM yy");
        revenueByMonth[key] = { revenue: 0, cash: 0, overdue: 0 };
      }
      paidInvoices.forEach((inv) => {
        const key = format(new Date(inv.issue_date), "MMM yy");
        if (revenueByMonth[key]) revenueByMonth[key].revenue += Number(inv.total) || 0;
      });
      payments.forEach((p) => {
        const key = format(new Date(p.payment_date || p.created_at), "MMM yy");
        if (revenueByMonth[key]) revenueByMonth[key].cash += Number(p.amount) || 0;
      });
      // For overdue, distribute by due_date month
      allOverdue.forEach((inv) => {
        const key = format(new Date(inv.due_date), "MMM yy");
        if (revenueByMonth[key]) revenueByMonth[key].overdue += Number(inv.total) || 0;
      });

      const revenueChartData = Object.entries(revenueByMonth).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        cash: data.cash,
        overdue: data.overdue,
      }));

      // === QUOTE FUNNEL ===
      const wonQuotes = quotes.filter((q) => q.status === "accepted");
      const lostQuotes = quotes.filter((q) => q.status === "declined");
      const sentQuotes = quotes.filter((q) => ["sent", "accepted", "declined"].includes(q.status));

      // Average days to win: created_at → updated_at (when status changed to accepted)
      const daysToWin = wonQuotes.map((q) => {
        const accepted = new Date(q.updated_at || q.created_at);
        const created = new Date(q.created_at);
        return Math.max(0, differenceInDays(accepted, created));
      });
      const avgDaysToWin = daysToWin.length > 0
        ? Math.round(daysToWin.reduce((s, d) => s + d, 0) / daysToWin.length)
        : 0;

      const quoteFunnel: QuoteFunnelData = {
        created: quotes.length,
        sent: sentQuotes.length,
        won: wonQuotes.length,
        lost: lostQuotes.length,
        createdValue: quotes.reduce((s, q) => s + (Number(q.total) || 0), 0),
        sentValue: sentQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0),
        wonValue: wonQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0),
        lostValue: lostQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0),
        avgDaysToWin,
        staleQuotes: staleQuotes.length,
      };

      // === INVOICE AGING ===
      const agingBuckets = { current: 0, "1-30": 0, "31-60": 0, "60+": 0 };
      const agingInvoices: Record<string, any[]> = { current: [], "1-30": [], "31-60": [], "60+": [] };
      outstandingInvoices.forEach((inv) => {
        const daysOverdue = differenceInDays(now, new Date(inv.due_date));
        let bucket: string;
        if (daysOverdue <= 0) bucket = "current";
        else if (daysOverdue <= 30) bucket = "1-30";
        else if (daysOverdue <= 60) bucket = "31-60";
        else bucket = "60+";
        agingBuckets[bucket as keyof typeof agingBuckets] += Number(inv.total) || 0;
        agingInvoices[bucket].push({
          id: inv.id, invoiceNumber: inv.invoice_number,
          client: inv.customer?.name || "Unknown",
          amount: Number(inv.total) || 0, daysOverdue: Math.max(0, daysOverdue),
        });
      });

      // === TOP CUSTOMERS ===
      const customerRevenue: Record<string, CustomerProfitData> = {};
      paidInvoices.forEach((inv) => {
        const cid = inv.customer_id;
        const name = inv.customer?.name || "Unknown";
        if (!customerRevenue[cid]) customerRevenue[cid] = { id: cid, name, revenue: 0, jobCount: 0, invoiceCount: 0 };
        customerRevenue[cid].revenue += Number(inv.total) || 0;
        customerRevenue[cid].invoiceCount++;
      });
      jobs.forEach((j) => {
        if (customerRevenue[j.customer_id]) customerRevenue[j.customer_id].jobCount++;
      });
      const topCustomers = Object.values(customerRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      // === JOBS AT RISK ===
      const jobsAtRisk: JobAtRisk[] = stuckJobs
        .sort((a, b) => differenceInDays(now, new Date(a.updated_at || a.created_at)) - differenceInDays(now, new Date(b.updated_at || b.created_at)))
        .reverse()
        .slice(0, 10)
        .map((j) => ({
          id: j.id,
          title: j.title,
          customer: j.customer?.name || "Unknown",
          status: j.status,
          daysInStage: differenceInDays(now, new Date(j.updated_at || j.created_at)),
          value: Number(j.estimated_value) || 0,
        }));

      // === INVOICE RISK TABLE ===
      // Group overdue invoices by customer
      const customerOverdue: Record<string, { customer: string; totalDue: number; oldestDate: Date; invoices: any[] }> = {};
      allOverdue.forEach((inv) => {
        const cid = inv.customer_id;
        const name = inv.customer?.name || "Unknown";
        if (!customerOverdue[cid]) customerOverdue[cid] = { customer: name, totalDue: 0, oldestDate: new Date(), invoices: [] };
        customerOverdue[cid].totalDue += Number(inv.total) || 0;
        const dueDate = new Date(inv.due_date);
        if (dueDate < customerOverdue[cid].oldestDate) customerOverdue[cid].oldestDate = dueDate;
        customerOverdue[cid].invoices.push(inv);
      });

      const invoicesAtRisk: InvoiceAtRisk[] = Object.entries(customerOverdue)
        .map(([id, data]) => {
          const daysOverdue = differenceInDays(now, data.oldestDate);
          return {
            id,
            customer: data.customer,
            totalDue: data.totalDue,
            oldestInvoice: format(data.oldestDate, "dd MMM"),
            daysOverdue,
            riskScore: (daysOverdue > 60 ? "high" : daysOverdue > 30 ? "medium" : "low") as "high" | "medium" | "low",
          };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 10);

      // === DRILL DATA ===
      const activeJobsList = activeJobs.map((j) => ({
        id: j.id, title: j.title, client: j.customer?.name || "Unknown",
        status: j.status, date: j.scheduled_date, value: j.estimated_value,
      }));
      const outstandingList = outstandingInvoices.map((inv) => ({
        id: inv.id, invoiceNumber: inv.invoice_number, client: inv.customer?.name || "Unknown",
        amount: Number(inv.total) || 0,
        daysOverdue: Math.max(0, differenceInDays(now, new Date(inv.due_date))),
        dueDate: inv.due_date,
      }));
      const pendingQuotesList = pendingQuotes.map((q) => ({
        id: q.id, quoteNumber: q.quote_number, client: q.customer?.name || "Unknown",
        amount: Number(q.total) || 0, date: q.created_at,
      }));

      // Jobs due this week
      const today = format(now, "yyyy-MM-dd");
      const nextWeekStr = format(addDays(now, 7), "yyyy-MM-dd");
      const jobsDueThisWeek = jobs
        .filter((j) => j.scheduled_date && j.scheduled_date >= today && j.scheduled_date <= nextWeekStr && ["pending", "scheduled", "in_progress"].includes(j.status))
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        .slice(0, 10)
        .map((j) => ({ id: j.id, client: j.customer?.name || "Unknown", job: j.title, date: j.scheduled_date, value: j.estimated_value }));

      // Overdue invoices list
      const overdueList = allOverdue
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 10)
        .map((inv) => ({
          id: inv.id, client: inv.customer?.name || "Unknown",
          invoiceNumber: inv.invoice_number, amount: Number(inv.total) || 0,
          daysOverdue: differenceInDays(now, new Date(inv.due_date)),
        }));

      // Legacy metrics shape for backward compat
      const metrics = {
        activeJobs: activeJobs.length,
        activeJobsTrend: jobsThisWeek - jobsLastWeek,
        revenueMTD,
        revenueGoal,
        outstandingAmount,
        outstandingCount: outstandingInvoices.length,
        pendingQuotesAmount,
        pendingQuotesCount: pendingQuotes.length,
      };

      // Job status data (kept for potential use)
      const statusLabels: Record<string, string> = {
        scheduled: "Scheduled", in_progress: "In Progress", completed: "Completed",
        pending: "Pending", cancelled: "Cancelled",
      };
      const statusColors: Record<string, string> = {
        scheduled: "hsl(221, 83%, 53%)", in_progress: "hsl(38, 92%, 50%)",
        completed: "hsl(142, 71%, 45%)", pending: "hsl(262, 83%, 58%)",
        cancelled: "hsl(0, 84%, 60%)",
      };
      const jobStatusCounts: Record<string, number> = {};
      jobs.forEach((j) => { jobStatusCounts[j.status] = (jobStatusCounts[j.status] || 0) + 1; });
      const jobStatusData = Object.entries(jobStatusCounts).map(([status, count]) => ({
        status: statusLabels[status] || status, rawStatus: status, count,
        color: statusColors[status] || "hsl(220, 9%, 46%)",
      }));

      return {
        metrics,
        controlHeader,
        kpi,
        actionAlerts,
        revenueChartData,
        jobStatusData,
        quoteFunnel,
        agingBuckets,
        agingInvoices,
        topCustomers,
        jobsAtRisk,
        invoicesAtRisk,
        drillData: { activeJobs: activeJobsList, outstanding: outstandingList, pendingQuotes: pendingQuotesList },
        jobsDueThisWeek,
        overdueInvoices: overdueList,
        // Legacy compat
        insights: actionAlerts.map((a) => ({
          id: a.id,
          type: a.severity === "critical" ? "warning" as const : a.severity === "warning" ? "info" as const : "success" as const,
          message: a.message,
          cta: "View",
          href: a.href,
        })),
        healthInsights: [],
      };
    },
  });
}
