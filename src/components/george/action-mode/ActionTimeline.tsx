import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle, Clock, ShieldAlert } from "lucide-react";
import type { ActionStep, ActionStepStatus } from "@/types/foreman-actions";

interface ActionTimelineProps {
  steps: ActionStep[];
}

const stepIcons: Record<ActionStepStatus, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  running: <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
  complete: <Check className="h-3.5 w-3.5 text-primary" />,
  failed: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
  awaiting_approval: <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />,
};

const stepLineColors: Record<ActionStepStatus, string> = {
  pending: "bg-muted-foreground/20",
  running: "bg-primary/40",
  complete: "bg-primary",
  failed: "bg-destructive",
  awaiting_approval: "bg-amber-400",
};

export function ActionTimeline({ steps }: ActionTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Live Actions
        </span>
      </div>
      <div className="space-y-0">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3 relative">
            {/* Vertical connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute left-[13px] top-6 w-0.5 h-[calc(100%-4px)]",
                  stepLineColors[step.status]
                )}
              />
            )}
            {/* Step icon */}
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border z-10",
                step.status === "complete" && "bg-primary/10 border-primary/30",
                step.status === "running" && "bg-primary/5 border-primary/30",
                step.status === "failed" && "bg-destructive/5 border-destructive/30",
                step.status === "awaiting_approval" && "bg-amber-50 border-amber-200",
                step.status === "pending" && "bg-muted border-border"
              )}
            >
              {stepIcons[step.status]}
            </div>
            {/* Step label */}
            <div className="flex-1 pb-3 pt-1">
              <p
                className={cn(
                  "text-sm leading-tight",
                  step.status === "complete" && "text-primary font-medium",
                  step.status === "running" && "text-foreground font-medium",
                  step.status === "failed" && "text-destructive font-medium",
                  step.status === "pending" && "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {step.error_message && (
                <p className="text-xs text-destructive mt-0.5">{step.error_message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
