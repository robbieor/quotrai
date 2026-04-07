import { X, Download, Trash2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onBulkDelete: () => void;
  onBulkMarkup: (percent: number) => void;
  onExport: () => void;
}

export function BulkActionsBar({ selectedCount, onClear, onBulkDelete, onBulkMarkup, onExport }: BulkActionsBarProps) {
  const [showMarkup, setShowMarkup] = useState(false);
  const [markupValue, setMarkupValue] = useState("30");

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg animate-in slide-in-from-top-1 duration-200">
      <span className="text-sm font-medium">
        {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
      </span>
      <div className="flex items-center gap-2">
        {showMarkup ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={markupValue}
              onChange={(e) => setMarkupValue(e.target.value)}
              className="h-7 w-16 text-xs px-2"
              placeholder="%"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const v = parseFloat(markupValue);
                if (!isNaN(v)) onBulkMarkup(v);
                setShowMarkup(false);
              }}
            >
              Apply
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowMarkup(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowMarkup(true)}>
            <Percent className="h-3 w-3 mr-1" /> Markup
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onExport}>
          <Download className="h-3 w-3 mr-1" /> Export
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={onBulkDelete}>
          <Trash2 className="h-3 w-3 mr-1" /> Delete
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
          <X className="h-3 w-3 mr-1" /> Clear
        </Button>
      </div>
    </div>
  );
}
