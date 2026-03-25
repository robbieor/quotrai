import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, AlertCircle, TrendingUp, CheckCircle2, ChevronDown } from "lucide-react";
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
    bg: "bg-destructive/8",
    border: "border-destructive/25",
    iconColor: "text-destructive",
    valueColor: "text-destructive font-bold",
    dot: "bg-destructive",
  },
  warning: {
    icon: AlertCircle,
    bg: "bg-amber-500/8",
    border: "border-amber-500/25",
    iconColor: "text-amber-500",
    valueColor: "text-amber-600 font-semibold",
    dot: "bg-amber-500",
  },
  opportunity: {
    icon: TrendingUp,
    bg: "bg-primary/8",
    border: "border-primary/25",
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
      <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-4 py-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
        <p className="text-xs text-foreground">
          {segment !== "all"
            ? `No alerts for this focus — try "All Data" for the full picture.`
            : "All clear — no issues or opportunities right now."}
        </p>
      </div>
    );
  }

  const sorted = [...visibleAlerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, opportunity: 2 };
    return order[a.severity] - order[b.severity];
  });

  const criticalCount = sorted.filter(a => a.severity === "critical").length;
  const warningCount = sorted.filter(a => a.severity === "warning").length;

  // Collapsed: single summary row
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 w-full text-left hover:bg-muted/30 transition-colors"
      >
        {criticalCount > 0 ? (
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        )}
        <span className="text-xs text-foreground flex-1">
          {sorted.length} item{sorted.length !== 1 ? "s" : ""} need{sorted.length === 1 ? "s" : ""} attention
          {criticalCount > 0 && <span className="text-destructive font-medium ml-1">({criticalCount} critical)</span>}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
    );
  }

  // Expanded: full alert list
  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setExpanded(false)}
        className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
      >
        ▾ {sorted.length} alert{sorted.length !== 1 ? "s" : ""}
      </button>
      {sorted.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors hover:bg-muted/30",
              config.bg, config.border
            )}
            onClick={() => navigate(alert.href)}
          >
            <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
            <Icon className={cn("h-3.5 w-3.5 shrink-0", config.iconColor)} />
            <p className="text-sm text-foreground flex-1 truncate">{alert.message}</p>
            <span className={cn("text-sm tabular-nums shrink-0", config.valueColor)}>
              {alert.isCurrency && alert.rawValue != null ? formatCurrency(alert.rawValue) : alert.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
