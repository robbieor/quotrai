import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import type { QuoteFunnelData } from "@/hooks/useDashboardAnalytics";

interface QuotePipelineCardProps {
  data: QuoteFunnelData | undefined;
}

interface FunnelStep {
  label: string;
  count: number;
  value: number;
  color: string;
}

export function QuotePipelineCard({ data }: QuotePipelineCardProps) {
  const { formatCurrency } = useCurrency();

  if (!data) return null;

  const steps: FunnelStep[] = [
    { label: "Created", count: data.created, value: data.createdValue, color: "bg-muted-foreground" },
    { label: "Sent", count: data.sent, value: data.sentValue, color: "bg-blue-500" },
    { label: "Accepted", count: data.won, value: data.wonValue, color: "bg-primary" },
    { label: "Lost", count: data.lost, value: data.lostValue, color: "bg-destructive" },
  ];

  const conversionRate = data.sent > 0 ? ((data.won / data.sent) * 100).toFixed(0) : "0";

  return (
    <Card className="border-border">
      <CardHeader className="pb-1 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Quote Pipeline</CardTitle>
          <Badge variant="outline" className="text-[10px] font-medium">
            {conversionRate}% win rate
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Funnel bars */}
        <div className="space-y-2.5 mb-4">
          {steps.map((step) => {
            const maxCount = Math.max(...steps.map((s) => s.count), 1);
            const pct = (step.count / maxCount) * 100;
            return (
              <div key={step.label}>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="font-medium text-foreground">{step.label}</span>
                  <span className="text-muted-foreground tabular-nums">{step.count} · {formatCurrency(step.value)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", step.color)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Days to Win</p>
            <p className="text-base font-bold text-foreground tabular-nums">{data.avgDaysToWin || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Stale (7+ days)</p>
            <p className={cn("text-base font-bold tabular-nums", data.staleQuotes > 0 ? "text-amber-500" : "text-foreground")}>
              {data.staleQuotes}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
