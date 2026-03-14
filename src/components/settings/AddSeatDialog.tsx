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
import { Loader2, CreditCard } from "lucide-react";
import { useAddSeat } from "@/hooks/useSubscription";

interface AddSeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  seatPrice?: string;
}

export function AddSeatDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  seatPrice = "€29/month" 
}: AddSeatDialogProps) {
  const addSeat = useAddSeat();

  const handleAddSeat = async () => {
    try {
      await addSeat.mutateAsync();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Another Seat
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You've reached your current seat limit. To invite another team member, 
              you'll need to add an additional seat to your subscription.
            </p>
            <p className="font-medium text-foreground">
              Cost: {seatPrice} per additional seat
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={addSeat.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleAddSeat}
            disabled={addSeat.isPending}
          >
            {addSeat.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Add Seat & Continue"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
