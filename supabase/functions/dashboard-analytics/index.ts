import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── helpers ──────────────────────────────────────────────────────────
function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}
function fmt(d: Date, pattern: "MMM yy" | "dd MMM" | "yyyy-MM-dd" | "dd/MM"): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (pattern === "MMM yy") return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  if (pattern === "dd MMM") return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]}`;
  if (pattern === "dd/MM") return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59, 999); }
function subMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth()-n, d.getDate()); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeek(d: Date): Date { const r = new Date(d); r.setDate(r.getDate() - r.getDay() + 1); return r; }

const JOB_TYPE_KEYWORDS: Record<string, string[]> = {
  "Plumbing & Heating": ["plumb","boiler","heating","radiator","pipe","water","leak","tap","shower","bathroom"],
  "Electrical": ["electri","wiring","socket","fuse","light","switch","rewire","circuit"],
  "Carpentry": ["carpent","wood","door","window","cabinet","shelf","deck","fence"],
  "Painting & Decorating": ["paint","decorat","wallpaper","plaster","render"],
  "Roofing": ["roof","gutter","slate","tile","chimney","flashing"],
  "General Maintenance": ["repair","fix","maintain","service","inspect","general"],
  "Landscaping": ["garden","landscape","lawn","tree","paving","driveway"],
  "HVAC": ["hvac","air con","ventilat","duct","heat pump"],
};
function matchJobType(title: string): string {
  const lower = title.toLowerCase();
  for (const [type, kws] of Object.entries(JOB_TYPE_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) return type;
  }
  return "Other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Parse filters from request body
    const body = await req.json().catch(() => ({}));
    const { fromDate, toDate, customerId, staffId, jobType, segment, crossFilter } = body as Record<string, any>;

    // ── FETCH DATA ──────────────────────────────────────────────────
    let jobsQ = supabase.from("jobs").select("id, title, status, scheduled_date, created_at, updated_at, estimated_value, customer_id, customer:customers(name)");
    let invoicesQ = supabase.from("invoices").select("id, display_number, status, total, balance_due, issue_date, due_date, customer_id, quote_id, customer:customers(name)");
    let quotesQ = supabase.from("quotes").select("id, quote_number, status, total, created_at, updated_at, customer_id, customer:customers(name)");
    let paymentsQ = supabase.from("payments").select("id, amount, payment_date, created_at, invoice_id, invoice:invoices(display_number, customer_id, issue_date, customer:customers(name))");

    if (fromDate) {
      jobsQ = jobsQ.gte("created_at", fromDate);
      invoicesQ = invoicesQ.gte("issue_date", fromDate);
      quotesQ = quotesQ.gte("created_at", fromDate);
      paymentsQ = paymentsQ.gte("payment_date", fromDate);
    }
    if (toDate) {
      jobsQ = jobsQ.lte("created_at", `${toDate}T23:59:59`);
      invoicesQ = invoicesQ.lte("issue_date", toDate);
      quotesQ = quotesQ.lte("created_at", `${toDate}T23:59:59`);
      paymentsQ = paymentsQ.lte("payment_date", toDate);
    }
    if (customerId) {
      jobsQ = jobsQ.eq("customer_id", customerId);
      invoicesQ = invoicesQ.eq("customer_id", customerId);
      quotesQ = quotesQ.eq("customer_id", customerId);
    }

    let staffJobIds: Set<string> | null = null;
    if (staffId && !["all","overloaded","underperforming"].includes(staffId)) {
      const { data: te } = await supabase.from("time_entries").select("job_id").eq("user_id", staffId);
      staffJobIds = new Set((te || []).map((t: any) => t.job_id).filter(Boolean));
    }

    // Also fetch comparison period data for invoices and payments
    const rangeFrom = fromDate ? new Date(fromDate) : null;
    const rangeTo = toDate ? new Date(toDate + "T23:59:59") : new Date();
    const rangeDays = rangeFrom ? diffDays(rangeTo, rangeFrom) : 30;
    const compFrom = rangeFrom ? new Date(rangeFrom.getTime() - rangeDays * 86_400_000) : subMonths(new Date(), 2);
    const compTo = rangeFrom ? new Date(rangeFrom.getTime() - 1) : subMonths(new Date(), 1);
    const compFromStr = fmt(compFrom, "yyyy-MM-dd");
    const compToStr = fmt(compTo, "yyyy-MM-dd");

    let compInvoicesQ = supabase.from("invoices").select("id, status, total, issue_date").gte("issue_date", compFromStr).lte("issue_date", compToStr);
    let compPaymentsQ = supabase.from("payments").select("id, amount, payment_date").gte("payment_date", compFromStr).lte("payment_date", compToStr);
    if (customerId) {
      compInvoicesQ = compInvoicesQ.eq("customer_id", customerId);
    }

    const [jobsR, invoicesR, quotesR, paymentsR, paymentScoresR, profitR, compInvR, compPayR] = await Promise.all([
      jobsQ, invoicesQ, quotesQ, paymentsQ,
      supabase.from("customer_payment_scores").select("customer_id, avg_days_to_pay, late_payments_count, total_invoices_paid"),
      supabase.from("v_job_profitability" as any).select("customer_id, customer_name, estimated_value, total_cost, profit, profit_margin_pct"),
      compInvoicesQ, compPaymentsQ,
    ]);

    if (jobsR.error) throw jobsR.error;
    if (invoicesR.error) throw invoicesR.error;
    if (quotesR.error) throw quotesR.error;
    if (paymentsR.error) throw paymentsR.error;

    let jobs = (jobsR.data || []) as any[];
    let invoices = (invoicesR.data || []) as any[];
    let quotes = (quotesR.data || []) as any[];
    let payments = (paymentsR.data || []) as any[];
    const compInvoices = (compInvR.data || []) as any[];
    const compPayments = (compPayR.data || []) as any[];

    // Payment scores map
    const scoreMap: Record<string, { avgDaysToPay: number; lateRate: number }> = {};
    (paymentScoresR.data || []).forEach((ps: any) => {
      const lateRate = ps.total_invoices_paid > 0 ? Math.round((ps.late_payments_count / ps.total_invoices_paid) * 100) : 0;
      scoreMap[ps.customer_id] = { avgDaysToPay: Number(ps.avg_days_to_pay) || 0, lateRate };
    });

    // ── CLIENT-SIDE FILTERS ─────────────────────────────────────────
    if (jobType) jobs = jobs.filter((j: any) => matchJobType(j.title) === jobType);
    if (staffJobIds) jobs = jobs.filter((j: any) => staffJobIds!.has(j.id));

    if (crossFilter) {
      if (crossFilter.dimension === "month") {
        jobs = jobs.filter((j: any) => fmt(new Date(j.created_at), "MMM yy") === crossFilter.value);
        invoices = invoices.filter((i: any) => fmt(new Date(i.issue_date), "MMM yy") === crossFilter.value);
        quotes = quotes.filter((q: any) => fmt(new Date(q.created_at), "MMM yy") === crossFilter.value);
      } else if (crossFilter.dimension === "jobStatus") {
        jobs = jobs.filter((j: any) => j.status === crossFilter.value);
      } else if (crossFilter.dimension === "customer") {
        const cid = crossFilter.value;
        jobs = jobs.filter((j: any) => j.customer_id === cid);
        invoices = invoices.filter((i: any) => i.customer_id === cid);
        quotes = quotes.filter((q: any) => q.customer_id === cid);
      }
    }

    // ── SEGMENT FILTERING ───────────────────────────────────────────
    const now = new Date();
    if (segment === "high_risk") {
      const hrIds = new Set<string>();
      invoices.forEach((i: any) => {
        const bal = Number(i.balance_due) || Number(i.total) || 0;
        if (bal > 0 && (diffDays(now, new Date(i.due_date)) > 30 || bal > 1000)) hrIds.add(i.customer_id);
      });
      jobs.forEach((j: any) => {
        if (["pending","scheduled","in_progress"].includes(j.status) && diffDays(now, new Date(j.updated_at || j.created_at)) > 7) hrIds.add(j.customer_id);
      });
      jobs = jobs.filter((j: any) => hrIds.has(j.customer_id));
      invoices = invoices.filter((i: any) => hrIds.has(i.customer_id));
      quotes = quotes.filter((q: any) => hrIds.has(q.customer_id));
      payments = payments.filter((p: any) => p.invoice && hrIds.has((p.invoice as any).customer_id));
    } else if (segment === "top_customers") {
      const cash: Record<string, number> = {};
      payments.forEach((p: any) => { const inv = p.invoice as any; if (inv?.customer_id) cash[inv.customer_id] = (cash[inv.customer_id] || 0) + (Number(p.amount) || 0); });
      const sorted = Object.entries(cash).sort((a, b) => b[1] - a[1]);
      const cutoff = Math.max(10, Math.ceil(sorted.length * 0.2));
      const topSet = new Set(sorted.slice(0, cutoff).map(([id]) => id));
      jobs = jobs.filter((j: any) => topSet.has(j.customer_id));
      invoices = invoices.filter((i: any) => topSet.has(i.customer_id));
      quotes = quotes.filter((q: any) => topSet.has(q.customer_id));
      payments = payments.filter((p: any) => p.invoice && topSet.has((p.invoice as any).customer_id));
    } else if (segment === "jobs_at_risk") {
      const arIds = new Set<string>(); const arCids = new Set<string>();
      jobs.forEach((j: any) => {
        if (!["pending","scheduled","in_progress"].includes(j.status)) return;
        const dsu = diffDays(now, new Date(j.updated_at || j.created_at));
        const deadlineNear = j.scheduled_date && diffDays(new Date(j.scheduled_date), now) <= 3 && diffDays(new Date(j.scheduled_date), now) >= 0;
        if (dsu > 7 || deadlineNear) { arIds.add(j.id); arCids.add(j.customer_id); }
      });
      jobs = jobs.filter((j: any) => arIds.has(j.id));
      invoices = invoices.filter((i: any) => arCids.has(i.customer_id));
      quotes = quotes.filter((q: any) => arCids.has(q.customer_id));
    } else if (segment === "recent") {
      const ago7 = addDays(now, -7);
      jobs = jobs.filter((j: any) => new Date(j.created_at) >= ago7 || new Date(j.updated_at || j.created_at) >= ago7);
      invoices = invoices.filter((i: any) => new Date(i.issue_date) >= ago7);
      quotes = quotes.filter((q: any) => new Date(q.created_at) >= ago7);
      payments = payments.filter((p: any) => new Date(p.payment_date || p.created_at) >= ago7);
    }

    // ── COMPUTE METRICS (now uses FILTERED data, not hardcoded MTD) ─
    const activeJobs = jobs.filter((j: any) => ["pending","scheduled","in_progress"].includes(j.status));
    const paidInvoices = invoices.filter((i: any) => i.status === "paid");
    const outstandingInvoices = invoices.filter((i: any) => ["pending","overdue"].includes(i.status));

    const paidByInv: Record<string, number> = {};
    payments.forEach((p: any) => { paidByInv[p.invoice_id] = (paidByInv[p.invoice_id] || 0) + (Number(p.amount) || 0); });

    const outstandingAmount = outstandingInvoices.reduce((s: number, i: any) => s + Math.max(0, (Number(i.total) || 0) - (paidByInv[i.id] || 0)), 0);

    // Cash & Revenue now use the FULL filtered dataset (respects fromDate/toDate)
    const cashCollected = payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const revenueInRange = invoices.filter((i: any) => !["cancelled","draft"].includes(i.status)).reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);

    // Comparison period metrics
    const compRevenue = compInvoices.filter((i: any) => !["cancelled","draft"].includes(i.status)).reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
    const compCash = compPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const revenueChangePercent = compRevenue > 0 ? ((revenueInRange - compRevenue) / compRevenue) * 100 : revenueInRange > 0 ? 100 : 0;

    // Build comparison label
    let comparisonLabel = "vs prev period";
    if (rangeDays <= 8) comparisonLabel = "vs prev 7 days";
    else if (rangeDays <= 32) comparisonLabel = "vs prev 30 days";
    else if (rangeDays <= 95) comparisonLabel = "vs prev quarter";
    else comparisonLabel = "vs prev period";

    const overdue30Plus = outstandingInvoices.filter((i: any) => diffDays(now, new Date(i.due_date)) > 30);
    const overdue30PlusAmount = overdue30Plus.reduce((s: number, i: any) => s + Math.max(0, (Number(i.total) || 0) - (paidByInv[i.id] || 0)), 0);

    const allOverdue = outstandingInvoices.filter((i: any) => {
      const bal = Math.max(0, (Number(i.total) || 0) - (paidByInv[i.id] || 0));
      return diffDays(now, new Date(i.due_date)) > 0 && bal > 0;
    });
    const totalOverdue = allOverdue.reduce((s: number, i: any) => s + Math.max(0, (Number(i.total) || 0) - (paidByInv[i.id] || 0)), 0);

    const stuckJobs = activeJobs.filter((j: any) => diffDays(now, new Date(j.updated_at || j.created_at)) > 7);

    const staleQuotes = quotes.filter((q: any) => q.status === "sent" && diffDays(now, new Date(q.created_at)) > 7);
    const staleQuotesValue = staleQuotes.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);

    const pendingQuotes = quotes.filter((q: any) => q.status === "sent");
    const pendingQuotesAmount = pendingQuotes.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);

    const revenueGoal = Math.max(compRevenue * 1.1, revenueInRange * 1.2, 1);

    const lastWeekStart = addDays(now, -7);
    const jobsThisWeek = jobs.filter((j: any) => new Date(j.created_at) >= lastWeekStart).length;
    const jobsLastWeek = jobs.filter((j: any) => { const d = new Date(j.created_at); return d >= addDays(lastWeekStart, -7) && d < lastWeekStart; }).length;

    // ── CONTROL HEADER ──────────────────────────────────────────────
    let aiRecommendation = "All clear — keep going.";
    if (totalOverdue > 0 && staleQuotes.length > 0) aiRecommendation = "Chase overdue invoices and follow up on stale quotes to recover cash flow.";
    else if (totalOverdue > 0) aiRecommendation = `You have uncollected cash — send reminders on ${allOverdue.length} overdue invoice${allOverdue.length > 1 ? "s" : ""}.`;
    else if (staleQuotes.length > 0) aiRecommendation = `${staleQuotes.length} quote${staleQuotes.length > 1 ? "s" : ""} sent over a week ago with no response — follow up today.`;
    else if (stuckJobs.length > 0) aiRecommendation = `${stuckJobs.length} job${stuckJobs.length > 1 ? "s" : ""} haven't progressed in 7+ days — check in with your team.`;

    const controlHeader = { totalOverdue, overdueCount: allOverdue.length, quotesNeedFollowUp: staleQuotes.length, quotesFollowUpValue: staleQuotesValue, stuckJobs: stuckJobs.length, aiRecommendation };

    const kpi = {
      cashCollectedMTD: cashCollected, cashCollectedCount: payments.length,
      outstandingAR: outstandingAmount, outstandingARCount: outstandingInvoices.length,
      overdue30Plus: overdue30PlusAmount, overdue30PlusCount: overdue30Plus.length,
      revenueMTD: revenueInRange, revenueLastMonth: compRevenue, revenueChangePercent,
      comparisonLabel,
      activeJobs: activeJobs.length, stuckJobs: stuckJobs.length,
    };

    // ── ACTION ALERTS ───────────────────────────────────────────────
    const actionAlerts: any[] = [];
    if (overdue30Plus.length > 0) actionAlerts.push({ id: "critical-overdue-30", severity: "critical", message: `${overdue30Plus.length} invoice${overdue30Plus.length > 1 ? "s" : ""} overdue 30+ days`, value: "", rawValue: overdue30PlusAmount, isCurrency: true, href: "/invoices?status=overdue" });

    const overdue60 = outstandingInvoices.filter((i: any) => diffDays(now, new Date(i.due_date)) > 60);
    if (overdue60.length > 0) {
      const amt = overdue60.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
      actionAlerts.push({ id: "critical-overdue-60", severity: "critical", message: `${overdue60.length} invoice${overdue60.length > 1 ? "s" : ""} overdue 60+ days — escalate`, value: "", rawValue: amt, isCurrency: true, href: "/invoices?status=overdue" });
    }
    if (staleQuotes.length > 0) actionAlerts.push({ id: "warning-stale-quotes", severity: "warning", message: `${staleQuotes.length} quote${staleQuotes.length > 1 ? "s" : ""} not followed up in 7+ days`, value: "", rawValue: staleQuotesValue, isCurrency: true, href: "/quotes?status=sent" });
    if (stuckJobs.length > 0) {
      const sv = stuckJobs.reduce((s: number, j: any) => s + (Number(j.estimated_value) || 0), 0);
      actionAlerts.push({ id: "warning-stuck-jobs", severity: "warning", message: `${stuckJobs.length} job${stuckJobs.length > 1 ? "s" : ""} stuck in same stage 7+ days`, value: "", rawValue: sv, isCurrency: true, href: "/jobs?status=in_progress" });
    }
    const convRate = pendingQuotes.length > 0 || quotes.filter((q: any) => q.status === "accepted").length > 0
      ? (quotes.filter((q: any) => q.status === "accepted").length / Math.max(quotes.filter((q: any) => ["sent","accepted","declined"].includes(q.status)).length, 1)) * 100 : 0;
    if (convRate > 60) actionAlerts.push({ id: "opp-high-conversion", severity: "opportunity", message: `Quote win rate at ${convRate.toFixed(0)}% — consider raising prices`, value: `${convRate.toFixed(0)}%`, href: "/quotes" });

    const nw = addDays(now, 7); const tw = addDays(now, 14);
    const nwJobs = jobs.filter((j: any) => { if (!j.scheduled_date) return false; const d = new Date(j.scheduled_date); return d >= nw && d <= tw && ["pending","scheduled","in_progress"].includes(j.status); });
    if (nwJobs.length === 0 && activeJobs.length > 0) actionAlerts.push({ id: "opp-schedule-gap", severity: "opportunity", message: "No jobs scheduled next week — fill the gap", value: `${pendingQuotes.length} pending quotes`, href: "/jobs?status=scheduled" });

    // ── REVENUE CHART (dynamic buckets based on date range) ─────────
    const chartFrom = rangeFrom || subMonths(now, 5);
    const chartTo = rangeTo;
    const chartDays = diffDays(chartTo, chartFrom);

    const revenueChartData: any[] = [];
    if (chartDays <= 14) {
      // Daily buckets
      for (let i = 0; i <= chartDays; i++) {
        const d = addDays(chartFrom, i);
        const key = fmt(d, "dd/MM");
        const dateStr = fmt(d, "yyyy-MM-dd");
        const revenue = paidInvoices.filter((inv: any) => inv.issue_date === dateStr).reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
        const cash = payments.filter((p: any) => (p.payment_date || "").startsWith(dateStr)).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
        const overdue = allOverdue.filter((inv: any) => inv.due_date === dateStr).reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
        revenueChartData.push({ month: key, revenue, cash, overdue });
      }
    } else if (chartDays <= 90) {
      // Weekly buckets
      let cursor = startOfWeek(chartFrom);
      while (cursor <= chartTo) {
        const weekEnd = addDays(cursor, 6);
        const key = `${fmt(cursor, "dd MMM")}`;
        const revenue = paidInvoices.filter((inv: any) => { const d = new Date(inv.issue_date); return d >= cursor && d <= weekEnd; }).reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
        const cash = payments.filter((p: any) => { const d = new Date(p.payment_date || p.created_at); return d >= cursor && d <= weekEnd; }).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
        const overdue = allOverdue.filter((inv: any) => { const d = new Date(inv.due_date); return d >= cursor && d <= weekEnd; }).reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
        revenueChartData.push({ month: key, revenue, cash, overdue });
        cursor = addDays(cursor, 7);
      }
    } else {
      // Monthly buckets bounded by actual range
      const monthCount = Math.ceil(chartDays / 30);
      for (let i = monthCount - 1; i >= 0; i--) {
        const mDate = subMonths(chartTo, i);
        const k = fmt(mDate, "MMM yy");
        const mS = startOfMonth(mDate);
        const mE = endOfMonth(mDate);
        const revenue = paidInvoices.filter((inv: any) => { const d = new Date(inv.issue_date); return d >= mS && d <= mE; }).reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
        const cash = payments.filter((p: any) => { const d = new Date(p.payment_date || p.created_at); return d >= mS && d <= mE; }).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
        const overdue = allOverdue.filter((inv: any) => { const d = new Date(inv.due_date); return d >= mS && d <= mE; }).reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
        revenueChartData.push({ month: k, revenue, cash, overdue });
      }
    }

    // ── REVENUE BY JOB TYPE ─────────────────────────────────────────
    const jobTypeMap: Record<string, string> = {};
    jobs.forEach((j: any) => { jobTypeMap[j.id] = matchJobType(j.title); });
    // Map invoices to job types via quote_id or customer correlation
    const revenueByType: Record<string, { revenue: number; count: number }> = {};
    // Direct: invoices linked to jobs via quotes
    const quoteToJob: Record<string, string> = {};
    jobs.forEach((j: any) => { /* jobs don't directly link to quotes, but invoices have quote_id */ });
    // Use invoice's job connection: find jobs for each customer and assign types
    const custJobTypes: Record<string, string> = {};
    jobs.forEach((j: any) => {
      const jt = matchJobType(j.title);
      if (jt !== "Other" || !custJobTypes[j.customer_id]) custJobTypes[j.customer_id] = jt;
    });
    invoices.filter((i: any) => !["cancelled","draft"].includes(i.status)).forEach((inv: any) => {
      const jt = custJobTypes[inv.customer_id] || "Other";
      if (!revenueByType[jt]) revenueByType[jt] = { revenue: 0, count: 0 };
      revenueByType[jt].revenue += Number(inv.total) || 0;
      revenueByType[jt].count++;
    });
    const revenueByJobType = Object.entries(revenueByType)
      .map(([type, d]) => ({ type, revenue: d.revenue, count: d.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── QUOTE FUNNEL ────────────────────────────────────────────────
    const acceptedQ = quotes.filter((q: any) => q.status === "accepted");
    const acceptedIds = new Set(acceptedQ.map((q: any) => q.id));
    const invoicedQIds = new Set(invoices.filter((i: any) => i.quote_id && acceptedIds.has(i.quote_id)).map((i: any) => i.quote_id));
    const approvedQ = acceptedQ.filter((q: any) => !invoicedQIds.has(q.id));
    const wonQ = acceptedQ.filter((q: any) => invoicedQIds.has(q.id));
    const lostQ = quotes.filter((q: any) => q.status === "declined");
    const sentQ = quotes.filter((q: any) => ["sent","accepted","declined"].includes(q.status));
    const d2w = acceptedQ.map((q: any) => Math.max(0, diffDays(new Date(q.updated_at || q.created_at), new Date(q.created_at))));
    const avgDaysToWin = d2w.length > 0 ? Math.round(d2w.reduce((s: number, d: number) => s + d, 0) / d2w.length) : 0;
    const quoteFunnel = {
      created: quotes.length, sent: sentQ.length, approved: approvedQ.length, won: wonQ.length, lost: lostQ.length,
      createdValue: quotes.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0),
      sentValue: sentQ.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0),
      approvedValue: approvedQ.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0),
      wonValue: wonQ.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0),
      lostValue: lostQ.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0),
      avgDaysToWin, staleQuotes: staleQuotes.length,
    };

    // ── INVOICE AGING ───────────────────────────────────────────────
    const agingBuckets: Record<string, number> = { current: 0, "1-30": 0, "31-60": 0, "60+": 0 };
    const agingInvoices: Record<string, any[]> = { current: [], "1-30": [], "31-60": [], "60+": [] };
    outstandingInvoices.forEach((inv: any) => {
      const dov = diffDays(now, new Date(inv.due_date));
      const bucket = dov <= 0 ? "current" : dov <= 30 ? "1-30" : dov <= 60 ? "31-60" : "60+";
      agingBuckets[bucket] += Number(inv.total) || 0;
      agingInvoices[bucket].push({ id: inv.id, invoiceNumber: inv.display_number, client: inv.customer?.name || "Unknown", amount: Number(inv.total) || 0, daysOverdue: Math.max(0, dov) });
    });

    // ── TOP CUSTOMERS ───────────────────────────────────────────────
    const custRev: Record<string, any> = {};
    paidInvoices.forEach((inv: any) => {
      const cid = inv.customer_id; const name = inv.customer?.name || "Unknown";
      if (!custRev[cid]) custRev[cid] = { id: cid, name, revenue: 0, jobCount: 0, invoiceCount: 0 };
      custRev[cid].revenue += Number(inv.total) || 0; custRev[cid].invoiceCount++;
    });
    jobs.forEach((j: any) => { if (custRev[j.customer_id]) custRev[j.customer_id].jobCount++; });
    const topCustomers = Object.values(custRev).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 8);

    // ── CUSTOMER PROFITABILITY SCATTER ───────────────────────────────
    const custProfit: Record<string, { revenue: number; profit: number; jobCount: number; costCount: number }> = {};
    (profitR.data || []).forEach((r: any) => {
      const cid = r.customer_id;
      if (!custProfit[cid]) custProfit[cid] = { revenue: 0, profit: 0, jobCount: 0, costCount: 0 };
      custProfit[cid].revenue += Number(r.estimated_value) || 0;
      custProfit[cid].profit += Number(r.profit) || 0;
      custProfit[cid].jobCount++;
      if (Number(r.total_cost) > 0) custProfit[cid].costCount++;
    });
    const customerProfitability = Object.entries(custProfit)
      .filter(([, d]) => d.revenue > 0 && d.costCount > 0)
      .map(([cid, d]) => {
        const ps = scoreMap[cid] || { avgDaysToPay: 0, lateRate: 0 };
        const row = (profitR.data || []).find((r: any) => r.customer_id === cid) as any;
        return { id: cid, name: row?.customer_name || "Unknown", revenue: d.revenue, profit: d.profit, profitMargin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0, jobCount: d.jobCount, avgDaysToPay: ps.avgDaysToPay, latePaymentRate: ps.lateRate };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 30);

    // ── JOBS AT RISK ────────────────────────────────────────────────
    const jobsAtRisk = stuckJobs
      .sort((a: any, b: any) => diffDays(now, new Date(a.updated_at || a.created_at)) - diffDays(now, new Date(b.updated_at || b.created_at))).reverse().slice(0, 10)
      .map((j: any) => ({ id: j.id, title: j.title, customer: j.customer?.name || "Unknown", status: j.status, daysInStage: diffDays(now, new Date(j.updated_at || j.created_at)), value: Number(j.estimated_value) || 0 }));

    // ── INVOICE RISK TABLE ──────────────────────────────────────────
    const custOver: Record<string, { customer: string; totalDue: number; oldestDate: string; invoices: any[] }> = {};
    allOverdue.forEach((inv: any) => {
      const cid = inv.customer_id; const name = inv.customer?.name || "Unknown";
      if (!custOver[cid]) custOver[cid] = { customer: name, totalDue: 0, oldestDate: new Date().toISOString(), invoices: [] };
      custOver[cid].totalDue += Number(inv.total) || 0;
      if (new Date(inv.due_date) < new Date(custOver[cid].oldestDate)) custOver[cid].oldestDate = inv.due_date;
      custOver[cid].invoices.push(inv);
    });
    const invoicesAtRisk = Object.entries(custOver).map(([id, data]) => {
      const dov = diffDays(now, new Date(data.oldestDate));
      const ps = scoreMap[id] || { avgDaysToPay: 0, lateRate: 0 };
      const riskPoints = Math.round((Math.min(dov, 120) / 120 * 60) + (ps.lateRate / 100 * 30) + (Math.min(data.totalDue / 10000, 1) * 10));
      return { id, customer: data.customer, totalDue: data.totalDue, oldestInvoice: fmt(new Date(data.oldestDate), "dd MMM"), daysOverdue: dov, riskScore: riskPoints > 50 ? "high" : riskPoints > 25 ? "medium" : "low", riskPoints, avgDaysToPay: ps.avgDaysToPay, latePaymentRate: ps.lateRate };
    }).sort((a, b) => b.riskPoints - a.riskPoints).slice(0, 10);

    // ── DRILL DATA ──────────────────────────────────────────────────
    const activeJobsList = activeJobs.map((j: any) => ({ id: j.id, title: j.title, client: j.customer?.name || "Unknown", status: j.status, date: j.scheduled_date, value: j.estimated_value }));
    const outstandingList = outstandingInvoices.map((inv: any) => ({ id: inv.id, invoiceNumber: inv.display_number, client: inv.customer?.name || "Unknown", amount: Number(inv.total) || 0, daysOverdue: Math.max(0, diffDays(now, new Date(inv.due_date))), dueDate: inv.due_date }));
    const pendingQuotesList = pendingQuotes.map((q: any) => ({ id: q.id, quoteNumber: q.quote_number, client: q.customer?.name || "Unknown", amount: Number(q.total) || 0, date: q.created_at }));

    const today = fmt(now, "yyyy-MM-dd");
    const nextWeekStr = fmt(addDays(now, 7), "yyyy-MM-dd");
    const jobsDueThisWeek = jobs.filter((j: any) => j.scheduled_date && j.scheduled_date >= today && j.scheduled_date <= nextWeekStr && ["pending","scheduled","in_progress"].includes(j.status))
      .sort((a: any, b: any) => a.scheduled_date.localeCompare(b.scheduled_date)).slice(0, 10)
      .map((j: any) => ({ id: j.id, client: j.customer?.name || "Unknown", job: j.title, date: j.scheduled_date, value: j.estimated_value }));

    const overdueList = allOverdue.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 10)
      .map((inv: any) => ({ id: inv.id, client: inv.customer?.name || "Unknown", invoiceNumber: inv.display_number, amount: Number(inv.total) || 0, daysOverdue: diffDays(now, new Date(inv.due_date)) }));

    const metrics = { activeJobs: activeJobs.length, activeJobsTrend: jobsThisWeek - jobsLastWeek, revenueMTD: revenueInRange, revenueGoal, outstandingAmount, outstandingCount: outstandingInvoices.length, pendingQuotesAmount, pendingQuotesCount: pendingQuotes.length };

    const statusLabels: Record<string, string> = { scheduled: "Scheduled", in_progress: "In Progress", completed: "Completed", pending: "Pending", cancelled: "Cancelled" };
    const statusColors: Record<string, string> = { scheduled: "hsl(221,83%,53%)", in_progress: "hsl(38,92%,50%)", completed: "hsl(142,71%,45%)", pending: "hsl(262,83%,58%)", cancelled: "hsl(0,84%,60%)" };
    const jsc: Record<string, number> = {};
    jobs.forEach((j: any) => { jsc[j.status] = (jsc[j.status] || 0) + 1; });
    const jobStatusData = Object.entries(jsc).map(([status, count]) => ({ status: statusLabels[status] || status, rawStatus: status, count, color: statusColors[status] || "hsl(220,9%,46%)" }));

    const insights = actionAlerts.map((a: any) => ({ id: a.id, type: a.severity === "critical" ? "warning" : a.severity === "warning" ? "info" : "success", message: a.message, cta: "View", href: a.href }));

    const result = {
      metrics, controlHeader, kpi, actionAlerts, revenueChartData, jobStatusData, quoteFunnel,
      agingBuckets, agingInvoices, topCustomers, customerProfitability,
      jobsAtRisk, invoicesAtRisk, revenueByJobType,
      drillData: { activeJobs: activeJobsList, outstanding: outstandingList, pendingQuotes: pendingQuotesList },
      jobsDueThisWeek, overdueInvoices: overdueList, insights, healthInsights: [],
    };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("dashboard-analytics error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
