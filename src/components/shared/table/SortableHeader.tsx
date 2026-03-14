import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";
import { type SortDirection } from "@/hooks/useTableSort";

interface SortableHeaderProps {
  children: React.ReactNode;
  sortDirection?: SortDirection;
  onSort?: () => void;
  className?: string;
  align?: "left" | "right" | "center";
}

export function SortableHeader({
  children,
  sortDirection,
  onSort,
  className,
  align = "left",
}: SortableHeaderProps) {
  return (
    <th
      className={cn(
        "h-10 px-3 py-2 text-xs font-semibold text-foreground/80 bg-muted/60 border-r border-border/30 last:border-r-0",
        "cursor-pointer hover:bg-muted transition-colors select-none",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      onClick={onSort}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          align === "right" && "justify-end",
          align === "center" && "justify-center"
        )}
      >
        <span>{children}</span>
        {sortDirection === "asc" && (
          <ArrowUp className="h-3 w-3 text-primary" />
        )}
        {sortDirection === "desc" && (
          <ArrowDown className="h-3 w-3 text-primary" />
        )}
      </div>
    </th>
  );
}
