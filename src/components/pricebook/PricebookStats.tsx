import { Package, Store, TrendingUp, AlertTriangle } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface PricebookStatsProps {
  totalItems: number;
  totalSuppliers: number;
  avgMargin: number;
  lowMarginCount: number;
}

export function PricebookStats({ totalItems, totalSuppliers, avgMargin, lowMarginCount }: PricebookStatsProps) {
  const { formatCurrency } = useCurrency();

  const stats = [
    { label: "Total Items", value: totalItems.toLocaleString(), icon: Package, color: "text-primary" },
    { label: "Suppliers", value: totalSuppliers.toLocaleString(), icon: Store, color: "text-blue-500" },
    { label: "Avg Margin", value: `${avgMargin.toFixed(1)}%`, icon: TrendingUp, color: avgMargin >= 20 ? "text-emerald-500" : "text-amber-500" },
    { label: "Low Margin", value: lowMarginCount.toLocaleString(), icon: AlertTriangle, color: lowMarginCount > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
          <s.icon className={`h-5 w-5 ${s.color} flex-shrink-0`} />
          <div>
            <p className="text-lg font-bold leading-tight">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
