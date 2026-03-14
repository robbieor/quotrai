import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string | null;
  isEditing: boolean;
  isSelected: boolean;
  onStartEdit: () => void;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  onKeyNav: (direction: "up" | "down" | "left" | "right" | "tab" | "shift-tab") => void;
  placeholder?: string;
  className?: string;
}

export function EditableCell({
  value,
  isEditing,
  isSelected,
  onStartEdit,
  onSave,
  onCancel,
  onKeyNav,
  placeholder = "—",
  className,
}: EditableCellProps) {
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isSelected && !isEditing && cellRef.current) {
      cellRef.current.focus();
    }
  }, [isSelected, isEditing]);

  useEffect(() => {
    setEditValue(value || "");
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSave(editValue);
      } else if (e.key === "Escape") {
        setEditValue(value || "");
        onCancel();
      } else if (e.key === "Tab") {
        e.preventDefault();
        onSave(editValue);
        onKeyNav(e.shiftKey ? "shift-tab" : "tab");
      }
    } else {
      // Navigation mode
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          onKeyNav("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          onKeyNav("down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          onKeyNav("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          onKeyNav("right");
          break;
        case "Tab":
          e.preventDefault();
          onKeyNav(e.shiftKey ? "shift-tab" : "tab");
          break;
        case "Enter":
        case "F2":
          e.preventDefault();
          onStartEdit();
          break;
        default:
          // Start editing on any printable character
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            setEditValue(e.key);
            onStartEdit();
          }
      }
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(editValue)}
        className="h-7 text-xs px-2 py-1 border-primary ring-2 ring-primary/20 bg-background"
      />
    );
  }

  return (
    <div
      ref={cellRef}
      tabIndex={isSelected ? 0 : -1}
      onClick={onStartEdit}
      onDoubleClick={onStartEdit}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-cell px-2 py-1.5 rounded-sm transition-all duration-150 text-xs truncate outline-none min-h-[28px] flex items-center",
        !value && "text-muted-foreground/50 italic",
        isSelected && "ring-2 ring-primary bg-primary/5 shadow-sm",
        !isSelected && "hover:bg-muted/60",
        className
      )}
    >
      {value || placeholder}
    </div>
  );
}
