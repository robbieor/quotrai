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

type ActionType = "sent" | "accepted" | "declined" | "convert_job" | "convert_invoice";

const actionConfig: Record<ActionType, { title: string; description: (num: string) => string; confirmLabel: string; destructive?: boolean }> = {
  sent: {
    title: "Mark as Sent",
    description: (num) => `Are you sure you want to mark ${num} as Sent?`,
    confirmLabel: "Yes, Mark as Sent",
  },
  accepted: {
    title: "Mark as Accepted",
    description: (num) => `Are you sure you want to mark ${num} as Accepted? This will enable conversion to a job or invoice.`,
    confirmLabel: "Yes, Mark as Accepted",
  },
  declined: {
    title: "Mark as Declined",
    description: (num) => `Are you sure you want to mark ${num} as Declined? This action can be reversed later.`,
    confirmLabel: "Yes, Decline",
    destructive: true,
  },
  convert_job: {
    title: "Convert to Job",
    description: (num) => `Are you sure you want to convert ${num} to a Job? This will create a new job from the quote details.`,
    confirmLabel: "Yes, Convert to Job",
  },
  convert_invoice: {
    title: "Convert to Invoice",
    description: (num) => `Are you sure you want to convert ${num} to an Invoice? This will create a new invoice from the quote details.`,
    confirmLabel: "Yes, Convert to Invoice",
  },
};

interface QuoteStatusConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionType | null;
  quoteNumber: string;
  onConfirm: () => void;
}

export function QuoteStatusConfirmDialog({ open, onOpenChange, action, quoteNumber, onConfirm }: QuoteStatusConfirmDialogProps) {
  if (!action) return null;
  const config = actionConfig[action];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>{config.description(quoteNumber)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={config.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {config.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
