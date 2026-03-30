import { format } from "date-fns";
import { CalendarPlus, Briefcase } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Job } from "@/hooks/useJobs";
import { useCurrency } from "@/hooks/useCurrency";

interface ScheduleJobPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  hour?: number;
  unscheduledJobs: Job[];
  onSelectJob: (job: Job) => void;
  onCreateNew: () => void;
}

export function ScheduleJobPicker({
  open,
  onOpenChange,
  date,
  hour,
  unscheduledJobs,
  onSelectJob,
  onCreateNew,
}: ScheduleJobPickerProps) {
  const { formatCurrency } = useCurrency();
  const timeLabel = hour !== undefined ? ` at ${String(hour).padStart(2, "0")}:00` : "";
  const dateLabel = format(date, "EEE, MMM d");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">
            Schedule for {dateLabel}{timeLabel}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          <Button onClick={onCreateNew} className="w-full gap-2" size="lg">
            <CalendarPlus className="h-4 w-4" />
            Create New Job
          </Button>

          {unscheduledJobs.length > 0 && (
            <>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
                Or schedule an existing job
              </div>
              <ScrollArea className="h-[calc(70vh-200px)]">
                <div className="space-y-2 pr-2">
                  {unscheduledJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => onSelectJob(job)}
                      className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{job.title}</div>
                            {job.customers && (
                              <div className="text-xs text-muted-foreground truncate">
                                {(job.customers as { name: string }).name}
                              </div>
                            )}
                          </div>
                        </div>
                        {job.estimated_value != null && (
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {formatCurrency(job.estimated_value)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {unscheduledJobs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No unscheduled jobs — create a new one above.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
