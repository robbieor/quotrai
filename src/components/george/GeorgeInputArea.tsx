import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Mic, MicOff, Loader2, Volume2, VolumeX, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useCreateGeorgeConversation,
  useAddGeorgeMessage,
  useUpdateGeorgeConversation,
} from "@/hooks/useGeorge";
import { useVoiceInput, useGeorgeVoice } from "@/hooks/useGeorgeVoice";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeorgeInputAreaProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  onNewMessage?: (message: string, isAssistant: boolean) => void;
}

export function GeorgeInputArea({
  conversationId,
  onConversationCreated,
  onNewMessage,
}: GeorgeInputAreaProps) {
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createConversation = useCreateGeorgeConversation();
  const addMessage = useAddGeorgeMessage();
  const updateConversation = useUpdateGeorgeConversation();

  const { isListening, transcript, partialTranscript, startListening, stopListening, clearTranscript } = useVoiceInput();
  const { speak, stop: stopSpeaking, isPlaying, isSpeaking } = useGeorgeVoice();

  // Update message when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);

  // Handle quick action events
  useEffect(() => {
    const handleQuickAction = (e: CustomEvent<{ message: string }>) => {
      setMessage(e.detail.message);
      textareaRef.current?.focus();
    };

    window.addEventListener("foremanai-quick-action", handleQuickAction as EventListener);
    return () => {
      window.removeEventListener("foremanai-quick-action", handleQuickAction as EventListener);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const sendMessage = async () => {
    const messageToSend = message.trim();
    if (!messageToSend || isProcessing) return;

    // Stop listening if active
    if (isListening) {
      stopListening();
    }
    clearTranscript();
    setMessage("");
    setIsProcessing(true);

    try {
      let currentConversationId = conversationId;

      // Create conversation if needed
      if (!currentConversationId) {
        const newConversation = await createConversation.mutateAsync({
          title: messageToSend.slice(0, 50),
        });
        currentConversationId = newConversation.id;
        onConversationCreated(currentConversationId);
      } else {
        updateConversation.mutate({
          id: currentConversationId,
          title: messageToSend.slice(0, 50),
        });
      }

      // Add user message
      await addMessage.mutateAsync({
        conversation_id: currentConversationId,
        role: "user",
        content: messageToSend,
      });

      onNewMessage?.(messageToSend, false);

      // Call the george-chat edge function
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) {
        toast.error("No team found. Please complete onboarding first.");
        return;
      }
      const { data: user } = await supabase.auth.getUser();

      const response = await supabase.functions.invoke("george-chat", {
        body: {
          message: messageToSend,
          conversation_id: currentConversationId,
          team_id: teamId,
          user_id: user.user?.id,
        },
      });

      if (response.error) throw response.error;

      const assistantMessage = response.data.message || "I'm sorry, I couldn't process that request.";

      // Add assistant message
      await addMessage.mutateAsync({
        conversation_id: currentConversationId,
        role: "assistant",
        content: assistantMessage,
      });

      onNewMessage?.(assistantMessage, true);

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speak(assistantMessage);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening();
      // Send the message if we have a transcript
      if (transcript || message) {
        setTimeout(() => sendMessage(), 100);
      }
    } else {
      clearTranscript();
      startListening();
    }
  }, [isListening, stopListening, startListening, clearTranscript, transcript, message]);

  const toggleVoiceOutput = () => {
    if (isPlaying) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  return (
    <div className="border-t border-border bg-background p-3 md:p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-1.5 md:gap-2 bg-muted rounded-2xl p-1.5 md:p-2">
          {/* Voice Output Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10",
              !voiceEnabled && "text-muted-foreground"
            )}
            onClick={toggleVoiceOutput}
            title={voiceEnabled ? "Mute ForemanAI" : "Unmute ForemanAI"}
          >
            {isPlaying ? (
              <div className="relative">
                <Volume2 className="h-4 w-4 md:h-5 md:w-5 text-primary animate-pulse" />
              </div>
            ) : voiceEnabled ? (
              <Volume2 className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <VolumeX className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </Button>

          {/* Voice Input Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 transition-all",
              isListening && "bg-destructive text-destructive-foreground animate-pulse"
            )}
            onClick={toggleVoice}
            disabled={isProcessing}
          >
            {isListening ? (
              <MicOff className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <Mic className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </Button>

          {/* Voice Waveform / Listening Indicator */}
          {isListening ? (
            <div className="flex-1 flex flex-col gap-2 py-2">
              <div className="flex items-center justify-center gap-1">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-destructive rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 20 + 8}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              {(partialTranscript || transcript) && (
                <p className="text-xs md:text-sm text-muted-foreground text-center truncate px-2 md:px-4">
                  {partialTranscript || transcript}
                </p>
              )}
            </div>
          ) : (
            /* Text Input */
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message George..."
              className="flex-1 min-h-[40px] md:min-h-[44px] max-h-[150px] md:max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2.5 md:py-3 text-sm md:text-base"
              rows={1}
              disabled={isProcessing}
            />
          )}

          {/* Send/Stop Button */}
          {isListening ? (
            <Button
              size="icon"
              variant="destructive"
              className="shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10"
              onClick={() => {
                stopListening();
                if (transcript || message) {
                  setTimeout(() => sendMessage(), 100);
                }
              }}
            >
              <Square className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10"
              onClick={sendMessage}
              disabled={!message.trim() || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
          )}
        </div>

        <p className="text-[10px] md:text-xs text-muted-foreground text-center mt-2">
          {isListening 
            ? "Listening... Tap stop when done"
            : isSpeaking 
               ? "Revamo AI is speaking..." 
               : "Revamo AI can help with jobs, quotes, invoices, and expenses"
          }
        </p>
      </div>
    </div>
  );
}
