import { Mail, Copy, CheckCircle2, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";

export function ExpenseEmailBanner() {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("expense-email-banner-dismissed") === "true";
  });
  const { profile } = useProfile();

  const forwardCode = (profile as any)?.expense_forward_code;
  const expenseEmail = forwardCode ? `expenses+${forwardCode}@quotr.info` : null;

  const handleCopy = () => {
    if (!expenseEmail) return;
    navigator.clipboard.writeText(expenseEmail);
    setCopied(true);
    toast.success("Email address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("expense-email-banner-dismissed", "true");
  };

  if (dismissed || !expenseEmail) return null;

  return (
    <div className="relative rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 md:p-5">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">📧 Email-to-Expense</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">NEW</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Forward any supplier invoice or receipt to your unique address and AI will log it automatically.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono bg-background/80 border border-border rounded px-3 py-1.5 break-all">
              {expenseEmail}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
