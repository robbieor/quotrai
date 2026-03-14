import { format } from "date-fns";
import { Trash2, CreditCard, Banknote, Building2, FileCheck, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePayments, useDeletePayment, type Payment } from "@/hooks/usePayments";
import { Skeleton } from "@/components/ui/skeleton";

interface PaymentHistoryProps {
  invoiceId: string;
}

const methodIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  bank_transfer: Building2,
  credit_card: CreditCard,
  check: FileCheck,
  other: MoreHorizontal,
};

export function PaymentHistory({ invoiceId }: PaymentHistoryProps) {
  const { data: payments, isLoading } = usePayments(invoiceId);
  const deletePayment = useDeletePayment();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getMethodLabel = (method: string | null) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      bank_transfer: "Bank Transfer",
      credit_card: "Credit Card",
      check: "Check",
      other: "Other",
    };
    return method ? labels[method] || method : "—";
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No payments recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((payment) => {
        const MethodIcon = methodIcons[payment.payment_method || "other"] || MoreHorizontal;
        
        return (
          <div
            key={payment.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MethodIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">{formatCurrency(Number(payment.amount))}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(payment.payment_date), "MMM d, yyyy")} • {getMethodLabel(payment.payment_method)}
                </div>
                {payment.notes && (
                  <div className="text-xs text-muted-foreground mt-1">{payment.notes}</div>
                )}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this payment of {formatCurrency(Number(payment.amount))}? 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deletePayment.mutate({ id: payment.id, invoiceId })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      })}
    </div>
  );
}
