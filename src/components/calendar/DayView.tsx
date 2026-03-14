import { useMemo } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Job } from "@/hooks/useJobs";
import { DraggableJobCard } from "./DraggableJobCard";
import { DroppableCell } from "./DroppableCell";

interface DayViewProps {
  currentDate: Date;
  jobs: Job[];
  onJobClick: (job: Job) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

export function DayView({ currentDate, jobs, onJobClick }: DayViewProps) {
  const dayJobs = jobs.filter((job) => {
    if (!job.scheduled_date) return false;
    return isSameDay(new Date(job.scheduled_date), currentDate);
  });

  const parseTimeToHour = (time: string | null): number | null => {
    if (!time) return null;
    const [hours] = time.split(":").map(Number);
    return hours;
  };

  const getJobsForHour = (hour: number) => {
    return dayJobs.filter((job) => {
      const jobHour = parseTimeToHour(job.scheduled_time);
      return jobHour === hour;
    });
  };

  // Pre-compute busy slots for visual indicators
  const busySlots = useMemo(() => {
    const slots: Record<number, number> = {};
    dayJobs.forEach((job) => {
      const hour = parseTimeToHour(job.scheduled_time);
      if (hour !== null) {
        slots[hour] = (slots[hour] || 0) + 1;
      }
    });
    return slots;
  }, [dayJobs]);

  const unscheduledTimeJobs = dayJobs.filter((job) => !job.scheduled_time);
  const dateKey = format(currentDate, "yyyy-MM-dd");

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-muted p-4 border-b text-center relative">
        <div className="text-sm font-medium text-muted-foreground">
          {format(currentDate, "EEEE")}
        </div>
        <div
          className={cn(
            "text-2xl font-bold w-12 h-12 mx-auto flex items-center justify-center rounded-full mt-1",
            isToday(currentDate) && "bg-primary text-primary-foreground"
          )}
        >
          {format(currentDate, "d")}
        </div>
        {/* Day summary */}
        {dayJobs.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
              dayJobs.length <= 2 && "bg-primary/10 text-primary",
              dayJobs.length > 2 && dayJobs.length <= 4 && "bg-amber-500/10 text-amber-600",
              dayJobs.length > 4 && "bg-destructive/10 text-destructive"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                dayJobs.length <= 2 && "bg-primary",
                dayJobs.length > 2 && dayJobs.length <= 4 && "bg-amber-500",
                dayJobs.length > 4 && "bg-destructive"
              )} />
              {dayJobs.length} job{dayJobs.length > 1 ? 's' : ''} scheduled
            </span>
          </div>
        )}
      </div>

      {/* All-day / unscheduled section */}
      {unscheduledTimeJobs.length > 0 && (
        <div className="p-3 border-b bg-muted/50">
          <div className="text-xs text-muted-foreground mb-2">All Day / No Time Set</div>
          <div className="space-y-1">
            {unscheduledTimeJobs.map((job) => (
              <DraggableJobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="overflow-auto max-h-[600px]">
        {HOURS.map((hour) => {
          const hourJobs = getJobsForHour(hour);
          const jobCount = busySlots[hour] || 0;
          
          return (
            <div key={hour} className="grid grid-cols-[80px_1fr] min-h-[60px] border-b last:border-b-0">
              <div className={cn(
                "p-2 text-sm text-muted-foreground border-r text-right pr-3",
                jobCount > 0 ? "bg-primary/5" : "bg-muted/30"
              )}>
                <div className="flex items-center justify-end gap-2">
                  {jobCount > 0 && (
                    <div 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        jobCount === 1 && "bg-primary/60",
                        jobCount === 2 && "bg-amber-500/70",
                        jobCount >= 3 && "bg-destructive/70"
                      )}
                    />
                  )}
                  {format(new Date().setHours(hour, 0, 0, 0), "h:mm a")}
                </div>
              </div>
              <DroppableCell
                id={`day-${dateKey}-${hour}`}
                date={currentDate}
                hour={hour}
                className="p-2 min-h-[60px]"
                hasJobs={jobCount > 0}
                jobCount={jobCount}
              >
                {hourJobs.length > 0 && (
                  <div className="space-y-1">
                    {hourJobs.map((job) => (
                      <DraggableJobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
                    ))}
                  </div>
                )}
              </DroppableCell>
            </div>
          );
        })}
      </div>
    </div>
  );
}
