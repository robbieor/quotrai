import { useState, useMemo, useCallback } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortState<T> {
  field: keyof T | null;
  direction: SortDirection;
}

export function useTableSort<T>(data: T[]) {
  const [sortState, setSortState] = useState<SortState<T>>({
    field: null,
    direction: null,
  });

  const handleSort = useCallback((field: keyof T) => {
    setSortState((prev) => {
      if (prev.field !== field) {
        return { field, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { field, direction: "desc" };
      }
      return { field: null, direction: null };
    });
  }, []);

  const getSortDirection = useCallback(
    (field: keyof T): SortDirection => {
      return sortState.field === field ? sortState.direction : null;
    },
    [sortState]
  );

  const sortedData = useMemo(() => {
    if (!sortState.field || !sortState.direction) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortState.field as keyof T];
      const bVal = b[sortState.field as keyof T];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Handle numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortState.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle dates
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortState.direction === "asc"
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      // Default string comparison
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortState.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortState]);

  return {
    sortState,
    sortedData,
    handleSort,
    getSortDirection,
  };
}
