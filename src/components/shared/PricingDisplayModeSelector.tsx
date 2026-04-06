import { List, Layers, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PricingDisplayMode } from "@/types/pricingDisplay";
import { DISPLAY_MODE_LABELS } from "@/types/pricingDisplay";

const icons: Record<PricingDisplayMode, React.ReactNode> = {
  detailed: <List className="h-3.5 w-3.5" />,
  grouped: <Layers className="h-3.5 w-3.5" />,
  summary: <FileText className="h-3.5 w-3.5" />,
  items_only: <Eye className="h-3.5 w-3.5" />,
};

interface PricingDisplayModeSelectorProps {
  value: PricingDisplayMode;
  onChange: (mode: PricingDisplayMode) => void;
}

export function PricingDisplayModeSelector({ value, onChange }: PricingDisplayModeSelectorProps) {
  const modes: PricingDisplayMode[] = ['detailed', 'grouped', 'summary', 'items_only'];

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Customer Display Mode</label>
      <div className="flex gap-1 rounded-lg border border-input bg-muted/30 p-1">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
              value === mode
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={DISPLAY_MODE_LABELS[mode].description}
          >
            {icons[mode]}
            <span className="hidden sm:inline">{DISPLAY_MODE_LABELS[mode].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
