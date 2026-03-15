import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConfirmationGate } from "@/types/foreman-actions";

interface ActionConfirmationGateProps {
  gate: ConfirmationGate;
  onAction: (action: "confirm" | "review" | "cancel") => void;
}

const riskColors = {
  low: "border-primary/30 bg-primary/5",
  medium: "border-amber-300 bg-amber-50",
  high: "border-destructive/30 bg-destructive/5",
};

export function ActionConfirmationGate({ gate, onAction }: ActionConfirmationGateProps) {
  return (
    <div className={`p-4 rounded-xl border-2 ${riskColors[gate.risk_level]}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold mb-1">Confirmation Required</h4>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{gate.message}</p>
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
                className="text-xs h-9"
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
