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

export function FloatingTomButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const { profile } = useProfile();
  const { hasVoiceAccess, canUseVoice } = useGeorgeAccess();
  const { startTask } = useAgentTask();
  
  const { 
    status, 
    isSpeaking, 
    isConnecting, 
    retryAttempt,
    maxRetries,
    startConversation, 
    stopConversation,
    callWebhook,
    setContext,
    preWarmToken,
  } = useGlobalVoiceAgent();

  const isConnected = status === "connected";
  const isRetrying = retryAttempt > 0 && isConnecting;

  // Set context when profile loads
  useEffect(() => {
    const loadContext = async () => {
      if (!profile) return;
      
      try {
        const { data: teamId } = await supabase.rpc("get_user_team_id");
        const { data: { user } } = await supabase.auth.getUser();
        
        if (teamId && user) {
          setContext({
            userId: user.id,
            teamId,
            userName: profile.full_name || undefined,
          });
        }
      } catch (error) {
        console.error("Failed to load context:", error);
      }
    };
    
    loadContext();
  }, [profile, setContext]);

  // Pre-warm token when FAB expands (user shows intent to call)
  useEffect(() => {
    if (isExpanded && hasVoiceAccess && canUseVoice) {
      preWarmToken();
    }
  }, [isExpanded, hasVoiceAccess, canUseVoice, preWarmToken]);

  // Hide on Foreman AI page (the page has its own controls)
  // Keep showing on other pages even during calls for quick end-call access
  if (location.pathname === "/foreman-ai") {
    return null;
  }

  const handleMainButtonClick = () => {
    if (isConnected) {
      // If connected, end the call
      stopConversation();
      setIsExpanded(false);
    } else {
      // Toggle expanded state
      setIsExpanded(!isExpanded);
    }
  };

  const handleStartCall = async () => {
    if (!hasVoiceAccess || !canUseVoice) {
      navigate("/foreman-ai");
      return;
    }
    
    await startConversation({
      userId: profile?.id,
      teamId: profile?.team_id || undefined,
      userName: profile?.full_name || undefined,
    });
    setIsExpanded(false);
  };

  const handleQuickAction = async (action: typeof quickActions[0]) => {
    setIsExpanded(false);
    
    // Start global task visibility for mutation actions
    const taskStepsMap: Record<string, { label: string; steps: any[] }> = {
      create_quote: { label: "Creating quote…", steps: QUOTE_CREATION_STEPS },
      create_invoice: { label: "Creating invoice…", steps: INVOICE_CREATION_STEPS },
    };
    const taskDef = taskStepsMap[action.action];
    if (taskDef) {
      startTask(action.action, taskDef.label, taskDef.steps);
    }

    // Navigate to Foreman AI page with the quick action
    navigate("/foreman-ai");
    
    // Dispatch event for the Foreman AI page to handle
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

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Quick Actions Menu */}
      {isExpanded && !isConnected && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 animate-fade-in">
          {/* Voice Call Button */}
          {hasVoiceAccess && canUseVoice && (
            <button
              onClick={handleStartCall}
              disabled={isConnecting}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-full",
                "bg-primary text-primary-foreground shadow-lg",
                "hover:bg-primary/90 active:scale-95",
                "transition-all duration-200",
                isConnecting && "opacity-50 cursor-not-allowed"
              )}
            >
              <Phone className="h-5 w-5" />
              <span className="font-medium pr-2">
                {isRetrying 
                  ? `Retrying (${retryAttempt}/${maxRetries})...` 
                  : isConnecting 
                    ? "Connecting..." 
                    : "Call Foreman AI"}
              </span>
            </button>
          )}

          {/* Chat Button */}
          <button
            onClick={handleOpenChat}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-full",
              "bg-card text-foreground border border-border shadow-lg",
              "hover:bg-muted active:scale-95",
              "transition-all duration-200"
            )}
          >
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="font-medium pr-2">Chat with Foreman AI</span>
          </button>

          {/* Divider */}
          <div className="h-px bg-border my-1" />

          {/* Quick Actions */}
          {quickActions.map((action) => (
            <button
              key={action.action}
              onClick={() => handleQuickAction(action)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-full",
                "bg-card text-foreground border border-border shadow-lg",
                "hover:bg-muted active:scale-95",
                "transition-all duration-200"
              )}
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="font-medium pr-2">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Floating Button */}
      <button
        onClick={handleMainButtonClick}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "h-14 w-14 rounded-full",
          "shadow-[0_4px_12px_rgba(13,155,106,0.3)]",
          "flex items-center justify-center",
          "hover:scale-110 hover:shadow-xl",
          "active:scale-95",
          "transition-all duration-200",
          // Safe area for mobile devices
          "mb-safe-area-inset-bottom mr-safe-area-inset-right",
          // State-based colors
          isConnected 
            ? "bg-destructive text-destructive-foreground shadow-destructive/25 hover:shadow-destructive/30" 
            : isExpanded
              ? "bg-muted text-foreground border border-border"
              : "bg-primary text-primary-foreground shadow-primary/25 hover:shadow-primary/30"
        )}
        aria-label={isConnected ? "End call with Foreman AI" : "Talk to Foreman AI"}
      >
        {isConnected ? (
          <PhoneOff className="h-6 w-6" />
        ) : isExpanded ? (
          <X className="h-6 w-6" />
        ) : (
          <Phone className="h-6 w-6" />
        )}
      </button>

      {/* Voice Activity Indicator */}
      {isConnected && (
        <div className={cn(
          "fixed bottom-24 right-6 z-50",
          "px-4 py-2 rounded-full",
          "bg-card border border-border shadow-lg",
          "flex items-center gap-2",
          "animate-fade-in"
        )}>
          <div className={cn(
            "h-2 w-2 rounded-full bg-primary",
            isSpeaking && "animate-pulse"
          )} />
          <span className="text-sm font-medium">
            {isSpeaking ? "Foreman AI is speaking..." : "Listening..."}
          </span>
        </div>
      )}
    </>
  );
}
