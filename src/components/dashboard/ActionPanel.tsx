import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, AlertCircle, TrendingUp, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import type { ActionAlert } from "@/hooks/useDashboardAnalytics";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useSeatAccess } from "@/hooks/useSeatAccess";

interface ActionPanelProps {
  alerts: ActionAlert[] | undefined;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: "bg-destructive/6",
    border: "border-destructive/20",
    iconColor: "text-destructive",
    valueColor: "text-destructive font-bold",
    dot: "bg-destructive",
  },
  warning: {
    icon: AlertCircle,
    bg: "bg-amber-500/6",
    border: "border-amber-500/20",
    iconColor: "text-amber-500",
    valueColor: "text-amber-600 font-semibold",
    dot: "bg-amber-500",
  },
  opportunity: {
    icon: TrendingUp,
    bg: "bg-primary/6",
    border: "border-primary/20",
    iconColor: "text-primary",
    valueColor: "text-primary font-semibold",
    dot: "bg-primary",
  },
};

export function ActionPanel({ alerts }: ActionPanelProps) {
  const navigate = useNavigate();
  const { segment } = useDashboardFilters();
  const { formatCurrency } = useCurrency();
  const { canAccessGeorge } = useSeatAccess();
  const [expanded, setExpanded] = useState(false);

  const visibleAlerts = alerts?.filter(
    (a) => canAccessGeorge || a.severity !== "opportunity"
  );

  if (!visibleAlerts || visibleAlerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-primary/[0.03] px-5 py-3.5">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-foreground">
          {segment !== "all"
            ? `Nothing flagged for this view — switch to "All" for the full picture.`
            : "All clear — operations running smoothly."}
        </p>
      </div>
    );
  }

  const sorted = [...visibleAlerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, opportunity: 2 };
    return order[a.severity] - order[b.severity];
  });

  const criticalCount = sorted.filter(a => a.severity === "critical").length;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 w-full text-left hover:shadow-medium transition-all duration-300 shadow-premium"
      >
        {criticalCount > 0 ? (
          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground flex-1">
          {sorted.length} item{sorted.length !== 1 ? "s" : ""} need{sorted.length === 1 ? "s" : ""} your attention
          {criticalCount > 0 && <span className="text-destructive ml-1">({criticalCount} urgent)</span>}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-premium overflow-hidden">
      <button
        onClick={() => setExpanded(false)}
        className="flex items-center gap-2 px-5 py-3 w-full text-left border-b border-border/40 hover:bg-muted/20 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground flex-1">
          What needs attention
        </span>
        <span className="text-xs text-muted-foreground">{sorted.length} item{sorted.length !== 1 ? "s" : ""}</span>
        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      <div className="p-2 space-y-1">
        {sorted.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all duration-200 hover:shadow-sm",
                config.bg, config.border
              )}
              onClick={() => navigate(alert.href)}
            >
              <Icon className={cn("h-4 w-4 shrink-0", config.iconColor)} />
              <p className="text-sm text-foreground flex-1 truncate">{alert.message}</p>
              <span className={cn("text-sm tabular-nums shrink-0", config.valueColor)}>
                {alert.isCurrency && alert.rawValue != null ? formatCurrency(alert.rawValue) : alert.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
