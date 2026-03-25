import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import type { KPIData } from "@/hooks/useDashboardAnalytics";
import { useDashboardFilters, type TimePreset } from "@/contexts/DashboardFilterContext";
import { useIsMobile } from "@/hooks/use-mobile";

function getTimeSuffix(preset: TimePreset): string {
  switch (preset) {
    case "7d": return "7D";
    case "30d": return "30D";
    case "this_month": return "MTD";
    case "last_month": return "Last Month";
    case "ytd": return "YTD";
    case "custom": return "Period";
  }
}

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
        "bg-card border border-border rounded-lg p-3 transition-all duration-200 min-w-0 group relative",
        onClick && "cursor-pointer hover:border-primary/40 hover:bg-muted/20 hover:shadow-sm"
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
      {onClick && (
        <span className="absolute top-2 right-2 text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors duration-200">
          Click to drill ↗
        </span>
      )}
    </div>
  );
}

export function KPIStrip({ data, isLoading, onDrillDown }: KPIStripProps) {
  const { formatCurrency } = useCurrency();
  const { timePreset } = useDashboardFilters();
  const isMobile = useIsMobile();
  const suffix = getTimeSuffix(timePreset);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
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

  // Primary 3 cards always visible
  const primaryCards = [
    <KPICard
      key="revenue"
      label={`Revenue ${suffix}`}
      value={formatCurrency(data.revenueMTD)}
      subMetric={`vs ${formatCurrency(data.revenueLastMonth)} ${data.comparisonLabel || "prev period"}`}
      context={`${changeDir === "positive" ? "+" : changeDir === "negative" ? "-" : ""}${changePct}% ${data.comparisonLabel || "vs prev period"}`}
      contextType={changeDir as "positive" | "negative" | "neutral"}
    />,
    <KPICard
      key="ar"
      label="Outstanding AR"
      value={formatCurrency(data.outstandingAR)}
      subMetric={`${data.outstandingARCount} invoice${data.outstandingARCount !== 1 ? "s" : ""}`}
      context={data.overdue30PlusCount > 0 ? `${data.overdue30PlusCount} overdue 30+` : "No overdue risk"}
      contextType={data.overdue30PlusCount > 0 ? "negative" : "positive"}
      onClick={() => onDrillDown?.("outstanding")}
    />,
    <KPICard
      key="jobs"
      label="Active Jobs"
      value={String(data.activeJobs)}
      subMetric={data.stuckJobs > 0 ? `${data.stuckJobs} stuck` : "All progressing"}
      context={data.stuckJobs > 0 ? `${data.stuckJobs} need attention` : "On track"}
      contextType={data.stuckJobs > 0 ? "negative" : "positive"}
      onClick={() => onDrillDown?.("jobs")}
    />,
  ];

  // Secondary cards behind "View all"
  const secondaryCards = [
    <KPICard
      key="cash"
      label={`Cash Collected ${suffix}`}
      value={formatCurrency(data.cashCollectedMTD)}
      subMetric={`${data.cashCollectedCount} payment${data.cashCollectedCount !== 1 ? "s" : ""}`}
      onClick={() => onDrillDown?.("cash")}
    />,
    <KPICard
      key="overdue30"
      label="30+ Day Overdue"
      value={formatCurrency(data.overdue30Plus)}
      subMetric={`${data.overdue30PlusCount} invoice${data.overdue30PlusCount !== 1 ? "s" : ""}`}
      context={data.overdue30PlusCount > 0 ? "Requires escalation" : "All current"}
      contextType={data.overdue30PlusCount > 0 ? "negative" : "positive"}
      onClick={() => onDrillDown?.("overdue30")}
    />,
  ];

  const mobilePrimary = isMobile && !showAll ? primaryCards.slice(0, 3) : primaryCards;

  return (
    <div className="space-y-2">
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
        {mobilePrimary}
      </div>
      {showAll && (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
          {secondaryCards}
        </div>
      )}
      {!showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary font-medium hover:underline w-full text-center py-1"
        >
          View all metrics
        </button>
      )}
    </div>
  );
}
