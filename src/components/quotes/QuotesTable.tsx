import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  Mail,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Quote } from "@/hooks/useQuotes";
import { formatCurrencyValue, getCurrencyFromCountry } from "@/utils/currencyUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { SortableHeader } from "@/components/shared/table/SortableHeader";
import { TableSelectionBar } from "@/components/shared/table/TableSelectionBar";
import { useTableSelection } from "@/hooks/useTableSelection";
import { useTableSort } from "@/hooks/useTableSort";
import { exportToExcel } from "@/utils/exportToExcel";
import { toast } from "sonner";

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

interface QuotesTableProps {
  quotes: Quote[];
  onEdit: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
  onDownloadPdf: (quote: Quote) => void;
  onSendEmail: (quote: Quote) => void;
  onCopyPortalLink: (quote: Quote) => void;
  onBulkDelete?: (quotes: Quote[]) => void;
  onBulkSendEmail?: (quotes: Quote[]) => void;
  onView?: (quote: Quote) => void;
}

export function QuotesTable({
  quotes,
  onEdit,
  onDelete,
  onDownloadPdf,
  onSendEmail,
  onCopyPortalLink,
  onBulkDelete,
  onBulkSendEmail,
  onView,
}: QuotesTableProps) {
  const { formatCurrency } = useCurrency();
  const { sortedData, handleSort, getSortDirection } = useTableSort(quotes);
  const {
    selectedRows,
    allSelected,
    someSelected,
    handleRowClick,
    handleSelectAll,
    handleCheckboxChange,
    clearSelection,
  } = useTableSelection(sortedData.length);

  const handleExport = () => {
    const selectedQuotes = Array.from(selectedRows).map((i) => sortedData[i]);
    const dataToExport = selectedQuotes.length > 0 ? selectedQuotes : sortedData;

    exportToExcel(
      dataToExport,
      [
        { header: "Quote #", accessor: "display_number" },
        { header: "Customer", accessor: (q) => q.customer?.name || "" },
        { header: "Status", accessor: (q) => statusLabels[q.status] },
        { header: "Items", accessor: (q) => q.quote_items.length },
        { header: "Subtotal", accessor: (q) => q.subtotal },
        { header: "Tax", accessor: (q) => q.tax_amount },
        { header: "Total", accessor: (q) => q.total },
        { header: "Valid Until", accessor: (q) => q.valid_until || "" },
        { header: "Created", accessor: (q) => format(new Date(q.created_at), "yyyy-MM-dd") },
        { header: "Notes", accessor: "notes" },
      ],
      `quotes-export-${format(new Date(), "yyyy-MM-dd")}`
    );

    toast.success(`Exported ${dataToExport.length} quotes to Excel`);
  };

  const getSelectedQuotes = () => Array.from(selectedRows).map((i) => sortedData[i]);

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
      <TableSelectionBar
        selectedCount={selectedRows.size}
        onClear={clearSelection}
        onExport={handleExport}
        onBulkDelete={onBulkDelete ? () => { onBulkDelete(getSelectedQuotes()); clearSelection(); } : undefined}
        onBulkSendEmail={onBulkSendEmail ? () => { onBulkSendEmail(getSelectedQuotes()); clearSelection(); } : undefined}
      />

      {/* Desktop Table */}
      <div className="hidden md:block">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border/50">
              <th className="w-8 h-8 px-2 text-center bg-muted/60 border-r border-border/30">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="h-3.5 w-3.5"
                  aria-label="Select all"
                  {...(someSelected ? { "data-state": "indeterminate" } : {})}
                />
              </th>
              <SortableHeader
                sortDirection={getSortDirection("display_number")}
                onSort={() => handleSort("display_number")}
                className="w-28"
              >
                Quote #
              </SortableHeader>
              <SortableHeader
                sortDirection={getSortDirection("customer")}
                onSort={() => handleSort("customer")}
              >
                Customer
              </SortableHeader>
              <SortableHeader
                sortDirection={getSortDirection("status")}
                onSort={() => handleSort("status")}
                className="w-24"
              >
                Status
              </SortableHeader>
              <th className="h-8 px-2 text-xs font-semibold text-foreground/80 bg-muted/60 border-r border-border/30 text-center w-16 hidden sm:table-cell">
                Items
              </th>
              <SortableHeader
                sortDirection={getSortDirection("total")}
                onSort={() => handleSort("total")}
                align="right"
                className="w-24"
              >
                Total
              </SortableHeader>
              <SortableHeader
                sortDirection={getSortDirection("created_at")}
                onSort={() => handleSort("created_at")}
                className="w-28 hidden md:table-cell"
              >
                Created
              </SortableHeader>
              <th className="w-10 h-8 px-1.5 bg-muted/60"></th>
            </tr>
          </thead>

          <tbody>
            {sortedData.map((quote, rowIdx) => (
              <tr
                key={quote.id}
                className={cn(
                  "border-b border-border/30 transition-colors cursor-pointer",
                  selectedRows.has(rowIdx)
                    ? "bg-primary/10 hover:bg-primary/15"
                    : "hover:bg-muted/50"
                )}
                onClick={(e) => {
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    handleRowClick(rowIdx, e);
                  } else if (onView) {
                    onView(quote);
                  }
                }}
              >
                <td className="px-2 py-1.5 text-center border-r border-border/20">
                  <Checkbox
                    checked={selectedRows.has(rowIdx)}
                    onCheckedChange={(checked) => handleCheckboxChange(rowIdx, checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3.5 w-3.5"
                  />
                </td>
                <td className="px-2 py-1.5 border-r border-border/20">
                  <span className="font-medium text-sm">{quote.display_number}</span>
                </td>
                <td className="px-2 py-1.5 border-r border-border/20">
                  <span className="text-sm truncate block max-w-[200px]">
                    {quote.customer?.name || "No customer"}
                  </span>
                </td>
                <td className="px-2 py-1.5 border-r border-border/20">
                  <Badge className={cn("text-[10px] px-1.5 py-0", statusColors[quote.status])}>
                    {statusLabels[quote.status]}
                  </Badge>
                </td>
                <td className="px-2 py-1.5 text-center border-r border-border/20 hidden sm:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {quote.quote_items.length}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right border-r border-border/20">
                  <span className="text-xs font-semibold tabular-nums">
                    {formatCurrencyValue(Number(quote.total), (quote as any).currency || getCurrencyFromCountry(quote.customer?.country_code))}
                  </span>
                </td>
                <td className="px-2 py-1.5 border-r border-border/20 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(quote.created_at), "MMM d, yyyy")}
                  </span>
                </td>
                <td className="px-1.5 py-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDownloadPdf(quote)}>
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSendEmail(quote)}>
                        <Mail className="mr-2 h-3.5 w-3.5" />
                        Send via Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCopyPortalLink(quote)}>
                        <Link2 className="mr-2 h-3.5 w-3.5" />
                        Copy Portal Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(quote)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(quote)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-border/30">
        {sortedData.map((quote, rowIdx) => (
          <div
            key={quote.id}
            className={cn(
              "px-3 py-2.5 transition-colors cursor-pointer",
              selectedRows.has(rowIdx) ? "bg-primary/10" : "hover:bg-muted/50"
            )}
            onClick={() => onView?.(quote)}
          >
            <div className="flex items-start gap-2">
              <div className="pt-0.5 shrink-0">
                <Checkbox
                  checked={selectedRows.has(rowIdx)}
                  onCheckedChange={(checked) => handleCheckboxChange(rowIdx, checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3.5 w-3.5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{quote.display_number}</span>
                  <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0", statusColors[quote.status])}>
                    {statusLabels[quote.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  {quote.customer?.name && <span className="truncate">{quote.customer.name}</span>}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrencyValue(Number(quote.total), (quote as any).currency || getCurrencyFromCountry(quote.customer?.country_code))}
                  </span>
                </div>
              </div>
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(quote)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(quote)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
