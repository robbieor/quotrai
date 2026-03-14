import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DroppableCellProps {
  id: string;
  date: Date;
  hour?: number;
  children: ReactNode;
  className?: string;
  hasJobs?: boolean;
  jobCount?: number;
}

export function DroppableCell({ 
  id, 
  date, 
  hour, 
  children, 
  className,
  hasJobs = false,
  jobCount = 0
}: DroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { date, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors relative",
        isOver && "bg-primary/10 ring-2 ring-primary ring-inset",
        hasJobs && !isOver && "bg-primary/5",
        className
      )}
    >
      {/* Busy indicator dot */}
      {hasJobs && (
        <div className="absolute top-1 right-1 flex items-center gap-1">
          <div 
            className={cn(
              "w-2 h-2 rounded-full",
              jobCount === 1 && "bg-primary/60",
              jobCount === 2 && "bg-amber-500/70",
              jobCount >= 3 && "bg-destructive/70"
            )}
            title={`${jobCount} job${jobCount > 1 ? 's' : ''} scheduled`}
          />
        </div>
      )}
      {children}
    </div>
  );
}
