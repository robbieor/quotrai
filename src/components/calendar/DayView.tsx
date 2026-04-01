import { useMemo } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Job } from "@/hooks/useJobs";
import { DraggableJobCard } from "./DraggableJobCard";
import { DroppableCell } from "./DroppableCell";
import { TravelChip } from "./RouteOptimizer";

interface DayViewProps {
  currentDate: Date;
  jobs: Job[];
  onJobClick: (job: Job) => void;
  onJobDrop: (payload: { jobId: string; date: Date; hour?: number }) => void;
  onJobDragStart: (job: Job) => void;
  onJobDragEnd: () => void;
  onSlotClick?: (date: Date, hour?: number) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

export function DayView({
  currentDate,
  jobs,
  onJobClick,
  onJobDrop,
  onJobDragStart,
  onJobDragEnd,
  onSlotClick,
}: DayViewProps) {
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
      {/* All-day / unscheduled section (moved to top, no redundant date header) */}
      {unscheduledTimeJobs.length > 0 && (
        <div className="p-3 border-b bg-muted/50">
          <div className="text-xs text-muted-foreground mb-2">All Day / No Time Set</div>
          <div className="space-y-1">
            {unscheduledTimeJobs.map((job) => (
              <DraggableJobCard
                key={job.id}
                job={job}
                onClick={() => onJobClick(job)}
                onJobDragStart={onJobDragStart}
                onJobDragEnd={onJobDragEnd}
              />
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
            <div key={hour} className="grid grid-cols-[56px_1fr] min-h-[56px] border-b last:border-b-0">
              <div className={cn(
                "p-1 text-[11px] text-muted-foreground border-r text-right pr-2",
                jobCount > 0 ? "bg-primary/5" : "bg-muted/30"
              )}>
                <div className="flex items-center justify-end gap-1">
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
                  {format(new Date().setHours(hour, 0, 0, 0), "ha").toLowerCase()}
                </div>
              </div>
              <DroppableCell
                id={`day-${dateKey}-${hour}`}
                date={currentDate}
                hour={hour}
                className="p-2 min-h-[60px]"
                hasJobs={jobCount > 0}
                jobCount={jobCount}
                onJobDrop={onJobDrop}
                onSlotClick={onSlotClick}
              >
                {hourJobs.length > 0 && (
                  <div className="space-y-1">
                    {hourJobs.map((job, jobIdx) => {
                      // Find previous job in the day for travel chip
                      const allScheduled = dayJobs
                        .filter((j) => j.scheduled_time)
                        .sort((a, b) => (a.scheduled_time || "").localeCompare(b.scheduled_time || ""));
                      const jobGlobalIdx = allScheduled.findIndex((j) => j.id === job.id);
                      const prevJob = jobGlobalIdx > 0 ? allScheduled[jobGlobalIdx - 1] : null;

                      return (
                        <div key={job.id}>
                          {prevJob && jobIdx === 0 && (
                            <TravelChip from={prevJob} to={job} />
                          )}
                          <DraggableJobCard
                            job={job}
                            onClick={() => onJobClick(job)}
                            onJobDragStart={onJobDragStart}
                            onJobDragEnd={onJobDragEnd}
                          />
                        </div>
                      );
                    })}
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
