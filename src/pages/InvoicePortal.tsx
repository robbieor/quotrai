import { useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useParams, useSearchParams } from "react-router-dom";
import { format, isPast, isToday } from "date-fns";
import { usePortalInvoice } from "@/hooks/usePortal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Calendar, AlertCircle, Clock, CreditCard, CheckCircle2, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-primary/20 text-primary",
  overdue: "bg-destructive/20 text-destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
};

export default function InvoicePortal() {
  const { token: routeToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get("token");
  const paymentStatus = searchParams.get("payment");
  const { data: invoice, isLoading, error } = usePortalInvoice(token);
  const [payLoading, setPayLoading] = useState(false);

  const handlePayNow = async () => {
    if (!token) return;
    setPayLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invoice-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ portal_token: token }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment failed");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start payment");
    } finally {
      setPayLoading(false);
    }
  };

  const { formatCurrency } = useCurrency();

  const getDisplayStatus = (status: string, dueDate: string) => {
    if (status === "pending") {
      const due = new Date(dueDate);
      if (isPast(due) && !isToday(due)) {
        return "overdue";
      }
    }
    return status;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Invoice Not Found</h2>
            <p className="text-muted-foreground">
              This invoice link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayStatus = getDisplayStatus(invoice.status, invoice.due_date);
  const amountDue = invoice.balance_due ?? invoice.total;
  const hasPartialPayment = amountDue > 0 && amountDue < invoice.total;
  const teamLogo = invoice.team.logo_url;

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header with team branding */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            {teamLogo ? (
              <img src={teamLogo} alt={invoice.team.name} className="h-12 w-12 rounded-lg object-contain bg-white border" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                {invoice.team.name?.charAt(0) || "F"}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{invoice.team.name}</h1>
              <p className="text-muted-foreground">Invoice {invoice.display_number}</p>
            </div>
          </div>
          <Badge className={statusColors[displayStatus] || "bg-muted"}>
            {statusLabels[displayStatus] || displayStatus}
          </Badge>
        </div>

        {/* Payment success/cancelled banner */}
        {paymentStatus === "success" && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Payment successful!</p>
              <p className="text-sm text-muted-foreground">Thank you — your payment has been received.</p>
            </div>
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="rounded-lg border border-border bg-muted/50 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-foreground">Payment was cancelled. You can try again below.</p>
          </div>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Bill to
                </div>
                <p className="font-semibold text-lg">{invoice.customer.name}</p>
                {invoice.customer.email && (
                  <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
                )}
                {invoice.customer.address && (
                  <p className="text-sm text-muted-foreground">{invoice.customer.address}</p>
                )}
              </div>
              <div className="space-y-2 text-sm md:text-right">
                <div className="flex items-center gap-2 md:justify-end text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Issued {format(new Date(invoice.issue_date), "MMM d, yyyy")}
                </div>
                <div className={`flex items-center gap-2 md:justify-end ${displayStatus === "overdue" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  <Clock className="h-4 w-4" />
                  Due {format(new Date(invoice.due_date), "MMM d, yyyy")}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Amount Due Banner for unpaid invoices */}
            {displayStatus !== "paid" && amountDue > 0 && (
              <div className={`rounded-lg p-6 text-center ${displayStatus === "overdue" ? "bg-destructive/10" : "bg-primary/10"}`}>
                <p className="text-sm text-muted-foreground mb-1">
                  {hasPartialPayment ? "Remaining Balance" : "Amount Due"}
                </p>
                <p className={`text-4xl font-bold ${displayStatus === "overdue" ? "text-destructive" : "text-primary"}`}>
                  {formatCurrency(amountDue)}
                </p>
                {hasPartialPayment && (
                  <p className="text-xs text-muted-foreground mt-1">
                    of {formatCurrency(invoice.total)} total
                  </p>
                )}
                <Button
                  onClick={handlePayNow}
                  disabled={payLoading}
                  size="lg"
                  className="mt-4 gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {payLoading ? "Redirecting..." : "Pay Now"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Secure payment via card
                </p>
              </div>
            )}

            {/* Paid Banner */}
            {(displayStatus === "paid" || amountDue === 0) && (
              <div className="rounded-lg p-6 text-center bg-primary/10">
                <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(invoice.total)}
                </p>
                <p className="text-sm text-primary mt-2">✓ Payment received — Thank you!</p>
              </div>
            )}

            {/* Line Items */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center w-24">Qty</TableHead>
                    <TableHead className="text-right w-32">Unit Price</TableHead>
                    <TableHead className="text-right w-32">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
                {hasPartialPayment && (
                  <>
                    <div className="flex justify-between text-sm text-primary">
                      <span>Paid</span>
                      <span>−{formatCurrency(invoice.total - amountDue)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Balance Due</span>
                      <span className="text-destructive">{formatCurrency(amountDue)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Terms / Bank Details */}
            {(invoice.team.payment_terms || invoice.team.bank_details) && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                {invoice.team.payment_terms && (
                  <div>
                    <p className="text-sm font-medium">Payment Terms</p>
                    <p className="text-sm text-muted-foreground">{invoice.team.payment_terms}</p>
                  </div>
                )}
                {invoice.team.bank_details && (
                  <div>
                    <p className="text-sm font-medium">Bank Details</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.team.bank_details}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Contact Footer */}
        <div className="text-center space-y-2">
          {(invoice.team.company_phone || invoice.team.company_email) && (
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              {invoice.team.company_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {invoice.team.company_phone}
                </span>
              )}
              {invoice.team.company_email && (
                <a href={`mailto:${invoice.team.company_email}`} className="flex items-center gap-1 hover:text-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {invoice.team.company_email}
                </a>
              )}
            </div>
          )}
          {invoice.team.company_address && (
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {invoice.team.company_address}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Powered by Foreman
          </p>
        </div>
      </div>
    </div>
  );
}