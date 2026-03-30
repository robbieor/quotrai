import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { Job } from "@/hooks/useJobs";
import { DraggableJobCard } from "./DraggableJobCard";
import { DroppableCell } from "./DroppableCell";

interface MonthViewProps {
  currentDate: Date;
  jobs: Job[];
  onJobClick: (job: Job) => void;
  onJobDrop: (payload: { jobId: string; date: Date; hour?: number }) => void;
  onJobDragStart: (job: Job) => void;
  onJobDragEnd: () => void;
  onSlotClick?: (date: Date, hour?: number) => void;
}

export function MonthView({
  currentDate,
  jobs,
  onJobClick,
  onJobDrop,
  onJobDragStart,
  onJobDragEnd,
}: MonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const getJobsForDay = (day: Date) => {
    return jobs.filter((job) => {
      if (!job.scheduled_date) return false;
      return isSameDay(new Date(job.scheduled_date), day);
    });
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted">
        {weekdays.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayJobs = getJobsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dateKey = format(day, "yyyy-MM-dd");
          
          return (
            <DroppableCell
              key={day.toISOString()}
              id={`month-${dateKey}`}
              date={day}
              onJobDrop={onJobDrop}
              className={cn(
                "min-h-[120px] p-1 border-b border-r",
                index % 7 === 0 && "border-l-0",
                !isCurrentMonth && "bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "text-sm mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                  !isCurrentMonth && "text-muted-foreground",
                  isToday(day) && "bg-primary text-primary-foreground font-semibold"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1 overflow-hidden">
                {dayJobs.slice(0, 3).map((job) => (
                  <DraggableJobCard
                    key={job.id}
                    job={job}
                    onClick={() => onJobClick(job)}
                    onJobDragStart={onJobDragStart}
                    onJobDragEnd={onJobDragEnd}
                    compact
                  />
                ))}
                {dayJobs.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">+{dayJobs.length - 3} more</div>
                )}
              </div>
            </DroppableCell>
          );
        })}
      </div>
    </div>
  );
}
