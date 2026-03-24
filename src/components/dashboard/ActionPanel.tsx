import { useNavigate } from "react-router-dom";
import { AlertTriangle, AlertCircle, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionAlert } from "@/hooks/useDashboardAnalytics";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";

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

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-4 py-2.5">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-foreground">
          {segment !== "all"
            ? `No alerts for this focus — try switching to "All Data" for the full picture.`
            : "All clear — no critical issues, warnings, or opportunities right now."}
        </p>
      </div>
    );
  }

  // Sort: critical first, then warning, then opportunity
  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, opportunity: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-1.5">
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
            <span className={cn("text-sm tabular-nums shrink-0", config.valueColor)}>{alert.value}</span>
          </div>
        );
      })}
    </div>
  );
}
