import { Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onBulkDelete?: () => void;
}

export function SelectionBar({ selectedCount, onClear, onBulkDelete }: SelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-4 text-sm animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
          <Check className="h-3 w-3 text-primary" />
        </div>
        <span className="font-medium text-foreground">
          {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        {onBulkDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onBulkDelete}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete selected
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
