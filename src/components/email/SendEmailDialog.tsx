import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/hooks/useInvoices";
import { Quote } from "@/hooks/useQuotes";
import { generateInvoicePdf } from "@/lib/pdf/invoicePdf";
import { generateQuotePdf } from "@/lib/pdf/quotePdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Loader2 } from "lucide-react";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Invoice | Quote | null;
  documentType: "invoice" | "quote";
}

function isInvoice(doc: Invoice | Quote): doc is Invoice {
  return "issue_date" in doc;
}

export function SendEmailDialog({
  open,
  onOpenChange,
  document,
  documentType,
}: SendEmailDialogProps) {
  const [email, setEmail] = useState("");
  const [fromName, setFromName] = useState("Quotr");
  const [attachPdf, setAttachPdf] = useState(true);
  const [isSending, setIsSending] = useState(false);

  if (!document) return null;

  const customerName = document.customer?.name || "Customer";
  const documentNumber = isInvoice(document) ? document.display_number : document.display_number;
  const total = Number(document.total) || 0;

  const handleSend = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSending(true);

    try {
      let pdfBase64: string | undefined;

      if (attachPdf) {
        const doc = isInvoice(document)
          ? await generateInvoicePdf(document)
          : await generateQuotePdf(document);
        pdfBase64 = doc.output("datauristring").split(",")[1];
      }

      // COMMUNICATION SAFETY: Include mandatory safety metadata
      const payload: Record<string, unknown> = {
        to: email,
        customerName,
        documentType,
        documentNumber,
        total,
        fromName,
        pdfBase64,
        manual_send: true,
        confirmed_by_user: true,
        source_screen: "SendEmailDialog",
        record_type: documentType,
        record_id: document.id,
      };

      if (isInvoice(document)) {
        payload.dueDate = format(new Date(document.due_date), "MMM d, yyyy");
        // Include portal payment link
        if (document.portal_token) {
          const origin = window.location.origin;
          payload.portalUrl = `${origin}/portal/invoice?token=${document.portal_token}`;
        }
      } else if (document.valid_until) {
        payload.validUntil = format(new Date(document.valid_until), "MMM d, yyyy");
      }

      const { data, error } = await supabase.functions.invoke("send-document-email", {
        body: payload,
      });

      if (error) throw error;

      toast.success(`${documentType === "invoice" ? "Invoice" : "Quote"} sent to ${email}`);
      onOpenChange(false);
      setEmail("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send {documentType === "invoice" ? "Invoice" : "Quote"} via Email
          </DialogTitle>
          <DialogDescription>
            Send {documentNumber} to your customer via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Recipient Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromName">From Name</Label>
            <Input
              id="fromName"
              placeholder="Your business name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="attachPdf"
              checked={attachPdf}
              onCheckedChange={(checked) => setAttachPdf(checked === true)}
            />
            <Label htmlFor="attachPdf" className="text-sm font-normal cursor-pointer">
              Attach PDF document
            </Label>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-1">Preview:</p>
            <p className="text-muted-foreground">
              To: {email || "—"}
              <br />
              Subject: {documentType === "invoice" ? "Invoice" : "Quote"} {documentNumber} from {fromName}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !email}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
