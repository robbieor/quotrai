import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Lock, Phone, PhoneOff } from "lucide-react";
import { PhotoQuoteButton, type PhotoQuoteSuggestion } from "./PhotoQuoteButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { useProfile } from "@/hooks/useProfile";
import { useGeorgeAccess } from "@/hooks/useGeorgeAccess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeorgeMobileInputProps {
  onUserMessage?: (message: string) => void;
  onAssistantMessage?: (message: string, conversationId?: string) => void;
  onStructuredResponse?: (responseData: any, conversationId?: string) => void;
  onPhotoQuote?: (suggestion: PhotoQuoteSuggestion) => void;
  conversationId?: string | null;
  memoryContext?: Record<string, unknown>;
}

export function GeorgeMobileInput({
  onUserMessage,
  onAssistantMessage,
  onPhotoQuote,
  conversationId,
}: GeorgeMobileInputProps) {
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
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
    startConversation,
    stopConversation,
    sendTextMessage,
    callWebhook,
    setContext,
  } = useGlobalVoiceAgent();

  const isConnected = status === "connected";

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
      e: CustomEvent<{ message: string; action?: string }>
    ) => {
      const { message: actionMessage, action } = e.detail;

      if (action) {
        setIsProcessing(true);
        onUserMessage?.(actionMessage);

        try {
          const result = await callWebhook(action);
          onAssistantMessage?.(result);
        } catch (error) {
          console.error("Quick action error:", error);
          toast.error("Failed to process action");
        } finally {
          setIsProcessing(false);
        }
      } else {
        setMessage(actionMessage);
        inputRef.current?.focus();
      }
    };

    window.addEventListener(
      "foremanai-quick-action",
      handleQuickAction as EventListener
    );
    return () => {
      window.removeEventListener(
        "foremanai-quick-action",
        handleQuickAction as EventListener
      );
    };
  }, [callWebhook, onUserMessage, onAssistantMessage]);

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text || isProcessing) return;

    setMessage("");
    onUserMessage?.(text);

    if (isConnected) {
      sendTextMessage(text);
    } else {
      setIsProcessing(true);
      try {
        const response = await supabase.functions.invoke("george-chat", {
          body: {
            message: text,
            conversation_id: conversationId || null,
          },
        });

        if (response.error) throw response.error;

        const assistantMessage = response.data.message || "I'm here to help!";
        const newConversationId = response.data.conversation_id;
        onAssistantMessage?.(assistantMessage, newConversationId);
      } catch (error) {
        console.error("Chat error:", error);
        toast.error("Failed to send message");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const toggleConnection = async () => {
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

  const voiceDisabled = !canUseVoice || isConnecting || accessLoading;
  const showVoiceLock = !hasVoiceAccess;

  return (
    <div className="px-3 pt-2 pb-3 safe-area-pb bg-background border-t border-border">
      {/* Voice status bar */}
      {isConnected && (
        <div className="flex items-center justify-center gap-2 mb-3 py-2 px-3 bg-primary/10 rounded-full border border-primary/20">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isSpeaking ? "bg-primary animate-pulse" : "bg-muted-foreground/50"
            )}
          />
          <span className="text-xs font-medium text-primary">
            {isSpeaking ? "Foreman AI is speaking..." : "Listening..."}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {Math.round(remainingMinutes)} mins
          </span>
        </div>
      )}

      {/* Input bar - light theme */}
      <div className="flex items-center gap-2 bg-white border border-border rounded-full px-2 py-1.5 shadow-sm">
        {/* Photo Quote Button */}
        <PhotoQuoteButton
          onQuoteSuggestion={(suggestion) => onPhotoQuote?.(suggestion)}
          disabled={isProcessing}
        />

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask anything"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0 py-2"
          disabled={isProcessing}
        />

        {/* Right side buttons */}
        {message.trim() ? (
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={handleSendMessage}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        ) : (
          /* Voice call button - green phone */
          <Button
            variant={isConnected ? "default" : "ghost"}
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full shrink-0",
              isConnected 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
            onClick={toggleConnection}
            disabled={voiceDisabled}
          >
            {isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : showVoiceLock ? (
              <Lock className="h-4 w-4" />
            ) : isConnected ? (
              <PhoneOff className="h-5 w-5" />
            ) : (
              <Phone className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
