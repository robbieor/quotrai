import { useMemo, useState } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Job } from "@/hooks/useJobs";
import { DraggableJobCard } from "./DraggableJobCard";
import { DroppableCell } from "./DroppableCell";

interface WeekViewProps {
  currentDate: Date;
  jobs: Job[];
  onJobClick: (job: Job) => void;
  onJobDrop: (payload: { jobId: string; date: Date; hour?: number }) => void;
  onJobDragStart: (job: Job) => void;
  onJobDragEnd: () => void;
  onSlotClick?: (date: Date, hour?: number) => void;
  hourSlots?: number[];
}

const formatHourShort = (hour: number) => {
  const h = hour % 12 || 12;
  return `${h}${hour < 12 ? "a" : "p"}`;
};

export function WeekView({
  currentDate,
  jobs,
  onJobClick,
  onJobDrop,
  onJobDragStart,
  onJobDragEnd,
  onSlotClick,
}: WeekViewProps) {
  const isMobile = useIsMobile();
  const [showWeekends, setShowWeekends] = useState(false);

  const allDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  const days = useMemo(() => {
    if (isMobile && !showWeekends) return allDays.filter((d) => !isWeekend(d));
    return allDays;
  }, [allDays, isMobile, showWeekends]);

  const getJobsForDay = (day: Date) => {
    return jobs.filter((job) => {
      if (!job.scheduled_date) return false;
      return isSameDay(new Date(job.scheduled_date), day);
    });
  };

  const parseTimeToHour = (time: string | null): number | null => {
    if (!time) return null;
    const [hours] = time.split(":").map(Number);
    return hours;
  };

  // Pre-compute busy slots for visual indicators
  const busySlots = useMemo(() => {
    const slots: Record<string, number> = {};
    jobs.forEach((job) => {
      if (!job.scheduled_date) return;
      const dateKey = job.scheduled_date;
      const hour = parseTimeToHour(job.scheduled_time);
      
      if (hour !== null) {
        const key = `${dateKey}-${hour}`;
        slots[key] = (slots[key] || 0) + 1;
      }
    });
    return slots;
  }, [jobs]);

  const colCount = days.length + (isMobile ? 0 : 1); // +1 for time gutter on desktop

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Mobile weekday/weekend toggle */}
      {isMobile && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
          <span className="text-[12px] text-muted-foreground">{showWeekends ? "7 days" : "Mon – Fri"}</span>
          <button
            onClick={() => setShowWeekends(!showWeekends)}
            className="text-[12px] font-medium text-primary"
          >
            {showWeekends ? "Hide weekends" : "Show weekends"}
          </button>
        </div>
      )}

      {/* Header with day names */}
      <div className={cn("grid bg-muted border-b")} style={{ gridTemplateColumns: isMobile ? `repeat(${days.length}, 1fr)` : `auto repeat(${days.length}, 1fr)` }}>
        {!isMobile && (
          <div className="p-2 text-center text-sm font-medium text-muted-foreground border-r">
            Time
          </div>
        )}
        {days.map((day) => {
          const dayJobs = getJobsForDay(day);
          const hasJobs = dayJobs.length > 0;
          
          return (
            <div key={day.toISOString()} className={cn("p-1.5 md:p-2 text-center border-r last:border-r-0 relative")}>
              <div className="text-[11px] md:text-sm font-medium text-muted-foreground">
                {format(day, isMobile ? "EEE" : "EEE")}
              </div>
              <div
                className={cn(
                  "text-[14px] md:text-lg font-semibold w-7 h-7 md:w-8 md:h-8 mx-auto flex items-center justify-center rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </div>
              {hasJobs && (
                <div className="absolute top-1 right-1">
                  <div 
                    className={cn(
                      "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                      dayJobs.length <= 2 && "bg-primary/60",
                      dayJobs.length > 2 && dayJobs.length <= 4 && "bg-amber-500/70",
                      dayJobs.length > 4 && "bg-destructive/70"
                    )}
                    title={`${dayJobs.length} job${dayJobs.length > 1 ? 's' : ''} this day`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-auto max-h-[600px]">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid border-b last:border-b-0"
            style={{ gridTemplateColumns: isMobile ? `repeat(${days.length}, 1fr)` : `auto repeat(${days.length}, 1fr)`, minHeight: isMobile ? 48 : 60 }}
          >
            {!isMobile && (
              <div className="p-2 text-xs text-muted-foreground border-r text-right pr-3">
                {format(new Date().setHours(hour, 0, 0, 0), "h a")}
              </div>
            )}
            {days.map((day) => {
              const dayJobs = getJobsForDay(day);
              const hourJobs = dayJobs.filter((job) => {
                const jobHour = parseTimeToHour(job.scheduled_time);
                return jobHour === hour;
              });
              const unscheduledJobs = hour === 7 ? dayJobs.filter((job) => !job.scheduled_time) : [];
              const dateKey = format(day, "yyyy-MM-dd");
              const slotKey = `${dateKey}-${hour}`;
              const jobCount = busySlots[slotKey] || 0;

              return (
                <DroppableCell
                  key={`${dateKey}-${hour}`}
                  id={`week-${dateKey}-${hour}`}
                  date={day}
                  hour={hour}
                  className={cn("border-r last:border-r-0 p-0.5 md:p-1", isMobile ? "min-h-[48px]" : "min-h-[60px]")}
                  hasJobs={jobCount > 0}
                  jobCount={jobCount}
                  onJobDrop={onJobDrop}
                  onSlotClick={onSlotClick}
                >
                  {[...hourJobs, ...unscheduledJobs].map((job) => (
                    <DraggableJobCard
                      key={job.id}
                      job={job}
                      onClick={() => onJobClick(job)}
                      onJobDragStart={onJobDragStart}
                      onJobDragEnd={onJobDragEnd}
                      compact
                    />
                  ))}
                </DroppableCell>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
