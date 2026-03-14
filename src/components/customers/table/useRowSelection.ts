import { useState, useCallback } from "react";

export function useRowSelection(totalRows: number) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [lastClickedRow, setLastClickedRow] = useState<number | null>(null);

  const handleRowClick = useCallback(
    (rowIndex: number, e: React.MouseEvent) => {
      if (e.shiftKey && lastClickedRow !== null) {
        // Shift+Click: select range
        const start = Math.min(lastClickedRow, rowIndex);
        const end = Math.max(lastClickedRow, rowIndex);
        const newSelection = new Set<number>();
        for (let i = start; i <= end; i++) {
          newSelection.add(i);
        }
        setSelectedRows(newSelection);
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+Click: toggle individual row
        setSelectedRows((prev) => {
          const next = new Set(prev);
          if (next.has(rowIndex)) {
            next.delete(rowIndex);
          } else {
            next.add(rowIndex);
          }
          return next;
        });
        setLastClickedRow(rowIndex);
      } else {
        // Normal click: select single row
        setSelectedRows(new Set([rowIndex]));
        setLastClickedRow(rowIndex);
      }
    },
    [lastClickedRow]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRows(new Set(Array.from({ length: totalRows }, (_, i) => i)));
      } else {
        setSelectedRows(new Set());
      }
    },
    [totalRows]
  );

  const handleCheckboxChange = useCallback((rowIndex: number, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(rowIndex);
      } else {
        next.delete(rowIndex);
      }
      return next;
    });
    setLastClickedRow(rowIndex);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const allSelected = totalRows > 0 && selectedRows.size === totalRows;
  const someSelected = selectedRows.size > 0 && selectedRows.size < totalRows;

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
