import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";
import { DRAG_JOB_ID_MIME } from "./DraggableJobCard";

interface DroppableCellProps {
  id: string;
  date: Date;
  hour?: number;
  children: ReactNode;
  className?: string;
  hasJobs?: boolean;
  jobCount?: number;
  onJobDrop?: (payload: { jobId: string; date: Date; hour?: number }) => void;
  onSlotClick?: (date: Date, hour?: number) => void;
}

export function DroppableCell({
  id,
  date,
  hour,
  children,
  className,
  hasJobs = false,
  jobCount = 0,
  onJobDrop,
  onSlotClick,
}: DroppableCellProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(false);

    const jobId =
      event.dataTransfer.getData(DRAG_JOB_ID_MIME) ||
      event.dataTransfer.getData("text/plain");

    if (!jobId) return;
    onJobDrop?.({ jobId, date, hour });
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only fire if clicking on the cell itself, not on a child job card
    if ((event.target as HTMLElement).closest("[data-job-card]")) return;
    onSlotClick?.(date, hour);
  };

  return (
    <div
      id={id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "transition-colors relative cursor-pointer group",
        isOver && "bg-primary/10 ring-2 ring-primary ring-inset",
        hasJobs && !isOver && "bg-primary/5",
        !hasJobs && "hover:bg-muted/50",
        className
      )}
    >
      {!hasJobs && onSlotClick && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-xs text-muted-foreground">+ Schedule</span>
        </div>
      )}
      {hasJobs && (
        <div className="absolute top-1 right-1 flex items-center gap-1">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              jobCount === 1 && "bg-primary/60",
              jobCount === 2 && "bg-amber-500/70",
              jobCount >= 3 && "bg-destructive/70"
            )}
            title={`${jobCount} job${jobCount > 1 ? "s" : ""} scheduled`}
          />
        </div>
      )}
      {children}
    </div>
  );
}
