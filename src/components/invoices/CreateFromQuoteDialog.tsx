import { useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useQuotes } from "@/hooks/useQuotes";
import { useCreateInvoiceFromQuote } from "@/hooks/useInvoices";

interface CreateFromQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFromQuoteDialog({ open, onOpenChange }: CreateFromQuoteDialogProps) {
  const { data: quotes } = useQuotes();
  const createFromQuote = useCreateInvoiceFromQuote();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");

  // Filter to only show accepted quotes
  const acceptedQuotes = quotes?.filter((q) => q.status === "accepted") || [];

  const { formatCurrency } = useCurrency();

  const handleCreate = async () => {
    if (!selectedQuoteId) return;
    await createFromQuote.mutateAsync(selectedQuoteId);
    setSelectedQuoteId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice from Quote</DialogTitle>
          <DialogDescription>
            Select an accepted quote to convert into an invoice. All line items will be copied.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Quote</Label>
            <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an accepted quote" />
              </SelectTrigger>
              <SelectContent>
                {acceptedQuotes.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No accepted quotes available
                  </div>
                ) : (
                  acceptedQuotes.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{quote.quote_number}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{quote.customer?.name}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{formatCurrency(Number(quote.total))}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedQuoteId && (
            <div className="rounded-lg border p-4 bg-muted/50">
              {(() => {
                const quote = acceptedQuotes.find((q) => q.id === selectedQuoteId);
                if (!quote) return null;
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-medium">{quote.customer?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Line Items</span>
                      <span>{quote.quote_items.length} item(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{format(new Date(quote.created_at), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(Number(quote.total))}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedQuoteId || createFromQuote.isPending}
          >
            Create Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
