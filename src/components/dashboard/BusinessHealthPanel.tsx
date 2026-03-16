import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Calendar, Users, Receipt, FileText, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface HealthInsight {
  id: string;
  icon: "revenue_up" | "revenue_down" | "revenue_flat" | "quotes_good" | "quotes_bad" | "overdue" | "workload_gap" | "top_customer" | "jobs_busy";
  headline: string;
  detail: string;
  sentiment: "positive" | "negative" | "neutral";
  cta?: { label: string; href: string };
}

const ICON_MAP = {
  revenue_up: TrendingUp,
  revenue_down: TrendingDown,
  revenue_flat: Activity,
  quotes_good: CheckCircle2,
  quotes_bad: FileText,
  overdue: Receipt,
  workload_gap: Calendar,
  top_customer: Users,
  jobs_busy: CheckCircle2,
};

const SENTIMENT_STYLES = {
  positive: {
    border: "border-primary/30",
    bg: "bg-primary/5",
    icon: "text-primary",
    dot: "bg-primary",
  },
  negative: {
    border: "border-destructive/30",
    bg: "bg-destructive/5",
    icon: "text-destructive",
    dot: "bg-destructive",
  },
  neutral: {
    border: "border-border",
    bg: "bg-muted/30",
    icon: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

interface BusinessHealthPanelProps {
  insights: HealthInsight[] | undefined;
  isLoading?: boolean;
}

export function BusinessHealthPanel({ insights, isLoading }: BusinessHealthPanelProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) return null;

  // Determine overall health from sentiments
  const negCount = insights.filter((i) => i.sentiment === "negative").length;
  const posCount = insights.filter((i) => i.sentiment === "positive").length;
  const overallLabel =
    negCount >= 2 ? "Needs Attention" : posCount > negCount ? "Looking Good" : "Steady";
  const overallColor =
    negCount >= 2 ? "text-destructive" : posCount > negCount ? "text-primary" : "text-muted-foreground";

  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Activity className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Business Health</h2>
              <p className={cn("text-xs font-medium", overallColor)}>{overallLabel}</p>
            </div>
          </div>
        </div>

        {/* Insight cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.slice(0, 5).map((insight) => {
            const Icon = ICON_MAP[insight.icon] || Activity;
            const style = SENTIMENT_STYLES[insight.sentiment];

            return (
              <div
                key={insight.id}
                className={cn(
                  "rounded-lg border p-3.5 transition-colors",
                  style.border,
                  style.bg
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 shrink-0", style.icon)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {insight.headline}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {insight.detail}
                    </p>
                    {insight.cta && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs font-medium"
                        onClick={() => navigate(insight.cta!.href)}
                      >
                        {insight.cta.label} →
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
