import { Button } from "@/components/ui/button";
import { HardHat, ExternalLink, X } from "lucide-react";

interface CommandResultProps {
  title: string;
  items: { label: string; value: string }[];
  link?: string;
  linkLabel?: string;
  onClear: () => void;
  onNavigate?: (url: string) => void;
}

export function CommandResult({ title, items, link, linkLabel, onClear, onNavigate }: CommandResultProps) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardHat className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <button onClick={onClear} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-md bg-muted/50">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">No items found.</p>
        )}
      </div>
      {link && onNavigate && (
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 text-xs"
          onClick={() => onNavigate(link)}
        >
          <ExternalLink className="h-3 w-3" />
          {linkLabel || "View All"}
        </Button>
      )}
    </div>
  );
}
