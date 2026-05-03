import { useState, useMemo, useEffect } from "react";
import { format, isPast, isToday, startOfMonth, endOfMonth, isWithinInterval, differenceInDays, addDays } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Receipt, FileText, Download, Mail, Pencil, Trash2, MoreHorizontal, Link2, DollarSign, AlertTriangle, TrendingUp, Clock, CheckCircle2, ChevronRight } from "lucide-react";
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
import { PlanGate } from "@/components/dashboard/PlanGate";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { StripeConnectNudge } from "@/components/invoices/StripeConnectNudge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { safeFormatDate } from "@/lib/pdf/dateUtils";

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
  const isMobile = useIsMobile();
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

  const dueSoonCount = useMemo(() => {
    if (!invoices) return 0;
    const now = new Date();
    const threeDaysOut = addDays(now, 3);
    return invoices.filter((i) => {
      if (i.status === "paid" || i.status === "draft") return false;
      const due = new Date(i.due_date);
      return due >= now && due <= threeDaysOut;
    }).length;
  }, [invoices]);

  const handleEdit = (invoice: Invoice) => { setSelectedInvoice(invoice); setFormOpen(true); };
  const handleDelete = (invoice: Invoice) => { setSelectedInvoice(invoice); setDeleteOpen(true); };
  const handleNewInvoice = () => { setSelectedInvoice(null); setFormOpen(true); };
  const handleViewInvoice = (invoice: Invoice) => { setSelectedInvoice(invoice); setDetailOpen(true); };
  const handleDownloadPdf = async (invoice: Invoice) => { await downloadInvoicePdf(invoice, branding, currencySymbol); };
  const handleSendEmail = (invoice: Invoice) => { setSelectedInvoice(invoice); setEmailOpen(true); };
  const handleCopyPortalLink = (invoice: Invoice) => {
    const portalUrl = `${window.location.origin}/invoice/${invoice.portal_token}`;
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

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid": return "success";
      case "overdue": return "destructive";
      case "pending": return "warning";
      default: return "secondary";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6" data-section="overdue-invoices">
        <StripeConnectNudge />
        <UpgradePromptBanner />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">Invoices</h1>
            {invoices && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {invoices.length.toLocaleString()} invoices
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!isMobile && (
              <Button variant="outline" onClick={() => setFromQuoteOpen(true)} className="text-sm">
                <FileText className="mr-2 h-4 w-4" />
                From Quote
              </Button>
            )}
            <ReadOnlyGuard>
              {isMobile ? (
                <button
                  onClick={handleNewInvoice}
                  className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md active:scale-95 transition-transform"
                >
                  <Plus className="h-5 w-5" />
                </button>
              ) : (
                <Button onClick={handleNewInvoice}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Invoice
                </Button>
              )}
            </ReadOnlyGuard>
          </div>
        </div>

        {/* Alert Banner — due within 3 days */}
        {isMobile && dueSoonCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 border-l-[3px] border-l-amber-500">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-[14px] flex-1">
              {dueSoonCount} invoice{dueSoonCount > 1 ? "s" : ""} due within 3 days
            </span>
            <button
              onClick={() => setStatusFilter("pending")}
              className="text-[14px] font-medium text-primary"
            >
              Review
            </button>
          </div>
        )}

        {!isMobile && <InsightAlerts insights={invoiceInsights} />}

        {/* Metrics Row */}
        {isMobile ? (
          <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
            {[
              { label: "OVERDUE", value: formatCurrency(stats.overdue), color: "text-destructive", accent: "border-l-destructive" },
              { label: "PAID THIS MONTH", value: formatCurrency(stats.paidMonth), color: "text-primary", accent: "border-l-primary" },
              { label: "AVG DAYS", value: String(stats.avgDaysToPay), color: "text-blue-600", accent: "border-l-blue-500" },
            ].map((m) => (
              <div
                key={m.label}
                className={cn(
                  "min-w-[120px] flex-1 snap-start rounded-xl bg-card border border-border p-3 border-l-[3px] shadow-subtle",
                  m.accent
                )}
              >
                <p className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">{m.label}</p>
                <p className={cn("text-[20px] font-bold tabular-nums mt-1", m.color)}>{m.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
            {kpiCards.map((kpi) => (
              <Card key={kpi.label} className={cn("min-w-[160px] flex-1 snap-start", kpi.alert && "border-destructive/30")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={cn("h-3.5 w-3.5", kpi.alert ? "text-destructive" : "text-muted-foreground")} />
                    <span className={cn("text-[13px] font-medium", kpi.alert ? "text-destructive" : "text-muted-foreground")}>{kpi.label}</span>
                  </div>
                  <span className={cn("text-xl font-bold tabular-nums", kpi.alert && "text-destructive")}>{kpi.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className={cn("pl-9", isMobile && "rounded-[22px] bg-[hsl(240,10%,96%)] border-transparent h-11")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {(["all", "draft", "pending", "paid", "overdue"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 h-9 rounded-[18px] text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {status === "all" ? "All" : (statusConfig[status]?.label || status)}{" "}
              {statusCounts[status as keyof typeof statusCounts]?.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Invoice List / Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ) : sortedData.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              icon={Receipt}
              title={searchQuery || statusFilter !== "all" ? "No invoices match your filters" : "Get paid faster with professional invoices"}
              description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter." : "Create invoices, send them via email or portal link, and track payments."}
              actionLabel={!searchQuery && statusFilter === "all" ? "Create Your First Invoice" : undefined}
              onAction={!searchQuery && statusFilter === "all" ? handleNewInvoice : undefined}
              secondaryActionLabel={!searchQuery && statusFilter === "all" ? "From a Quote" : undefined}
              onSecondaryAction={!searchQuery && statusFilter === "all" ? () => setFromQuoteOpen(true) : undefined}
            />
          </div>
        ) : isMobile ? (
          /* Mobile card list */
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            {sortedData.map((invoice, idx) => {
              const displayStatus = getDisplayStatus(invoice);
              const currency = invoice.currency || getCurrencyFromCountry(invoice.customer?.country_code);
              return (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => handleViewInvoice(invoice)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 transition-colors",
                    idx < sortedData.length - 1 && "border-b border-[hsl(240,10%,96%)]"
                  )}
                  style={{ minHeight: 80 }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate">{invoice.display_number}</p>
                    <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                      {invoice.customer?.name || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[16px] font-semibold tabular-nums">
                      {formatCurrencyValue(Number(invoice.total), currency)}
                    </span>
                    <Badge variant={statusBadgeVariant(displayStatus)} className="text-[11px]">
                      {(statusConfig[displayStatus] || fallbackStatus).label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Desktop table */
          <Card>
            <TableSelectionBar
              selectedCount={selectedRows.size}
              onClear={clearSelection}
              onExport={handleExport}
              onBulkDelete={() => {
                const selected = Array.from(selectedRows).map((i) => sortedData[i]).filter(Boolean);
                selected.forEach((inv) => deleteInvoice.mutate(inv.id));
                clearSelection();
              }}
            />
            <CardContent className="p-0">
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
                      <SortableHeader sortDirection={getSortDirection("customer" as any)} onSort={() => handleSort("customer" as any)} className="text-[10px] uppercase tracking-wider">
                        Customer
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("due_date" as any)} onSort={() => handleSort("due_date" as any)} className="text-[10px] uppercase tracking-wider">
                        Due Date
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("status" as any)} onSort={() => handleSort("status" as any)} className="text-[10px] uppercase tracking-wider">
                        Status
                      </SortableHeader>
                      <th className="h-8 px-3 text-[10px] uppercase tracking-wider font-semibold text-foreground/80 bg-muted/60">Items</th>
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
                            "border-b border-[hsl(240_10%_95%)] cursor-pointer transition-colors hover:bg-muted/30",
                            selectedRows.has(idx) && "bg-primary/5",
                            isOverdue && "bg-destructive/5"
                          )}
                        >
                          <td className="px-2 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(idx)}
                              onCheckedChange={(c) => handleCheckboxChange(idx, c)}
                              className="h-3.5 w-3.5"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-sm font-medium">{invoice.display_number}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-sm text-muted-foreground truncate block max-w-[150px]">{invoice.customer?.name || "—"}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn("text-sm", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                              {safeFormatDate(invoice.due_date, "MMM d, yyyy")}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <Badge className={cn((statusConfig[displayStatus] || fallbackStatus).className, "text-[11px] px-2 py-0.5")}>
                              {(statusConfig[displayStatus] || fallbackStatus).label}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-sm text-muted-foreground">{invoice.invoice_items.length}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm font-semibold tabular-nums">{formatCurrencyValue(Number(invoice.total), currency)}</span>
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
            </CardContent>
          </Card>
        )}
      </div>

      <Separator className="my-6" />
      <PlanGate requiredSeat="connect" featureLabel="Recurring Invoices (Crew+)">
        <RecurringInvoicesSection />
      </PlanGate>

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
