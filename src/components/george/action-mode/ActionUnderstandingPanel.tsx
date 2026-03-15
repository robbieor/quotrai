import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import type { ExtractedEntity } from "@/types/foreman-actions";

interface ActionUnderstandingPanelProps {
  intentLabel: string;
  entities: ExtractedEntity[];
}

const confidenceColors = {
  high: "bg-primary/10 text-foreground border-primary/20",
  medium: "bg-amber-500/10 text-amber-700 border-amber-200",
  low: "bg-red-500/10 text-red-700 border-red-200",
};

export function ActionUnderstandingPanel({ intentLabel, entities }: ActionUnderstandingPanelProps) {
  if (entities.length === 0) return null;

  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What I understood
        </span>
        <span className="text-xs text-primary font-medium ml-auto">{intentLabel}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entities.map((entity) => (
          <div
            key={entity.key}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
              confidenceColors[entity.confidence]
            )}
          >
            <span className="text-muted-foreground text-xs font-medium">{entity.label}</span>
            <span className="font-semibold text-right flex items-center gap-1">
              {entity.value}
              {entity.confidence === "low" && (
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
