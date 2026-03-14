import { cn } from "@/lib/utils";
import type { Job, JobStatus } from "@/hooks/useJobs";

interface JobCardProps {
  job: Job;
  onClick: () => void;
  compact?: boolean;
}

const statusColors: Record<JobStatus, string> = {
  pending: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
  scheduled: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
  cancelled: "bg-muted border-border text-muted-foreground",
};

export function JobCard({ job, onClick, compact = false }: JobCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded border px-2 py-1 transition-opacity hover:opacity-80 cursor-pointer",
        statusColors[job.status],
        compact && "text-xs truncate"
      )}
    >
      <div className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>
        {job.title}
      </div>
      {!compact && job.customers?.name && (
        <div className="text-xs opacity-75 truncate">{job.customers.name}</div>
      )}
      {!compact && job.scheduled_time && (
        <div className="text-xs opacity-75">
          {job.scheduled_time.slice(0, 5)}
        </div>
      )}
    </button>
  );
}
