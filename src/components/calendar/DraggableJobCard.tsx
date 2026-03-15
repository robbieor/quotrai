import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Job, JobStatus } from "@/hooks/useJobs";
import { GripVertical } from "lucide-react";

interface DraggableJobCardProps {
  job: Job;
  onClick: () => void;
  compact?: boolean;
  onJobDragStart?: (job: Job) => void;
  onJobDragEnd?: () => void;
}

export const DRAG_JOB_ID_MIME = "application/x-quotr-job-id";

const statusColors: Record<JobStatus, string> = {
  pending: "bg-yellow-100 border-yellow-300 text-yellow-800",
  scheduled: "bg-blue-100 border-blue-300 text-blue-800",
  in_progress: "bg-purple-100 border-purple-300 text-purple-800",
  completed: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-gray-100 border-gray-300 text-gray-800",
};

export function DraggableJobCard({
  job,
  onClick,
  compact = false,
  onJobDragStart,
  onJobDragEnd,
}: DraggableJobCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    try {
      event.dataTransfer.setData(DRAG_JOB_ID_MIME, job.id);
      event.dataTransfer.setData("text/plain", job.id);
    } catch {
      // no-op
    }
    event.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    onJobDragStart?.(job);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onJobDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "w-full text-left rounded border px-2 py-1 transition-all cursor-grab active:cursor-grabbing group",
        statusColors[job.status],
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary z-50"
      )}
    >
      <div className="flex items-center gap-1">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <GripVertical className={cn("text-current", compact ? "h-3 w-3" : "h-4 w-4")} />
        </span>
        <button onClick={onClick} className="flex-1 text-left min-w-0">
          <div className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>{job.title}</div>
          {!compact && job.customers?.name && (
            <div className="text-xs opacity-75 truncate">{job.customers.name}</div>
          )}
          {!compact && job.scheduled_time && (
            <div className="text-xs opacity-75">{job.scheduled_time.slice(0, 5)}</div>
          )}
        </button>
      </div>
    </div>
  );
}
