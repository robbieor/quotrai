import { useEffect, useRef, useState } from "react";
import { Calendar, FileText, CalendarDays, PlusCircle, AlertTriangle, TrendingUp, ChevronRight, X, BarChart3, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";
import { format } from "date-fns";

interface GeorgeWelcomeProps {
  onQuickAction?: (action: string | null, message: string) => void;
  isProcessing?: boolean;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function GeorgeWelcome({ onQuickAction, isProcessing }: GeorgeWelcomeProps) {
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const { data: insights } = useQuery({
    queryKey: ["foreman-welcome-insights"],
    queryFn: async () => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return null;

      const now = new Date();
      const today = now.toISOString().split("T")[0];

      const [overdueRes, todayJobsRes, draftQuotesRes, todayInvoicesRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, total")
          .eq("team_id", teamId)
          .eq("status", "overdue")
          .limit(100),
        supabase
          .from("jobs")
          .select("id")
          .eq("team_id", teamId)
          .gte("scheduled_date", today)
          .lt("scheduled_date", today + "T23:59:59")
          .limit(100),
        supabase
          .from("quotes")
          .select("id")
          .eq("team_id", teamId)
          .eq("status", "draft")
          .limit(100),
        supabase
          .from("invoices")
          .select("id, total")
          .eq("team_id", teamId)
          .gte("created_at", today)
          .lt("created_at", today + "T23:59:59")
          .limit(100),
      ]);

      const overdueTotal = (overdueRes.data || []).reduce((sum, inv) => sum + (inv.total || 0), 0);
      const todayInvoicedTotal = (todayInvoicesRes.data || []).reduce((sum, inv) => sum + (inv.total || 0), 0);

      return {
        overdueCount: overdueRes.data?.length || 0,
        overdueTotal,
        todayJobsCount: todayJobsRes.data?.length || 0,
        draftQuotesCount: draftQuotesRes.data?.length || 0,
        todayInvoicedTotal,
      };
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const hasUrgentItems = (insights?.overdueCount ?? 0) > 0 || (insights?.draftQuotesCount ?? 0) > 0;

  // Proactive AI nudges
  const today = new Date().toISOString().split("T")[0];
  const [dismissedNudges, setDismissedNudges] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`nudges-dismissed-${today}`) || "[]");
    } catch { return []; }
  });

  const { data: nudges } = useQuery({
    queryKey: ["foreman-nudges"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const res = await supabase.functions.invoke("generate-nudges");
      return res.data?.nudges || [];
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const visibleNudges = (nudges || []).filter((n: any) => !dismissedNudges.includes(n.id));

  // Weekly analysis — cached for 1 hour
  const [showAnalysis, setShowAnalysis] = useState(false);
  const { data: weeklyAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ["weekly-analysis"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const res = await supabase.functions.invoke("weekly-analysis");
      return res.data?.analysis || null;
    },
    staleTime: 3600000, // 1 hour
    refetchOnWindowFocus: false,
    enabled: showAnalysis,
  });

  const statusIcon: Record<string, any> = {
    good: CheckCircle2,
    warning: AlertCircle,
    critical: AlertTriangle,
  };
  const statusColor: Record<string, string> = {
    good: "text-green-500",
    warning: "text-[hsl(36,91%,55%)]",
    critical: "text-destructive",
  };

  const dismissNudge = (id: string) => {
    const updated = [...dismissedNudges, id];
    setDismissedNudges(updated);
    localStorage.setItem(`nudges-dismissed-${today}`, JSON.stringify(updated));
  };

  const urgencyBorder: Record<string, string> = {
    high: "border-l-destructive",
    medium: "border-l-[hsl(36,91%,55%)]",
    low: "border-l-primary",
  };

  // Auto-trigger morning briefing on first load if there are urgent items
  const briefingTriggered = useRef(false);
  useEffect(() => {
    if (!briefingTriggered.current && insights && hasUrgentItems && !isProcessing && onQuickAction) {
      const briefingKey = `foreman-auto-briefing-${today}`;
      if (!localStorage.getItem(briefingKey)) {
        briefingTriggered.current = true;
        localStorage.setItem(briefingKey, "true");
        setTimeout(() => {
          onQuickAction("get_today_summary", "Give me my morning briefing — what needs attention today?");
        }, 800);
      }
    }
  }, [insights, hasUrgentItems, isProcessing, onQuickAction]);

  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col px-5 pt-6 pb-6 space-y-4">
          {/* Greeting */}
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-foreground">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {format(new Date(), "EEEE, d MMMM")}
            </p>
          </div>

          {/* Needs Attention */}
          {hasUrgentItems && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-[15px] font-semibold text-muted-foreground">
                  Needs attention
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x pb-1 -mx-5 px-5">
                {insights?.overdueCount ? (
                  <button
                    onClick={() => onQuickAction?.("get_overdue_invoices", "Which invoices are overdue? Help me chase them.")}
                    disabled={isProcessing}
                    className="min-w-[160px] w-40 bg-card rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-border border-l-[3px] border-l-destructive p-3.5 snap-start active:scale-[0.97] transition-transform text-left disabled:opacity-50"
                  >
                    <AlertTriangle className="h-5 w-5 text-destructive mb-2" />
                    <p className="text-[20px] font-bold tabular-nums text-foreground">
                      €{Math.round(insights.overdueTotal).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[13px] text-muted-foreground">
                        {insights.overdueCount} overdue
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </button>
                ) : null}

                {insights?.draftQuotesCount ? (
                  <button
                    onClick={() => onQuickAction?.(null, "Show me my draft quotes that need to be sent.")}
                    disabled={isProcessing}
                    className="min-w-[160px] w-40 bg-card rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-border border-l-[3px] border-l-[hsl(36,91%,55%)] p-3.5 snap-start active:scale-[0.97] transition-transform text-left disabled:opacity-50"
                  >
                    <TrendingUp className="h-5 w-5 text-[hsl(36,91%,55%)] mb-2" />
                    <p className="text-[20px] font-bold tabular-nums text-foreground">
                      {insights.draftQuotesCount}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[13px] text-muted-foreground">
                        draft quote{insights.draftQuotesCount > 1 ? "s" : ""}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* AI Nudges */}
          {visibleNudges.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ForemanAvatar size="sm" />
                <span className="text-[15px] font-semibold text-muted-foreground">
                  George says
                </span>
              </div>
              {visibleNudges.map((nudge: any) => (
                <div
                  key={nudge.id}
                  className={`bg-card rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-border border-l-[3px] ${urgencyBorder[nudge.urgency] || urgencyBorder.low} p-3.5 relative`}
                >
                  <button
                    onClick={() => dismissNudge(nudge.id)}
                    className="absolute top-2 right-2 p-1 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-[14px] text-foreground pr-6 leading-relaxed">{nudge.text}</p>
                  {nudge.action_label && (
                    <button
                      onClick={() => onQuickAction?.(nudge.action, nudge.text)}
                      disabled={isProcessing}
                      className="mt-2 text-[13px] font-semibold text-primary active:scale-[0.97] transition-transform disabled:opacity-50"
                    >
                      {nudge.action_label} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <span className="text-[15px] font-semibold text-muted-foreground">
              Quick actions
            </span>
            <div className="grid grid-cols-2 gap-2">
              {mobileQuickActions.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => onQuickAction?.(qa.action, qa.message)}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center gap-2 py-4 bg-card rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-border active:scale-[0.97] transition-transform disabled:opacity-50 min-h-[90px]"
                >
                  <div className="w-11 h-11 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                    <qa.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[14px] font-medium text-foreground">{qa.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Snapshot */}
          <div className="space-y-2">
            <span className="text-[15px] font-semibold text-muted-foreground">Today</span>
            <div className="bg-card rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-border grid grid-cols-3 divide-x divide-border">
              <div className="flex flex-col items-center justify-center py-4 px-2">
                <span className="text-[18px] font-bold tabular-nums text-foreground">
                  {insights?.todayJobsCount ?? 0}
                </span>
                <span className="text-[12px] text-muted-foreground mt-0.5">scheduled</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4 px-2">
                <span className="text-[18px] font-bold tabular-nums text-foreground">
                  €{Math.round(insights?.todayInvoicedTotal ?? 0).toLocaleString()}
                </span>
                <span className="text-[12px] text-muted-foreground mt-0.5">invoiced</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4 px-2">
                <span className="text-[18px] font-bold tabular-nums text-foreground">
                  {insights?.todayJobsCount ?? 0}
                </span>
                <span className="text-[12px] text-muted-foreground mt-0.5">appointments</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout — unchanged
  const statusMessage =
    !hasUrgentItems
      ? "Operations running smoothly. What would you like to do?"
      : `Hey ${firstName}, here's what needs attention:`;

  const dynamicInsights: { icon: any; label: string; message: string; action: string | null; priority: number }[] = [];
  if (insights?.overdueCount && insights.overdueCount > 0) {
    dynamicInsights.push({
      icon: AlertTriangle,
      label: `Chase €${Math.round(insights.overdueTotal).toLocaleString()} overdue`,
      message: "Which invoices are overdue? Help me chase them.",
      action: "get_overdue_invoices",
      priority: 1,
    });
  }
  if (insights?.todayJobsCount && insights.todayJobsCount > 0) {
    dynamicInsights.push({
      icon: Calendar,
      label: `${insights.todayJobsCount} job${insights.todayJobsCount > 1 ? "s" : ""} today`,
      message: "What jobs do I have scheduled for today?",
      action: "get_todays_jobs",
      priority: 2,
    });
  }
  if (insights?.draftQuotesCount && insights.draftQuotesCount > 0) {
    dynamicInsights.push({
      icon: TrendingUp,
      label: `${insights.draftQuotesCount} draft quote${insights.draftQuotesCount > 1 ? "s" : ""} to send`,
      message: "Show me my draft quotes that need to be sent.",
      action: null,
      priority: 3,
    });
  }

  const allActions = [
    ...dynamicInsights,
    ...desktopQuickActions.filter(
      (sa) => !dynamicInsights.some((d) => d.action === sa.action && d.action !== null)
    ),
  ];
  const displayActions = allActions.slice(0, 4);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 overflow-y-auto">
      <div className="flex flex-col items-center mb-8">
        <ForemanAvatar size="xl" className="shadow-md w-20 h-20" />
        <h1 className="text-xl font-semibold mb-1">Foreman AI</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          Your AI Operating System
        </span>
      </div>

      <p className="text-center text-muted-foreground mb-6 max-w-sm">{statusMessage}</p>

      {/* AI Nudges — Desktop */}
      {visibleNudges.length > 0 && (
        <div className="w-full max-w-sm mb-6 space-y-2">
          {visibleNudges.map((nudge: any) => (
            <div
              key={nudge.id}
              className={`bg-card rounded-xl shadow-sm border border-border border-l-[3px] ${urgencyBorder[nudge.urgency] || urgencyBorder.low} p-3.5 relative text-left`}
            >
              <button
                onClick={() => dismissNudge(nudge.id)}
                className="absolute top-2 right-2 p-1 text-muted-foreground/50 hover:text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="text-sm text-foreground pr-6 leading-relaxed">{nudge.text}</p>
              {nudge.action_label && (
                <button
                  onClick={() => onQuickAction?.(nudge.action, nudge.text)}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  {nudge.action_label} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {displayActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => onQuickAction?.(qa.action, qa.message)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all border border-transparent hover:border-border"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <qa.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-center leading-tight">{qa.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const mobileQuickActions = [
  { icon: Calendar, label: "Today's jobs", message: "What jobs do I have scheduled for today?", action: "get_todays_jobs" },
  { icon: CalendarDays, label: "Week ahead", message: "Give me a summary of my week ahead", action: "get_week_ahead_summary" },
  { icon: FileText, label: "Create quote", message: "Help me create a new quote", action: null },
  { icon: PlusCircle, label: "Create invoice", message: "Help me create a new invoice", action: null },
];

const desktopQuickActions = [
  { icon: Calendar, label: "Today's jobs", message: "What jobs do I have scheduled for today?", action: "get_todays_jobs", priority: 10 },
  { icon: FileText, label: "Create quote", message: "Help me create a new quote", action: null, priority: 11 },
  { icon: PlusCircle, label: "Log expense", message: "I need to log an expense", action: null, priority: 12 },
  { icon: CalendarDays, label: "Overdue invoices", message: "Which invoices are overdue?", action: "get_overdue_invoices", priority: 13 },
];
