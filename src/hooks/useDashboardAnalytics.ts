import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { format, differenceInDays, subMonths, startOfMonth, addDays } from "date-fns";

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

export function useDashboardAnalytics() {
  const { dateRange, customerId, staffId, jobType, crossFilter, filterQueryKey } = useDashboardFilters();

  return useQuery({
    queryKey: ["dashboard-analytics", ...filterQueryKey],
    queryFn: async () => {
      const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
      const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

      // Build queries with date range filters
      let jobsQuery = supabase.from("jobs").select("id, title, status, scheduled_date, created_at, estimated_value, customer_id, customer:customers(name)");
      let invoicesQuery = supabase.from("invoices").select("id, invoice_number, status, total, issue_date, due_date, customer_id, customer:customers(name)");
      let quotesQuery = supabase.from("quotes").select("id, quote_number, status, total, created_at, customer_id, customer:customers(name)");
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

      // Fetch staff time entries if staff filter applied
      let staffJobIds: Set<string> | null = null;
      if (staffId) {
        const { data: timeEntries } = await supabase
          .from("time_entries")
          .select("job_id")
          .eq("user_id", staffId);
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

      // Apply job type filter client-side
      if (jobType) {
        jobs = jobs.filter((j) => matchJobType(j.title) === jobType);
        const jobIds = new Set(jobs.map((j) => j.id));
        // Filter invoices/quotes linked to these jobs would be ideal but they may not have job_id
      }

      // Apply staff filter
      if (staffJobIds) {
        jobs = jobs.filter((j) => staffJobIds!.has(j.id));
      }

      // Apply cross-filter
      if (crossFilter) {
        if (crossFilter.dimension === "month") {
          jobs = jobs.filter((j) => format(new Date(j.created_at), "MMM yy") === crossFilter.value);
          invoices = invoices.filter((i) => format(new Date(i.issue_date), "MMM yy") === crossFilter.value);
          quotes = quotes.filter((q) => format(new Date(q.created_at), "MMM yy") === crossFilter.value);
        } else if (crossFilter.dimension === "jobStatus") {
          jobs = jobs.filter((j) => j.status === crossFilter.value);
        } else if (crossFilter.dimension === "customer") {
          const custId = crossFilter.value;
          jobs = jobs.filter((j) => j.customer_id === custId);
          invoices = invoices.filter((i) => i.customer_id === custId);
          quotes = quotes.filter((q) => q.customer_id === custId);
        }
      }

      const now = new Date();

      // --- Metrics ---
      const activeJobs = jobs.filter((j) => ["pending", "scheduled", "in_progress"].includes(j.status));
      const paidInvoices = invoices.filter((i) => i.status === "paid");
      const revenueMTD = paidInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const outstandingInvoices = invoices.filter((i) => ["pending", "overdue"].includes(i.status));
      const outstandingAmount = outstandingInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const pendingQuotes = quotes.filter((q) => q.status === "sent");
      const pendingQuotesAmount = pendingQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);

      // Revenue goal from 3-month average
      const threeMonthsAgo = subMonths(startOfMonth(now), 3);
      const pastPaid = invoices.filter((inv) => {
        if (inv.status !== "paid") return false;
        const d = new Date(inv.issue_date);
        return d >= threeMonthsAgo && d < startOfMonth(now);
      });
      const pastRevenue = pastPaid.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const revenueGoal = Math.max(pastRevenue / 3, revenueMTD * 1.2, 1);

      // Trend: jobs created this week vs last
      const lastWeekStart = addDays(now, -7);
      const jobsThisWeek = jobs.filter((j) => new Date(j.created_at) >= lastWeekStart).length;
      const jobsLastWeek = jobs.filter((j) => {
        const d = new Date(j.created_at);
        return d >= addDays(lastWeekStart, -7) && d < lastWeekStart;
      }).length;

      // --- Revenue by month ---
      const revenueByMonth: Record<string, number> = {};
      paidInvoices.forEach((inv) => {
        const key = format(new Date(inv.issue_date), "MMM yy");
        revenueByMonth[key] = (revenueByMonth[key] || 0) + (Number(inv.total) || 0);
      });
      const revenueChartData = Object.entries(revenueByMonth)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => {
          // Sort chronologically
          const parseMonth = (m: string) => {
            const [mon, yr] = m.split(" ");
            return new Date(`${mon} 20${yr}`);
          };
          return parseMonth(a.month).getTime() - parseMonth(b.month).getTime();
        });

      // --- Job status counts ---
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
        status: statusLabels[status] || status,
        rawStatus: status,
        count,
        color: statusColors[status] || "hsl(220, 9%, 46%)",
      }));

      // --- Quote funnel ---
      const quoteFunnel = {
        created: quotes.length,
        sent: quotes.filter((q) => ["sent", "accepted", "rejected"].includes(q.status)).length,
        won: quotes.filter((q) => q.status === "accepted").length,
        createdValue: quotes.reduce((s, q) => s + (Number(q.total) || 0), 0),
        sentValue: quotes.filter((q) => ["sent", "accepted", "rejected"].includes(q.status)).reduce((s, q) => s + (Number(q.total) || 0), 0),
        wonValue: quotes.filter((q) => q.status === "accepted").reduce((s, q) => s + (Number(q.total) || 0), 0),
      };

      // --- Invoice aging ---
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
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          client: inv.customer?.name || "Unknown",
          amount: Number(inv.total) || 0,
          daysOverdue: Math.max(0, daysOverdue),
        });
      });

      // --- Top customers ---
      const customerRevenue: Record<string, { name: string; id: string; revenue: number; jobCount: number }> = {};
      paidInvoices.forEach((inv) => {
        const cid = inv.customer_id;
        const name = inv.customer?.name || "Unknown";
        if (!customerRevenue[cid]) customerRevenue[cid] = { name, id: cid, revenue: 0, jobCount: 0 };
        customerRevenue[cid].revenue += Number(inv.total) || 0;
      });
      jobs.forEach((j) => {
        if (customerRevenue[j.customer_id]) customerRevenue[j.customer_id].jobCount++;
      });
      const topCustomers = Object.values(customerRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // --- Proactive insights (compact alerts) ---
      const insights: { id: string; type: "warning" | "success" | "info"; message: string; cta: string; href: string }[] = [];

      const severeOverdue = outstandingInvoices.filter((i) => differenceInDays(now, new Date(i.due_date)) > 30);
      if (severeOverdue.length > 0) {
        insights.push({
          id: "overdue-severe",
          type: "warning",
          message: `${severeOverdue.length} invoice${severeOverdue.length > 1 ? "s" : ""} overdue by 30+ days — at risk`,
          cta: "View invoices",
          href: "/invoices",
        });
      }

      const conversionRate = quoteFunnel.sent > 0 ? (quoteFunnel.won / quoteFunnel.sent) * 100 : 0;
      if (quoteFunnel.sent >= 3 && conversionRate < 30) {
        insights.push({
          id: "low-conversion",
          type: "warning",
          message: `Quote conversion at ${conversionRate.toFixed(0)}% — below target`,
          cta: "Review quotes",
          href: "/quotes",
        });
      }

      if (topCustomers.length > 0) {
        insights.push({
          id: "top-customer",
          type: "success",
          message: `${topCustomers[0].name} is your top customer with ${topCustomers[0].jobCount} jobs`,
          cta: "View customer",
          href: "/customers",
        });
      }

      // Workload gap
      const nextWeek = addDays(now, 7);
      const twoWeeks = addDays(now, 14);
      const nextWeekJobs = jobs.filter((j) => {
        if (!j.scheduled_date) return false;
        const d = new Date(j.scheduled_date);
        return d >= nextWeek && d <= twoWeeks && ["pending", "scheduled", "in_progress"].includes(j.status);
      });
      if (nextWeekJobs.length === 0) {
        insights.push({
          id: "workload-gap",
          type: "info",
          message: "No jobs scheduled for next week — fill the gap?",
          cta: "Schedule jobs",
          href: "/jobs",
        });
      }

      // --- Business Health insights (plain-language summaries) ---
      type HealthInsight = {
        id: string;
        icon: "revenue_up" | "revenue_down" | "revenue_flat" | "quotes_good" | "quotes_bad" | "overdue" | "workload_gap" | "top_customer" | "jobs_busy";
        headline: string;
        detail: string;
        sentiment: "positive" | "negative" | "neutral";
        cta?: { label: string; href: string };
      };
      const healthInsights: HealthInsight[] = [];

      // 1. Revenue trend
      if (revenueChartData.length >= 2) {
        const recent = revenueChartData.slice(-2);
        const prev = recent[0].revenue;
        const curr = recent[1].revenue;
        if (prev > 0) {
          const pctChange = ((curr - prev) / prev) * 100;
          if (pctChange > 5) {
            healthInsights.push({
              id: "health-revenue",
              icon: "revenue_up",
              headline: `Revenue is up ${pctChange.toFixed(0)}%`,
              detail: `Your income grew from last month. Keep momentum going by following up on open quotes.`,
              sentiment: "positive",
              cta: { label: "View reports", href: "/reports" },
            });
          } else if (pctChange < -5) {
            healthInsights.push({
              id: "health-revenue",
              icon: "revenue_down",
              headline: `Revenue dropped ${Math.abs(pctChange).toFixed(0)}%`,
              detail: `Income fell compared to last month. Check if quotes are being followed up and invoices collected on time.`,
              sentiment: "negative",
              cta: { label: "View reports", href: "/reports" },
            });
          } else {
            healthInsights.push({
              id: "health-revenue",
              icon: "revenue_flat",
              headline: "Revenue is holding steady",
              detail: "Your income is consistent month-to-month. A good sign of business stability.",
              sentiment: "neutral",
            });
          }
        } else if (curr > 0) {
          healthInsights.push({
            id: "health-revenue",
            icon: "revenue_up",
            headline: "First revenue recorded!",
            detail: "You've started earning. Keep sending quotes and completing jobs to build momentum.",
            sentiment: "positive",
          });
        }
      }

      // 2. Quote conversion
      if (quoteFunnel.sent > 0) {
        const cr = conversionRate;
        if (cr >= 50) {
          healthInsights.push({
            id: "health-quotes",
            icon: "quotes_good",
            headline: `Winning ${cr.toFixed(0)}% of quotes`,
            detail: `You're converting more than half your quotes — that's strong. Consider raising your prices slightly.`,
            sentiment: "positive",
            cta: { label: "View quotes", href: "/quotes" },
          });
        } else if (cr >= 25) {
          healthInsights.push({
            id: "health-quotes",
            icon: "quotes_good",
            headline: `Quote win rate at ${cr.toFixed(0)}%`,
            detail: `This is typical for trades. Following up within 48 hours can boost your conversion rate.`,
            sentiment: "neutral",
            cta: { label: "View quotes", href: "/quotes" },
          });
        } else {
          healthInsights.push({
            id: "health-quotes",
            icon: "quotes_bad",
            headline: `Only winning ${cr.toFixed(0)}% of quotes`,
            detail: `Most of your quotes aren't converting. Review your pricing or try following up sooner after sending.`,
            sentiment: "negative",
            cta: { label: "Review quotes", href: "/quotes" },
          });
        }
      }

      // 3. Overdue invoice risk
      const allOverdue = outstandingInvoices.filter((i) => differenceInDays(now, new Date(i.due_date)) > 0);
      const overdueTotal = allOverdue.reduce((s, i) => s + (Number(i.total) || 0), 0);
      if (allOverdue.length > 0) {
        healthInsights.push({
          id: "health-overdue",
          icon: "overdue",
          headline: `${allOverdue.length} unpaid invoice${allOverdue.length > 1 ? "s" : ""} past due`,
          detail: overdueTotal > 0
            ? `You have money sitting uncollected. Send a friendly reminder — most clients just need a nudge.`
            : `Some invoices have gone past their due date. Follow up to keep your cash flow healthy.`,
          sentiment: "negative",
          cta: { label: "Chase payments", href: "/invoices" },
        });
      } else if (outstandingInvoices.length === 0 && paidInvoices.length > 0) {
        healthInsights.push({
          id: "health-overdue",
          icon: "quotes_good",
          headline: "All invoices are paid up",
          detail: "No overdue invoices — your cash flow is in great shape right now.",
          sentiment: "positive",
        });
      }

      // 4. Workload / scheduling
      const thisWeekJobs = jobs.filter((j) => {
        if (!j.scheduled_date) return false;
        return j.scheduled_date >= format(now, "yyyy-MM-dd") && j.scheduled_date <= format(addDays(now, 7), "yyyy-MM-dd")
          && ["pending", "scheduled", "in_progress"].includes(j.status);
      });
      if (nextWeekJobs.length === 0 && thisWeekJobs.length <= 1) {
        healthInsights.push({
          id: "health-workload",
          icon: "workload_gap",
          headline: "Your schedule is looking quiet",
          detail: "You have few jobs lined up. Now's a good time to follow up on open quotes or reach out to past customers.",
          sentiment: "negative",
          cta: { label: "Schedule work", href: "/jobs" },
        });
      } else if (thisWeekJobs.length >= 5) {
        healthInsights.push({
          id: "health-workload",
          icon: "jobs_busy",
          headline: `${thisWeekJobs.length} jobs on the go this week`,
          detail: "You've got a full schedule — make sure to send invoices promptly after each job to keep cash flowing.",
          sentiment: "positive",
          cta: { label: "View schedule", href: "/jobs" },
        });
      } else if (thisWeekJobs.length > 0) {
        healthInsights.push({
          id: "health-workload",
          icon: "jobs_busy",
          headline: `${thisWeekJobs.length} job${thisWeekJobs.length > 1 ? "s" : ""} scheduled this week`,
          detail: "You've got work lined up. Stay on top of materials and customer communications.",
          sentiment: "neutral",
        });
      }

      // 5. Top customer highlight
      if (topCustomers.length > 0 && topCustomers[0].revenue > 0) {
        const top = topCustomers[0];
        healthInsights.push({
          id: "health-top-customer",
          icon: "top_customer",
          headline: `${top.name} is your biggest earner`,
          detail: `They've brought in the most revenue with ${top.jobCount} job${top.jobCount !== 1 ? "s" : ""}. A thank-you or check-in call can go a long way.`,
          sentiment: "positive",
          cta: { label: "View customers", href: "/customers" },
        });
      }

      // --- Drill-through data ---
      const activeJobsList = activeJobs.map((j) => ({
        id: j.id,
        title: j.title,
        client: j.customer?.name || "Unknown",
        status: j.status,
        date: j.scheduled_date,
        value: j.estimated_value,
      }));

      const outstandingList = outstandingInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        client: inv.customer?.name || "Unknown",
        amount: Number(inv.total) || 0,
        daysOverdue: Math.max(0, differenceInDays(now, new Date(inv.due_date))),
        dueDate: inv.due_date,
      }));

      const pendingQuotesList = pendingQuotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quote_number,
        client: q.customer?.name || "Unknown",
        amount: Number(q.total) || 0,
        date: q.created_at,
      }));

      // Jobs due this week
      const today = format(now, "yyyy-MM-dd");
      const nextWeekStr = format(addDays(now, 7), "yyyy-MM-dd");
      const jobsDueThisWeek = jobs
        .filter((j) => j.scheduled_date && j.scheduled_date >= today && j.scheduled_date <= nextWeekStr && ["pending", "scheduled", "in_progress"].includes(j.status))
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        .slice(0, 10)
        .map((j) => ({
          id: j.id,
          client: j.customer?.name || "Unknown",
          job: j.title,
          date: j.scheduled_date,
          value: j.estimated_value,
        }));

      // Overdue invoices
      const overdueList = outstandingInvoices
        .filter((inv) => differenceInDays(now, new Date(inv.due_date)) > 0)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 10)
        .map((inv) => ({
          id: inv.id,
          client: inv.customer?.name || "Unknown",
          invoiceNumber: inv.invoice_number,
          amount: Number(inv.total) || 0,
          daysOverdue: differenceInDays(now, new Date(inv.due_date)),
        }));

      return {
        metrics: {
          activeJobs: activeJobs.length,
          activeJobsTrend: jobsThisWeek - jobsLastWeek,
          revenueMTD,
          revenueGoal,
          outstandingAmount,
          outstandingCount: outstandingInvoices.length,
          pendingQuotesAmount,
          pendingQuotesCount: pendingQuotes.length,
        },
        revenueChartData,
        jobStatusData,
        quoteFunnel,
        agingBuckets,
        agingInvoices,
        topCustomers,
        insights,
        healthInsights,
        drillData: {
          activeJobs: activeJobsList,
          outstanding: outstandingList,
          pendingQuotes: pendingQuotesList,
        },
        jobsDueThisWeek,
        overdueInvoices: overdueList,
      };
    },
  });
}
