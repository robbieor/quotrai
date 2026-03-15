import { useState, useRef, useEffect, RefObject } from "react";
import { Send, Loader2, Phone, PhoneOff, Lock } from "lucide-react";
import { PhotoQuoteButton, type PhotoQuoteSuggestion } from "./PhotoQuoteButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { useProfile } from "@/hooks/useProfile";
import { useGeorgeAccess } from "@/hooks/useGeorgeAccess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GeorgeAgentInputProps {
  onUserMessage?: (message: string) => void;
  onAssistantMessage?: (message: string, conversationId?: string) => void;
  onStructuredResponse?: (responseData: any, conversationId?: string) => void;
  onPhotoQuote?: (suggestion: PhotoQuoteSuggestion) => void;
  conversationId?: string | null;
  textareaRef?: RefObject<HTMLTextAreaElement>;
}

export function GeorgeAgentInput({ 
  onUserMessage, 
  onAssistantMessage,
  onStructuredResponse,
  onPhotoQuote,
  conversationId,
  textareaRef: externalTextareaRef,
}: GeorgeAgentInputProps) {
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef || internalTextareaRef;
  const { profile } = useProfile();
  const { 
    canUseVoice, 
    hasVoiceAccess, 
    accessMessage, 
    remainingMinutes,
    isLoading: accessLoading 
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

  // Set user context on mount and profile change
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

  // Handle quick action events
  useEffect(() => {
    const handleQuickAction = async (e: CustomEvent<{ message: string; action?: string; autoSend?: boolean }>) => {
      const { message: actionMessage, action, autoSend } = e.detail;
      
      // If we have a direct action, call webhook
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
      } else if (autoSend !== false) {
        // Auto-send the message (for demo script)
        setIsProcessing(true);
        onUserMessage?.(actionMessage);
        
        try {
          const response = await supabase.functions.invoke("george-chat", {
            body: {
              message: actionMessage,
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
      } else {
        // Just set the message for manual send
        setMessage(actionMessage);
        textareaRef.current?.focus();
      }
    };

    window.addEventListener("foremanai-quick-action", handleQuickAction as EventListener);
    return () => {
      window.removeEventListener("foremanai-quick-action", handleQuickAction as EventListener);
    };
  }, [callWebhook, onUserMessage, onAssistantMessage, conversationId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text || isProcessing) return;

    setMessage("");
    onUserMessage?.(text);

    // If connected to ElevenLabs, send via voice agent
    if (isConnected) {
      sendTextMessage(text);
    } else {
      // Otherwise, call george-chat edge function directly
      setIsProcessing(true);
      try {
        const response = await supabase.functions.invoke("george-chat", {
          body: {
            message: text,
            conversation_id: conversationId || null,
            memory_context: memoryContext || undefined,
          },
        });

        if (response.error) throw response.error;
        
        const assistantMessage = response.data.message || "I'm here to help!";
        const newConversationId = response.data.conversation_id;
        onAssistantMessage?.(assistantMessage, newConversationId);
        
        // Pass structured action plan if available
        if (response.data.action_plan) {
          onStructuredResponse?.(response.data, newConversationId);
        }
      } catch (error) {
        console.error("Chat error:", error);
        toast.error("Failed to send message");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  // Determine voice button state
  const voiceDisabled = !canUseVoice || isConnecting || accessLoading;
  const showVoiceLock = !hasVoiceAccess;

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-muted rounded-2xl p-2">
          {/* Voice Connection Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isConnected ? "destructive" : showVoiceLock ? "secondary" : "default"}
                  size="icon"
                  className="shrink-0 rounded-full"
                  onClick={toggleConnection}
                  disabled={voiceDisabled}
                >
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : showVoiceLock ? (
                    <Lock className="h-5 w-5" />
                  ) : isConnected ? (
                    <PhoneOff className="h-5 w-5" />
                  ) : (
                    <Phone className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {accessMessage || (
                  isConnected 
                    ? "End voice conversation" 
                    : `Start voice conversation (${Math.round(remainingMinutes)} mins remaining)`
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Voice Activity Indicator */}
          {isConnected && (
            <div className="shrink-0 flex items-center gap-1 px-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  isSpeaking ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                )}
              />
              <span className="text-xs text-muted-foreground">
                {isSpeaking ? "Speaking" : "Listening"}
              </span>
            </div>
          )}

          {/* Photo Quote Button */}
          <PhotoQuoteButton
            onQuoteSuggestion={(suggestion) => onPhotoQuote?.(suggestion)}
            disabled={isProcessing}
          />

          {/* Text Input */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? "Type or speak to Foreman AI..."
                : "Type a message..."
            }
            className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-3"
            rows={1}
            disabled={isProcessing}
          />

          {/* Send Button */}
          <Button
            size="icon"
            className="shrink-0 rounded-full"
            onClick={handleSendMessage}
            disabled={!message.trim() || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {isConnecting
             ? "Connecting to Foreman AI..."
             : isConnected
               ? isSpeaking
                 ? "Foreman AI is speaking..."
                : `Listening... ${Math.round(remainingMinutes)} mins remaining`
              : isProcessing
                ? "Processing..."
                : hasVoiceAccess
                  ? `Type a message or click the phone button for voice (${Math.round(remainingMinutes)} mins remaining)`
                  : "Type a message (voice requires Foreman AI Voice add-on)"}
        </p>
      </div>
    </div>
  );
}
