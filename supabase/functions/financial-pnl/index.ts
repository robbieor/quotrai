import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_LABOUR_RATE = 35;

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function startOfQuarter(d: Date) { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); }
function endOfQuarter(d: Date) { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function endOfYear(d: Date) { return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999); }
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function resolvePeriod(period: string, fromDate?: string, toDate?: string) {
  const now = new Date();
  if (period === "this_month") return { from: startOfMonth(now), to: endOfMonth(now), label: "This Month" };
  if (period === "last_month") {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from: startOfMonth(lm), to: endOfMonth(lm), label: "Last Month" };
  }
  if (period === "quarter") return { from: startOfQuarter(now), to: endOfQuarter(now), label: "This Quarter" };
  if (period === "ytd") return { from: startOfYear(now), to: endOfYear(now), label: "Year to Date" };
  if (period === "custom" && fromDate && toDate) {
    return { from: new Date(fromDate), to: new Date(`${toDate}T23:59:59`), label: "Custom Range" };
  }
  return { from: startOfMonth(now), to: endOfMonth(now), label: "This Month" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { period = "this_month", fromDate, toDate, labourRate = DEFAULT_LABOUR_RATE } = body as Record<string, any>;

    const { from, to, label } = resolvePeriod(period, fromDate, toDate);
    const fromStr = fmtDate(from);
    const toStr = fmtDate(to);

    // ── Pull all data in parallel ──────────────────────────────────
    const [paymentsR, invoicesR, expensesR, materialsR, timeR] = await Promise.all([
      // Revenue: actual cash collected (payments) in period
      supabase
        .from("payments")
        .select("id, amount, payment_date")
        .gte("payment_date", fromStr)
        .lte("payment_date", toStr),
      // Invoices issued in period (for billed-revenue alt view)
      supabase
        .from("invoices")
        .select("id, total, status, issue_date")
        .gte("issue_date", fromStr)
        .lte("issue_date", toStr),
      // Expenses in period
      supabase
        .from("expenses")
        .select("id, amount, category, expense_date, vendor, description")
        .gte("expense_date", fromStr)
        .lte("expense_date", toStr),
      // Materials charged on jobs created in period
      supabase
        .from("job_materials")
        .select("unit_cost, quantity, created_at")
        .gte("created_at", `${fromStr}T00:00:00`)
        .lte("created_at", `${toStr}T23:59:59`),
      // Time entries clocked in period
      supabase
        .from("time_entries")
        .select("clock_in_at, clock_out_at, is_billable")
        .gte("clock_in_at", `${fromStr}T00:00:00`)
        .lte("clock_in_at", `${toStr}T23:59:59`),
    ]);

    const payments = paymentsR.data || [];
    const invoices = invoicesR.data || [];
    const expenses = expensesR.data || [];
    const materials = materialsR.data || [];
    const timeEntries = timeR.data || [];

    // ── Compute totals ─────────────────────────────────────────────
    const cashRevenue = payments.reduce((s, p: any) => s + (Number(p.amount) || 0), 0);
    const billedRevenue = invoices
      .filter((i: any) => !["draft", "cancelled"].includes(i.status))
      .reduce((s, i: any) => s + (Number(i.total) || 0), 0);

    const materialsCost = materials.reduce(
      (s, m: any) => s + (Number(m.unit_cost) || 0) * (Number(m.quantity) || 1),
      0
    );

    const labourHours = timeEntries.reduce((s, t: any) => {
      if (!t.clock_in_at) return s;
      const end = t.clock_out_at ? new Date(t.clock_out_at) : new Date();
      const ms = end.getTime() - new Date(t.clock_in_at).getTime();
      return s + Math.max(0, ms / 3_600_000);
    }, 0);
    const labourCost = labourHours * Number(labourRate);

    const expensesTotal = expenses.reduce((s, e: any) => s + (Number(e.amount) || 0), 0);

    // Expenses by category breakdown
    const byCategory: Record<string, { amount: number; count: number }> = {};
    expenses.forEach((e: any) => {
      const cat = e.category || "other";
      if (!byCategory[cat]) byCategory[cat] = { amount: 0, count: 0 };
      byCategory[cat].amount += Number(e.amount) || 0;
      byCategory[cat].count += 1;
    });
    const expensesByCategory = Object.entries(byCategory)
      .map(([category, d]) => ({ category, amount: d.amount, count: d.count }))
      .sort((a, b) => b.amount - a.amount);

    const totalCosts = materialsCost + labourCost + expensesTotal;
    const netProfit = cashRevenue - totalCosts;
    const grossMargin = cashRevenue > 0 ? (netProfit / cashRevenue) * 100 : 0;

    const result = {
      period: { from: fromStr, to: toStr, label },
      revenue: {
        cash: cashRevenue,
        billed: billedRevenue,
        paymentsCount: payments.length,
        invoicesCount: invoices.length,
      },
      costs: {
        materials: materialsCost,
        labour: labourCost,
        labourHours: Math.round(labourHours * 10) / 10,
        labourRate: Number(labourRate),
        expenses: expensesTotal,
        expensesCount: expenses.length,
        total: totalCosts,
      },
      expensesByCategory,
      profit: {
        net: netProfit,
        marginPct: Math.round(grossMargin * 10) / 10,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("financial-pnl error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
