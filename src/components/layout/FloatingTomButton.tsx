import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Phone, PhoneOff, X, FileText, Receipt, Briefcase, DollarSign, Calendar, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { useAgentTask } from "@/contexts/AgentTaskContext";
import { useGeorgeAccess } from "@/hooks/useGeorgeAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { QUOTE_CREATION_STEPS, INVOICE_CREATION_STEPS } from "@/components/shared/AgentWorkingPanel";

const quickActions = [
  { icon: FileText, label: "New Quote", action: "create_quote", message: "Help me create a new quote" },
  { icon: Receipt, label: "New Invoice", action: "create_invoice", message: "Help me create a new invoice" },
  { icon: Briefcase, label: "New Job", action: "create_job", message: "Help me schedule a new job" },
  { icon: DollarSign, label: "Log Expense", action: "log_expense", message: "I need to log an expense" },
  { icon: Calendar, label: "Today's Jobs", action: "get_todays_jobs", message: "What jobs do I have today?" },
];

const PHASE_LABELS: Record<string, string> = {
  requesting_mic: "Requesting mic…",
  fetching_token: "Authenticating…",
  dialing_webrtc: "Connecting…",
  dialing_websocket: "Trying fallback…",
};

export function FloatingTomButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const { profile } = useProfile();
  const { hasVoiceAccess, canUseVoice, isLoading: georgeLoading } = useGeorgeAccess();
  const { isTeamSeat, isLoading: roleLoading } = useUserRole();
  const { startTask } = useAgentTask();
  
  const { 
    status, 
    isConnecting, 
    connectionPhase,
    startConversation, 
    stopConversation,
    cancelConnection,
    callWebhook,
    setContext,
    preWarmToken,
  } = useGlobalVoiceAgent();

  const isConnected = status === "connected";

  useEffect(() => {
    const loadContext = async () => {
      if (!profile) return;
      try {
        const { data: teamId } = await supabase.rpc("get_user_team_id");
        const { data: { user } } = await supabase.auth.getUser();
        if (teamId && user) {
          setContext({ userId: user.id, teamId, userName: profile.full_name || undefined });
        }
      } catch (error) {
        console.error("Failed to load context:", error);
      }
    };
    loadContext();
  }, [profile, setContext]);

  useEffect(() => {
    if (isExpanded && hasVoiceAccess && canUseVoice) preWarmToken();
  }, [isExpanded, hasVoiceAccess, canUseVoice, preWarmToken]);

  if ((location.pathname === "/foreman-ai" && !isConnected) || (!roleLoading && isTeamSeat)) return null;

  const handleMainButtonClick = () => {
    if (isConnected) {
      stopConversation();
      setIsExpanded(false);
    } else if (isConnecting) {
      cancelConnection();
      setIsExpanded(false);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleStartCall = async () => {
    if (!hasVoiceAccess || !canUseVoice) {
      navigate("/foreman-ai");
      return;
    }
    setIsExpanded(false);
    await startConversation({
      userId: profile?.id,
      teamId: profile?.team_id || undefined,
      userName: profile?.full_name || undefined,
    });
  };

  const handleQuickAction = async (action: typeof quickActions[0]) => {
    setIsExpanded(false);
    const taskStepsMap: Record<string, { label: string; steps: any[] }> = {
      create_quote: { label: "Creating quote…", steps: QUOTE_CREATION_STEPS },
      create_invoice: { label: "Creating invoice…", steps: INVOICE_CREATION_STEPS },
    };
    const taskDef = taskStepsMap[action.action];
    if (taskDef) startTask(action.action, taskDef.label, taskDef.steps);
    navigate("/foreman-ai");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("foremanai-quick-action", {
        detail: { action: action.action, message: action.message }
      }));
    }, 500);
  };

  const handleOpenChat = () => {
    setIsExpanded(false);
    navigate("/foreman-ai");
  };

  const phaseLabel = PHASE_LABELS[connectionPhase] || "Connecting…";

  return (
    <>
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {isExpanded && !isConnected && !isConnecting && (
        <div className="fixed right-6 z-50 flex flex-col gap-2 animate-fade-in" style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
          {(georgeLoading || (hasVoiceAccess && canUseVoice)) && (
            <button
              onClick={handleStartCall}
              disabled={georgeLoading}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-full",
                "bg-primary text-primary-foreground shadow-lg",
                "hover:bg-primary/90 active:scale-95",
                "transition-all duration-200",
                georgeLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Phone className="h-5 w-5" />
              <span className="font-medium pr-2">
                {georgeLoading ? "Loading..." : "Call revamo AI"}
              </span>
            </button>
          )}

          <button
            onClick={handleOpenChat}
            className="flex items-center gap-3 px-4 py-3 rounded-full bg-card text-foreground border border-border shadow-lg hover:bg-muted active:scale-95 transition-all duration-200"
          >
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="font-medium pr-2">Chat with revamo AI</span>
          </button>

          <div className="h-px bg-border my-1" />

          {quickActions.map((action) => (
            <button
              key={action.action}
              onClick={() => handleQuickAction(action)}
              className="flex items-center gap-3 px-4 py-3 rounded-full bg-card text-foreground border border-border shadow-lg hover:bg-muted active:scale-95 transition-all duration-200"
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="font-medium pr-2">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Floating Button — hidden once a call is active or connecting.
          The bottom-center ActiveCallBar pill becomes the single in-call control
          surface (mute / open chat / end call) so we don't show three call widgets
          at once on mobile. */}
      {!isConnected && !isConnecting && (
        <div className="fixed right-6 z-50" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <button
            onClick={handleMainButtonClick}
            className={cn(
              "relative h-14 w-14 rounded-full",
              "shadow-[0_4px_12px_rgba(13,155,106,0.3)]",
              "flex items-center justify-center",
              "hover:scale-110 hover:shadow-xl",
              "active:scale-95",
              "transition-all duration-200",
              isExpanded
                ? "bg-muted text-foreground border border-border"
                : "bg-primary text-primary-foreground shadow-primary/25 hover:shadow-primary/30"
            )}
            aria-label="Talk to revamo AI"
          >
            {isExpanded ? (
              <X className="h-6 w-6" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </button>
        </div>
      )}
      {/* In-call UI fully owned by ActiveCallBar (bottom-center pill).
          No right-side speaking/listening pill, no floating phone button. */}
    </>
  );
}
