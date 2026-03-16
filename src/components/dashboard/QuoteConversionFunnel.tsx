import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface FunnelProps {
  funnel: { created: number; sent: number; won: number; createdValue: number; sentValue: number; wonValue: number } | undefined;
}

export function QuoteConversionFunnel({ funnel }: FunnelProps) {
  const { formatCompact } = useCurrency();

  if (!funnel || funnel.created === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Quote Conversion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No quote data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stages = [
    { label: "Created", count: funnel.created, value: funnel.createdValue, widthPct: 100 },
    { label: "Sent", count: funnel.sent, value: funnel.sentValue, widthPct: funnel.created > 0 ? (funnel.sent / funnel.created) * 100 : 0 },
    { label: "Won", count: funnel.won, value: funnel.wonValue, widthPct: funnel.created > 0 ? (funnel.won / funnel.created) * 100 : 0 },
  ];

  const conversionRate = funnel.sent > 0 ? ((funnel.won / funnel.sent) * 100).toFixed(0) : "0";

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Quote Conversion</CardTitle>
          <span className="text-sm font-semibold text-primary">{conversionRate}% win rate</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, i) => (
          <div key={stage.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{stage.label}</span>
              <span className="text-muted-foreground">{stage.count} · {formatCompact(stage.value)}</span>
            </div>
            <div className="h-8 bg-muted rounded-md overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-md transition-all duration-500 flex items-center px-3",
                  i === 0 ? "bg-primary/20" : i === 1 ? "bg-primary/40" : "bg-primary"
                )}
                style={{ width: `${Math.max(stage.widthPct, 8)}%` }}
              >
                <span className={cn("text-xs font-medium", i === 2 ? "text-primary-foreground" : "text-foreground")}>
                  {stage.widthPct.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
