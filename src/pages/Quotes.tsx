import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Download, Mail, Pencil, Trash2, MoreHorizontal, Link2, Briefcase } from "lucide-react";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { DeleteQuoteDialog } from "@/components/quotes/DeleteQuoteDialog";
import { QuoteDetailSheet } from "@/components/quotes/QuoteDetailSheet";
import { downloadQuotePdf } from "@/lib/pdf/quotePdf";
import { SendEmailDialog } from "@/components/email/SendEmailDialog";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { toast } from "sonner";
import { UpgradePromptBanner } from "@/components/billing/UpgradePromptBanner";
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
  sent: { label: "Sent", className: "bg-blue-100 text-blue-800" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-800" },
  declined: { label: "Declined", className: "bg-red-100 text-red-800" },
};

type StatusFilter = "all" | Quote["status"];

export default function Quotes() {
  const { data: quotes, isLoading } = useQuotes();
  const { branding } = useCompanyBranding();
  const { symbol: currencySymbol } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    const query = searchQuery.toLowerCase();
    return quotes.filter((quote) => {
      const matchesSearch =
        quote.quote_number.toLowerCase().includes(query) ||
        quote.customer?.name.toLowerCase().includes(query) ||
        quote.notes?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, statusFilter]);

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

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <UpgradePromptBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quotes</h1>
            <p className="text-sm md:text-base text-muted-foreground">Create and manage quotes for your customers</p>
          </div>
          <Button onClick={handleNewQuote} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Quote
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search quotes..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Status filter tabs */}
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

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : filteredQuotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={searchQuery || statusFilter !== "all" ? "No quotes match your filters" : "Win more work with professional quotes"}
            description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter to find what you're looking for." : "Create branded quotes in seconds, send them to customers, and track when they're accepted — all from one place."}
            actionLabel={!searchQuery && statusFilter === "all" ? "Create Your First Quote" : undefined}
            onAction={!searchQuery && statusFilter === "all" ? handleNewQuote : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredQuotes.map((quote) => {
              const currency = (quote as any).currency || getCurrencyFromCountry(quote.customer?.country_code);
              return (
                <div
                  key={quote.id}
                  onClick={() => handleViewQuote(quote)}
                  className="group relative bg-card rounded-xl border border-border/60 p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{quote.quote_number}</p>
                        <p className="text-xs text-muted-foreground truncate">{quote.customer?.name || "No customer"}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadPdf(quote); }}>
                          <Download className="mr-2 h-4 w-4" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendEmail(quote); }}>
                          <Mail className="mr-2 h-4 w-4" /> Send via Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyPortalLink(quote); }}>
                          <Link2 className="mr-2 h-4 w-4" /> Copy Portal Link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(quote); }}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(quote); }} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Total */}
                  <p className="text-xl font-bold mb-3">
                    {formatCurrencyValue(Number(quote.total), currency)}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-xs", statusConfig[quote.status].className)}>
                      {statusConfig[quote.status].label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(quote.created_at), "MMM d, yyyy")}
                    </span>
                  </div>

                  {/* Items count & linked job */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {quote.quote_items.length} {quote.quote_items.length === 1 ? "item" : "items"}
                    </p>
                    {quote.job && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {quote.job.title}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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
      />
    </DashboardLayout>
  );
}
