import { useState } from "react";
import { DollarSign, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaymentHistory } from "./PaymentHistory";
import { PaymentFormDialog } from "./PaymentFormDialog";
import { usePayments } from "@/hooks/usePayments";
import type { Tables } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;

interface PaymentTrackerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export function PaymentTrackerSheet({ open, onOpenChange, invoice }: PaymentTrackerSheetProps) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { data: payments } = usePayments(invoice?.id);

  if (!invoice) return null;

  const invoiceTotal = Number(invoice.total) || 0;
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const outstandingBalance = Math.max(0, invoiceTotal - totalPaid);
  const isPaidInFull = outstandingBalance === 0 && invoiceTotal > 0;
  const paymentProgress = invoiceTotal > 0 ? (totalPaid / invoiceTotal) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Payment Tracker
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Invoice Summary */}
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">
                Invoice #{invoice.invoice_number}
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold">{formatCurrency(invoiceTotal)}</span>
                {isPaidInFull ? (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    Paid in Full
                  </Badge>
                ) : totalPaid > 0 ? (
                  <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    Partial Payment
                  </Badge>
                ) : (
                  <Badge variant="outline">Unpaid</Badge>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100, paymentProgress)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Paid: <span className="text-foreground font-medium">{formatCurrency(totalPaid)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Due: <span className="text-primary font-medium">{formatCurrency(outstandingBalance)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Record Payment Button */}
            {!isPaidInFull && (
              <Button 
                className="w-full" 
                onClick={() => setPaymentDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            )}

            <Separator />

            {/* Payment History */}
            <div>
              <h3 className="font-medium mb-3">Payment History</h3>
              <PaymentHistory invoiceId={invoice.id} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoiceId={invoice.id}
        invoiceTotal={invoiceTotal}
        outstandingBalance={outstandingBalance}
      />
    </>
  );
}
