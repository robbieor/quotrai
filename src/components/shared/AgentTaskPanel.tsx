import { useAgentTask } from "@/contexts/AgentTaskContext";
import { AgentWorkingPanel } from "./AgentWorkingPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function AgentTaskPanel() {
  const { activeTask, isMinimised, toggleMinimise, dismissTask, retryTask } = useAgentTask();
  const isMobile = useIsMobile();
  const location = useLocation();

  // Don't render on /foreman-ai — it has its own LiveActionFeed
  if (location.pathname === "/foreman-ai") return null;
  if (!activeTask) return null;

  const isDone = activeTask.status === "success" || activeTask.status === "error" || activeTask.status === "cancelled";

  // Minimised pill bar
  if (isMinimised) {
    return (
      <button
        onClick={toggleMinimise}
        className={cn(
          "fixed z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border border-border bg-card text-foreground",
          "hover:shadow-xl transition-all duration-200 animate-fade-in",
          isMobile ? "bottom-24 left-1/2 -translate-x-1/2" : "bottom-6 right-24"
        )}
      >
        {activeTask.status === "running" && (
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
        )}
        {activeTask.status === "success" && (
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        )}
        {activeTask.status === "error" && (
          <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
        )}
        <span className="text-sm font-medium truncate max-w-[200px]">
          {activeTask.label}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <Sheet open={!!activeTask && !isMinimised} onOpenChange={(open) => { if (!open) toggleMinimise(); }}>
        <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl px-4 pb-8">
          <SheetHeader className="flex flex-row items-center justify-between pb-2">
            <SheetTitle className="text-base">revamo AI</SheetTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMinimise}>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {isDone && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={dismissTask}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetHeader>
          <AgentWorkingPanel
            steps={activeTask.steps}
            currentStepIndex={activeTask.currentStepIndex}
            completedSteps={activeTask.completedSteps}
            failedStep={activeTask.failedStep}
            isComplete={activeTask.status === "success"}
            successMessage={activeTask.successMessage}
            successActions={activeTask.successActions}
            onRetry={activeTask.status === "error" ? retryTask : undefined}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: right side panel
  return (
    <div
      className={cn(
        "fixed top-14 right-0 z-30 h-[calc(100vh-3.5rem)] w-[320px]",
        "bg-card border-l border-border shadow-lg",
        "animate-in slide-in-from-right duration-300",
        "flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">revamo AI</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMinimise}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {isDone && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={dismissTask}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AgentWorkingPanel
          steps={activeTask.steps}
          currentStepIndex={activeTask.currentStepIndex}
          completedSteps={activeTask.completedSteps}
          failedStep={activeTask.failedStep}
          isComplete={activeTask.status === "success"}
          successMessage={activeTask.successMessage}
          successActions={activeTask.successActions}
          onRetry={activeTask.status === "error" ? retryTask : undefined}
          title={activeTask.label}
        />
      </div>
    </div>
  );
}
