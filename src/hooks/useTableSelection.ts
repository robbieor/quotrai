import { useState, useCallback } from "react";

export function useTableSelection(totalItems: number) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [lastClickedRow, setLastClickedRow] = useState<number | null>(null);

  const handleRowClick = useCallback(
    (rowIndex: number, e: React.MouseEvent) => {
      if (e.shiftKey && lastClickedRow !== null) {
        // Shift+click: select range
        const start = Math.min(lastClickedRow, rowIndex);
        const end = Math.max(lastClickedRow, rowIndex);
        const newSelection = new Set<number>();
        for (let i = start; i <= end; i++) {
          newSelection.add(i);
        }
        setSelectedRows(newSelection);
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+click: toggle individual
        setSelectedRows((prev) => {
          const next = new Set(prev);
          if (next.has(rowIndex)) {
            next.delete(rowIndex);
          } else {
            next.add(rowIndex);
          }
          return next;
        });
      } else {
        // Simple click: select only this
        setSelectedRows(new Set([rowIndex]));
      }
      setLastClickedRow(rowIndex);
    },
    [lastClickedRow]
  );

  const handleSelectAll = useCallback(
    (checked: boolean | "indeterminate") => {
      if (checked === true) {
        const all = new Set<number>();
        for (let i = 0; i < totalItems; i++) {
          all.add(i);
        }
        setSelectedRows(all);
      } else {
        setSelectedRows(new Set());
      }
    },
    [totalItems]
  );

  const handleCheckboxChange = useCallback(
    (rowIndex: number, checked: boolean | "indeterminate") => {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (checked === true) {
          next.add(rowIndex);
        } else {
          next.delete(rowIndex);
        }
        return next;
      });
      setLastClickedRow(rowIndex);
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
    setLastClickedRow(null);
  }, []);

  const allSelected = totalItems > 0 && selectedRows.size === totalItems;
  const someSelected = selectedRows.size > 0 && selectedRows.size < totalItems;

  return {
    selectedRows,
    allSelected,
    someSelected,
    handleRowClick,
    handleSelectAll,
    handleCheckboxChange,
    clearSelection,
  };
}
