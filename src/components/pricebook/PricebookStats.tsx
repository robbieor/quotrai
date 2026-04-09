import { Package, Store, TrendingUp, AlertTriangle } from "lucide-react";

interface PricebookStatsProps {
  totalItems: number;
  totalSuppliers: number;
  avgMargin: number;
  lowMarginCount: number;
}

export function PricebookStats({ totalItems, totalSuppliers, avgMargin, lowMarginCount }: PricebookStatsProps) {
  const stats = [
    { label: "Total Items", value: totalItems.toLocaleString(), icon: Package, color: "text-primary" },
    { label: "Suppliers", value: totalSuppliers.toLocaleString(), icon: Store, color: "text-foreground" },
    { label: "Avg Margin", value: `${avgMargin.toFixed(1)}%`, icon: TrendingUp, color: avgMargin >= 20 ? "text-primary" : "text-foreground" },
    { label: "Low Margin", value: lowMarginCount.toLocaleString(), icon: AlertTriangle, color: lowMarginCount > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-2xl font-semibold leading-none tracking-[-0.02em]">{s.value}</p>
            </div>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
