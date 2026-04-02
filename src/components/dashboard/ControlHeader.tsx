import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import type { ControlHeaderData } from "@/hooks/useDashboardAnalytics";

interface ControlHeaderProps {
  data: ControlHeaderData | undefined;
  isLoading?: boolean;
}

export function ControlHeader({ data, isLoading }: ControlHeaderProps) {
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasIssues = data.overdueCount > 0 || data.quotesNeedFollowUp > 0 || data.stuckJobs > 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="h-[2px] bg-primary/50" />
      <div className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory sm:grid sm:grid-cols-4 divide-x divide-border">
        <div className="p-3 text-center min-w-[120px] shrink-0 snap-start sm:min-w-0 sm:shrink">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Overdue</p>
          <p className={`text-lg font-bold tabular-nums ${data.overdueCount > 0 ? "text-destructive" : "text-foreground"}`}>
            {formatCurrency(data.totalOverdue)}
          </p>
          <p className="text-[10px] text-muted-foreground">{data.overdueCount} invoice{data.overdueCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="p-3 text-center min-w-[120px] shrink-0 snap-start sm:min-w-0 sm:shrink">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Stale Quotes</p>
          <p className={`text-lg font-bold tabular-nums ${data.quotesNeedFollowUp > 0 ? "text-amber-500" : "text-foreground"}`}>
            {data.quotesNeedFollowUp}
          </p>
          <p className="text-[10px] text-muted-foreground">{formatCurrency(data.quotesFollowUpValue)} at risk</p>
        </div>
        <div className="p-3 text-center min-w-[120px] shrink-0 snap-start sm:min-w-0 sm:shrink">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Stuck Jobs</p>
          <p className={`text-lg font-bold tabular-nums ${data.stuckJobs > 0 ? "text-amber-500" : "text-foreground"}`}>
            {data.stuckJobs}
          </p>
          <p className="text-[10px] text-muted-foreground">7+ days no progress</p>
        </div>
        <div className="p-3 text-center hidden sm:block">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
          <p className={`text-lg font-bold ${hasIssues ? "text-amber-500" : "text-primary"}`}>
            {hasIssues ? "Needs Action" : "On Track"}
          </p>
          <p className="text-[10px] text-muted-foreground">{hasIssues ? "Issues found" : "All clear"}</p>
        </div>
      </div>
    </div>
  );
}