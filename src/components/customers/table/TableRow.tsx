import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type Customer } from "@/hooks/useCustomers";
import { EditableCell } from "./EditableCell";

type EditableField = "name" | "contact_person" | "email" | "phone" | "address" | "notes";

const COLUMNS: { field: EditableField; label: string }[] = [
  { field: "name", label: "Company" },
  { field: "contact_person", label: "Contact" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "address", label: "Address" },
];

const EDITABLE_FIELDS: { field: EditableField; label: string }[] = [
  { field: "name", label: "Company Name" },
  { field: "contact_person", label: "Contact Person" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "address", label: "Address" },
  { field: "notes", label: "Notes" },
];

interface TableRowProps {
  customer: Customer;
  rowIndex: number;
  isSelected: boolean;
  isRowHighlighted: boolean;
  columnWidths: number[];
  editingCell: { rowId: string; field: keyof Customer } | null;
  selectedCell: { rowIndex: number; colIndex: number } | null;
  onRowClick: (rowIndex: number, e: React.MouseEvent) => void;
  onCheckboxChange: (rowIndex: number, checked: boolean) => void;
  onCellSelect: (rowIndex: number, colIndex: number) => void;
  onStartEdit: (rowId: string, field: keyof Customer, rowIndex: number, colIndex: number) => void;
  onSave: (rowId: string, field: keyof Customer, value: string) => void;
  onCancel: () => void;
  onKeyNav: (direction: "up" | "down" | "left" | "right" | "tab" | "shift-tab") => void;
  onDelete: (customer: Customer) => void;
}

export function TableRow({
  customer,
  rowIndex,
  isSelected,
  isRowHighlighted,
  columnWidths,
  editingCell,
  selectedCell,
  onRowClick,
  onCheckboxChange,
  onCellSelect,
  onStartEdit,
  onSave,
  onCancel,
  onKeyNav,
  onDelete,
}: TableRowProps) {
  const isEditing = (field: keyof Customer) =>
    editingCell?.rowId === customer.id && editingCell?.field === field;

  const isCellSelected = (colIndex: number) =>
    selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;

  return (
    <tr
      onClick={(e) => onRowClick(rowIndex, e)}
      className={cn(
        "group border-b border-border/30 cursor-pointer transition-colors duration-100",
        isSelected && "bg-primary/10 hover:bg-primary/15",
        !isSelected && isRowHighlighted && "bg-accent/5",
        !isSelected && !isRowHighlighted && rowIndex % 2 === 0 ? "bg-background hover:bg-muted/40" : "bg-muted/10 hover:bg-muted/40"
      )}
    >
      {/* Checkbox cell */}
      <td
        className="py-2 px-3 text-center border-r border-border/20 w-10"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(rowIndex, !!checked)}
          className="h-4 w-4 transition-transform hover:scale-110"
          aria-label={`Select row ${rowIndex + 1}`}
        />
      </td>

      {/* Client number cell */}
      <td className="py-2 px-3 text-xs text-muted-foreground font-mono border-r border-border/20 w-14 tabular-nums">
        #{(customer as any).client_number || "—"}
      </td>

      {/* Editable cells */}
      {COLUMNS.map((col, colIdx) => (
        <td
          key={col.field}
          className={cn(
            "py-1 px-1 border-r border-border/20 transition-colors",
            isCellSelected(colIdx) && "bg-primary/5"
          )}
          style={{ width: columnWidths[colIdx], maxWidth: columnWidths[colIdx] }}
          onClick={(e) => {
            e.stopPropagation();
            onCellSelect(rowIndex, colIdx);
          }}
        >
          <EditableCell
            value={customer[col.field] as string | null}
            isEditing={isEditing(col.field)}
            isSelected={isCellSelected(colIdx)}
            onStartEdit={() => onStartEdit(customer.id, col.field, rowIndex, colIdx)}
            onSave={(v) => onSave(customer.id, col.field, v)}
            onCancel={onCancel}
            onKeyNav={onKeyNav}
            placeholder="—"
            className={col.field === "name" ? "font-medium text-foreground" : ""}
          />
        </td>
      ))}

      {/* Actions cell */}
      <td className="py-1 px-2 w-10" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-popover border shadow-lg z-50">
            {EDITABLE_FIELDS.map(({ field, label }) => (
              <DropdownMenuItem
                key={field}
                onClick={() => {
                  const colIdx = COLUMNS.findIndex((c) => c.field === field);
                  if (colIdx >= 0) {
                    onStartEdit(customer.id, field, rowIndex, colIdx);
                  }
                }}
                className="text-xs cursor-pointer"
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(customer)}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 text-xs cursor-pointer"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export { COLUMNS };
