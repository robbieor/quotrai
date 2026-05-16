import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function DeleteAccountDialog({ open, onOpenChange, userEmail }: Props) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const matches = typed.trim().toLowerCase() === userEmail.toLowerCase();

  const handleDelete = async () => {
    if (!matches) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error || (data && data.error)) {
        const msg = (data?.message || data?.error || error?.message) ?? "Failed to schedule deletion";
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success("Account scheduled for deletion. Check your email for the cancel link.");
      await supabase.auth.signOut();
      navigate("/login");
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Delete your account
          </DialogTitle>
          <DialogDescription>
            This will schedule your account for permanent deletion in 30 days.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="text-sm">
          <AlertDescription>
            You'll get an email with a link to cancel within 30 days. After that, your
            profile, jobs, quotes, invoices and customers are deleted for good.
            Your Stripe subscription is cancelled automatically.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="confirm-email">
            Type <span className="font-mono text-foreground">{userEmail}</span> to confirm
          </Label>
          <Input
            id="confirm-email"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={userEmail}
            autoComplete="off"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!matches || submitting}
            onClick={handleDelete}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete my account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
