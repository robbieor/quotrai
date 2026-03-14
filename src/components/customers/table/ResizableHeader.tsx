import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

interface ResizableHeaderProps {
  children: React.ReactNode;
  width: number;
  minWidth: number;
  onResize: (newWidth: number) => void;
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: () => void;
}

export function ResizableHeader({
  children,
  width,
  minWidth,
  onResize,
  sortable = false,
  sortDirection,
  onSort,
}: ResizableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(minWidth, startWidth.current + diff);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, onResize]);

  const SortIcon = sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <th
      className={cn(
        "font-semibold text-xs h-9 py-2 px-3 text-left relative select-none bg-muted/80 border-b border-border/50",
        sortable && "cursor-pointer hover:bg-muted transition-colors",
        isResizing && "bg-primary/10"
      )}
      style={{ width, minWidth }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-foreground/80">{children}</span>
        {sortable && (
          <SortIcon 
            className={cn(
              "h-3 w-3 transition-opacity",
              sortDirection ? "text-primary opacity-100" : "text-muted-foreground/60 opacity-0 group-hover:opacity-100",
              isHovering && !sortDirection && "opacity-60"
            )} 
          />
        )}
      </div>
      
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute right-0 top-0 h-full w-1.5 cursor-col-resize transition-all flex items-center justify-center",
          "hover:bg-primary/40",
          isResizing && "bg-primary w-1",
          !isResizing && !isHovering && "opacity-0",
          isHovering && "opacity-100"
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/40" />
      </div>
    </th>
  );
}
