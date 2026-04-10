import { useNavigate } from "react-router-dom";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  type: "warning" | "success" | "info";
  message: string;
  cta: string;
  href: string;
}

interface InsightAlertsProps {
  insights: Insight[] | undefined;
}

const icons = {
  warning: AlertTriangle,
  success: TrendingUp,
  info: Info,
};

const styles = {
  warning: "border-destructive/30 bg-destructive/5",
  success: "border-primary/30 bg-primary/5",
  info: "border-border bg-muted/30",
};

export function InsightAlerts({ insights }: InsightAlertsProps) {
  const navigate = useNavigate();

  if (!insights || insights.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:overflow-x-auto sm:pb-1 sm:-mx-1 sm:px-1 sm:scrollbar-hide">
      {insights.map((insight) => {
        const Icon = icons[insight.type];
        return (
          <div
            key={insight.id}
            className={cn(
              "flex items-center gap-3 border rounded-lg p-3 w-full sm:min-w-[280px] sm:shrink-0",
              styles[insight.type]
            )}
          >
            <Icon className={cn(
              "h-4 w-4 shrink-0",
              insight.type === "warning" ? "text-destructive" : insight.type === "success" ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="text-sm text-foreground flex-1">{insight.message}</p>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => navigate(insight.href)}
            >
              {insight.cta}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
