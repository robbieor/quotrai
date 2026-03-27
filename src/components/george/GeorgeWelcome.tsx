import { Calendar, FileText, Receipt, Send, CalendarDays, PlusCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import tomAvatar from "@/assets/tom-avatar.png";

interface GeorgeWelcomeProps {
  onQuickAction?: (action: string | null, message: string) => void;
  isProcessing?: boolean;
}

interface DynamicInsight {
  icon: any;
  label: string;
  message: string;
  action: string | null;
  priority: number;
}

export function GeorgeWelcome({ onQuickAction, isProcessing }: GeorgeWelcomeProps) {
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Fetch live business insights for dynamic suggestions
  const { data: insights } = useQuery({
    queryKey: ["foreman-welcome-insights"],
    queryFn: async () => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return null;

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [overdueRes, todayJobsRes, draftQuotesRes] = await Promise.all([
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
      ]);

      const overdueTotal = (overdueRes.data || []).reduce((sum, inv) => sum + (inv.total || 0), 0);

      return {
        overdueCount: overdueRes.data?.length || 0,
        overdueTotal,
        todayJobsCount: todayJobsRes.data?.length || 0,
        draftQuotesCount: draftQuotesRes.data?.length || 0,
      };
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Build dynamic insights
  const dynamicInsights: DynamicInsight[] = [];

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

  // Combine dynamic + static actions
  const staticActions = isMobile ? mobileQuickActions : quickActions;
  const allActions = [
    ...dynamicInsights,
    ...staticActions.filter(
      (sa) => !dynamicInsights.some((d) => d.action === sa.action && d.action !== null)
    ),
  ];

  const displayActions = isMobile ? allActions.slice(0, 6) : allActions.slice(0, 4);

  const statusMessage =
    dynamicInsights.length === 0
      ? `Operations running smoothly. What would you like to do?`
      : `Hey ${firstName}, here's what needs attention:`;

  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full px-5 py-6 bg-background">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4 border border-border overflow-hidden">
            <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
          </div>

          <p className="text-center text-muted-foreground text-sm leading-relaxed max-w-xs mb-5">
            {statusMessage}
          </p>

          <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
            {displayActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => onQuickAction?.(qa.action, qa.message)}
                disabled={isProcessing}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 active:scale-[0.97] transition-all border border-transparent active:border-border disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <qa.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-left leading-tight">
                  {qa.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 overflow-y-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 overflow-hidden shadow-md">
          <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-semibold mb-1">Foreman AI</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          Your AI Operating System
        </span>
      </div>

      <p className="text-center text-muted-foreground mb-8 max-w-sm">
        {statusMessage}
      </p>

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
            <span className="text-sm font-medium text-center leading-tight">
              {qa.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const quickActions = [
  {
    icon: Calendar,
    label: "Today's jobs",
    message: "What jobs do I have scheduled for today?",
    action: "get_todays_jobs",
    priority: 10,
  },
  {
    icon: FileText,
    label: "Create quote",
    message: "Help me create a new quote",
    action: null,
    priority: 11,
  },
  {
    icon: Receipt,
    label: "Log expense",
    message: "I need to log an expense",
    action: null,
    priority: 12,
  },
  {
    icon: Send,
    label: "Overdue invoices",
    message: "Which invoices are overdue?",
    action: "get_overdue_invoices",
    priority: 13,
  },
];

const mobileQuickActions = [
  {
    icon: Calendar,
    label: "Today's jobs",
    message: "What jobs do I have scheduled for today?",
    action: "get_todays_jobs",
    priority: 10,
  },
  {
    icon: FileText,
    label: "Create quote",
    message: "Help me create a new quote",
    action: null,
    priority: 11,
  },
  {
    icon: CalendarDays,
    label: "Week ahead",
    message: "Give me a summary of my week ahead",
    action: "get_week_ahead_summary",
    priority: 12,
  },
  {
    icon: PlusCircle,
    label: "Create invoice",
    message: "Help me create a new invoice",
    action: null,
    priority: 13,
  },
  {
    icon: Receipt,
    label: "Log expense",
    message: "I need to log an expense",
    action: null,
    priority: 14,
  },
  {
    icon: Send,
    label: "Overdue invoices",
    message: "Which invoices are overdue?",
    action: "get_overdue_invoices",
    priority: 15,
  },
];
