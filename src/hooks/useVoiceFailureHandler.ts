import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VoiceFailureReason = 
  | "microphone_denied"
  | "microphone_unavailable"
  | "token_failed"
  | "connection_failed"
  | "agent_unavailable"
  | "unknown";

interface VoiceFailure {
  reason: VoiceFailureReason;
  error?: Error | unknown;
  context?: Record<string, unknown>;
}

const FAILURE_MESSAGES: Record<VoiceFailureReason, { title: string; description: string }> = {
  microphone_denied: {
    title: "Microphone Access Denied",
    description: "Please allow microphone access in your browser settings and try again.",
  },
  microphone_unavailable: {
    title: "Microphone Not Available",
    description: "We couldn't detect a microphone. Please check your device settings.",
  },
  token_failed: {
    title: "Voice Service Temporarily Unavailable",
    description: "We're having trouble connecting to voice. You can still use text chat below.",
  },
  connection_failed: {
    title: "Connection Failed",
    description: "Couldn't establish voice connection. Please try again or use text chat.",
  },
  agent_unavailable: {
    title: "Voice Assistant Unavailable",
    description: "revamo AI is temporarily unavailable. Please use text chat for now.",
  },
  unknown: {
    title: "Voice Call Failed",
    description: "Something went wrong. Please try again or use text chat instead.",
  },
};

export function useVoiceFailureHandler() {
  const logFailure = useCallback(async (failure: VoiceFailure) => {
    try {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      const { data: userData } = await supabase.auth.getUser();
      
      if (!teamId || !userData.user?.id) {
        console.warn("[VoiceFailure] Cannot log - missing team/user context");
        return;
      }

      // Log to george_usage_log with a special skill_used marker
      await supabase.from("george_usage_log").insert({
        team_id: teamId,
        user_id: userData.user.id,
        duration_seconds: 0,
        usage_type: "voice_failure",
        skill_used: failure.reason,
        cost_estimate: 0,
      });

      console.log("[VoiceFailure] Logged failure:", failure.reason);
    } catch (err) {
      console.error("[VoiceFailure] Failed to log failure:", err);
    }
  }, []);

  const handleFailure = useCallback((failure: VoiceFailure): { showFallback: boolean } => {
    const message = FAILURE_MESSAGES[failure.reason] || FAILURE_MESSAGES.unknown;
    
    console.error("[VoiceFailure]", failure.reason, failure.error);
    
    // Log the failure asynchronously
    logFailure(failure);

    // Show user-friendly toast with action
    toast.error(message.title, {
      description: message.description,
      duration: 6000,
      action: failure.reason !== "microphone_denied" && failure.reason !== "microphone_unavailable" 
        ? {
            label: "Use Text Chat",
            onClick: () => {
              // Focus text input - dispatch event for components to handle
              window.dispatchEvent(new CustomEvent("voice-fallback-to-text"));
            },
          }
        : undefined,
    });

    // Return whether we should show fallback UI
    const showFallback = [
      "token_failed",
      "connection_failed", 
      "agent_unavailable",
      "unknown",
    ].includes(failure.reason);

    return { showFallback };
  }, [logFailure]);

  const getFailureReason = useCallback((error: unknown): VoiceFailureReason => {
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        return "microphone_denied";
      }
      if (error.message?.toLowerCase().includes("microphone")) {
        return "microphone_unavailable";
      }
      if (error.message?.toLowerCase().includes("token") || 
          error.message?.toLowerCase().includes("401") ||
          error.message?.toLowerCase().includes("permission")) {
        return "token_failed";
      }
      if (error.message?.toLowerCase().includes("connection") ||
          error.message?.toLowerCase().includes("websocket") ||
          error.message?.toLowerCase().includes("network")) {
        return "connection_failed";
      }
      if (error.message?.toLowerCase().includes("agent")) {
        return "agent_unavailable";
      }
    }
    return "unknown";
  }, []);

  return {
    handleFailure,
    getFailureReason,
    logFailure,
  };
}
