import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardMetrics } from "@/hooks/useDashboardData";
import { useProfile } from "@/hooks/useProfile";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { X, Calendar, Receipt, FileText, Sparkles } from "lucide-react";
import tomAvatar from "@/assets/tom-avatar.png";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function MorningBriefingCard() {
  const [dismissed, setDismissed] = useState(false);
  const { data: metrics, isLoading } = useDashboardMetrics();
  const { profile } = useProfile();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  if (dismissed || isLoading) return null;

  const firstName = profile?.full_name?.split(" ")[0] || "boss";
  const greeting = getGreeting();

  // Build summary lines
  const lines: string[] = [];
  if (metrics) {
    if (metrics.activeJobs > 0) {
      lines.push(`You've got **${metrics.activeJobs} active job${metrics.activeJobs > 1 ? "s" : ""}** on the books.`);
    }
    if (metrics.pendingQuotesCount > 0) {
      lines.push(`**${metrics.pendingQuotesCount} quote${metrics.pendingQuotesCount > 1 ? "s" : ""}** pending worth ${formatCurrency(metrics.pendingQuotesAmount)} — chase or follow up?`);
    }
    if (metrics.outstandingCount > 0) {
      lines.push(`**${metrics.outstandingCount} invoice${metrics.outstandingCount > 1 ? "s" : ""}** outstanding totalling ${formatCurrency(metrics.outstandingAmount)}.`);
    }
    if (metrics.revenueMTD > 0) {
      lines.push(`Revenue this month: ${formatCurrency(metrics.revenueMTD)} — keep it going!`);
    }
  }

  if (lines.length === 0) {
    lines.push("No activity yet. Time to create your first quote or job!");
  }

  return (
    <div className="relative rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card p-5 sm:p-6 animate-fade-up">
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="hidden sm:block h-12 w-12 rounded-xl overflow-hidden border-2 border-primary/20 flex-shrink-0">
          <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {greeting}, {firstName} 👋
            </h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-medium text-green-600">Foreman AI Online</span>
            </div>
          </div>

          {/* Summary */}
          <div className="text-sm text-muted-foreground space-y-0.5 mb-4">
            {lines.map((line, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => navigate("/jobs")}
            >
              <Calendar className="h-3.5 w-3.5" />
              View Schedule
            </Button>
            {metrics && metrics.outstandingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => navigate("/invoices")}
              >
                <Receipt className="h-3.5 w-3.5" />
                Chase Overdue
              </Button>
            )}
            {metrics && metrics.pendingQuotesCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => navigate("/quotes")}
              >
                <FileText className="h-3.5 w-3.5" />
                Send Quotes
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-primary"
              onClick={() => navigate("/foreman-ai")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask Foreman AI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
