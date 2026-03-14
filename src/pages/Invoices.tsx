import { useState, useMemo } from "react";
import { format, isPast, isToday } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Receipt, FileText, Download, Mail, Pencil, Trash2, MoreHorizontal, Link2, DollarSign } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Paid", className: "bg-green-100 text-green-800" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
};

const getDisplayStatus = (invoice: Invoice) => {
  if (invoice.status === "pending") {
    const dueDate = new Date(invoice.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return "overdue";
  }
  return invoice.status;
};

type StatusFilter = "all" | Invoice["status"];

export default function Invoices() {
  const { data: invoices, isLoading } = useInvoices();
  const updateStatus = useUpdateInvoiceStatus();
  const deleteInvoice = useDeleteInvoice();
  const { branding } = useCompanyBranding();
  const { symbol: currencySymbol } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fromQuoteOpen, setFromQuoteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    const query = searchQuery.toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoice_number.toLowerCase().includes(query) ||
        invoice.customer?.name.toLowerCase().includes(query) ||
        invoice.notes?.toLowerCase().includes(query);
      const displayStatus = getDisplayStatus(invoice);
      const matchesStatus = statusFilter === "all" || displayStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

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

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <UpgradePromptBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-sm md:text-base text-muted-foreground">Track payments and manage invoices</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFromQuoteOpen(true)} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <FileText className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">From Quote</span>
              <span className="sm:hidden">Quote</span>
            </Button>
            <Button onClick={handleNewInvoice} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <Plus className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Invoice</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search invoices..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Status filter tabs */}
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
              {status === "all" ? "All" : statusConfig[status].label}
              <span className="ml-1.5 opacity-70">{statusCounts[status]}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={searchQuery || statusFilter !== "all" ? "No invoices match your filters" : "Get paid faster with professional invoices"}
            description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter." : "Create invoices, send them via email or portal link, and track payments — so nothing slips through the cracks."}
            actionLabel={!searchQuery && statusFilter === "all" ? "Create Your First Invoice" : undefined}
            onAction={!searchQuery && statusFilter === "all" ? handleNewInvoice : undefined}
            secondaryActionLabel={!searchQuery && statusFilter === "all" ? "From a Quote" : undefined}
            onSecondaryAction={!searchQuery && statusFilter === "all" ? () => setFromQuoteOpen(true) : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredInvoices.map((invoice) => {
              const displayStatus = getDisplayStatus(invoice);
              const currency = invoice.currency || getCurrencyFromCountry(invoice.customer?.country_code);
              return (
                <div
                  key={invoice.id}
                  onClick={() => handleViewInvoice(invoice)}
                  className="group relative bg-card rounded-xl border border-border/60 p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Receipt className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground truncate">{invoice.customer?.name || "No customer"}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadPdf(invoice); }}>
                          <Download className="mr-2 h-4 w-4" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendEmail(invoice); }}>
                          <Mail className="mr-2 h-4 w-4" /> Send via Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyPortalLink(invoice); }}>
                          <Link2 className="mr-2 h-4 w-4" /> Copy Portal Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePaymentTracker(invoice); }}>
                          <DollarSign className="mr-2 h-4 w-4" /> Payment Tracker
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(invoice); }}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(invoice); }} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Total */}
                  <p className="text-xl font-bold mb-3">
                    {formatCurrencyValue(Number(invoice.total), currency)}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-xs", statusConfig[displayStatus].className)}>
                      {statusConfig[displayStatus].label}
                    </Badge>
                    <span className={cn(
                      "text-xs",
                      displayStatus === "overdue" ? "text-destructive font-medium" : "text-muted-foreground"
                    )}>
                      Due {format(new Date(invoice.due_date), "MMM d, yyyy")}
                    </span>
                  </div>

                  {/* Items count */}
                  <p className="text-xs text-muted-foreground mt-2">
                    {invoice.invoice_items.length} {invoice.invoice_items.length === 1 ? "item" : "items"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
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
