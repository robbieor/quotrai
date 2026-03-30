import { HardHat, Send, Mail, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

interface Suggestion {
  message: string;
  icon: React.ElementType;
  variant: "warning" | "success" | "info";
  actionLabel?: string;
  onAction?: () => void;
}

const variantStyles = {
  warning: "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20",
  success: "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20",
  info: "border-primary/20 bg-primary/5",
};

const iconColors = {
  warning: "text-amber-600",
  success: "text-emerald-600",
  info: "text-primary",
};

// Quote suggestions
export function QuoteSuggestion({
  status,
  createdAt,
  onSend,
  onEmail,
}: {
  status: string;
  createdAt: string;
  onSend?: () => void;
  onEmail?: () => void;
}) {
  const days = differenceInDays(new Date(), new Date(createdAt));
  let suggestion: Suggestion | null = null;

  if (status === "draft" && days >= 2) {
    suggestion = {
      message: `This quote hasn't been sent — it's been sitting ${days} days. Send it now?`,
      icon: Send,
      variant: "warning",
      actionLabel: "Send Quote",
      onAction: onSend,
    };
  } else if (status === "sent" && days >= 5) {
    suggestion = {
      message: `No response in ${days} days. Follow up before this goes cold.`,
      icon: Mail,
      variant: "warning",
      actionLabel: "Follow Up",
      onAction: onEmail,
    };
  } else if (status === "accepted") {
    suggestion = {
      message: "Quote accepted — convert to a job or invoice to keep momentum.",
      icon: CheckCircle,
      variant: "success",
    };
  }

  if (!suggestion) return null;
  return <SuggestionCard suggestion={suggestion} />;
}

// Invoice suggestions
export function InvoiceSuggestion({
  status,
  dueDate,
  total,
  formatAmount,
  onChase,
}: {
  status: string;
  dueDate: string;
  total: number;
  formatAmount: (v: number) => string;
  onChase?: () => void;
}) {
  const daysOverdue = differenceInDays(new Date(), new Date(dueDate));
  let suggestion: Suggestion | null = null;

  if ((status === "pending" || status === "overdue") && daysOverdue > 0) {
    suggestion = {
      message: `${daysOverdue} days overdue — ${formatAmount(total)} at risk. Chase it now.`,
      icon: AlertTriangle,
      variant: "warning",
      actionLabel: "Send Reminder",
      onAction: onChase,
    };
  } else if (status === "paid") {
    suggestion = {
      message: "Paid on time — reliable client. Consider prioritising their work.",
      icon: CheckCircle,
      variant: "success",
    };
  }

  if (!suggestion) return null;
  return <SuggestionCard suggestion={suggestion} />;
}

// Job suggestions
export function JobSuggestion({
  status,
  hasTimeEntries,
  margin,
}: {
  status: string;
  hasTimeEntries: boolean;
  margin: number;
}) {
  let suggestion: Suggestion | null = null;

  if (status === "in_progress" && !hasTimeEntries) {
    suggestion = {
      message: "No hours logged yet on this job. Time tracking keeps profitability visible.",
      icon: Clock,
      variant: "info",
    };
  } else if (status === "completed" && margin < 20) {
    suggestion = {
      message: `Low margin (${margin}%). Review costs — materials or labour may need adjusting for next time.`,
      icon: AlertTriangle,
      variant: "warning",
    };
  }

  if (!suggestion) return null;
  return <SuggestionCard suggestion={suggestion} />;
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const Icon = suggestion.icon;
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${variantStyles[suggestion.variant]}`}>
      <div className={`mt-0.5 ${iconColors[suggestion.variant]}`}>
        <HardHat className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{suggestion.message}</p>
        {suggestion.actionLabel && suggestion.onAction && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-7 text-xs gap-1.5"
            onClick={suggestion.onAction}
          >
            <Icon className="h-3 w-3" />
            {suggestion.actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
