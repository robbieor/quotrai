import { useState, useRef, useEffect, RefObject } from "react";
import { Send, Loader2, Phone, PhoneOff, Lock, Slash } from "lucide-react";
import { PhotoQuoteButton, type PhotoQuoteSuggestion } from "./PhotoQuoteButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { useProfile } from "@/hooks/useProfile";
import { useGeorgeAccess } from "@/hooks/useGeorgeAccess";
import { useForemanChat } from "@/hooks/useForemanChat";
import { getSlashHints, type SlashCommandHint } from "@/utils/slashCommandParser";
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
  onStreamingUpdate?: (text: string) => void;
  conversationId?: string | null;
  textareaRef?: RefObject<HTMLTextAreaElement>;
  memoryContext?: any;
}

export function GeorgeAgentInput({ 
  onUserMessage, 
  onAssistantMessage,
  onStructuredResponse,
  onPhotoQuote,
  onStreamingUpdate,
  conversationId,
  textareaRef: externalTextareaRef,
  memoryContext,
}: GeorgeAgentInputProps) {
  const [message, setMessage] = useState("");
  const [slashHints, setSlashHints] = useState<SlashCommandHint[]>([]);
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

  // Consolidated chat hook
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
      
      if (action) {
        onUserMessage?.(actionMessage);
        try {
          const result = await callWebhook(action);
          onAssistantMessage?.(result);
        } catch (error) {
          console.error("Quick action error:", error);
          toast.error("Failed to process action");
        }
      } else if (autoSend !== false) {
        await sendChatMessage(actionMessage);
      } else {
        setMessage(actionMessage);
        textareaRef.current?.focus();
      }
    };

    window.addEventListener("foremanai-quick-action", handleQuickAction as EventListener);
    return () => {
      window.removeEventListener("foremanai-quick-action", handleQuickAction as EventListener);
    };
  }, [callWebhook, onUserMessage, onAssistantMessage, sendChatMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Slash command hints
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSlashSelect = (hint: SlashCommandHint) => {
    setMessage(hint.command + " ");
    setSlashHints([]);
    textareaRef.current?.focus();
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
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-3xl mx-auto">
        {/* Slash command autocomplete */}
        {slashHints.length > 0 && (
          <div className="mb-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            {slashHints.map((hint) => (
              <button
                key={hint.command}
                onClick={() => handleSlashSelect(hint)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
              >
                <Slash className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="text-sm font-medium">{hint.command}</span>
                  <span className="text-xs text-muted-foreground ml-2">{hint.label}</span>
                  <p className="text-xs text-muted-foreground/70">{hint.example}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-muted rounded-2xl p-2">
          {/* Voice Connection Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isConnected ? "destructive" : showVoiceLock ? "secondary" : "default"}
                  size="icon"
                  className={`shrink-0 rounded-full ${!isConnected && !showVoiceLock ? "bg-emerald-400 hover:bg-emerald-500 text-emerald-950" : ""}`}
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
                ? "Type or speak to Revamo AI..."
                : "Type a message or / for commands..."
            }
            className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-3"
            rows={1}
            disabled={isProcessing}
          />

          {/* Send Button */}
          <Button
            size="icon"
            className="shrink-0 rounded-full bg-emerald-400 hover:bg-emerald-500 text-emerald-950"
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
             ? "Connecting to Revamo AI..."
             : isConnected
               ? isSpeaking
                 ? "Revamo AI is speaking..."
                : `Listening... ${Math.round(remainingMinutes)} mins remaining`
              : isProcessing
                ? "Processing..."
                : lastError
                  ? lastError
                  : hasVoiceAccess
                    ? `Type a message or click the phone button for voice (${Math.round(remainingMinutes)} mins remaining)`
                    : "Type a message or use / commands (voice requires Revamo AI Voice add-on)"}
        </p>
      </div>
    </div>
  );
}