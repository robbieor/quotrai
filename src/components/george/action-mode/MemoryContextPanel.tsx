import { Brain, User, Briefcase, FileText, Receipt, X, RotateCcw, UserCheck, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { MemoryContext } from "@/types/foreman-actions";
import type { SessionEntity, ClearMode } from "@/hooks/useForemanMemory";

interface MemoryContextPanelProps {
  taskContext: MemoryContext;
  sessionEntities: SessionEntity[];
  hasActiveContext: boolean;
  onClear: (mode: ClearMode) => void;
}

export function MemoryContextPanel({
  taskContext,
  sessionEntities,
  hasActiveContext,
  onClear,
}: MemoryContextPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hasActiveContext && sessionEntities.length === 0) return null;

  const contextItems: { icon: typeof User; label: string; value: string }[] = [];
  if (taskContext.current_customer) {
    contextItems.push({ icon: User, label: "Customer", value: taskContext.current_customer.name });
  }
  if (taskContext.current_job) {
    contextItems.push({ icon: Briefcase, label: "Job", value: taskContext.current_job.title });
  }
  if (taskContext.current_quote) {
    contextItems.push({ icon: FileText, label: "Quote", value: taskContext.current_quote.number });
  }
  if (taskContext.current_invoice) {
    contextItems.push({ icon: Receipt, label: "Invoice", value: taskContext.current_invoice.number });
  }

  return (
    <div className="mx-4 mb-2">
      <div className="rounded-xl border border-primary/15 bg-primary/[0.03] overflow-hidden">
        {/* Compact bar */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/5 transition-colors"
        >
          <Brain className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
            Active Context
          </span>
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {contextItems.slice(0, 3).map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[11px] font-medium text-foreground shrink-0"
              >
                <item.icon className="h-2.5 w-2.5 text-primary" />
                {item.value}
              </span>
            ))}
            {contextItems.length > 3 && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                +{contextItems.length - 3}
              </span>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="px-3 pb-3 border-t border-primary/10">
            {/* Current task context */}
            {contextItems.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Task
                </span>
                {contextItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <item.icon className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">{item.label}:</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent session entities */}
            {sessionEntities.length > 0 && (
              <div className="mt-3 space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Refs
                </span>
                <div className="flex flex-wrap gap-1">
                  {sessionEntities.map((entity, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[11px]"
                    >
                      <span className="text-muted-foreground">{entity.label}:</span>
                      <span className="font-medium">{entity.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Clear controls */}
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => onClear("all")}
              >
                <X className="h-3 w-3" />
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => onClear("all")}
              >
                <RotateCcw className="h-3 w-3" />
                New Task
              </Button>
              {taskContext.current_customer && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => onClear("keep_customer")}
                >
                  <UserCheck className="h-3 w-3" />
                  Keep Customer
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
