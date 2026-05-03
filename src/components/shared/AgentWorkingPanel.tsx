import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle, Circle, Zap, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkflowStep } from "@/hooks/useAgentWorkflow";

/** Predefined step templates */
export const PREVIEW_EMAIL_STEPS: WorkflowStep[] = [
  { id: "structure", label: "Preparing document structure" },
  { id: "branding", label: "Applying branding settings" },
  { id: "layout", label: "Rendering logo and layout" },
  { id: "line_items", label: "Generating line items" },
  { id: "totals", label: "Calculating totals" },
  { id: "pdf", label: "Building PDF" },
  { id: "email", label: "Sending preview email" },
];

export const QUOTE_CREATION_STEPS: WorkflowStep[] = [
  { id: "customer", label: "Looking up customer" },
  { id: "items", label: "Building line items" },
  { id: "pricing", label: "Calculating pricing" },
  { id: "save", label: "Saving quote to drafts" },
];

export const INVOICE_CREATION_STEPS: WorkflowStep[] = [
  { id: "customer", label: "Looking up customer" },
  { id: "items", label: "Building line items" },
  { id: "tax", label: "Calculating tax" },
  { id: "save", label: "Creating invoice" },
];

interface SuccessAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface AgentWorkingPanelProps {
  steps: WorkflowStep[];
  currentStepIndex: number;
  completedSteps: Set<string>;
  failedStep?: { id: string; error: string } | null;
  isComplete: boolean;
  successMessage?: string;
  successActions?: SuccessAction[];
  onRetry?: () => void;
  title?: string;
}

export function AgentWorkingPanel({
  steps,
  currentStepIndex,
  completedSteps,
  failedStep,
  isComplete,
  successMessage,
  successActions,
  onRetry,
  title = "revamo AI is working…",
}: AgentWorkingPanelProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      {!isComplete && (
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
      )}

      {/* Steps timeline */}
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isFailed = failedStep?.id === step.id;
          const isDone = completedSteps.has(step.id);
          const isActive = index === currentStepIndex && !isFailed && !isDone;
          const isPending = index > currentStepIndex && !isDone && !isFailed;

          return (
            <div
              key={step.id}
              className="flex items-start gap-3 relative"
              style={{
                animationDelay: `${index * 150}ms`,
                animationFillMode: "both",
              }}
            >
              {/* Vertical connector */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[13px] top-7 w-0.5 h-[calc(100%-8px)]",
                    isDone ? "bg-primary" : isFailed ? "bg-destructive" : isActive ? "bg-primary/40" : "bg-muted-foreground/20"
                  )}
                />
              )}

              {/* Icon */}
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border z-10 transition-all duration-300",
                  isDone && "bg-primary/10 border-primary/30",
                  isActive && "bg-primary/5 border-primary/30",
                  isFailed && "bg-destructive/5 border-destructive/30",
                  isPending && "bg-muted border-border"
                )}
              >
                {isDone && <Check className="h-3.5 w-3.5 text-primary" />}
                {isActive && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />}
                {isFailed && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                {isPending && <Circle className="h-3 w-3 text-muted-foreground/40" />}
              </div>

              {/* Label */}
              <div className="flex-1 pb-3 pt-1">
                <p
                  className={cn(
                    "text-sm leading-tight transition-colors duration-200",
                    isDone && "text-primary font-medium",
                    isActive && "text-foreground font-medium",
                    isFailed && "text-destructive font-medium",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                  {isActive && "…"}
                </p>
                {isFailed && failedStep && (
                  <p className="text-xs text-destructive mt-0.5">{failedStep.error}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Success state */}
      {isComplete && (
        <div className="animate-fade-in rounded-lg bg-primary/10 border border-primary/30 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-primary">
              {successMessage || "All done!"}
            </p>
          </div>
          {successActions && successActions.length > 0 && (
            <div className="flex gap-2">
              {successActions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  variant={action.variant || "outline"}
                  onClick={action.onClick}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Failure state */}
      {failedStep && (
        <div className="animate-fade-in rounded-lg bg-destructive/5 border border-destructive/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-destructive font-medium">Something went wrong</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
