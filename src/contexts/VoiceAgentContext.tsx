import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useVoiceFailureHandler } from "@/hooks/useVoiceFailureHandler";
import { useVoiceConnectionReliability } from "@/hooks/useVoiceConnectionReliability";

const ELEVENLABS_AGENT_ID = "agent_2701kffwpjhvf4gvt2cxpsx6j3rb";
const TOAST_DEBOUNCE_MS = 10000; // Suppress duplicate toasts within 10s

interface AgentContext {
  userId?: string;
  teamId?: string;
  userName?: string;
}

type ConnectionStatus = "connected" | "connecting" | "disconnecting" | "disconnected";

interface VoiceAgentContextType {
  status: ConnectionStatus;
  isSpeaking: boolean;
  isConnecting: boolean;
  currentConversationId: string | null;
  voiceUnavailable: boolean;
  retryAttempt: number;
  maxRetries: number;
  startConversation: (context?: AgentContext) => Promise<void>;
  stopConversation: () => Promise<void>;
  sendTextMessage: (text: string) => void;
  callWebhook: (functionName: string, parameters?: Record<string, unknown>) => Promise<string>;
  setContext: (context: AgentContext) => void;
  resetVoiceAvailability: () => void;
  preWarmToken: () => void;
}

const VoiceAgentContext = createContext<VoiceAgentContextType | null>(null);

// Mutation function names that modify data and need cache invalidation
const MUTATION_QUERY_MAP: Record<string, string[][]> = {
  create_job: [["jobs"], ["dashboard"], ["calendar-jobs"]],
  reschedule_job: [["jobs"], ["dashboard"], ["calendar-jobs"]],
  update_job_status: [["jobs"], ["dashboard"], ["calendar-jobs"]],
  delete_job: [["jobs"], ["dashboard"], ["calendar-jobs"]],
  create_customer: [["customers"]],
  update_customer: [["customers"]],
  delete_customer: [["customers"]],
  create_quote: [["quotes"], ["dashboard"]],
  update_quote_status: [["quotes"], ["dashboard"]],
  delete_quote: [["quotes"], ["dashboard"]],
  create_invoice: [["invoices"], ["dashboard"]],
  update_invoice_status: [["invoices"], ["dashboard"]],
  delete_invoice: [["invoices"], ["dashboard"]],
  log_expense: [["expenses"], ["dashboard"]],
  delete_expense: [["expenses"], ["dashboard"]],
  use_template_for_quote: [["quotes"], ["jobs"], ["dashboard"], ["calendar-jobs"]],
  create_invoice_from_template: [["invoices"], ["jobs"], ["dashboard"], ["calendar-jobs"]],
  send_invoice_reminder: [["invoices"]],
  record_payment: [["payments"], ["invoices"], ["dashboard"]],
  create_invoice_from_quote: [["invoices"], ["quotes"], ["dashboard"]],
};

export function VoiceAgentProvider({ children }: { children: ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const contextRef = useRef<AgentContext>({});
  const queryClient = useQueryClient();
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastToastRef = useRef<number>(0);
  const cachedTokenRef = useRef<{ token?: string; usePublicAgent?: boolean; fetchedAt: number } | null>(null);
  const TOKEN_TTL_MS = 45_000; // tokens valid ~60s, use within 45s

  // Webhook caller that invalidates relevant React Query caches after mutations
  const callGeorgeWebhook = useCallback(async (
    functionName: string,
    parameters: Record<string, unknown>,
    context: AgentContext
  ): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("george-webhook", {
        body: {
          function_name: functionName,
          parameters: {
            ...parameters,
            user_id: context.userId,
            team_id: context.teamId,
          },
        },
      });

      if (error) {
        console.error("[VoiceAgent] Webhook error:", error);
        return `Sorry, I encountered an error: ${error.message}`;
      }

      // Invalidate relevant queries after successful mutations
      const queriesToInvalidate = MUTATION_QUERY_MAP[functionName];
      if (queriesToInvalidate && data?.success !== false) {
        console.log(`[VoiceAgent] Invalidating queries for ${functionName}:`, queriesToInvalidate);
        for (const queryKey of queriesToInvalidate) {
          queryClient.invalidateQueries({ queryKey });
        }
      }

      return data?.message || data?.result || "Action completed successfully";
    } catch (err) {
      console.error("[VoiceAgent] Webhook exception:", err);
      return "Sorry, something went wrong. Please try again.";
    }
  }, [queryClient]);
  const conversationIdRef = useRef<string | null>(null);
  const pendingContextRef = useRef<AgentContext | undefined>(undefined);
  const { handleFailure, getFailureReason } = useVoiceFailureHandler();
  
  // Initialize reliability hook (no health monitoring — ElevenLabs SDK manages connection state)
  const {
    withRetry,
    resetRetryState,
    MAX_RETRIES,
  } = useVoiceConnectionReliability();

  // Save message to database
  const saveMessage = useCallback(async (role: "user" | "assistant", content: string) => {
    if (!conversationIdRef.current || !content.trim()) return;
    
    try {
      await supabase.from("george_messages").insert({
        conversation_id: conversationIdRef.current,
        role,
        content: content.trim(),
      });
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["george-messages", conversationIdRef.current] });
      queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
    } catch (error) {
      console.error("[VoiceAgent] Failed to save message:", error);
    }
  }, [queryClient]);

  const debouncedToast = useCallback((type: 'success' | 'info', message: string, opts?: any) => {
    const now = Date.now();
    if (now - lastToastRef.current < TOAST_DEBOUNCE_MS) return;
    lastToastRef.current = now;
    if (type === 'success') toast.success(message, opts);
    else toast.info(message, opts);
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      console.log("[VoiceAgent] ✅ Connected to Foreman AI");
      debouncedToast('success', "Connected to Foreman AI", { duration: 2000 });

      // Send immediate activity signal so agent knows user is present
      // (mobile mic can take 1-2s to start flowing audio)
      try { conversation.sendUserActivity(); } catch (_) { /* noop */ }

      // Start keep-alive interval to prevent silence-based disconnection
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      keepAliveRef.current = setInterval(() => {
        try { conversation.sendUserActivity(); } catch (_) { /* noop */ }
      }, 15_000);
    },
    onDisconnect: () => {
      console.log("[VoiceAgent] 🔌 Disconnected from Foreman AI");
      debouncedToast('info', "Call ended", { duration: 2000 });
      conversationIdRef.current = null;
      setCurrentConversationId(null);

      // Clear keep-alive interval
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
    },
    onMessage: (message: any) => {
      // Save user transcripts
      if (message.type === "user_transcript" && message.user_transcription_event?.user_transcript) {
        saveMessage("user", message.user_transcription_event.user_transcript);
      }
      // Save agent responses
      if (message.type === "agent_response" && message.agent_response_event?.agent_response) {
        saveMessage("assistant", message.agent_response_event.agent_response);
      }
    },
    onError: (error) => {
      console.error("[VoiceAgent] ❌ Error:", error);
      const reason = getFailureReason(error);
      handleFailure({ reason, error });
    },
    clientTools: {
      // ============================================
      // Summaries & Overview
      // ============================================
      get_today_summary: async () => {
        return await callGeorgeWebhook("get_today_summary", {}, contextRef.current);
      },
      get_week_ahead_summary: async () => {
        return await callGeorgeWebhook("get_week_ahead_summary", {}, contextRef.current);
      },
      get_todays_jobs: async () => {
        return await callGeorgeWebhook("get_todays_jobs", {}, contextRef.current);
      },
      get_upcoming_jobs: async (params: { days?: number }) => {
        return await callGeorgeWebhook("get_upcoming_jobs", params, contextRef.current);
      },
      get_financial_summary: async (params: { period?: string }) => {
        return await callGeorgeWebhook("get_financial_summary", params, contextRef.current);
      },

      // ============================================
      // Jobs - Full CRUD
      // ============================================
      create_job: async (params: {
        customer_name: string;
        title: string;
        description?: string;
        scheduled_date?: string;
        scheduled_time?: string;
        estimated_value?: number;
      }) => {
        return await callGeorgeWebhook("create_job", params, contextRef.current);
      },
      list_jobs: async (params: { 
        status?: string; 
        customer_name?: string; 
        search?: string; 
        date_from?: string; 
        date_to?: string; 
        limit?: number 
      }) => {
        return await callGeorgeWebhook("list_jobs", params, contextRef.current);
      },
      reschedule_job: async (params: {
        job_title?: string;
        client_name?: string;
        new_date: string;
        new_time?: string;
      }) => {
        return await callGeorgeWebhook("reschedule_job", params, contextRef.current);
      },
      update_job_status: async (params: { job_title: string; new_status: string }) => {
        return await callGeorgeWebhook("update_job_status", params, contextRef.current);
      },
      delete_job: async (params: { job_id?: string; job_title?: string; client_name?: string }) => {
        return await callGeorgeWebhook("delete_job", params, contextRef.current);
      },

      // ============================================
      // Customers - Full CRUD
      // ============================================
      list_customers: async (params: { search?: string; limit?: number }) => {
        return await callGeorgeWebhook("list_customers", params, contextRef.current);
      },
      search_customer: async (params: { query: string }) => {
        return await callGeorgeWebhook("search_customer", params, contextRef.current);
      },
      get_client_info: async (params: { client_name: string }) => {
        return await callGeorgeWebhook("get_client_info", params, contextRef.current);
      },
      create_customer: async (params: { 
        name: string; 
        email?: string; 
        phone?: string; 
        address?: string; 
        contact_person?: string; 
        notes?: string 
      }) => {
        return await callGeorgeWebhook("create_customer", params, contextRef.current);
      },
      update_customer: async (params: { 
        customer_name?: string; 
        customer_id?: string; 
        name?: string; 
        email?: string; 
        phone?: string; 
        address?: string; 
        contact_person?: string; 
        notes?: string 
      }) => {
        return await callGeorgeWebhook("update_customer", params, contextRef.current);
      },
      delete_customer: async (params: { customer_name?: string; customer_id?: string }) => {
        return await callGeorgeWebhook("delete_customer", params, contextRef.current);
      },

      // ============================================
      // Quotes - Full CRUD
      // ============================================
      create_quote: async (params: {
        customer_name: string;
        items: Array<{ description: string; quantity: number; unit_price: number }>;
        notes?: string;
        valid_days?: number;
        job_id?: string;
      }) => {
        return await callGeorgeWebhook("create_quote", params, contextRef.current);
      },
      list_quotes: async (params: { status?: string; customer_name?: string; search?: string; limit?: number }) => {
        return await callGeorgeWebhook("list_quotes", params, contextRef.current);
      },
      get_pending_quotes: async () => {
        return await callGeorgeWebhook("get_pending_quotes", {}, contextRef.current);
      },
      update_quote_status: async (params: { quote_id?: string; display_number?: string; new_status: string }) => {
        return await callGeorgeWebhook("update_quote_status", params, contextRef.current);
      },
      delete_quote: async (params: { quote_id?: string; display_number?: string }) => {
        return await callGeorgeWebhook("delete_quote", params, contextRef.current);
      },

      // ============================================
      // Invoices - Full CRUD
      // ============================================
      create_invoice: async (params: {
        customer_name: string;
        items: Array<{ description: string; quantity: number; unit_price: number }>;
        notes?: string;
        due_days?: number;
        job_id?: string;
        tax_rate?: number;
      }) => {
        return await callGeorgeWebhook("create_invoice", params, contextRef.current);
      },
      list_invoices: async (params: { status?: string; customer_name?: string; search?: string; limit?: number }) => {
        return await callGeorgeWebhook("list_invoices", params, contextRef.current);
      },
      get_outstanding_invoices: async () => {
        return await callGeorgeWebhook("get_outstanding_invoices", {}, contextRef.current);
      },
      get_overdue_invoices: async () => {
        return await callGeorgeWebhook("get_overdue_invoices", {}, contextRef.current);
      },
      update_invoice_status: async (params: { invoice_id?: string; display_number?: string; new_status: string }) => {
        return await callGeorgeWebhook("update_invoice_status", params, contextRef.current);
      },
      send_invoice_reminder: async (params: { display_number?: string; invoice_id?: string }) => {
        return await callGeorgeWebhook("send_invoice_reminder", params, contextRef.current);
      },
      delete_invoice: async (params: { invoice_id?: string; display_number?: string }) => {
        return await callGeorgeWebhook("delete_invoice", params, contextRef.current);
      },

      // ============================================
      // Expenses - Full CRUD
      // ============================================
      log_expense: async (params: {
        description: string;
        amount: number;
        category?: string;
        vendor?: string;
        job_title?: string;
      }) => {
        return await callGeorgeWebhook("log_expense", params, contextRef.current);
      },
      list_expenses: async (params: { 
        category?: string; 
        vendor?: string; 
        job_id?: string; 
        date_from?: string; 
        date_to?: string; 
        limit?: number 
      }) => {
        return await callGeorgeWebhook("list_expenses", params, contextRef.current);
      },
      delete_expense: async (params: { expense_id?: string; vendor?: string; amount?: number }) => {
        return await callGeorgeWebhook("delete_expense", params, contextRef.current);
      },

      // ============================================
      // Templates
      // ============================================
      get_templates: async (params?: { category?: string; search?: string }) => {
        return await callGeorgeWebhook("get_templates", params || {}, contextRef.current);
      },
      use_template_for_quote: async (params: {
        template_name?: string;
        template_id?: string;
        customer_name: string;
        notes?: string;
        quantity_overrides?: Record<string, number>;
        job_id?: string;
        job_title?: string;
        create_job?: boolean;
        scheduled_date?: string;
        scheduled_time?: string;
      }) => {
        return await callGeorgeWebhook("use_template_for_quote", params, contextRef.current);
      },
      create_invoice_from_template: async (params: {
        template_name?: string;
        template_id?: string;
        customer_name: string;
        notes?: string;
        due_days?: number;
        quantity_overrides?: Record<string, number>;
        job_id?: string;
        job_title?: string;
        create_job?: boolean;
        scheduled_date?: string;
        scheduled_time?: string;
      }) => {
        return await callGeorgeWebhook("create_invoice_from_template", params, contextRef.current);
      },
      suggest_template: async (params: { job_description: string }) => {
        return await callGeorgeWebhook("suggest_template", params, contextRef.current);
      },

      // ============================================
      // Additional Skills (wired from backend)
      // ============================================
      create_invoice_from_quote: async (params: { quote_id?: string; display_number?: string; due_days?: number }) => {
        return await callGeorgeWebhook("create_invoice_from_quote", params, contextRef.current);
      },
      get_jobs_for_date: async (params: { date: string }) => {
        return await callGeorgeWebhook("get_jobs_for_date", params, contextRef.current);
      },
      check_availability: async (params: { date: string; preferred_time?: string }) => {
        return await callGeorgeWebhook("check_availability", params, contextRef.current);
      },
      get_week_schedule: async (params: { start_date?: string }) => {
        return await callGeorgeWebhook("get_week_schedule", params, contextRef.current);
      },
      get_monthly_summary: async (params: { month?: number; year?: number }) => {
        return await callGeorgeWebhook("get_monthly_summary", params, contextRef.current);
      },
      get_outstanding_balance: async (params: { customer_name?: string }) => {
        return await callGeorgeWebhook("get_outstanding_balance", params, contextRef.current);
      },
      record_payment: async (params: { display_number?: string; invoice_id?: string; amount: number; payment_method?: string; notes?: string }) => {
        return await callGeorgeWebhook("record_payment", params, contextRef.current);
      },
      get_payment_history: async (params: { display_number?: string; invoice_id?: string; customer_name?: string; limit?: number }) => {
        return await callGeorgeWebhook("get_payment_history", params, contextRef.current);
      },
      get_template_details: async (params: { template_name?: string; template_id?: string }) => {
        return await callGeorgeWebhook("get_template_details", params, contextRef.current);
      },
      search_templates: async (params: { query: string; category?: string }) => {
        return await callGeorgeWebhook("search_templates", params, contextRef.current);
      },
      list_template_categories: async () => {
        return await callGeorgeWebhook("list_template_categories", {}, contextRef.current);
      },
    },
  });

  // Core connection logic (extracted for retry wrapper)
  const attemptConnection = useCallback(async (
    tokenResult: { token?: string; usePublicAgent?: boolean },
    dynamicVariables: Record<string, string>
  ) => {
    console.log("[VoiceAgent] 🚀 Starting session...");
    
    if (tokenResult.token) {
      console.log("[VoiceAgent] Using conversation token for WebRTC");
      await conversation.startSession({
        conversationToken: tokenResult.token,
        connectionType: "webrtc",
        dynamicVariables,
      });
    } else {
      console.log("[VoiceAgent] Using public agent, agentId:", ELEVENLABS_AGENT_ID);
      await conversation.startSession({
        agentId: ELEVENLABS_AGENT_ID,
        connectionType: "webrtc",
        dynamicVariables,
      });
    }
    
    console.log("[VoiceAgent] ✅ Session started successfully");
    resetRetryState();
  }, [conversation, resetRetryState]);

  // Pre-warm: fetch token in background so it's ready when user taps "Call"
  const preWarmToken = useCallback(() => {
    // Skip if we already have a fresh token
    if (cachedTokenRef.current && Date.now() - cachedTokenRef.current.fetchedAt < TOKEN_TTL_MS) {
      console.log("[VoiceAgent] Token already cached, skipping pre-warm");
      return;
    }
    console.log("[VoiceAgent] 🔥 Pre-warming conversation token...");
    supabase.functions.invoke("elevenlabs-agent-token", { body: {} })
      .then(({ data, error }) => {
        if (!error && data?.token) {
          cachedTokenRef.current = { token: data.token, fetchedAt: Date.now() };
          console.log("[VoiceAgent] ✅ Token pre-warmed");
        } else {
          cachedTokenRef.current = { usePublicAgent: true, fetchedAt: Date.now() };
          console.warn("[VoiceAgent] Token pre-warm fell back to public agent");
        }
      })
      .catch(() => {
        cachedTokenRef.current = { usePublicAgent: true, fetchedAt: Date.now() };
      });
  }, []);

  const startConversation = useCallback(async (context?: AgentContext) => {
    if (isConnecting || conversation.status === "connected") return;

    setIsConnecting(true);
    setRetryAttempt(0);
    pendingContextRef.current = context;
    console.log("[VoiceAgent] 🎙️ Starting voice connection...");

    try {
      // Use pre-loaded context if provided (from FloatingTomButton's profile)
      if (context) {
        contextRef.current = {
          ...contextRef.current,
          ...context,
        };
      }

      // Parallel: mic permission + token (only if not pre-warmed)
      const needsToken = !cachedTokenRef.current || Date.now() - cachedTokenRef.current.fetchedAt > TOKEN_TTL_MS;
      
      const [micResult, tokenFetchResult] = await Promise.allSettled([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        needsToken
          ? supabase.functions.invoke("elevenlabs-agent-token", { body: {} })
          : Promise.resolve(null),
      ]);

      // Check mic permission (hard failure)
      if (micResult.status === "rejected") {
        console.error("[VoiceAgent] ❌ Microphone error:", micResult.reason);
        const reason = (micResult.reason as Error).name === "NotAllowedError" 
          ? "microphone_denied" 
          : "microphone_unavailable";
        handleFailure({ reason, error: micResult.reason });
        setIsConnecting(false);
        return;
      }
      // Resume AudioContext on mobile (browsers often start it suspended)
      const micStream = micResult.value;
      try {
        const audioCtx = new AudioContext();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
          console.log("[VoiceAgent] ✅ AudioContext resumed for mobile");
        }
        audioCtx.close(); // We only needed to unblock the global audio policy
      } catch (_) { /* best-effort */ }
      // Stop the mic stream we requested (ElevenLabs SDK will request its own)
      micStream.getTracks().forEach(t => t.stop());
      console.log("[VoiceAgent] ✅ Microphone permission granted");

      // Use cached token or freshly fetched one
      let tokenData: { token?: string; usePublicAgent?: boolean } = { usePublicAgent: true };
      if (!needsToken && cachedTokenRef.current?.token) {
        tokenData = { token: cachedTokenRef.current.token };
        console.log("[VoiceAgent] ✅ Using pre-warmed token");
      } else if (tokenFetchResult.status === "fulfilled" && tokenFetchResult.value?.data?.token) {
        tokenData = { token: tokenFetchResult.value.data.token };
        console.log("[VoiceAgent] ✅ Got fresh conversation token");
      } else {
        console.warn("[VoiceAgent] Token unavailable, using public agent fallback");
      }
      // Clear cached token after use (single-use)
      cachedTokenRef.current = null;

      // Build dynamic variables from already-loaded context
      const dynamicVariables: Record<string, string> = {};
      if (contextRef.current.userName) dynamicVariables.user_name = contextRef.current.userName;
      if (contextRef.current.teamId) dynamicVariables.team_id = contextRef.current.teamId;

      const now = new Date();
      dynamicVariables.current_date = now.toISOString().split("T")[0];
      dynamicVariables.current_time = now.toTimeString().slice(0, 5);
      dynamicVariables.current_day = now.toLocaleDateString("en-US", { weekday: "long" });
      dynamicVariables.current_datetime = now.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      // Attempt connection with retry
      const { success, error } = await withRetry(
        () => attemptConnection(tokenData, dynamicVariables),
        "ElevenLabs connection",
        (attempt) => {
          setRetryAttempt(attempt);
          if (attempt > 1) {
            toast.loading(`Reconnecting... (attempt ${attempt}/${MAX_RETRIES})`, { id: "voice-retry" });
          }
        }
      );

      if (success) {
        // Defer DB conversation creation
        const userId = contextRef.current.userId;
        const teamId = contextRef.current.teamId;
        if (teamId && userId) {
          supabase
            .from("george_conversations")
            .insert({
              team_id: teamId,
              user_id: userId,
              title: `Voice call - ${new Date().toLocaleString()}`,
            })
            .select()
            .single()
            .then(({ data: newConversation, error: dbError }) => {
              if (!dbError && newConversation) {
                conversationIdRef.current = newConversation.id;
                setCurrentConversationId(newConversation.id);
                console.log("[VoiceAgent] Created conversation:", newConversation.id);
              }
            });
        }
      } else {
        console.error("[VoiceAgent] ❌ Connection failed after retries:", error);
        toast.dismiss("voice-retry");
        toast.error("Unable to connect after multiple attempts", {
          description: "Please try again later or use text chat",
        });
        setVoiceUnavailable(true);
      }
    } catch (error: unknown) {
      console.error("[VoiceAgent] ❌ Failed to start conversation:", error);
      
      const reason = getFailureReason(error);
      const { showFallback } = handleFailure({ reason, error });
      
      if (showFallback) {
        setVoiceUnavailable(true);
      }
    } finally {
      setIsConnecting(false);
      setRetryAttempt(0);
      toast.dismiss("voice-retry");
    }
  }, [conversation, isConnecting, handleFailure, getFailureReason, withRetry, attemptConnection, MAX_RETRIES]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error("[VoiceAgent] Error stopping conversation:", error);
    }
  }, [conversation]);

  const sendTextMessage = useCallback((text: string) => {
    if (conversation.status === "connected") {
      conversation.sendUserMessage(text);
    }
  }, [conversation]);

  const callWebhook = useCallback(async (
    functionName: string,
    parameters: Record<string, unknown> = {}
  ) => {
    return callGeorgeWebhook(functionName, parameters, contextRef.current);
  }, [callGeorgeWebhook]);

  const setContext = useCallback((context: AgentContext) => {
    contextRef.current = context;
  }, []);

  const resetVoiceAvailability = useCallback(() => {
    setVoiceUnavailable(false);
  }, []);

  // Cleanup keep-alive on unmount
  useEffect(() => {
    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    };
  }, []);

  return (
    <VoiceAgentContext.Provider
      value={{
        status: conversation.status,
        isSpeaking: conversation.isSpeaking,
        isConnecting,
        currentConversationId,
        voiceUnavailable,
        retryAttempt,
        maxRetries: MAX_RETRIES,
        startConversation,
        stopConversation,
        sendTextMessage,
        callWebhook,
        setContext,
        resetVoiceAvailability,
        preWarmToken,
      }}
    >
      {children}
    </VoiceAgentContext.Provider>
  );
}

export function useGlobalVoiceAgent() {
  const context = useContext(VoiceAgentContext);
  if (!context) {
    throw new Error("useGlobalVoiceAgent must be used within VoiceAgentProvider");
  }
  return context;
}
