import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Mail, Pencil, Link2, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Quote } from "@/hooks/useQuotes";
import { QuoteSuggestion } from "@/components/shared/ForemanSuggestion";
import { formatCurrencyValue, getCurrencyFromCountry } from "@/utils/currencyUtils";

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

interface QuoteDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  onEdit: (quote: Quote) => void;
  onDownloadPdf: (quote: Quote) => void;
  onSendEmail: (quote: Quote) => void;
  onCopyPortalLink: (quote: Quote) => void;
}

export function QuoteDetailSheet({
  open,
  onOpenChange,
  quote,
  onEdit,
  onDownloadPdf,
  onSendEmail,
  onCopyPortalLink,
}: QuoteDetailSheetProps) {
  if (!quote) return null;

  const currency = (quote as any).currency || getCurrencyFromCountry(quote.customer?.country_code);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">{quote.display_number}</SheetTitle>
              <p className="text-sm text-muted-foreground">{quote.customer?.name || "No customer"}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Status & dates */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={cn("text-xs", statusColors[quote.status])}>
              {statusLabels[quote.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Created {format(new Date(quote.created_at), "MMM d, yyyy")}
            </span>
            {quote.valid_until && (
              <span className="text-xs text-muted-foreground">
                Valid until {format(new Date(quote.valid_until), "MMM d, yyyy")}
              </span>
            )}
          </div>

          {/* AI Suggestion */}
          <QuoteSuggestion
            status={quote.status}
            createdAt={quote.created_at}
            onSend={() => onSendEmail(quote)}
            onEmail={() => onSendEmail(quote)}
          />

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => { onEdit(quote); onOpenChange(false); }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDownloadPdf(quote)}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSendEmail(quote)}>
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => onCopyPortalLink(quote)}>
              <Link2 className="mr-1.5 h-3.5 w-3.5" /> Portal Link
            </Button>
          </div>

          <Separator />

          {/* Line items */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Line Items</h4>
            {quote.quote_items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items</p>
            ) : (
              <div className="space-y-2">
                {quote.quote_items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2 rounded-md border border-border/50 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatCurrencyValue(Number(item.unit_price), currency)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {formatCurrencyValue(Number(item.quantity) * Number(item.unit_price), currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyValue(Number(quote.subtotal), currency)}</span>
            </div>
            {Number(quote.tax_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({quote.tax_rate}%)</span>
                <span>{formatCurrencyValue(Number(quote.tax_amount), currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-border/50">
              <span>Total</span>
              <span>{formatCurrencyValue(Number(quote.total), currency)}</span>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
