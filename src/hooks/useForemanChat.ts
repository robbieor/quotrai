import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseSlashCommand, isSlashCommand } from "@/utils/slashCommandParser";

interface UseForemanChatOptions {
  conversationId: string | null;
  memoryContext?: any;
  onUserMessage?: (message: string) => void;
  onAssistantMessage?: (message: string, conversationId?: string) => void;
  onStructuredResponse?: (responseData: any, conversationId?: string) => void;
  onStreamingUpdate?: (text: string) => void;
}

interface UseForemanChatReturn {
  sendMessage: (text: string) => Promise<void>;
  isProcessing: boolean;
  streamingText: string;
  retryLastMessage: () => Promise<void>;
  lastError: string | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/george-chat`;

/**
 * Consolidated chat hook — handles SSE streaming, slash commands, error recovery.
 * Replaces duplicated logic in GeorgeAgentInput & GeorgeMobileInput.
 */
export function useForemanChat({
  conversationId,
  memoryContext,
  onUserMessage,
  onAssistantMessage,
  onStructuredResponse,
  onStreamingUpdate,
}: UseForemanChatOptions): UseForemanChatReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const lastMessageRef = useRef<string>("");
  const retryCountRef = useRef(0);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    lastMessageRef.current = text;
    retryCountRef.current = 0;
    setLastError(null);
    setIsProcessing(true);
    setStreamingText("");
    onUserMessage?.(text);

    // ─── Slash command shortcut ───
    if (isSlashCommand(text)) {
      const parsed = parseSlashCommand(text);
      if (parsed?.complete) {
        try {
          const response = await supabase.functions.invoke("george-webhook", {
            body: {
              function_name: parsed.function_name,
              parameters: parsed.parameters,
            },
          });
          if (response.error) throw response.error;
          const msg = response.data?.message || `${parsed.label} completed.`;
          onAssistantMessage?.(msg, conversationId || undefined);
        } catch (err) {
          console.error("Slash command error:", err);
          setLastError("Failed to execute command. Try again.");
          onAssistantMessage?.("❌ Command failed — please try again or type your request naturally.", conversationId || undefined);
        } finally {
          setIsProcessing(false);
        }
        return;
      }
      // Incomplete slash command — fall through to LLM with hint
    }

    // ─── SSE streaming to george-chat ───
    try {
      const session = await supabase.auth.getSession();
      const token = session.data?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId || null,
          memory_context: memoryContext || undefined,
          stream: true,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          setLastError("Rate limit exceeded. Please wait a moment.");
          onAssistantMessage?.("⏳ Revamo AI is temporarily busy — please try again in a moment.", conversationId || undefined);
          setIsProcessing(false);
          return;
        }
        if (resp.status === 402) {
          setLastError("AI usage limit reached.");
          onAssistantMessage?.("💳 AI usage limit reached. Please add credits to continue.", conversationId || undefined);
          setIsProcessing(false);
          return;
        }
        throw new Error(`HTTP ${resp.status}`);
      }

      const contentType = resp.headers.get("Content-Type") || "";

      // ─── SSE streaming path ───
      if (contentType.includes("text/event-stream") && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let fullText = "";
        let streamDone = false;
        let receivedConversationId: string | undefined;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);

              // Check for structured response (action plan)
              if (parsed.action_plan || parsed.type === "structured") {
                receivedConversationId = parsed.conversation_id;
                const plan = parsed.action_plan;
                // If purely conversational (no confirmation gate, no pending tool calls),
                // treat as a regular text message instead of an action plan card
                const isConversational = plan && !plan.confirmation_gate && (!plan.pending_tool_calls || plan.pending_tool_calls.length === 0);
                if (isConversational) {
                  const msg = parsed.message || plan.text_response || "";
                  if (msg) fullText = msg;
                } else {
                  onStructuredResponse?.(parsed, receivedConversationId);
                }
                streamDone = true;
                break;
              }

              // Check for conversation_id
              if (parsed.conversation_id) {
                receivedConversationId = parsed.conversation_id;
              }

              // SSE delta content
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullText += content;
                setStreamingText(fullText);
                onStreamingUpdate?.(fullText);
              }

              // Check for finish
              if (parsed.choices?.[0]?.finish_reason) {
                streamDone = true;
              }
            } catch {
              // Incomplete JSON — put back and wait
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const p = JSON.parse(jsonStr);
              const c = p.choices?.[0]?.delta?.content as string | undefined;
              if (c) {
                fullText += c;
                setStreamingText(fullText);
              }
            } catch { /* ignore */ }
          }
        }

        if (fullText) {
          onAssistantMessage?.(fullText, receivedConversationId);
        }
      } else {
        // ─── JSON fallback path (action plans, tool calls) ───
        const data = await resp.json();
        const newConversationId = data.conversation_id;
        if (data.action_plan) {
          const plan = data.action_plan;
          // If purely conversational (no confirmation gate, no pending tool calls),
          // render as a regular chat message instead of an action plan card
          const isConversational = !plan.confirmation_gate && (!plan.pending_tool_calls || plan.pending_tool_calls.length === 0);
          if (isConversational) {
            const msg = data.message || plan.text_response || "I'm here to help!";
            onAssistantMessage?.(msg, newConversationId);
          } else {
            onStructuredResponse?.(data, newConversationId);
          }
        } else {
          const msg = data.message || "I'm here to help!";
          onAssistantMessage?.(msg, newConversationId);
        }
      }
    } catch (err) {
      console.error("Revamo chat error:", err);
      setLastError("Failed to send message. Tap retry.");

      // Auto-retry once for network errors
      if (retryCountRef.current === 0) {
        retryCountRef.current = 1;
        setTimeout(() => {
          sendMessage(text);
        }, 1000);
        return;
      }

      onAssistantMessage?.(
        "❌ Something went wrong. Please try again.",
        conversationId || undefined
      );
    } finally {
      setIsProcessing(false);
      setStreamingText("");
    }
  }, [isProcessing, conversationId, memoryContext, onUserMessage, onAssistantMessage, onStructuredResponse, onStreamingUpdate]);

  const retryLastMessage = useCallback(async () => {
    if (lastMessageRef.current) {
      retryCountRef.current = 0;
      await sendMessage(lastMessageRef.current);
    }
  }, [sendMessage]);

  return {
    sendMessage,
    isProcessing,
    streamingText,
    retryLastMessage,
    lastError,
  };
}
