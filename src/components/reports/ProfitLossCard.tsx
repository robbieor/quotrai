import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancialPnL, type PnLPeriod } from "@/hooks/useFinancialPnL";
import { useCurrency } from "@/hooks/useCurrency";
import { Download, TrendingUp, TrendingDown, Package, Clock, Receipt, DollarSign, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenses";

const periodOptions: { value: PnLPeriod; label: string }[] = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "quarter", label: "Quarter" },
  { value: "ytd", label: "YTD" },
];

export function ProfitLossCard() {
  const [period, setPeriod] = useState<PnLPeriod>("this_month");
  const { data, isLoading } = useFinancialPnL(period);
  const { formatCurrency } = useCurrency();

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ["Profit & Loss Statement"],
      [`Period: ${data.period.label} (${data.period.from} → ${data.period.to})`],
      [],
      ["Section", "Line Item", "Amount"],
      ["Revenue", "Cash collected (paid invoices)", data.revenue.cash.toFixed(2)],
      ["Revenue", "Billed (invoiced) revenue", data.revenue.billed.toFixed(2)],
      [],
      ["Costs", "Materials", data.costs.materials.toFixed(2)],
      ["Costs", `Labour (${data.costs.labourHours}h × ${data.costs.labourRate})`, data.costs.labour.toFixed(2)],
      ["Costs", "Expenses (overheads)", data.costs.expenses.toFixed(2)],
      ["Costs", "Total costs", data.costs.total.toFixed(2)],
      [],
      ["Profit", "Net profit", data.profit.net.toFixed(2)],
      ["Profit", "Margin %", `${data.profit.marginPct}%`],
      [],
      ["Expense Breakdown by Category"],
      ["Category", "Amount", "Count"],
      ...data.expensesByCategory.map((c) => {
        const label = EXPENSE_CATEGORIES.find((x) => x.value === c.category)?.label || c.category;
        return [label, c.amount.toFixed(2), String(c.count)];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-loss-${data.period.from}-to-${data.period.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            Profit &amp; Loss
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {data ? data.period.label : "Loading…"} · cash basis (paid invoices vs costs incurred)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PnLPeriod)}>
            <TabsList className="h-8">
              {periodOptions.map((p) => (
                <TabsTrigger key={p.value} value={p.value} className="text-xs px-2.5">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!data}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : data ? (
          <>
            {/* Headline numbers */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue</p>
                <p className="text-lg font-bold tabular-nums mt-1">{formatCurrency(data.revenue.cash)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{data.revenue.paymentsCount} payment{data.revenue.paymentsCount !== 1 ? "s" : ""}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Costs</p>
                <p className="text-lg font-bold tabular-nums mt-1">{formatCurrency(data.costs.total)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">materials + labour + expenses</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Net Profit</p>
                <p className={cn("text-lg font-bold tabular-nums mt-1", data.profit.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {formatCurrency(data.profit.net)}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {data.profit.net >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                  <span className="text-[10px] text-muted-foreground">{data.profit.marginPct}% margin</span>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Billed Revenue</p>
                <p className="text-lg font-bold tabular-nums mt-1">{formatCurrency(data.revenue.billed)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{data.revenue.invoicesCount} invoice{data.revenue.invoicesCount !== 1 ? "s" : ""} issued</p>
              </div>
            </div>

            <Separator />

            {/* Line-by-line breakdown */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Revenue (paid invoices)</span>
                <span className="font-semibold tabular-nums">{formatCurrency(data.revenue.cash)}</span>
              </div>

              <div className="space-y-1.5 pl-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    Materials
                  </span>
                  <span className="tabular-nums">− {formatCurrency(data.costs.materials)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Labour ({data.costs.labourHours}h × {formatCurrency(data.costs.labourRate)})
                  </span>
                  <span className="tabular-nums">− {formatCurrency(data.costs.labour)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5" />
                    Expenses ({data.costs.expensesCount})
                  </span>
                  <span className="tabular-nums">− {formatCurrency(data.costs.expenses)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-base">
                <span className="font-bold">Net Profit</span>
                <div className="flex items-center gap-2">
                  <span className={cn("font-bold tabular-nums", data.profit.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    {formatCurrency(data.profit.net)}
                  </span>
                  <Badge variant={data.profit.net >= 0 ? "default" : "destructive"} className="text-[10px]">
                    {data.profit.marginPct}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Expense category breakdown */}
            {data.expensesByCategory.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expense Breakdown</p>
                  </div>
                  <div className="space-y-2">
                    {data.expensesByCategory.slice(0, 6).map((c) => {
                      const label = EXPENSE_CATEGORIES.find((x) => x.value === c.category)?.label || c.category;
                      const pct = data.costs.expenses > 0 ? (c.amount / data.costs.expenses) * 100 : 0;
                      return (
                        <div key={c.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="tabular-nums font-medium">{formatCurrency(c.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No data available for this period.</p>
        )}
      </CardContent>
    </Card>
  );
}
