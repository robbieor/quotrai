import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Lock, Phone, PhoneOff, X, Slash } from "lucide-react";
import { PhotoQuoteButton, type PhotoQuoteSuggestion } from "./PhotoQuoteButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { useProfile } from "@/hooks/useProfile";
import { useGeorgeAccess } from "@/hooks/useGeorgeAccess";
import { useForemanChat } from "@/hooks/useForemanChat";
import { getSlashHints, type SlashCommandHint } from "@/utils/slashCommandParser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PHASE_LABELS: Record<string, string> = {
  requesting_mic: "Requesting mic…",
  fetching_token: "Authenticating…",
  dialing_webrtc: "Connecting…",
  dialing_websocket: "Trying fallback…",
  failed: "Connection failed",
};

interface GeorgeMobileInputProps {
  onUserMessage?: (message: string) => void;
  onAssistantMessage?: (message: string, conversationId?: string) => void;
  onStructuredResponse?: (responseData: any, conversationId?: string) => void;
  onPhotoQuote?: (suggestion: PhotoQuoteSuggestion) => void;
  onStreamingUpdate?: (text: string) => void;
  conversationId?: string | null;
  memoryContext?: any;
}

export function GeorgeMobileInput({
  onUserMessage,
  onAssistantMessage,
  onStructuredResponse,
  onPhotoQuote,
  onStreamingUpdate,
  conversationId,
  memoryContext,
}: GeorgeMobileInputProps) {
  const [message, setMessage] = useState("");
  const [slashHints, setSlashHints] = useState<SlashCommandHint[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { profile } = useProfile();
  const {
    canUseVoice,
    hasVoiceAccess,
    accessMessage,
    remainingMinutes,
    isLoading: accessLoading,
  } = useGeorgeAccess();

  const {
    status,
    isSpeaking,
    isConnecting,
    connectionPhase,
    startConversation,
    stopConversation,
    cancelConnection,
    sendTextMessage,
    callWebhook,
    setContext,
  } = useGlobalVoiceAgent();

  const isConnected = status === "connected";

  const {
    sendMessage: sendChatMessage,
    isProcessing,
    lastError,
  } = useForemanChat({
    conversationId: conversationId || null,
    memoryContext,
    onUserMessage,
    onAssistantMessage,
    onStructuredResponse,
    onStreamingUpdate,
  });

  useEffect(() => {
    async function loadContext() {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      const { data: userData } = await supabase.auth.getUser();
      setContext({
        userId: userData.user?.id,
        teamId: teamId || undefined,
        userName: profile?.full_name?.split(" ")[0] || undefined,
      });
    }
    loadContext();
  }, [profile, setContext]);

  useEffect(() => {
    const handleQuickAction = async (
      e: CustomEvent<{ message: string; action?: string; autoSend?: boolean }>
    ) => {
      const { message: actionMessage, action, autoSend } = e.detail;
      if (action) {
        onUserMessage?.(actionMessage);
        try {
          const result = await callWebhook(action);
          onAssistantMessage?.(result);
        } catch (error) {
          console.error("Quick action error:", error);
          toast.error("Failed to process action");
        }
      } else if (autoSend) {
        await sendChatMessage(actionMessage);
      } else {
        setMessage(actionMessage);
        inputRef.current?.focus();
      }
    };

    window.addEventListener("foremanai-quick-action", handleQuickAction as EventListener);
    return () => window.removeEventListener("foremanai-quick-action", handleQuickAction as EventListener);
  }, [callWebhook, onUserMessage, onAssistantMessage, sendChatMessage]);

  useEffect(() => {
    setSlashHints(getSlashHints(message));
  }, [message]);

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text || isProcessing) return;
    setMessage("");
    setSlashHints([]);
    if (isConnected) {
      onUserMessage?.(text);
      sendTextMessage(text);
    } else {
      await sendChatMessage(text);
    }
  };

  const handleSlashSelect = (hint: SlashCommandHint) => {
    setMessage(hint.command + " ");
    setSlashHints([]);
    inputRef.current?.focus();
  };

  const toggleConnection = async () => {
    if (isConnecting) {
      cancelConnection();
      return;
    }

    if (!canUseVoice) {
      toast.error(accessMessage || "Voice access not available");
      return;
    }

    if (isConnected) {
      await stopConversation();
    } else {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      const { data: userData } = await supabase.auth.getUser();
      await startConversation({
        userId: userData.user?.id,
        teamId: teamId || undefined,
        userName: profile?.full_name?.split(" ")[0] || undefined,
      });
    }
  };

  const showVoiceLock = !hasVoiceAccess;
  const phaseLabel = PHASE_LABELS[connectionPhase] || "Connecting…";

  return (
    <div className="px-4 pt-3 pb-4 safe-area-pb bg-background border-t border-border">
      {/* Connecting status bar */}
      {isConnecting && !isConnected && (
        <div className="flex items-center justify-center gap-2 mb-3 py-2.5 px-4 bg-primary/10 rounded-full border border-primary/20">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span className="text-sm font-medium text-primary">{phaseLabel}</span>
          <button
            onClick={cancelConnection}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Voice status bar */}
      {isConnected && (
        <div className="flex items-center justify-center gap-2 mb-3 py-2.5 px-4 bg-primary/10 rounded-full border border-primary/20">
          <div className={cn("w-2 h-2 rounded-full", isSpeaking ? "bg-primary animate-pulse" : "bg-muted-foreground/50")} />
          <span className="text-sm font-medium text-primary">
            {isSpeaking ? "revamo AI is speaking..." : "Listening..."}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">{Math.round(remainingMinutes)} mins</span>
        </div>
      )}

      {/* Slash command autocomplete */}
      {slashHints.length > 0 && (
        <div className="mb-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {slashHints.map((hint) => (
            <button
              key={hint.command}
              onClick={() => handleSlashSelect(hint)}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted transition-colors text-left min-h-[44px]"
            >
              <Slash className="h-4 w-4 text-primary shrink-0" />
              <div>
                <span className="text-sm font-medium">{hint.command}</span>
                <span className="text-xs text-muted-foreground ml-2">{hint.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-2xl px-3 py-1.5 shadow-sm overflow-hidden">
        <PhotoQuoteButton onQuoteSuggestion={(suggestion) => onPhotoQuote?.(suggestion)} disabled={isProcessing} />

        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
          }}
          placeholder="Message revamo AI..."
          className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/50 min-w-0 py-2.5"
          disabled={isProcessing}
        />

        {message.trim() ? (
          <Button size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={handleSendMessage} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        ) : (
          <div className="relative flex items-center justify-center h-11 w-11 shrink-0">
            {isConnecting && (
              <>
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-ring-pulse" />
                <span className="absolute inset-0 rounded-full bg-primary/20 animate-ring-pulse-delay-1" />
                <span className="absolute inset-0 rounded-full bg-primary/10 animate-ring-pulse-delay-2" />
              </>
            )}
            <Button
              variant={isConnected ? "default" : "ghost"}
              size="icon"
              className={cn(
                "h-11 w-11 rounded-full shrink-0 relative z-10",
                isConnected
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground animate-breathe"
                  : isConnecting
                    ? "bg-destructive/80 hover:bg-destructive/70 text-destructive-foreground"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground",
              )}
              onClick={toggleConnection}
              disabled={!isConnecting && (!canUseVoice || accessLoading)}
            >
              {showVoiceLock ? (
                <Lock className="h-5 w-5" />
              ) : isConnected ? (
                <PhoneOff className="h-5 w-5" />
              ) : isConnecting ? (
                <X className="h-5 w-5" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
