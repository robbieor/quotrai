import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import type { ControlHeaderData } from "@/hooks/useDashboardAnalytics";

interface ControlHeaderProps {
  data: ControlHeaderData | undefined;
  isLoading?: boolean;
  onDrillDown?: (metric: string) => void;
}

export function ControlHeader({ data, isLoading, onDrillDown }: ControlHeaderProps) {
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

  const tiles = [
    {
      key: "overdue",
      label: "Overdue",
      value: formatCurrency(data.totalOverdue),
      sub: `${data.overdueCount} invoice${data.overdueCount !== 1 ? "s" : ""}`,
      highlight: data.overdueCount > 0,
      highlightClass: "text-destructive",
    },
    {
      key: "staleQuotes",
      label: "Stale Quotes",
      value: String(data.quotesNeedFollowUp),
      sub: `${formatCurrency(data.quotesFollowUpValue)} at risk`,
      highlight: data.quotesNeedFollowUp > 0,
      highlightClass: "text-amber-500",
    },
    {
      key: "stuckJobs",
      label: "Stuck Jobs",
      value: String(data.stuckJobs),
      sub: "7+ days no progress",
      highlight: data.stuckJobs > 0,
      highlightClass: "text-amber-500",
    },
    {
      key: "status",
      label: "Status",
      value: (data.overdueCount > 0 || data.quotesNeedFollowUp > 0 || data.stuckJobs > 0) ? "Needs Action" : "On Track",
      sub: (data.overdueCount > 0 || data.quotesNeedFollowUp > 0 || data.stuckJobs > 0) ? "Issues found" : "All clear",
      highlight: data.overdueCount > 0 || data.quotesNeedFollowUp > 0 || data.stuckJobs > 0,
      highlightClass: "text-amber-500",
      defaultClass: "text-primary",
      hideOnMobile: true,
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="h-[2px] bg-primary/50" />
      <div className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory sm:grid sm:grid-cols-4 divide-x divide-border">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={cn(
              "p-3 text-center min-w-[120px] shrink-0 snap-start sm:min-w-0 sm:shrink transition-all duration-200 group relative",
              tile.hideOnMobile && "hidden sm:block",
              onDrillDown && "cursor-pointer hover:bg-muted/20"
            )}
            onClick={() => onDrillDown?.(tile.key)}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{tile.label}</p>
            <p className={cn(
              "text-lg font-bold tabular-nums",
              tile.highlight ? tile.highlightClass : (tile.defaultClass || "text-foreground")
            )}>
              {tile.value}
            </p>
            <p className="text-[10px] text-muted-foreground">{tile.sub}</p>
            {onDrillDown && (
              <span className="absolute top-1.5 right-1.5 text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors duration-200">
                ↗
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
