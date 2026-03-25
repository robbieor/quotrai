import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type Customer } from "@/hooks/useCustomers";
import { EditableCell } from "./table/EditableCell";
import { ResizableHeader, type SortDirection } from "./table/ResizableHeader";
import { SelectionBar } from "./table/SelectionBar";
import { TableRow, COLUMNS } from "./table/TableRow";
import { useTableNavigation } from "./table/useTableNavigation";
import { useRowSelection } from "./table/useRowSelection";

interface CustomersTableProps {
  customers: Customer[];
  onUpdate: (id: string, field: keyof Customer, value: string) => void;
  onDelete: (customer: Customer) => void;
  isUpdating?: boolean;
}

type SortField = "name" | "contact_person" | "email" | "phone" | "address" | "client_number";

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

export function CustomersTable({
  customers,
  onUpdate,
  onDelete,
}: CustomersTableProps) {
  // Column widths with slightly more generous defaults
  const [columnWidths, setColumnWidths] = useState<number[]>([
    160, // Company
    130, // Contact
    180, // Email
    120, // Phone
    200, // Address
  ]);

  // Sorting state
  const [sortState, setSortState] = useState<SortState>({ field: null, direction: null });

  // Custom hooks for table logic
  const {
    editingCell,
    selectedCell,
    handleStartEdit,
    handleSave,
    handleCancel,
    handleCellSelect,
    handleKeyNav,
  } = useTableNavigation(customers, COLUMNS.length, onUpdate);

  const {
    selectedRows,
    allSelected,
    someSelected,
    handleRowClick,
    handleSelectAll,
    handleCheckboxChange,
    clearSelection,
  } = useRowSelection(customers.length);

  // Sorted customers
  const sortedCustomers = useMemo(() => {
    if (!sortState.field || !sortState.direction) return customers;

    return [...customers].sort((a, b) => {
      const aVal = a[sortState.field as keyof Customer];
      const bVal = b[sortState.field as keyof Customer];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortState.direction === "asc" ? comparison : -comparison;
    });
  }, [customers, sortState]);

  const handleColumnResize = (index: number, newWidth: number) => {
    setColumnWidths((prev) => {
      const next = [...prev];
      next[index] = newWidth;
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    setSortState((prev) => {
      if (prev.field !== field) {
        return { field, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { field, direction: "desc" };
      }
      return { field: null, direction: null };
    });
  };

  const getSortDirection = (field: string): SortDirection => {
    return sortState.field === field ? sortState.direction : null;
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Selection bar */}
      <SelectionBar
        selectedCount={selectedRows.size}
        onClear={clearSelection}
      />

      {/* Scrollable table area with horizontal scroll indicator */}
      <ScrollArea className="w-full">
        <div className="min-w-[700px]">
          <table className="w-full text-sm border-collapse">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border/50">
                {/* Checkbox header */}
                <th className="w-10 h-10 py-2 px-3 text-center bg-muted/60 border-r border-border/30">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    className="h-4 w-4"
                    aria-label="Select all"
                    {...(someSelected ? { "data-state": "indeterminate" } : {})}
                  />
                </th>

                {/* Client number header — hidden on mobile */}
                <th 
                  className="font-semibold text-xs h-10 py-2 px-3 text-left w-14 bg-muted/60 border-r border-border/30 cursor-pointer hover:bg-muted transition-colors hidden md:table-cell"
                  onClick={() => handleSort("client_number")}
                >
                  <span className="text-foreground/80">#</span>
                </th>

                {/* Column headers */}
                {COLUMNS.map((col, idx) => (
                  <ResizableHeader
                    key={col.field}
                    width={columnWidths[idx]}
                    minWidth={80}
                    onResize={(w) => handleColumnResize(idx, w)}
                    sortable
                    sortDirection={getSortDirection(col.field)}
                    onSort={() => handleSort(col.field as SortField)}
                  >
                    {col.label}
                  </ResizableHeader>
                ))}

                {/* Actions header */}
                <th className="w-10 h-10 py-2 px-2 bg-muted/60"></th>
              </tr>
            </thead>

            <tbody>
              {sortedCustomers.map((customer, rowIdx) => (
                <TableRow
                  key={customer.id}
                  customer={customer}
                  rowIndex={rowIdx}
                  isSelected={selectedRows.has(rowIdx)}
                  isRowHighlighted={selectedCell?.rowIndex === rowIdx}
                  columnWidths={columnWidths}
                  editingCell={editingCell}
                  selectedCell={selectedCell}
                  onRowClick={handleRowClick}
                  onCheckboxChange={handleCheckboxChange}
                  onCellSelect={handleCellSelect}
                  onStartEdit={handleStartEdit}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onKeyNav={handleKeyNav}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" className="h-2.5" />
      </ScrollArea>

      {/* Mobile hint */}
      <div className="md:hidden px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border/30 flex items-center gap-2">
        <span>←→</span>
        <span>Swipe to see more columns</span>
      </div>
    </div>
  );
}
