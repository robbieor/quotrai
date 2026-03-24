import { useEffect, useRef } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConfirmationGate } from "@/types/foreman-actions";

interface ActionConfirmationGateProps {
  gate: ConfirmationGate;
  onAction: (action: "confirm" | "review" | "cancel") => void;
}

const riskColors = {
  low: "border-primary/30 bg-primary/5",
  medium: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
  high: "border-destructive/30 bg-destructive/5",
};

export function ActionConfirmationGate({ gate, onAction }: ActionConfirmationGateProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "p-5 rounded-xl border-2 transition-all",
        riskColors[gate.risk_level],
        "animate-pulse-border"
      )}
    >
      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
          50% { box-shadow: 0 0 0 6px hsl(var(--primary) / 0); }
        }
        .animate-pulse-border { animation: pulse-border 2s ease-in-out 3; }
      `}</style>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold mb-1">👆 Action Required</h4>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{gate.message}</p>
          <div className="flex flex-wrap gap-2">
            {gate.actions.map((action) => (
              <Button
                key={action.action}
                variant={
                  action.variant === "destructive"
                    ? "destructive"
                    : action.variant === "outline"
                    ? "outline"
                    : "default"
                }
                size="sm"
                onClick={() => onAction(action.action)}
                className="text-sm h-10 px-5 font-medium"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
