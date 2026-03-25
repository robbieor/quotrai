import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Briefcase, Sparkles, Receipt } from "lucide-react";
import type { ControlHeaderData } from "@/hooks/useDashboardAnalytics";
import tomAvatar from "@/assets/tom-avatar.png";

interface ControlHeaderProps {
  data: ControlHeaderData | undefined;
  isLoading?: boolean;
  showAI?: boolean;
}

export function ControlHeader({ data, isLoading, showAI = true }: ControlHeaderProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <Skeleton className="h-8 w-64" />;
  }

  if (!data || !showAI) return null;

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="h-6 w-6 rounded-md overflow-hidden border border-primary/20 shrink-0">
        <img src={tomAvatar} alt="AI" className="w-full h-full object-cover" />
      </div>
      <p className="text-xs text-muted-foreground truncate">
        <span className="font-medium text-foreground">Foreman:</span> {data.aiRecommendation}
      </p>
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        {data.overdueCount > 0 && (
          <Button size="sm" variant="destructive" className="h-6 text-[11px] gap-1 px-2" onClick={() => navigate("/invoices?status=overdue")}>
            <Receipt className="h-3 w-3" /> Chase
          </Button>
        )}
        {data.quotesNeedFollowUp > 0 && (
          <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2" onClick={() => navigate("/quotes?status=sent")}>
            <FileText className="h-3 w-3" /> Quotes
          </Button>
        )}
        {data.stuckJobs > 0 && (
          <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2" onClick={() => navigate("/jobs?status=in_progress")}>
            <Briefcase className="h-3 w-3" /> Jobs
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1 px-2 text-primary" onClick={() => navigate("/george")}>
          <Sparkles className="h-3 w-3" /> Ask AI
        </Button>
      </div>
    </div>
  );
}
