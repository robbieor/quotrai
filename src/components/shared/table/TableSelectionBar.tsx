import { X, Download, Mail, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TableSelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onExport?: () => void;
  showExport?: boolean;
  onBulkDelete?: () => void;
  onBulkStatusChange?: (status: string) => void;
  onBulkSendEmail?: () => void;
  statusOptions?: { value: string; label: string }[];
}

export function TableSelectionBar({
  selectedCount,
  onClear,
  onExport,
  showExport = true,
  onBulkDelete,
  onBulkStatusChange,
  onBulkSendEmail,
  statusOptions,
}: TableSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-primary/20 animate-in slide-in-from-top-1 duration-200">
      <span className="text-sm font-medium text-foreground">
        {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
      </span>
      <div className="flex items-center gap-2">
        {statusOptions && onBulkStatusChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {statusOptions.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => onBulkStatusChange(opt.value)}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {onBulkSendEmail && (
          <Button variant="outline" size="sm" onClick={onBulkSendEmail} className="h-7 text-xs">
            <Mail className="h-3 w-3 mr-1" />
            Send All
          </Button>
        )}
        {showExport && onExport && (
          <Button variant="outline" size="sm" onClick={onExport} className="h-7 text-xs">
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        )}
        {onBulkDelete && (
          <Button variant="outline" size="sm" onClick={onBulkDelete} className="h-7 text-xs text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs">
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
