import { useState, useMemo, useEffect } from "react";
import { format, isPast, isToday, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Receipt, FileText, Download, Mail, Pencil, Trash2, MoreHorizontal, Link2, DollarSign, AlertTriangle, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { useInvoices, useUpdateInvoiceStatus, useDeleteInvoice, Invoice } from "@/hooks/useInvoices";
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog";
import { DeleteInvoiceDialog } from "@/components/invoices/DeleteInvoiceDialog";
import { CreateFromQuoteDialog } from "@/components/invoices/CreateFromQuoteDialog";
import { InvoiceDetailSheet } from "@/components/invoices/InvoiceDetailSheet";
import { PaymentTrackerSheet } from "@/components/invoices/PaymentTrackerSheet";
import { downloadInvoicePdf } from "@/lib/pdf/invoicePdf";
import { SendEmailDialog } from "@/components/email/SendEmailDialog";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { UpgradePromptBanner } from "@/components/billing/UpgradePromptBanner";
import { RecurringInvoicesSection } from "@/components/invoices/RecurringInvoicesSection";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { formatCurrencyValue, getCurrencyFromCountry } from "@/utils/currencyUtils";
import { SortableHeader } from "@/components/shared/table/SortableHeader";
import { TableSelectionBar } from "@/components/shared/table/TableSelectionBar";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableSelection } from "@/hooks/useTableSelection";
import { InsightAlerts } from "@/components/dashboard/InsightAlerts";
import { useInvoiceInsights } from "@/hooks/usePageInsights";
import { ReadOnlyGuard } from "@/components/auth/ReadOnlyGuard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Paid", className: "bg-green-100 text-green-800" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
};

const fallbackStatus = { label: "Unknown", className: "bg-muted text-muted-foreground" };

const getDisplayStatus = (invoice: Invoice) => {
  if (invoice.status === "pending") {
    const dueDate = new Date(invoice.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return "overdue";
  }
  return invoice.status;
};

type StatusFilter = "all" | Invoice["status"];

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: invoices, isLoading } = useInvoices();
  const updateStatus = useUpdateInvoiceStatus();
  const deleteInvoice = useDeleteInvoice();
  const { branding } = useCompanyBranding();
  const { symbol: currencySymbol, formatCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>((searchParams.get("status") as StatusFilter) || "all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fromQuoteOpen, setFromQuoteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && invoices && invoices.length > 0) {
      const target = invoices.find((i) => i.id === highlightId);
      if (target) {
        setSelectedInvoice(target);
        setDetailOpen(true);
        setSearchParams((prev) => { prev.delete("highlight"); return prev; }, { replace: true });
      }
    }
  }, [searchParams, invoices, setSearchParams]);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    const query = searchQuery.toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.display_number.toLowerCase().includes(query) ||
        invoice.customer?.name.toLowerCase().includes(query) ||
        invoice.notes?.toLowerCase().includes(query);
      const displayStatus = getDisplayStatus(invoice);
      const matchesStatus = statusFilter === "all" || displayStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const { sortedData, handleSort, getSortDirection } = useTableSort(filteredInvoices);
  const { selectedRows, allSelected, someSelected, handleCheckboxChange, handleSelectAll, clearSelection } = useTableSelection(sortedData.length);
  const invoiceInsights = useInvoiceInsights(invoices);

  const statusCounts = useMemo(() => {
    if (!invoices) return { all: 0, draft: 0, pending: 0, paid: 0, overdue: 0 };
    return {
      all: invoices.length,
      draft: invoices.filter((i) => getDisplayStatus(i) === "draft").length,
      pending: invoices.filter((i) => getDisplayStatus(i) === "pending").length,
      paid: invoices.filter((i) => getDisplayStatus(i) === "paid").length,
      overdue: invoices.filter((i) => getDisplayStatus(i) === "overdue").length,
    };
  }, [invoices]);

  // Stats
  const stats = useMemo(() => {
    if (!invoices || invoices.length === 0) return { outstanding: 0, overdue: 0, paidMonth: 0, avgDaysToPay: 0 };
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "draft").reduce((sum, i) => sum + Number(i.total), 0);
    const overdue = invoices.filter((i) => getDisplayStatus(i) === "overdue").reduce((sum, i) => sum + Number(i.total), 0);
    const paidMonth = invoices.filter((i) => i.status === "paid" && (i as any).paid_at && isWithinInterval(new Date((i as any).paid_at), { start: monthStart, end: monthEnd })).reduce((sum, i) => sum + Number(i.total), 0);

    const paidInvoices = invoices.filter((i) => i.status === "paid" && (i as any).paid_at);
    const avgDaysToPay = paidInvoices.length > 0
      ? Math.round(paidInvoices.reduce((sum, i) => sum + differenceInDays(new Date((i as any).paid_at), new Date(i.created_at)), 0) / paidInvoices.length)
      : 0;

    return { outstanding, overdue, paidMonth, avgDaysToPay };
  }, [invoices]);

  const handleEdit = (invoice: Invoice) => { setSelectedInvoice(invoice); setFormOpen(true); };
  const handleDelete = (invoice: Invoice) => { setSelectedInvoice(invoice); setDeleteOpen(true); };
  const handleNewInvoice = () => { setSelectedInvoice(null); setFormOpen(true); };
  const handleViewInvoice = (invoice: Invoice) => { setSelectedInvoice(invoice); setDetailOpen(true); };
  const handleDownloadPdf = async (invoice: Invoice) => { await downloadInvoicePdf(invoice, branding, currencySymbol); };
  const handleSendEmail = (invoice: Invoice) => { setSelectedInvoice(invoice); setEmailOpen(true); };
  const handleCopyPortalLink = (invoice: Invoice) => {
    const portalUrl = `${window.location.origin}/portal/invoice?token=${invoice.portal_token}`;
    navigator.clipboard.writeText(portalUrl);
    toast.success("Portal link copied to clipboard");
  };
  const handlePaymentTracker = (invoice: Invoice) => { setSelectedInvoice(invoice); setPaymentSheetOpen(true); };

  const handleExport = () => {
    const selected = Array.from(selectedRows).map((i) => sortedData[i]).filter(Boolean);
    const data = selected.length > 0 ? selected : sortedData;
    const csv = [
      ["Invoice #", "Customer", "Due Date", "Status", "Items", "Total"].join(","),
      ...data.map((inv) => [
        `"${inv.display_number}"`,
        `"${inv.customer?.name || ""}"`,
        inv.due_date,
        getDisplayStatus(inv),
        inv.invoice_items.length,
        inv.total,
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "invoices-export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    { label: "Outstanding", value: formatCurrency(stats.outstanding), icon: Clock },
    { label: "Overdue", value: formatCurrency(stats.overdue), icon: AlertTriangle, alert: stats.overdue > 0 },
    { label: "Paid This Month", value: formatCurrency(stats.paidMonth), icon: CheckCircle2 },
    { label: "Avg Days to Pay", value: stats.avgDaysToPay, icon: TrendingUp },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <UpgradePromptBanner />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Invoices</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFromQuoteOpen(true)} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <FileText className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">From Quote</span>
              <span className="sm:hidden">Quote</span>
            </Button>
            <ReadOnlyGuard>
              <Button onClick={handleNewInvoice} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Invoice</span>
                <span className="sm:hidden">New</span>
              </Button>
            </ReadOnlyGuard>
          </div>
        </div>

        <InsightAlerts insights={invoiceInsights} />

        {/* KPI Strip */}
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label} className={cn("min-w-[160px] flex-1 snap-start", kpi.alert && "border-destructive/30")}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className={cn("h-3.5 w-3.5", kpi.alert ? "text-destructive" : "text-muted-foreground")} />
                  <span className={cn("text-[10px] uppercase tracking-wider font-medium", kpi.alert ? "text-destructive" : "text-muted-foreground")}>{kpi.label}</span>
                </div>
                <span className={cn("text-lg font-bold", kpi.alert && "text-destructive")}>{kpi.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search invoices..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "draft", "pending", "paid", "overdue"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                statusFilter === status
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {status === "all" ? "All" : (statusConfig[status]?.label || status)}
              <span className="ml-1.5 opacity-70">{statusCounts[status as keyof typeof statusCounts]}</span>
            </button>
          ))}
        </div>

        <Card>
          <TableSelectionBar
            selectedCount={selectedRows.size}
            onClear={clearSelection}
            onExport={handleExport}
          />
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ) : sortedData.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Receipt}
                  title={searchQuery || statusFilter !== "all" ? "No invoices match your filters" : "Get paid faster with professional invoices"}
                  description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter." : "Create invoices, send them via email or portal link, and track payments — so nothing slips through the cracks."}
                  actionLabel={!searchQuery && statusFilter === "all" ? "Create Your First Invoice" : undefined}
                  onAction={!searchQuery && statusFilter === "all" ? handleNewInvoice : undefined}
                  secondaryActionLabel={!searchQuery && statusFilter === "all" ? "From a Quote" : undefined}
                  onSecondaryAction={!searchQuery && statusFilter === "all" ? () => setFromQuoteOpen(true) : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="h-8 w-8 px-2 bg-muted/60">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={handleSelectAll}
                          className="h-3.5 w-3.5"
                        />
                      </th>
                      <SortableHeader sortDirection={getSortDirection("display_number" as any)} onSort={() => handleSort("display_number" as any)} className="text-[10px] uppercase tracking-wider">
                        Invoice #
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("customer" as any)} onSort={() => handleSort("customer" as any)} className="text-[10px] uppercase tracking-wider hidden md:table-cell">
                        Customer
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("due_date" as any)} onSort={() => handleSort("due_date" as any)} className="text-[10px] uppercase tracking-wider hidden sm:table-cell">
                        Due Date
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("status" as any)} onSort={() => handleSort("status" as any)} className="text-[10px] uppercase tracking-wider">
                        Status
                      </SortableHeader>
                      <th className="h-8 px-3 text-[10px] uppercase tracking-wider font-semibold text-foreground/80 bg-muted/60 hidden lg:table-cell">Items</th>
                      <SortableHeader sortDirection={getSortDirection("total" as any)} onSort={() => handleSort("total" as any)} className="text-[10px] uppercase tracking-wider" align="right">
                        Total
                      </SortableHeader>
                      <th className="h-8 w-10 bg-muted/60" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((invoice, idx) => {
                      const displayStatus = getDisplayStatus(invoice);
                      const currency = invoice.currency || getCurrencyFromCountry(invoice.customer?.country_code);
                      const isOverdue = displayStatus === "overdue";
                      return (
                        <tr
                          key={invoice.id}
                          onClick={() => handleViewInvoice(invoice)}
                          className={cn(
                            "border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/30",
                            selectedRows.has(idx) && "bg-primary/5",
                            isOverdue && "bg-red-50/50 dark:bg-red-950/10"
                          )}
                        >
                          <td className="px-2 py-0.5 w-8" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(idx)}
                              onCheckedChange={(c) => handleCheckboxChange(idx, c)}
                              className="h-3.5 w-3.5"
                            />
                          </td>
                          <td className="px-3 py-0.5">
                            <span className="text-[11px] font-medium">{invoice.display_number}</span>
                          </td>
                          <td className="px-3 py-0.5 hidden md:table-cell">
                            <span className="text-[11px] text-muted-foreground truncate block max-w-[150px]">{invoice.customer?.name || "—"}</span>
                          </td>
                          <td className="px-3 py-0.5 hidden sm:table-cell">
                            <span className={cn("text-[11px]", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                              {format(new Date(invoice.due_date), "MMM d, yyyy")}
                            </span>
                          </td>
                          <td className="px-3 py-0.5">
                            <Badge className={cn((statusConfig[displayStatus] || fallbackStatus).className, "text-[10px] px-1.5 py-0")}>
                              {(statusConfig[displayStatus] || fallbackStatus).label}
                            </Badge>
                          </td>
                          <td className="px-3 py-0.5 hidden lg:table-cell">
                            <span className="text-[11px] text-muted-foreground">{invoice.invoice_items.length}</span>
                          </td>
                          <td className="px-3 py-0.5 text-right">
                            <span className="text-[11px] font-semibold">{formatCurrencyValue(Number(invoice.total), currency)}</span>
                          </td>
                          <td className="px-1 py-0.5 w-10" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownloadPdf(invoice)}>
                                  <Download className="mr-2 h-4 w-4" /> Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendEmail(invoice)}>
                                  <Mail className="mr-2 h-4 w-4" /> Send via Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyPortalLink(invoice)}>
                                  <Link2 className="mr-2 h-4 w-4" /> Copy Portal Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePaymentTracker(invoice)}>
                                  <DollarSign className="mr-2 h-4 w-4" /> Payment Tracker
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(invoice)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
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
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />
      <RecurringInvoicesSection />

      <InvoiceFormDialog open={formOpen} onOpenChange={setFormOpen} invoice={selectedInvoice} />
      <DeleteInvoiceDialog open={deleteOpen} onOpenChange={setDeleteOpen} invoice={selectedInvoice} />
      <CreateFromQuoteDialog open={fromQuoteOpen} onOpenChange={setFromQuoteOpen} />
      <SendEmailDialog open={emailOpen} onOpenChange={setEmailOpen} document={selectedInvoice} documentType="invoice" />
      <InvoiceDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        invoice={selectedInvoice}
        onEdit={handleEdit}
        onDownloadPdf={handleDownloadPdf}
        onSendEmail={handleSendEmail}
        onCopyPortalLink={handleCopyPortalLink}
        onPaymentTracker={handlePaymentTracker}
      />
      <PaymentTrackerSheet open={paymentSheetOpen} onOpenChange={setPaymentSheetOpen} invoice={selectedInvoice} />
    </DashboardLayout>
  );
}
