import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Star, Edit2, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Template, getTradeCategoryLabel } from "@/hooks/useTemplates";
import { useToggleFavorite } from "@/hooks/useTemplates";
import { useCurrency } from "@/hooks/useCurrency";
import { SortableHeader } from "@/components/shared/table/SortableHeader";
import { TableSelectionBar } from "@/components/shared/table/TableSelectionBar";
import { useTableSelection } from "@/hooks/useTableSelection";
import { useTableSort } from "@/hooks/useTableSort";
import { exportToExcel } from "@/utils/exportToExcel";
import { toast } from "sonner";

interface TemplatesTableProps {
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onUse: (template: Template) => void;
}

export function TemplatesTable({
  templates,
  onEdit,
  onDelete,
  onUse,
}: TemplatesTableProps) {
  const toggleFavorite = useToggleFavorite();
  const { formatRate } = useCurrency();
  const { sortedData, handleSort, getSortDirection } = useTableSort(templates);
  const {
    selectedRows,
    allSelected,
    someSelected,
    handleRowClick,
    handleSelectAll,
    handleCheckboxChange,
    clearSelection,
  } = useTableSelection(sortedData.length);

  const handleToggleFavorite = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    toggleFavorite.mutate({ id: template.id, is_favorite: !template.is_favorite });
  };

  const handleExport = () => {
    const selectedTemplates = Array.from(selectedRows).map((i) => sortedData[i]);
    const dataToExport = selectedTemplates.length > 0 ? selectedTemplates : sortedData;

    exportToExcel(
      dataToExport,
      [
        { header: "Name", accessor: "name" },
        { header: "Category", accessor: (t) => getTradeCategoryLabel(t.category) },
        { header: "Description", accessor: "description" },
        { header: "Labour Rate", accessor: "labour_rate_default" },
        { header: "Duration (hrs)", accessor: "estimated_duration" },
        { header: "Favorite", accessor: (t) => (t.is_favorite ? "Yes" : "No") },
        { header: "Created", accessor: (t) => format(new Date(t.created_at), "yyyy-MM-dd") },
      ],
      `templates-export-${format(new Date(), "yyyy-MM-dd")}`
    );

    toast.success(`Exported ${dataToExport.length} templates to Excel`);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
      <TableSelectionBar
        selectedCount={selectedRows.size}
        onClear={clearSelection}
        onExport={handleExport}
      />

      <ScrollArea className="w-full">
        <div className="min-w-[700px]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border/50">
                <th className="w-10 h-10 px-3 text-center bg-muted/60 border-r border-border/30">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    className="h-4 w-4"
                    aria-label="Select all"
                    {...(someSelected ? { "data-state": "indeterminate" } : {})}
                  />
                </th>
                <th className="w-10 h-10 px-2 bg-muted/60 border-r border-border/30"></th>
                <SortableHeader
                  sortDirection={getSortDirection("name")}
                  onSort={() => handleSort("name")}
                >
                  Name
                </SortableHeader>
                <SortableHeader
                  sortDirection={getSortDirection("category")}
                  onSort={() => handleSort("category")}
                  className="w-28"
                >
                  Category
                </SortableHeader>
                <th className="h-10 px-3 py-2 text-xs font-semibold text-foreground/80 bg-muted/60 border-r border-border/30 hidden md:table-cell">
                  Description
                </th>
                <SortableHeader
                  sortDirection={getSortDirection("labour_rate_default")}
                  onSort={() => handleSort("labour_rate_default")}
                  align="right"
                  className="w-24 hidden sm:table-cell"
                >
                  Rate
                </SortableHeader>
                <SortableHeader
                  sortDirection={getSortDirection("estimated_duration")}
                  onSort={() => handleSort("estimated_duration")}
                  align="right"
                  className="w-24 hidden sm:table-cell"
                >
                  Duration
                </SortableHeader>
                <th className="w-32 h-10 px-2 bg-muted/60 text-right text-xs font-semibold text-foreground/80">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedData.map((template, rowIdx) => (
                <tr
                  key={template.id}
                  className={cn(
                    "border-b border-border/30 transition-colors cursor-pointer",
                    selectedRows.has(rowIdx)
                      ? "bg-primary/10 hover:bg-primary/15"
                      : "hover:bg-muted/50"
                  )}
                  onClick={(e) => handleRowClick(rowIdx, e)}
                >
                  <td className="px-3 py-2 text-center border-r border-border/20">
                    <Checkbox
                      checked={selectedRows.has(rowIdx)}
                      onCheckedChange={(checked) => handleCheckboxChange(rowIdx, checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-2 py-2 text-center border-r border-border/20">
                    <button
                      onClick={(e) => handleToggleFavorite(e, template)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          template.is_favorite
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2 border-r border-border/20">
                    <span className="font-medium text-sm">{template.name}</span>
                  </td>
                  <td className="px-3 py-2 border-r border-border/20">
                    <Badge variant="secondary" className="text-xs">
                      {getTradeCategoryLabel(template.category)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 border-r border-border/20 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground truncate block max-w-[200px]">
                      {template.description || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right border-r border-border/20 hidden sm:table-cell">
                    <span className="text-sm">
                      {template.labour_rate_default
                        ? formatRate(template.labour_rate_default, "hr")
                        : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right border-r border-border/20 hidden sm:table-cell">
                    <span className="text-sm">
                      {template.estimated_duration ? `${template.estimated_duration}h` : "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(template);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(template);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUse(template);
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" className="h-2.5" />
      </ScrollArea>

      <div className="md:hidden px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border/30 flex items-center gap-2">
        <span>←→</span>
        <span>Swipe to see more columns</span>
      </div>
    </div>
  );
}
