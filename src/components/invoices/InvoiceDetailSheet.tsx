import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Mail, Pencil, Link2, Receipt, DollarSign } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Invoice } from "@/hooks/useInvoices";
import { formatCurrencyValue, getCurrencyFromCountry } from "@/utils/currencyUtils";

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
    if (isPast(dueDate) && !isToday(dueDate)) return "overdue";
  }
  return invoice.status;
};

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onEdit: (invoice: Invoice) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  onSendEmail: (invoice: Invoice) => void;
  onCopyPortalLink: (invoice: Invoice) => void;
  onPaymentTracker: (invoice: Invoice) => void;
}

export function InvoiceDetailSheet({
  open,
  onOpenChange,
  invoice,
  onEdit,
  onDownloadPdf,
  onSendEmail,
  onCopyPortalLink,
  onPaymentTracker,
}: InvoiceDetailSheetProps) {
  if (!invoice) return null;

  const displayStatus = getDisplayStatus(invoice);
  const currency = invoice.currency || getCurrencyFromCountry(invoice.customer?.country_code);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">{invoice.invoice_number}</SheetTitle>
              <p className="text-sm text-muted-foreground">{invoice.customer?.name || "No customer"}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Status & dates */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={cn("text-xs", statusColors[displayStatus])}>
              {statusLabels[displayStatus]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Issued {format(new Date(invoice.issue_date), "MMM d, yyyy")}
            </span>
            <span className={cn(
              "text-xs",
              displayStatus === "overdue" ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              Due {format(new Date(invoice.due_date), "MMM d, yyyy")}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => { onEdit(invoice); onOpenChange(false); }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDownloadPdf(invoice)}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSendEmail(invoice)}>
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => onCopyPortalLink(invoice)}>
              <Link2 className="mr-1.5 h-3.5 w-3.5" /> Portal Link
            </Button>
            <Button size="sm" variant="outline" onClick={() => { onPaymentTracker(invoice); onOpenChange(false); }}>
              <DollarSign className="mr-1.5 h-3.5 w-3.5" /> Payments
            </Button>
          </div>

          <Separator />

          {/* Line items */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Line Items</h4>
            {invoice.invoice_items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items</p>
            ) : (
              <div className="space-y-2">
                {invoice.invoice_items.map((item) => (
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
              <span>{formatCurrencyValue(Number(invoice.subtotal), currency)}</span>
            </div>
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
                <span>{formatCurrencyValue(Number(invoice.tax_amount), currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-border/50">
              <span>Total</span>
              <span>{formatCurrencyValue(Number(invoice.total), currency)}</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
