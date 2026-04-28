import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, FileText, Download, Mail, Pencil, Trash2, MoreHorizontal, Link2, TrendingUp, TrendingDown, PieChart, BarChart3, CalendarDays, AlertTriangle, ChevronRight, Send, CheckCircle, XCircle } from "lucide-react";
import { CreateFromQuoteDialog } from "@/components/invoices/CreateFromQuoteDialog";
import { JobFormDialog } from "@/components/jobs/JobFormDialog";
import { useCreateJob } from "@/hooks/useJobs";
import { useQuotes, useDeleteQuote, useUpdateQuoteStatus, Quote } from "@/hooks/useQuotes";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { DeleteQuoteDialog } from "@/components/quotes/DeleteQuoteDialog";
import { QuoteDetailSheet } from "@/components/quotes/QuoteDetailSheet";
import { downloadQuotePdf } from "@/lib/pdf/quotePdf";
import { SendEmailDialog } from "@/components/email/SendEmailDialog";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useCurrency } from "@/hooks/useCurrency";
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { UpgradePromptBanner } from "@/components/billing/UpgradePromptBanner";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { formatCurrencyValue, getCurrencyFromCountry } from "@/utils/currencyUtils";
import { SortableHeader } from "@/components/shared/table/SortableHeader";
import { TableSelectionBar } from "@/components/shared/table/TableSelectionBar";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableSelection } from "@/hooks/useTableSelection";
import { InsightAlerts } from "@/components/dashboard/InsightAlerts";
import { useQuoteInsights } from "@/hooks/usePageInsights";
import { ReadOnlyGuard } from "@/components/auth/ReadOnlyGuard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-800" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-800" },
  declined: { label: "Declined", className: "bg-red-100 text-red-800" },
};

const mobileStatusBadge: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/12 text-blue-700",
  accepted: "bg-green-500/12 text-green-700",
  declined: "bg-red-500/12 text-red-700",
};

type StatusFilter = "all" | Quote["status"];

export default function Quotes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: quotes, isLoading } = useQuotes();
  const { branding } = useCompanyBranding();
  const deleteQuote = useDeleteQuote();
  const updateStatus = useUpdateQuoteStatus();
  const { symbol: currencySymbol, formatCurrency } = useCurrency();
  const createJob = useCreateJob();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>((searchParams.get("status") as StatusFilter) || "all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [convertToInvoiceOpen, setConvertToInvoiceOpen] = useState(false);
  const [convertToJobOpen, setConvertToJobOpen] = useState(false);
  const [jobPrefill, setJobPrefill] = useState<any>(null);

  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && quotes && quotes.length > 0) {
      const target = quotes.find((q) => q.id === highlightId);
      if (target) {
        setSelectedQuote(target);
        setDetailOpen(true);
        setSearchParams((prev) => { prev.delete("highlight"); return prev; }, { replace: true });
      }
    }
  }, [searchParams, quotes, setSearchParams]);

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    const query = searchQuery.toLowerCase();
    return quotes.filter((quote) => {
      const matchesSearch =
        quote.display_number.toLowerCase().includes(query) ||
        quote.customer?.name.toLowerCase().includes(query) ||
        quote.notes?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, statusFilter]);

  const { sortedData, handleSort, getSortDirection } = useTableSort(filteredQuotes);
  const { selectedRows, allSelected, someSelected, handleCheckboxChange, handleSelectAll, clearSelection } = useTableSelection(sortedData.length);
  const quoteInsights = useQuoteInsights(quotes);

  const statusCounts = useMemo(() => {
    if (!quotes) return { all: 0, draft: 0, sent: 0, accepted: 0, declined: 0 };
    return {
      all: quotes.length,
      draft: quotes.filter((q) => q.status === "draft").length,
      sent: quotes.filter((q) => q.status === "sent").length,
      accepted: quotes.filter((q) => q.status === "accepted").length,
      declined: quotes.filter((q) => q.status === "declined").length,
    };
  }, [quotes]);

  // Cold quotes: sent 7+ days ago with no response
  const coldQuotes = useMemo(() => {
    if (!quotes) return { count: 0, valueAtRisk: 0, ids: new Set<string>() };
    const now = new Date();
    const cold = quotes.filter(
      (q) => q.status === "sent" && differenceInDays(now, new Date(q.created_at)) >= 7
    );
    return {
      count: cold.length,
      valueAtRisk: cold.reduce((sum, q) => sum + Number(q.total), 0),
      ids: new Set(cold.map((q) => q.id)),
    };
  }, [quotes]);

  // Stats
  const stats = useMemo(() => {
    if (!quotes || quotes.length === 0) return { pipelineValue: 0, acceptanceRate: 0, avgValue: 0, thisMonth: 0 };
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const nonDeclined = quotes.filter((q) => q.status !== "declined");
    const pipelineValue = nonDeclined.filter((q) => q.status === "sent" || q.status === "draft").reduce((sum, q) => sum + Number(q.total), 0);
    const decided = quotes.filter((q) => q.status === "accepted" || q.status === "declined");
    const acceptanceRate = decided.length > 0 ? Math.round((quotes.filter((q) => q.status === "accepted").length / decided.length) * 100) : 0;
    const avgValue = quotes.length > 0 ? quotes.reduce((sum, q) => sum + Number(q.total), 0) / quotes.length : 0;
    const thisMonth = quotes.filter((q) => isWithinInterval(new Date(q.created_at), { start: monthStart, end: monthEnd })).length;

    return { pipelineValue, acceptanceRate, avgValue, thisMonth };
  }, [quotes]);

  const handleEdit = (quote: Quote) => { setSelectedQuote(quote); setFormOpen(true); };
  const handleDelete = (quote: Quote) => { setSelectedQuote(quote); setDeleteOpen(true); };
  const handleNewQuote = () => { setSelectedQuote(null); setFormOpen(true); };
  const handleViewQuote = (quote: Quote) => { setSelectedQuote(quote); setDetailOpen(true); };
  const handleDownloadPdf = async (quote: Quote) => { await downloadQuotePdf(quote, branding, currencySymbol); };
  const handleSendEmail = (quote: Quote) => { setSelectedQuote(quote); setEmailOpen(true); };
  const handleCopyPortalLink = (quote: Quote) => {
    const portalUrl = `${window.location.origin}/quote/${quote.portal_token}`;
    navigator.clipboard.writeText(portalUrl);
    toast.success("Portal link copied to clipboard");
  };

  const handleConvertToJob = (quote: Quote) => {
    const description = quote.quote_items.map((item) => `${item.description} (x${item.quantity})`).join("\n");
    setJobPrefill({
      customer_id: quote.customer_id,
      title: `Job from ${quote.display_number}`,
      description,
      quoted_price: Number(quote.total),
    });
    setConvertToJobOpen(true);
  };

  const handleConvertToInvoice = (quote: Quote) => {
    setSelectedQuote(quote);
    setConvertToInvoiceOpen(true);
  };

  const handleUpdateStatus = (quote: Quote, status: "sent" | "accepted" | "declined") => {
    updateStatus.mutate(
      { id: quote.id, status },
      {
        onSuccess: () => {
          toast.success(`Quote marked as ${status}`);
          setDetailOpen(false);
        },
      }
    );
  };

  const handleExport = () => {
    const selected = Array.from(selectedRows).map((i) => sortedData[i]).filter(Boolean);
    const data = selected.length > 0 ? selected : sortedData;
    const csv = [
      ["Quote #", "Customer", "Status", "Date", "Items", "Total"].join(","),
      ...data.map((q) => [
        `"${q.display_number}"`,
        `"${q.customer?.name || ""}"`,
        q.status,
        format(new Date(q.created_at), "yyyy-MM-dd"),
        q.quote_items.length,
        q.total,
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "quotes-export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    { label: "Pipeline Value", value: formatCurrency(stats.pipelineValue), icon: BarChart3 },
    { label: "Acceptance Rate", value: `${stats.acceptanceRate}%`, icon: PieChart },
    { label: "Avg Quote Value", value: formatCurrency(stats.avgValue), icon: TrendingUp },
    { label: "Quotes This Month", value: stats.thisMonth, icon: CalendarDays },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6" data-section="pending-quotes">
        <UpgradePromptBanner />

        {/* === HEADER === */}
        {isMobile ? (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.02em]">Quotes</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {quotes?.length?.toLocaleString() ?? "—"} quotes
              </p>
            </div>
            <ReadOnlyGuard>
              <button
                onClick={handleNewQuote}
                className="h-11 w-11 rounded-full bg-primary flex items-center justify-center shadow-md"
              >
                <Plus className="h-5 w-5 text-white" />
              </button>
            </ReadOnlyGuard>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quotes</h1>
            <ReadOnlyGuard>
              <Button onClick={handleNewQuote} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Button>
            </ReadOnlyGuard>
          </div>
        )}

        {/* === COLD QUOTES ALERT (mobile) === */}
        {isMobile && coldQuotes.count > 0 && (
          <div className="bg-white rounded-xl border border-border/60 border-l-[4px] border-l-red-500 p-3 flex items-center gap-3 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold leading-tight">
                {coldQuotes.count} quotes going cold
              </p>
              <p className="text-[13px] text-muted-foreground leading-tight mt-0.5">
                No response in 7+ days — {formatCurrency(coldQuotes.valueAtRisk)} at risk
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0 text-[13px]"
              onClick={() => setStatusFilter("sent")}
            >
              Chase
            </Button>
          </div>
        )}

        {/* Desktop insight alerts */}
        {!isMobile && <InsightAlerts insights={quoteInsights} />}

        {/* === METRICS ROW === */}
        {isMobile ? (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            <div className="min-w-[120px] flex-1 bg-white rounded-xl border border-border/60 p-3 shadow-sm border-l-[3px] border-l-green-500">
              <p className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Pipeline</p>
              <p className="text-[20px] font-bold tabular-nums text-green-600 mt-0.5">{formatCurrency(stats.pipelineValue)}</p>
            </div>
            <div className="min-w-[120px] flex-1 bg-white rounded-xl border border-border/60 p-3 shadow-sm border-l-[3px] border-l-blue-500">
              <p className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Acceptance</p>
              <p className="text-[20px] font-bold tabular-nums text-blue-600 mt-0.5">{stats.acceptanceRate}%</p>
            </div>
            <div className="min-w-[120px] flex-1 bg-white rounded-xl border border-border/60 p-3 shadow-sm border-l-[3px] border-l-gray-400">
              <p className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Avg Quote</p>
              <p className="text-[20px] font-bold tabular-nums mt-0.5">{formatCurrency(stats.avgValue)}</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
            {kpiCards.map((kpi) => (
              <Card key={kpi.label} className="min-w-[160px] flex-1 snap-start">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[13px] text-muted-foreground font-medium">{kpi.label}</span>
                  </div>
                  <span className="text-xl font-bold tabular-nums">{kpi.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* === SEARCH === */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-9",
              isMobile && "h-11 rounded-[22px] bg-[hsl(240,10%,96%)] border-0 focus-visible:ring-1"
            )}
          />
        </div>

        {/* === STATUS FILTERS === */}
        <div className={cn("flex gap-2", isMobile ? "overflow-x-auto scrollbar-hide -mx-1 px-1" : "flex-wrap")}>
          {(["all", "draft", "sent", "accepted", "declined"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 h-9 rounded-[18px] text-[13px] font-medium transition-colors whitespace-nowrap flex-shrink-0",
                statusFilter === status
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {status === "all" ? "All" : statusConfig[status].label}
              <span className="ml-1.5 opacity-80">{statusCounts[status].toLocaleString()}</span>
            </button>
          ))}
        </div>

        {/* === CONTENT === */}
        {isMobile ? (
          /* ---- MOBILE LIST ---- */
          <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ) : sortedData.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title={searchQuery || statusFilter !== "all" ? "No quotes match your filters" : "Win more work with professional quotes"}
                  description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter." : "Create branded quotes in seconds, send them to customers, and track acceptance."}
                  actionLabel={!searchQuery && statusFilter === "all" ? "Create Your First Quote" : undefined}
                  onAction={!searchQuery && statusFilter === "all" ? handleNewQuote : undefined}
                />
              </div>
            ) : (
              <div>
                {sortedData.map((quote, idx) => {
                  const currency = (quote as any).currency || getCurrencyFromCountry(quote.customer?.country_code);
                  const isCold = coldQuotes.ids.has(quote.id);
                  return (
                    <div
                      key={quote.id}
                      onClick={() => handleViewQuote(quote)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 min-h-[72px] cursor-pointer active:bg-muted/40 transition-colors",
                        idx < sortedData.length - 1 && "border-b border-[#F0F0F5]"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isCold && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          )}
                          <span className="text-[15px] font-semibold truncate">{quote.display_number}</span>
                        </div>
                        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                          {quote.customer?.name || "No customer"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end ml-3 flex-shrink-0">
                        <span className="text-[16px] font-semibold tabular-nums">
                          {formatCurrencyValue(Number(quote.total), currency)}
                        </span>
                        <Badge className={cn(mobileStatusBadge[quote.status], "text-[11px] px-2 py-0 h-5 mt-1 font-medium border-0")}>
                          {statusConfig[quote.status].label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ---- DESKTOP TABLE ---- */
          <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
            <TableSelectionBar
              selectedCount={selectedRows.size}
              onClear={clearSelection}
              onExport={handleExport}
              onBulkDelete={() => {
                const selected = Array.from(selectedRows).map((i) => sortedData[i]).filter(Boolean);
                selected.forEach((q) => deleteQuote.mutate(q.id));
                clearSelection();
              }}
            />
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ) : sortedData.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title={searchQuery || statusFilter !== "all" ? "No quotes match your filters" : "Win more work with professional quotes"}
                  description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter to find what you're looking for." : "Create branded quotes in seconds, send them to customers, and track when they're accepted — all from one place."}
                  actionLabel={!searchQuery && statusFilter === "all" ? "Create Your First Quote" : undefined}
                  onAction={!searchQuery && statusFilter === "all" ? handleNewQuote : undefined}
                />
              </div>
            ) : (
              <>
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
                        <SortableHeader sortDirection={getSortDirection("display_number" as any)} onSort={() => handleSort("display_number" as any)}>
                          Quote #
                        </SortableHeader>
                        <SortableHeader sortDirection={getSortDirection("customer" as any)} onSort={() => handleSort("customer" as any)}>
                          Customer
                        </SortableHeader>
                        <SortableHeader sortDirection={getSortDirection("created_at" as any)} onSort={() => handleSort("created_at" as any)} className="w-28">
                          Date
                        </SortableHeader>
                        <SortableHeader sortDirection={getSortDirection("status" as any)} onSort={() => handleSort("status" as any)} className="w-24">
                          Status
                        </SortableHeader>
                        <th className="h-8 px-2 text-xs font-semibold text-foreground/80 bg-muted/60 border-r border-border/30 hidden lg:table-cell w-16 text-center">Items</th>
                        <SortableHeader sortDirection={getSortDirection("total" as any)} onSort={() => handleSort("total" as any)} align="right" className="w-24">
                          Total
                        </SortableHeader>
                        <th className="w-10 h-8 px-1.5 bg-muted/60"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((quote, idx) => {
                        const currency = (quote as any).currency || getCurrencyFromCountry(quote.customer?.country_code);
                        return (
                          <tr
                            key={quote.id}
                            onClick={() => handleViewQuote(quote)}
                            className={cn(
                              "border-b border-border/30 transition-colors cursor-pointer",
                              selectedRows.has(idx)
                                ? "bg-primary/10 hover:bg-primary/15"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <td className="px-2 py-1.5 text-center border-r border-border/20" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedRows.has(idx)}
                                onCheckedChange={(c) => handleCheckboxChange(idx, c)}
                                className="h-3.5 w-3.5"
                              />
                            </td>
                            <td className="px-2 py-1.5 border-r border-border/20">
                              <span className="font-medium text-sm">{quote.display_number}</span>
                            </td>
                            <td className="px-2 py-1.5 border-r border-border/20">
                              <span className="text-sm text-muted-foreground truncate block max-w-[150px]">{quote.customer?.name || "—"}</span>
                            </td>
                            <td className="px-2 py-1.5 border-r border-border/20">
                              <span className="text-xs text-muted-foreground">{format(new Date(quote.created_at), "MMM d, yyyy")}</span>
                            </td>
                            <td className="px-2 py-1.5 border-r border-border/20">
                              <Badge className={cn(statusConfig[quote.status].className, "text-[10px] px-1.5 py-0")}>
                                {statusConfig[quote.status].label}
                              </Badge>
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-border/20 hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground">{quote.quote_items.length}</span>
                            </td>
                            <td className="px-2 py-1.5 text-right border-r border-border/20">
                              <span className="text-xs font-semibold tabular-nums">{formatCurrencyValue(Number(quote.total), currency)}</span>
                            </td>
                            <td className="px-1.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleDownloadPdf(quote)}>
                                    <Download className="mr-2 h-3.5 w-3.5" /> Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSendEmail(quote)}>
                                    <Mail className="mr-2 h-3.5 w-3.5" /> Send via Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyPortalLink(quote)}>
                                    <Link2 className="mr-2 h-3.5 w-3.5" /> Copy Portal Link
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEdit(quote)}>
                                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                  </DropdownMenuItem>
                                  {quote.status === "draft" && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(quote, "sent")}>
                                      <Send className="mr-2 h-3.5 w-3.5" /> Mark as Sent
                                    </DropdownMenuItem>
                                  )}
                                  {(quote.status === "draft" || quote.status === "sent") && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(quote, "accepted")}>
                                        <CheckCircle className="mr-2 h-3.5 w-3.5" /> Mark as Accepted
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(quote, "declined")}>
                                        <XCircle className="mr-2 h-3.5 w-3.5" /> Mark as Declined
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDelete(quote)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
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

                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-border/30">
                  {sortedData.map((quote, idx) => {
                    const currency = (quote as any).currency || getCurrencyFromCountry(quote.customer?.country_code);
                    return (
                      <div
                        key={quote.id}
                        className={cn(
                          "px-3 py-2.5 transition-colors cursor-pointer",
                          selectedRows.has(idx) ? "bg-primary/10" : "hover:bg-muted/50"
                        )}
                        onClick={() => handleViewQuote(quote)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(idx)}
                              onCheckedChange={(c) => handleCheckboxChange(idx, c)}
                              className="h-3.5 w-3.5"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{quote.display_number}</span>
                              <Badge className={cn(statusConfig[quote.status].className, "text-[10px] px-1.5 py-0 shrink-0")}>
                                {statusConfig[quote.status].label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {quote.customer?.name && <span className="truncate">{quote.customer.name}</span>}
                              <span className="font-semibold text-foreground tabular-nums">{formatCurrencyValue(Number(quote.total), currency)}</span>
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
                                <DropdownMenuItem onClick={() => handleEdit(quote)}>
                                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(quote)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <QuoteFormDialog open={formOpen} onOpenChange={setFormOpen} quote={selectedQuote} />
      <DeleteQuoteDialog open={deleteOpen} onOpenChange={setDeleteOpen} quote={selectedQuote} />
      <SendEmailDialog open={emailOpen} onOpenChange={setEmailOpen} document={selectedQuote} documentType="quote" />
      <QuoteDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        quote={selectedQuote}
        onEdit={handleEdit}
        onDownloadPdf={handleDownloadPdf}
        onSendEmail={handleSendEmail}
        onCopyPortalLink={handleCopyPortalLink}
        onConvertToJob={handleConvertToJob}
        onConvertToInvoice={handleConvertToInvoice}
        onUpdateStatus={handleUpdateStatus}
      />
      <CreateFromQuoteDialog open={convertToInvoiceOpen} onOpenChange={setConvertToInvoiceOpen} preselectedQuoteId={selectedQuote?.id} />
      <JobFormDialog open={convertToJobOpen} onOpenChange={setConvertToJobOpen} job={jobPrefill} onSubmit={(values) => {
        createJob.mutate(values);
        setConvertToJobOpen(false);
        toast.success("Job created from quote");
      }} />
    </DashboardLayout>
  );
}
