import { format, isPast, isToday } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  Mail,
  Link2,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Invoice } from "@/hooks/useInvoices";
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
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

const statusLabels = {
  draft: "Draft",
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
};

const getDisplayStatus = (invoice: Invoice) => {
  if (invoice.status === "pending") {
    const dueDate = new Date(invoice.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) {
      return "overdue";
    }
  }
  return invoice.status;
};

interface InvoicesTableProps {
  invoices: Invoice[];
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  onSendEmail: (invoice: Invoice) => void;
  onCopyPortalLink: (invoice: Invoice) => void;
  onPaymentTracker: (invoice: Invoice) => void;
  onStatusChange: (invoiceId: string, status: Invoice["status"]) => void;
  onBulkDelete?: (invoices: Invoice[]) => void;
  onBulkSendEmail?: (invoices: Invoice[]) => void;
}

export function InvoicesTable({
  invoices,
  onEdit,
  onDelete,
  onDownloadPdf,
  onSendEmail,
  onCopyPortalLink,
  onPaymentTracker,
  onStatusChange,
  onBulkDelete,
  onBulkSendEmail,
}: InvoicesTableProps) {
  const { formatCurrency } = useCurrency();
  const { sortedData, handleSort, getSortDirection } = useTableSort(invoices);
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
    const selectedInvoices = Array.from(selectedRows).map((i) => sortedData[i]);
    const dataToExport = selectedInvoices.length > 0 ? selectedInvoices : sortedData;

    exportToExcel(
      dataToExport,
      [
        { header: "Invoice #", accessor: "display_number" },
        { header: "Customer", accessor: (inv) => inv.customer?.name || "" },
        { header: "Status", accessor: (inv) => statusLabels[getDisplayStatus(inv)] },
        { header: "Items", accessor: (inv) => inv.invoice_items.length },
        { header: "Subtotal", accessor: (inv) => inv.subtotal },
        { header: "Tax", accessor: (inv) => inv.tax_amount },
        { header: "Total", accessor: (inv) => inv.total },
        { header: "Issue Date", accessor: (inv) => format(new Date(inv.issue_date), "yyyy-MM-dd") },
        { header: "Due Date", accessor: (inv) => format(new Date(inv.due_date), "yyyy-MM-dd") },
        { header: "Notes", accessor: "notes" },
      ],
      `invoices-export-${format(new Date(), "yyyy-MM-dd")}`
    );

    toast.success(`Exported ${dataToExport.length} invoices to Excel`);
  };

  const getSelectedInvoices = () => Array.from(selectedRows).map((i) => sortedData[i]);

  const handleBulkStatusChange = (status: string) => {
    const selected = getSelectedInvoices();
    selected.forEach((inv) => onStatusChange(inv.id, status as Invoice["status"]));
    clearSelection();
    toast.success(`Updated ${selected.length} invoices`);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
      <TableSelectionBar
        selectedCount={selectedRows.size}
        onClear={clearSelection}
        onExport={handleExport}
        onBulkDelete={onBulkDelete ? () => { onBulkDelete(getSelectedInvoices()); clearSelection(); } : undefined}
        onBulkSendEmail={onBulkSendEmail ? () => { onBulkSendEmail(getSelectedInvoices()); clearSelection(); } : undefined}
        onBulkStatusChange={handleBulkStatusChange}
        statusOptions={[
          { value: "draft", label: "Draft" },
          { value: "pending", label: "Pending" },
          { value: "paid", label: "Paid" },
          { value: "overdue", label: "Overdue" },
        ]}
      />

      <ScrollArea className="w-full">
        <div className="min-w-[900px]">
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
                <SortableHeader
                  sortDirection={getSortDirection("display_number")}
                  onSort={() => handleSort("display_number")}
                  className="w-28"
                >
                  Invoice #
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
                <th className="h-10 px-3 py-2 text-xs font-semibold text-foreground/80 bg-muted/60 border-r border-border/30 text-center w-16 hidden sm:table-cell">
                  Items
                </th>
                <SortableHeader
                  sortDirection={getSortDirection("total")}
                  onSort={() => handleSort("total")}
                  align="right"
                  className="w-28"
                >
                  Total
                </SortableHeader>
                <SortableHeader
                  sortDirection={getSortDirection("due_date")}
                  onSort={() => handleSort("due_date")}
                  className="w-28 hidden md:table-cell"
                >
                  Due Date
                </SortableHeader>
                <th className="w-12 h-10 px-2 bg-muted/60"></th>
              </tr>
            </thead>

            <tbody>
              {sortedData.map((invoice, rowIdx) => {
                const displayStatus = getDisplayStatus(invoice);
                return (
                  <tr
                    key={invoice.id}
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
                    <td className="px-3 py-2 border-r border-border/20">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 shrink-0">
                          <Receipt className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{invoice.display_number}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-border/20">
                      <span className="text-sm truncate block max-w-[200px]">
                        {invoice.customer?.name || "No customer"}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-border/20">
                      <Badge className={cn("text-xs", statusColors[displayStatus])}>
                        {statusLabels[displayStatus]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center border-r border-border/20 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {invoice.invoice_items.length}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right border-r border-border/20">
                      <span className="font-semibold text-sm">
                        {formatCurrencyValue(Number(invoice.total), invoice.currency || getCurrencyFromCountry(invoice.customer?.country_code))}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-border/20 hidden md:table-cell">
                      <span className={cn(
                        "text-xs",
                        displayStatus === "overdue" ? "text-destructive font-medium" : "text-muted-foreground"
                      )}>
                        {format(new Date(invoice.due_date), "MMM d, yyyy")}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onDownloadPdf(invoice)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSendEmail(invoice)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send via Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onCopyPortalLink(invoice)}>
                            <Link2 className="mr-2 h-4 w-4" />
                            Copy Portal Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPaymentTracker(invoice)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Payment Tracker
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEdit(invoice)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Clock className="mr-2 h-4 w-4" />
                              Change Status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => onStatusChange(invoice.id, "draft")}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Draft
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onStatusChange(invoice.id, "pending")}>
                                <Clock className="mr-2 h-4 w-4" />
                                Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onStatusChange(invoice.id, "paid")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Paid
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onStatusChange(invoice.id, "overdue")}>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Overdue
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(invoice)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
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
