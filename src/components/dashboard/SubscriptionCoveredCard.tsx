import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SubscriptionCoveredData } from "@/hooks/useDashboardAnalytics";
import { useCurrency } from "@/hooks/useCurrency";
import { TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";

interface Props {
  data?: SubscriptionCoveredData;
  isLoading?: boolean;
}

export function SubscriptionCoveredCard({ data, isLoading }: Props) {
  const { formatCurrency } = useCurrency();

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          <div className="h-3 w-full bg-muted animate-pulse rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const { feeEarned, subscriptionCost, percentCovered } = data;
  const capped = Math.min(percentCovered, 100);

  const isFullyCovered = percentCovered >= 100;
  const isLow = percentCovered < 50;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Subscription Covered
          </span>
          {isFullyCovered ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : isLow ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : (
            <TrendingUp className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-foreground">{percentCovered}%</span>
          <span className="text-xs text-muted-foreground">covered</span>
        </div>

        <Progress value={capped} className="h-2" />

        <p className="text-xs text-muted-foreground">
          {formatCurrency(feeEarned)} earned of {formatCurrency(subscriptionCost)}/mo
        </p>

        <p className={`text-xs font-medium ${isFullyCovered ? "text-green-600" : isLow ? "text-amber-600" : "text-muted-foreground"}`}>
          {isFullyCovered
            ? "Subscription paid for itself! 🎉"
            : isLow
              ? "Process more payments to offset your subscription"
              : "On track — keep processing payments"}
        </p>
      </CardContent>
    </Card>
  );
}
