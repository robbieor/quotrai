import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useVoiceFailureHandler } from "@/hooks/useVoiceFailureHandler";
import { useVoiceConnectionReliability } from "@/hooks/useVoiceConnectionReliability";

const ELEVENLABS_AGENT_ID = "agent_2701kffwpjhvf4gvt2cxpsx6j3rb";
const TOAST_DEBOUNCE_MS = 10000;
const WEBRTC_CONNECT_TIMEOUT_MS = 8000; // Wait up to 8s for onConnect

interface AgentContext {
  userId?: string;
  teamId?: string;
  userName?: string;
}

type ConnectionStatus = "connected" | "connecting" | "disconnecting" | "disconnected" | "error";

// Debug state for the voice debug panel
export interface VoiceDebugState {
  micPermission: "idle" | "requesting" | "granted" | "denied" | "error";
  tokenFetch: "idle" | "pending" | "success" | "failed";
  transportPath: "none" | "webrtc" | "websocket";
  sessionConnected: boolean;
  onConnectFired: boolean;
  lastTranscript: string;
  lastToolCall: string;
  lastWebhookStatus: string;
  lastError: string;
  timeline: Array<{ time: string; event: string }>;
}

const initialDebugState: VoiceDebugState = {
  micPermission: "idle",
  tokenFetch: "idle",
  transportPath: "none",
  sessionConnected: false,
  onConnectFired: false,
  lastTranscript: "",
  lastToolCall: "",
  lastWebhookStatus: "",
  lastError: "",
  timeline: [],
};

interface VoiceAgentContextType {
  status: ConnectionStatus;
  isSpeaking: boolean;
  isConnecting: boolean;
  currentConversationId: string | null;
  voiceUnavailable: boolean;
  retryAttempt: number;
  maxRetries: number;
  debugState: VoiceDebugState;
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

function VoiceAgentProviderInner({ children }: { children: ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [debugState, setDebugState] = useState<VoiceDebugState>(initialDebugState);
  const contextRef = useRef<AgentContext>({});
  const queryClient = useQueryClient();
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastToastRef = useRef<number>(0);
  const cachedTokenRef = useRef<{ token: string; signedUrl?: string; fetchedAt: number } | null>(null);
  const TOKEN_TTL_MS = 30_000;

  // onConnect promise resolution refs
  const onConnectResolveRef = useRef<(() => void) | null>(null);
  const onConnectRejectRef = useRef<((err: Error) => void) | null>(null);

  const addDebugEvent = useCallback((event: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    console.log(`[VoiceDebug] ${event}`);
    setDebugState(prev => ({
      ...prev,
      timeline: [...prev.timeline.slice(-29), { time, event }],
    }));
  }, []);

  const updateDebug = useCallback((partial: Partial<VoiceDebugState>) => {
    setDebugState(prev => ({ ...prev, ...partial }));
  }, []);

  // Webhook caller with debug instrumentation
  const callGeorgeWebhook = useCallback(async (
    functionName: string,
    parameters: Record<string, unknown>,
    context: AgentContext
  ): Promise<string> => {
    addDebugEvent(`🔧 Tool call: ${functionName}`);
    updateDebug({ lastToolCall: functionName, lastWebhookStatus: "sending..." });

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
        const errMsg = `Webhook error: ${error.message}`;
        addDebugEvent(`❌ ${errMsg}`);
        updateDebug({ lastWebhookStatus: `FAILED: ${error.message}` });
        return `Sorry, I encountered an error: ${error.message}`;
      }

      const resultMsg = data?.message || data?.result || "Action completed successfully";
      addDebugEvent(`✅ Webhook success: ${functionName}`);
      updateDebug({ lastWebhookStatus: `OK: ${resultMsg.substring(0, 80)}` });

      // Invalidate relevant queries after successful mutations
      const queriesToInvalidate = MUTATION_QUERY_MAP[functionName];
      if (queriesToInvalidate && data?.success !== false) {
        for (const queryKey of queriesToInvalidate) {
          queryClient.invalidateQueries({ queryKey });
        }
      }

      return resultMsg;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addDebugEvent(`❌ Webhook exception: ${errMsg}`);
      updateDebug({ lastWebhookStatus: `EXCEPTION: ${errMsg}` });
      return "Sorry, something went wrong. Please try again.";
    }
  }, [queryClient, addDebugEvent, updateDebug]);

  const conversationIdRef = useRef<string | null>(null);
  const pendingContextRef = useRef<AgentContext | undefined>(undefined);
  const { handleFailure, getFailureReason } = useVoiceFailureHandler();
  
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
      console.log("[VoiceAgent] ✅ onConnect fired — transport is truly live");
      addDebugEvent("✅ onConnect fired — session truly connected");
      updateDebug({ sessionConnected: true, onConnectFired: true });
      debouncedToast('success', "Connected to Foreman AI", { duration: 2000 });

      // Resolve the connection promise so attemptConnection knows it worked
      if (onConnectResolveRef.current) {
        onConnectResolveRef.current();
        onConnectResolveRef.current = null;
        onConnectRejectRef.current = null;
      }

      // Send immediate activity signal
      try { conversation.sendUserActivity(); } catch (_) { /* noop */ }

      // Start keep-alive interval to prevent silence-based disconnection
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      keepAliveRef.current = setInterval(() => {
        try { conversation.sendUserActivity(); } catch (_) { /* noop */ }
      }, 15_000);
    },
    onDisconnect: () => {
      console.log("[VoiceAgent] 🔌 Disconnected from Foreman AI");
      addDebugEvent("🔌 Disconnected");
      updateDebug({ sessionConnected: false, onConnectFired: false });
      debouncedToast('info', "Call ended", { duration: 2000 });
      conversationIdRef.current = null;
      setCurrentConversationId(null);

      // If we were waiting for onConnect, reject it
      if (onConnectRejectRef.current) {
        onConnectRejectRef.current(new Error("Disconnected before onConnect fired"));
        onConnectResolveRef.current = null;
        onConnectRejectRef.current = null;
      }

      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
    },
    onMessage: (message: any) => {
      // Save user transcripts
      if (message.type === "user_transcript" && message.user_transcription_event?.user_transcript) {
        const transcript = message.user_transcription_event.user_transcript;
        addDebugEvent(`🗣️ User transcript: "${transcript.substring(0, 60)}"`);
        updateDebug({ lastTranscript: transcript });
        saveMessage("user", transcript);
      }
      // Save agent responses
      if (message.type === "agent_response" && message.agent_response_event?.agent_response) {
        const response = message.agent_response_event.agent_response;
        addDebugEvent(`🤖 Agent response: "${response.substring(0, 60)}"`);
        saveMessage("assistant", response);
      }
      // Log other message types for debugging
      if (message.type === "conversation_initiation_metadata") {
        addDebugEvent("📋 conversation_initiation_metadata received");
      }
    },
    onError: (error) => {
      console.error("[VoiceAgent] ❌ Error:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      addDebugEvent(`❌ SDK Error: ${errMsg}`);
      updateDebug({ lastError: errMsg });
      const reason = getFailureReason(error);
      handleFailure({ reason, error });

      // If we were waiting for onConnect, reject it
      if (onConnectRejectRef.current) {
        onConnectRejectRef.current(error instanceof Error ? error : new Error(errMsg));
        onConnectResolveRef.current = null;
        onConnectRejectRef.current = null;
      }
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
      // Additional Skills
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

  /**
   * Core connection logic — tries WebRTC first, then WebSocket fallback.
   * CRITICAL FIX: We now wait for the onConnect callback to actually fire
   * before declaring success. startSession() resolving is NOT enough —
   * the transport can fail asynchronously right after.
   */
  const attemptConnection = useCallback(async (
    token: string,
    signedUrl: string | undefined,
    dynamicVariables: Record<string, string>
  ) => {
    // Helper: start session and wait for onConnect with timeout
    const startAndWaitForConnect = (
      sessionOpts: Record<string, unknown>,
      label: string
    ): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        // Set up onConnect resolution refs
        onConnectResolveRef.current = resolve;
        onConnectRejectRef.current = reject;

        // Timeout — if onConnect doesn't fire, reject
        const timeout = setTimeout(() => {
          if (onConnectResolveRef.current === resolve) {
            onConnectResolveRef.current = null;
            onConnectRejectRef.current = null;
            reject(new Error(`${label} timed out waiting for onConnect (${WEBRTC_CONNECT_TIMEOUT_MS}ms)`));
          }
        }, WEBRTC_CONNECT_TIMEOUT_MS);

        // Wrap resolve/reject to clear timeout
        const origResolve = resolve;
        const origReject = reject;
        onConnectResolveRef.current = () => {
          clearTimeout(timeout);
          origResolve();
        };
        onConnectRejectRef.current = (err: Error) => {
          clearTimeout(timeout);
          origReject(err);
        };

        // Start the session — startSession returns void, errors surface via onError
        try {
          conversation.startSession({
            ...sessionOpts,
            dynamicVariables,
          });
        } catch (err: unknown) {
          clearTimeout(timeout);
          onConnectResolveRef.current = null;
          onConnectRejectRef.current = null;
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    };

    // Try WebRTC with token first
    try {
      addDebugEvent("🚀 Trying WebRTC connection...");
      updateDebug({ transportPath: "webrtc" });
      await startAndWaitForConnect({ conversationToken: token }, "WebRTC");
      addDebugEvent("✅ WebRTC connected (onConnect confirmed)");
      resetRetryState();
      return;
    } catch (webrtcErr) {
      const errMsg = webrtcErr instanceof Error ? webrtcErr.message : String(webrtcErr);
      addDebugEvent(`⚠️ WebRTC failed: ${errMsg}`);
      updateDebug({ lastError: errMsg });
      console.warn("[VoiceAgent] WebRTC failed:", errMsg);

      // Try to tear down any stale session
      try { await conversation.endSession(); } catch (_) { /* noop */ }
    }

    // Fallback: WebSocket with signed URL
    if (signedUrl) {
      try {
        addDebugEvent("🔄 Falling back to WebSocket...");
        updateDebug({ transportPath: "websocket" });
        await startAndWaitForConnect({ signedUrl }, "WebSocket");
        addDebugEvent("✅ WebSocket connected (onConnect confirmed)");
        resetRetryState();
        return;
      } catch (wsErr) {
        const errMsg = wsErr instanceof Error ? wsErr.message : String(wsErr);
        addDebugEvent(`❌ WebSocket also failed: ${errMsg}`);
        updateDebug({ lastError: errMsg });
        // Try to tear down
        try { await conversation.endSession(); } catch (_) { /* noop */ }
      }
    }

    throw new Error("Both WebRTC and WebSocket connection attempts failed — onConnect never fired");
  }, [conversation, resetRetryState, addDebugEvent, updateDebug]);

  // Pre-warm: fetch token in background
  const preWarmToken = useCallback(() => {
    if (cachedTokenRef.current && Date.now() - cachedTokenRef.current.fetchedAt < TOKEN_TTL_MS) {
      return;
    }
    addDebugEvent("🔥 Pre-warming token...");
    supabase.functions.invoke("elevenlabs-agent-token", { body: {} })
      .then(({ data, error }) => {
        if (!error && data?.token) {
          cachedTokenRef.current = { token: data.token, signedUrl: data.signed_url, fetchedAt: Date.now() };
          addDebugEvent("✅ Token pre-warmed");
        } else {
          addDebugEvent(`❌ Token pre-warm failed: ${data?.error || error?.message}`);
          cachedTokenRef.current = null;
        }
      })
      .catch((err) => {
        addDebugEvent(`❌ Token pre-warm exception: ${err}`);
        cachedTokenRef.current = null;
      });
  }, [addDebugEvent]);

  const startConversation = useCallback(async (context?: AgentContext) => {
    if (isConnecting || conversation.status === "connected") return;

    // Reset debug state for new attempt
    setDebugState({ ...initialDebugState, timeline: [] });
    setIsConnecting(true);
    setRetryAttempt(0);
    pendingContextRef.current = context;
    addDebugEvent("🎙️ Starting voice connection...");

    try {
      if (context) {
        contextRef.current = { ...contextRef.current, ...context };
      }

      // Mic permission
      updateDebug({ micPermission: "requesting" });
      addDebugEvent("🎤 Requesting microphone permission...");

      const needsToken = !cachedTokenRef.current || Date.now() - cachedTokenRef.current.fetchedAt > TOKEN_TTL_MS;
      if (needsToken) updateDebug({ tokenFetch: "pending" });

      const [micResult, tokenFetchResult] = await Promise.allSettled([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        needsToken
          ? supabase.functions.invoke("elevenlabs-agent-token", { body: {} })
          : Promise.resolve(null),
      ]);

      // Check mic permission
      if (micResult.status === "rejected") {
        const reason = (micResult.reason as Error).name === "NotAllowedError" 
          ? "microphone_denied" 
          : "microphone_unavailable";
        addDebugEvent(`❌ Mic ${reason}: ${micResult.reason}`);
        updateDebug({ micPermission: "denied", lastError: `Microphone: ${reason}` });
        handleFailure({ reason, error: micResult.reason });
        setIsConnecting(false);
        return;
      }

      updateDebug({ micPermission: "granted" });
      addDebugEvent("✅ Microphone permission granted");

      // Resume AudioContext on mobile
      const micStream = micResult.value;
      try {
        const audioCtx = new AudioContext();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
          addDebugEvent("✅ AudioContext resumed for mobile");
        }
        audioCtx.close();
      } catch (_) { /* best-effort */ }
      micStream.getTracks().forEach(t => t.stop());

      // Get conversation token
      let token: string | null = null;
      let signedUrl: string | undefined = undefined;
      
      if (!needsToken && cachedTokenRef.current?.token) {
        token = cachedTokenRef.current.token;
        signedUrl = cachedTokenRef.current.signedUrl;
        updateDebug({ tokenFetch: "success" });
        addDebugEvent("✅ Using pre-warmed token");
      } else if (tokenFetchResult.status === "fulfilled" && tokenFetchResult.value?.data?.token) {
        token = tokenFetchResult.value.data.token;
        signedUrl = tokenFetchResult.value.data.signed_url;
        updateDebug({ tokenFetch: "success" });
        addDebugEvent("✅ Got fresh conversation token");
      } else {
        const errorData = tokenFetchResult.status === "fulfilled" 
          ? tokenFetchResult.value?.data 
          : null;
        const errorMsg = errorData?.error || "Could not authenticate with voice service";
        addDebugEvent(`❌ Token fetch failed: ${errorMsg}`);
        updateDebug({ tokenFetch: "failed", lastError: errorMsg });
        
        toast.error("Voice Service Unavailable", {
          description: errorMsg,
          duration: 6000,
        });
        setIsConnecting(false);
        setVoiceUnavailable(true);
        return;
      }
      cachedTokenRef.current = null;

      // Build dynamic variables
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

      // Attempt connection with retry — now waits for onConnect
      addDebugEvent("📡 Attempting connection with retry...");
      const { success, error } = await withRetry(
        () => attemptConnection(token!, signedUrl, dynamicVariables),
        "ElevenLabs connection",
        (attempt) => {
          setRetryAttempt(attempt);
          addDebugEvent(`🔄 Connection attempt ${attempt}/${MAX_RETRIES}`);
          if (attempt > 1) {
            toast.loading(`Reconnecting... (attempt ${attempt}/${MAX_RETRIES})`, { id: "voice-retry" });
          }
        }
      );

      if (success) {
        addDebugEvent("🎉 Voice connection fully established!");
        // Only create DB conversation AFTER confirmed connection
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
                addDebugEvent(`📝 DB conversation created: ${newConversation.id.substring(0, 8)}`);
              }
            });
        }
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        addDebugEvent(`❌ Connection failed after all retries: ${errMsg}`);
        updateDebug({ lastError: errMsg });
        toast.dismiss("voice-retry");
        toast.error("Unable to connect to Foreman AI", {
          description: "Both WebRTC and WebSocket paths failed. Please try again later or use text chat.",
        });
        setVoiceUnavailable(true);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addDebugEvent(`❌ Unexpected error: ${errMsg}`);
      updateDebug({ lastError: errMsg });
      
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
  }, [conversation, isConnecting, handleFailure, getFailureReason, withRetry, attemptConnection, MAX_RETRIES, addDebugEvent, updateDebug]);

  const stopConversation = useCallback(async () => {
    try {
      addDebugEvent("🛑 Ending session...");
      await conversation.endSession();
    } catch (error) {
      console.error("[VoiceAgent] Error stopping conversation:", error);
    }
  }, [conversation, addDebugEvent]);

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

  // Cleanup on unmount
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
        debugState,
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

export function VoiceAgentProvider({ children }: { children: ReactNode }) {
  return (
    <ConversationProvider>
      <VoiceAgentProviderInner>{children}</VoiceAgentProviderInner>
    </ConversationProvider>
  );
}

export function useGlobalVoiceAgent() {
  const context = useContext(VoiceAgentContext);
  if (!context) {
    throw new Error("useGlobalVoiceAgent must be used within VoiceAgentProvider");
  }
  return context;
}
