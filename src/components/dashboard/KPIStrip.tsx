import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import type { KPIData } from "@/hooks/useDashboardAnalytics";

interface KPIStripProps {
  data: KPIData | undefined;
  isLoading?: boolean;
  onDrillDown?: (metric: string) => void;
}

interface KPICardProps {
  label: string;
  value: string;
  subMetric: string;
  context?: string;
  contextType?: "positive" | "negative" | "neutral";
  onClick?: () => void;
}

function KPICard({ label, value, subMetric, context, contextType = "neutral", onClick }: KPICardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg p-3 transition-colors min-w-0",
        onClick && "cursor-pointer hover:border-primary/40 hover:bg-muted/20"
      )}
      onClick={onClick}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 truncate">{label}</p>
      <p className="text-xl font-bold text-foreground tabular-nums leading-tight truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subMetric}</p>
      {context && (
        <div className={cn(
          "flex items-center gap-1 mt-1.5 text-[10px] font-medium",
          contextType === "positive" && "text-primary",
          contextType === "negative" && "text-destructive",
          contextType === "neutral" && "text-muted-foreground",
        )}>
          {contextType === "positive" && <TrendingUp className="h-2.5 w-2.5" />}
          {contextType === "negative" && <TrendingDown className="h-2.5 w-2.5" />}
          {contextType === "neutral" && <Minus className="h-2.5 w-2.5" />}
          <span className="truncate">{context}</span>
        </div>
      )}
    </div>
  );
}

export function KPIStrip({ data, isLoading, onDrillDown }: KPIStripProps) {
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-20 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const changeDir = data.revenueChangePercent > 0 ? "positive" : data.revenueChangePercent < 0 ? "negative" : "neutral";
  const changePct = Math.abs(data.revenueChangePercent).toFixed(0);

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      <KPICard
        label="Cash Collected MTD"
        value={formatCurrency(data.cashCollectedMTD)}
        subMetric={`${data.cashCollectedCount} payment${data.cashCollectedCount !== 1 ? "s" : ""}`}
        onClick={() => onDrillDown?.("cash")}
      />
      <KPICard
        label="Outstanding AR"
        value={formatCurrency(data.outstandingAR)}
        subMetric={`${data.outstandingARCount} invoice${data.outstandingARCount !== 1 ? "s" : ""}`}
        context={data.overdue30PlusCount > 0 ? `${data.overdue30PlusCount} overdue 30+` : "No overdue risk"}
        contextType={data.overdue30PlusCount > 0 ? "negative" : "positive"}
        onClick={() => onDrillDown?.("outstanding")}
      />
      <KPICard
        label="30+ Day Overdue"
        value={formatCurrency(data.overdue30Plus)}
        subMetric={`${data.overdue30PlusCount} invoice${data.overdue30PlusCount !== 1 ? "s" : ""}`}
        context={data.overdue30PlusCount > 0 ? "Requires escalation" : "All current"}
        contextType={data.overdue30PlusCount > 0 ? "negative" : "positive"}
        onClick={() => onDrillDown?.("overdue30")}
      />
      <KPICard
        label="Revenue MTD"
        value={formatCurrency(data.revenueMTD)}
        subMetric={`vs ${formatCurrency(data.revenueLastMonth)} last month`}
        context={`${changeDir === "positive" ? "+" : changeDir === "negative" ? "-" : ""}${changePct}% vs last month`}
        contextType={changeDir as "positive" | "negative" | "neutral"}
      />
      <KPICard
        label="Active Jobs"
        value={String(data.activeJobs)}
        subMetric={data.stuckJobs > 0 ? `${data.stuckJobs} stuck` : "All progressing"}
        context={data.stuckJobs > 0 ? `${data.stuckJobs} need attention` : "On track"}
        contextType={data.stuckJobs > 0 ? "negative" : "positive"}
        onClick={() => onDrillDown?.("jobs")}
      />
    </div>
  );
}
