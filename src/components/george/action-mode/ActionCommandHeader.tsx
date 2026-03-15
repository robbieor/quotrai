import { cn } from "@/lib/utils";
import { Mic, Keyboard, Zap, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ActionStatus, InputSource } from "@/types/foreman-actions";
import { format } from "date-fns";

interface ActionCommandHeaderProps {
  commandText: string;
  inputSource: InputSource;
  status: ActionStatus;
  timestamp: string;
}

const statusConfig: Record<ActionStatus, { label: string; color: string }> = {
  listening: { label: "Listening", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  interpreting: { label: "Interpreting", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  working: { label: "Working", color: "bg-primary/10 text-primary border-primary/20" },
  needs_confirmation: { label: "Needs Confirmation", color: "bg-orange-500/10 text-orange-600 border-orange-200" },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const sourceIcons: Record<InputSource, typeof Mic> = {
  voice: Mic,
  typed: Keyboard,
  quick_action: Zap,
};

export function ActionCommandHeader({ commandText, inputSource, status, timestamp }: ActionCommandHeaderProps) {
  const config = statusConfig[status];
  const SourceIcon = sourceIcons[inputSource];

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <SourceIcon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px] font-medium", config.color)}>
            {status === "working" && (
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1" />
            )}
            {config.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(timestamp), "h:mm a")}
          </span>
        </div>
        <p className="text-sm font-medium leading-snug line-clamp-2">{commandText}</p>
      </div>
    </div>
  );
}
