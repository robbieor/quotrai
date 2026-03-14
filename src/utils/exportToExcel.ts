/**
 * Export data to Excel (CSV format)
 * Browser-native implementation without external dependencies
 */

interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => string | number | null | undefined);
}

export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  // Build CSV content
  const headers = columns.map((col) => `"${col.header}"`).join(",");
  
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value =
          typeof col.accessor === "function"
            ? col.accessor(item)
            : item[col.accessor];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '""';
        }
        
        // Escape quotes and wrap in quotes for CSV safety
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",");
  });

  const csvContent = [headers, ...rows].join("\n");
  
  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  
  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
