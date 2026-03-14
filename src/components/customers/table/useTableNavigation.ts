import { useState, useCallback } from "react";
import { type Customer } from "@/hooks/useCustomers";

interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

interface EditingCell {
  rowId: string;
  field: keyof Customer;
}

export function useTableNavigation(
  customers: Customer[],
  columnCount: number,
  onUpdate: (id: string, field: keyof Customer, value: string) => void
) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);

  const handleStartEdit = useCallback(
    (rowId: string, field: keyof Customer, rowIndex: number, colIndex: number) => {
      setEditingCell({ rowId, field });
      setSelectedCell({ rowIndex, colIndex });
    },
    []
  );

  const handleSave = useCallback(
    (rowId: string, field: keyof Customer, newValue: string) => {
      const customer = customers.find((c) => c.id === rowId);
      if (customer && customer[field] !== newValue) {
        onUpdate(rowId, field, newValue);
      }
      setEditingCell(null);
    },
    [customers, onUpdate]
  );

  const handleCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleCellSelect = useCallback((rowIndex: number, colIndex: number) => {
    setSelectedCell({ rowIndex, colIndex });
    setEditingCell(null);
  }, []);

  const handleKeyNav = useCallback(
    (direction: "up" | "down" | "left" | "right" | "tab" | "shift-tab") => {
      if (!selectedCell) return;

      let { rowIndex, colIndex } = selectedCell;
      const maxRow = customers.length - 1;
      const maxCol = columnCount - 1;

      switch (direction) {
        case "up":
          rowIndex = Math.max(0, rowIndex - 1);
          break;
        case "down":
          rowIndex = Math.min(maxRow, rowIndex + 1);
          break;
        case "left":
          colIndex = Math.max(0, colIndex - 1);
          break;
        case "right":
          colIndex = Math.min(maxCol, colIndex + 1);
          break;
        case "tab":
          if (colIndex < maxCol) {
            colIndex++;
          } else if (rowIndex < maxRow) {
            colIndex = 0;
            rowIndex++;
          }
          break;
        case "shift-tab":
          if (colIndex > 0) {
            colIndex--;
          } else if (rowIndex > 0) {
            colIndex = maxCol;
            rowIndex--;
          }
          break;
      }

      setSelectedCell({ rowIndex, colIndex });
      setEditingCell(null);
    },
    [selectedCell, customers.length, columnCount]
  );

  return {
    editingCell,
    selectedCell,
    handleStartEdit,
    handleSave,
    handleCancel,
    handleCellSelect,
    handleKeyNav,
  };
}
