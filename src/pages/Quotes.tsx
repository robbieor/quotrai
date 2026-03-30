import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, FileText, Download, Mail, Pencil, Trash2, MoreHorizontal, Link2, TrendingUp, TrendingDown, PieChart, BarChart3, CalendarDays } from "lucide-react";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { DeleteQuoteDialog } from "@/components/quotes/DeleteQuoteDialog";
import { QuoteDetailSheet } from "@/components/quotes/QuoteDetailSheet";
import { downloadQuotePdf } from "@/lib/pdf/quotePdf";
import { SendEmailDialog } from "@/components/email/SendEmailDialog";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useCurrency } from "@/hooks/useCurrency";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
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

type StatusFilter = "all" | Quote["status"];

export default function Quotes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: quotes, isLoading } = useQuotes();
  const { branding } = useCompanyBranding();
  const { symbol: currencySymbol, formatCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>((searchParams.get("status") as StatusFilter) || "all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

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
    const portalUrl = `${window.location.origin}/portal/quote?token=${quote.portal_token}`;
    navigator.clipboard.writeText(portalUrl);
    toast.success("Portal link copied to clipboard");
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
      <div className="space-y-4 md:space-y-6">
        <UpgradePromptBanner />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quotes</h1>
          <ReadOnlyGuard>
            <Button onClick={handleNewQuote} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Quote
            </Button>
          </ReadOnlyGuard>
        </div>

        <InsightAlerts insights={quoteInsights} />

        {/* KPI Strip */}
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label} className="min-w-[160px] flex-1 snap-start">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</span>
                </div>
                <span className="text-lg font-bold">{kpi.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search quotes..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "draft", "sent", "accepted", "declined"] as StatusFilter[]).map((status) => (
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
                  icon={FileText}
                  title={searchQuery || statusFilter !== "all" ? "No quotes match your filters" : "Win more work with professional quotes"}
                  description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter to find what you're looking for." : "Create branded quotes in seconds, send them to customers, and track when they're accepted — all from one place."}
                  actionLabel={!searchQuery && statusFilter === "all" ? "Create Your First Quote" : undefined}
                  onAction={!searchQuery && statusFilter === "all" ? handleNewQuote : undefined}
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
                        Quote #
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("customer" as any)} onSort={() => handleSort("customer" as any)} className="text-[10px] uppercase tracking-wider hidden md:table-cell">
                        Customer
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("created_at" as any)} onSort={() => handleSort("created_at" as any)} className="text-[10px] uppercase tracking-wider hidden sm:table-cell">
                        Date
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
                    {sortedData.map((quote, idx) => {
                      const currency = (quote as any).currency || getCurrencyFromCountry(quote.customer?.country_code);
                      return (
                        <tr
                          key={quote.id}
                          onClick={() => handleViewQuote(quote)}
                          className={cn(
                            "border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/30",
                            selectedRows.has(idx) && "bg-primary/5"
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
                            <span className="text-[11px] font-medium">{quote.display_number}</span>
                          </td>
                          <td className="px-3 py-0.5 hidden md:table-cell">
                            <span className="text-[11px] text-muted-foreground truncate block max-w-[150px]">{quote.customer?.name || "—"}</span>
                          </td>
                          <td className="px-3 py-0.5 hidden sm:table-cell">
                            <span className="text-[11px] text-muted-foreground">{format(new Date(quote.created_at), "MMM d, yyyy")}</span>
                          </td>
                          <td className="px-3 py-0.5">
                            <Badge className={cn(statusConfig[quote.status].className, "text-[10px] px-1.5 py-0")}>
                              {statusConfig[quote.status].label}
                            </Badge>
                          </td>
                          <td className="px-3 py-0.5 hidden lg:table-cell">
                            <span className="text-[11px] text-muted-foreground">{quote.quote_items.length}</span>
                          </td>
                          <td className="px-3 py-0.5 text-right">
                            <span className="text-[11px] font-semibold">{formatCurrencyValue(Number(quote.total), currency)}</span>
                          </td>
                          <td className="px-1 py-0.5 w-10" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownloadPdf(quote)}>
                                  <Download className="mr-2 h-4 w-4" /> Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendEmail(quote)}>
                                  <Mail className="mr-2 h-4 w-4" /> Send via Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyPortalLink(quote)}>
                                  <Link2 className="mr-2 h-4 w-4" /> Copy Portal Link
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEdit(quote)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(quote)} className="text-destructive focus:text-destructive">
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
      />
    </DashboardLayout>
  );
}
