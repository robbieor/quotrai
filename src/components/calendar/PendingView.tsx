import { CalendarCheck, Clock, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/hooks/useJobs";
import { useCurrency } from "@/hooks/useCurrency";

interface PendingViewProps {
  jobs: Job[];
  onSchedule: (job: Job) => void;
  onJobClick: (job: Job) => void;
}

export function PendingView({ jobs, onSchedule, onJobClick }: PendingViewProps) {
  const { formatCurrency } = useCurrency();

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CalendarCheck className="h-8 w-8 text-primary" />
        </div>
        <p className="text-[16px] font-semibold text-foreground">No Pending Jobs</p>
        <p className="text-[13px] text-muted-foreground mt-1">All jobs are scheduled</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-[13px] font-medium text-muted-foreground">
          {jobs.length} pending job{jobs.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border rounded-[14px] overflow-hidden bg-card divide-y divide-border">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onJobClick(job)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold truncate">{job.title}</span>
                <Badge variant="outline" className="text-[11px] shrink-0 h-5">
                  {job.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {job.customer_id && (
                  <span className="text-[13px] text-muted-foreground truncate flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {(job as any).customers?.name || "Customer"}
                  </span>
                )}
                <span className="text-[12px] text-muted-foreground">
                  · {format(new Date(job.created_at), "d MMM")}
                </span>
              </div>
              {job.estimated_value != null && (
                <span className="text-[13px] font-medium text-foreground mt-0.5 block tabular-nums">
                  {formatAmount(job.estimated_value)}
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8 text-[12px] rounded-full px-3"
              onClick={(e) => {
                e.stopPropagation();
                onSchedule(job);
              }}
            >
              Schedule
            </Button>

            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
