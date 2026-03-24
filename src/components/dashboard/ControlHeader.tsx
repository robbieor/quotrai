import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText, Briefcase, Sparkles, Receipt } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import type { ControlHeaderData } from "@/hooks/useDashboardAnalytics";
import tomAvatar from "@/assets/tom-avatar.png";

interface ControlHeaderProps {
  data: ControlHeaderData | undefined;
  isLoading?: boolean;
}

export function ControlHeader({ data, isLoading }: ControlHeaderProps) {
  const navigate = useNavigate();
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
    <div className="rounded-lg border border-border bg-card">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-b border-border overflow-x-auto">
        <div className="p-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Overdue</p>
          <p className={`text-lg font-bold tabular-nums ${data.overdueCount > 0 ? "text-destructive" : "text-foreground"}`}>
            {formatCurrency(data.totalOverdue)}
          </p>
          <p className="text-[10px] text-muted-foreground">{data.overdueCount} invoice{data.overdueCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Stale Quotes</p>
          <p className={`text-lg font-bold tabular-nums ${data.quotesNeedFollowUp > 0 ? "text-amber-500" : "text-foreground"}`}>
            {data.quotesNeedFollowUp}
          </p>
          <p className="text-[10px] text-muted-foreground">{formatCurrency(data.quotesFollowUpValue)} at risk</p>
        </div>
        <div className="p-3 text-center">
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

      {/* AI Recommendation + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="h-7 w-7 rounded-lg overflow-hidden border border-primary/20 shrink-0">
            <img src={tomAvatar} alt="AI" className="w-full h-full object-cover" />
          </div>
          <p className="text-sm text-muted-foreground truncate">
            <span className="font-medium text-foreground">Foreman AI:</span> {data.aiRecommendation}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {data.overdueCount > 0 && (
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => navigate("/invoices?status=overdue")}>
              <Receipt className="h-3 w-3" /> Chase
            </Button>
          )}
          {data.quotesNeedFollowUp > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate("/quotes?status=sent")}>
              <FileText className="h-3 w-3" /> Quotes
            </Button>
          )}
          {data.stuckJobs > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate("/jobs?status=in_progress")}>
              <Briefcase className="h-3 w-3" /> Jobs
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary" onClick={() => navigate("/george")}>
            <Sparkles className="h-3 w-3" /> Ask AI
          </Button>
        </div>
      </div>
    </div>
  );
}
