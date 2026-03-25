import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";

export function ExpenseEmailForwarding() {
  const [copied, setCopied] = useState(false);
  const { profile, isLoading } = useProfile();

  const forwardCode = (profile as any)?.expense_forward_code;
  const expenseEmail = forwardCode ? `expenses+${forwardCode}@quotr.info` : null;

  const handleCopy = () => {
    if (!expenseEmail) return;
    navigator.clipboard.writeText(expenseEmail);
    setCopied(true);
    toast.success("Email address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Email-to-Expense</CardTitle>
          <Badge variant="secondary" className="ml-auto">Beta</Badge>
        </div>
        <CardDescription>
          Forward supplier invoices and receipts to your unique address below.
          AI reads the email and extracts the vendor, amount, date, and category for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email address display */}
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
          <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : expenseEmail ? (
            <code className="flex-1 text-sm font-mono font-medium break-all">{expenseEmail}</code>
          ) : (
            <span className="flex-1 text-sm text-muted-foreground">Loading your unique address…</span>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!expenseEmail} className="gap-1.5 shrink-0">
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

        {/* How it works */}
        <div className="space-y-3">
          <p className="text-sm font-medium">How it works:</p>
          <div className="space-y-2">
            {[
              { step: "1", text: "Forward a supplier invoice or receipt email to the address above" },
              { step: "2", text: "AI reads the email and extracts vendor, amount, date & category" },
              { step: "3", text: "The expense is automatically created in your account" },
              { step: "4", text: "You get a confirmation email with the details" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {item.step}
                </span>
                <span className="text-muted-foreground pt-0.5">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Important note */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Important:</strong> This address is unique to you — forward from any email account and expenses will land in your team automatically.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
