import { useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { usePortalQuote, useAcceptQuoteFromPortal, useDeclineQuoteFromPortal } from "@/hooks/usePortal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Building2, User, Calendar, AlertCircle, CheckCircle, Loader2, XCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  accepted: "bg-primary/20 text-primary",
  declined: "bg-destructive/20 text-destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

export default function QuotePortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { data: quote, isLoading, error } = usePortalQuote(token);
  const acceptQuote = useAcceptQuoteFromPortal();
  const declineQuote = useDeclineQuoteFromPortal();
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const canAccept = quote?.status === "sent" || quote?.status === "draft";

  const handleAccept = async () => {
    if (!token) return;
    await acceptQuote.mutateAsync(token);
    setShowAcceptDialog(false);
  };

  const handleDecline = async () => {
    if (!token) return;
    await declineQuote.mutateAsync({ token, reason: declineReason });
    setShowDeclineDialog(false);
    setDeclineReason("");
  };

  const { formatCurrency } = useCurrency();

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

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Quote Not Found</h2>
            <p className="text-muted-foreground">
              This quote link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
              T
            </div>
            <div>
              <h1 className="text-2xl font-bold">{quote.team.name}</h1>
              <p className="text-muted-foreground">Quote {quote.quote_number}</p>
            </div>
          </div>
          <Badge className={statusColors[quote.status] || "bg-muted"}>
            {statusLabels[quote.status] || quote.status}
          </Badge>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Prepared for
                </div>
                <p className="font-semibold text-lg">{quote.customer.name}</p>
                {quote.customer.email && (
                  <p className="text-sm text-muted-foreground">{quote.customer.email}</p>
                )}
                {quote.customer.address && (
                  <p className="text-sm text-muted-foreground">{quote.customer.address}</p>
                )}
              </div>
              <div className="space-y-2 text-sm md:text-right">
                <div className="flex items-center gap-2 md:justify-end text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Created {format(new Date(quote.created_at), "MMM d, yyyy")}
                </div>
                {quote.valid_until && (
                  <p className="text-muted-foreground">
                    Valid until {format(new Date(quote.valid_until), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
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
                  {quote.items.map((item) => (
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
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({quote.tax_rate}%)</span>
                  <span>{formatCurrency(quote.tax_amount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}

            {/* Accept/Decline Buttons */}
            {canAccept && (
              <div className="pt-4 border-t space-y-3">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setShowAcceptDialog(true)}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Accept Quote
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDeclineDialog(true)}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Decline Quote
                </Button>
              </div>
            )}

            {/* Already Accepted Message */}
            {quote.status === "accepted" && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-center gap-2 text-primary p-4 bg-primary/10 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">This quote has been accepted</span>
                </div>
              </div>
            )}

            {/* Declined Message */}
            {quote.status === "declined" && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">This quote has been declined</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accept Confirmation Dialog */}
        <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accept this quote?</AlertDialogTitle>
              <AlertDialogDescription>
                By accepting this quote, you agree to the terms and pricing outlined above.
                An invoice for {formatCurrency(quote.total)} will be generated and sent to you.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={acceptQuote.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAccept} disabled={acceptQuote.isPending}>
                {acceptQuote.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Accept Quote"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Decline Confirmation Dialog */}
        <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline this quote?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to decline this quote? You can optionally provide a reason.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="decline-reason">Reason (optional)</Label>
              <Textarea
                id="decline-reason"
                placeholder="Let us know why you're declining this quote..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={declineQuote.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDecline} 
                disabled={declineQuote.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {declineQuote.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Decline Quote"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Powered by Quotr
        </p>
      </div>
    </div>
  );
}
