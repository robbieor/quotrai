import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useVoiceFailureHandler } from "@/hooks/useVoiceFailureHandler";

const ELEVENLABS_AGENT_ID = "agent_2701kffwpjhvf4gvt2cxpsx6j3rb";
const TOAST_DEBOUNCE_MS = 10000;
const WEBRTC_CONNECT_TIMEOUT_MS = 8000;
const SESSION_TEARDOWN_DELAY_MS = 500; // Wait for SDK to clear internal lock

interface AgentContext {
  userId?: string;
  teamId?: string;
  userName?: string;
}

export type ConnectionPhase =
  | "idle"
  | "requesting_mic"
  | "fetching_token"
  | "dialing_webrtc"
  | "dialing_websocket"
  | "connected"
  | "failed";

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
  connectionPhase: ConnectionPhase;
  attemptCancelled: boolean;
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
  connectionPhase: "idle",
  attemptCancelled: false,
};

interface VoiceAgentContextType {
  status: "connected" | "disconnected";
  isSpeaking: boolean;
  isConnecting: boolean;
  connectionPhase: ConnectionPhase;
  currentConversationId: string | null;
  voiceUnavailable: boolean;
  retryAttempt: number;
  maxRetries: number;
  debugState: VoiceDebugState;
  startConversation: (context?: AgentContext) => Promise<void>;
  stopConversation: () => Promise<void>;
  cancelConnection: () => void;
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
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>("idle");
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

  // Attempt guard — bumped on cancel to invalidate stale callbacks
  const currentAttemptRef = useRef<number>(0);

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

  const conversationIdRef = useRef<string | null>(null);
  const { handleFailure, getFailureReason } = useVoiceFailureHandler();

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
      updateDebug({ sessionConnected: true, onConnectFired: true, connectionPhase: "connected" });
      setConnectionPhase("connected");
      debouncedToast('success', "Connected to Foreman AI", { duration: 2000 });

      if (onConnectResolveRef.current) {
        onConnectResolveRef.current();
        onConnectResolveRef.current = null;
        onConnectRejectRef.current = null;
      }

      try { conversation.sendUserActivity(); } catch (_) { /* noop */ }

      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      keepAliveRef.current = setInterval(() => {
        try { conversation.sendUserActivity(); } catch (_) { /* noop */ }
      }, 15_000);
    },
    onDisconnect: () => {
      console.log("[VoiceAgent] 🔌 Disconnected from Foreman AI");
      addDebugEvent("🔌 Disconnected");
      updateDebug({ sessionConnected: false, onConnectFired: false, connectionPhase: "idle" });
      setConnectionPhase("idle");
      debouncedToast('info', "Call ended", { duration: 2000 });
      conversationIdRef.current = null;
      setCurrentConversationId(null);

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
      if (message.type === "user_transcript" && message.user_transcription_event?.user_transcript) {
        const transcript = message.user_transcription_event.user_transcript;
        addDebugEvent(`🗣️ User transcript: "${transcript.substring(0, 60)}"`);
        updateDebug({ lastTranscript: transcript });
        saveMessage("user", transcript);
      }
      if (message.type === "agent_response" && message.agent_response_event?.agent_response) {
        const response = message.agent_response_event.agent_response;
        addDebugEvent(`🤖 Agent response: "${response.substring(0, 60)}"`);
        saveMessage("assistant", response);
      }
      if (message.type === "conversation_initiation_metadata") {
        addDebugEvent("📋 conversation_initiation_metadata received");
      }
    },
    onError: (error) => {
      console.error("[VoiceAgent] ❌ Error:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      addDebugEvent(`❌ SDK Error: ${errMsg}`);
      updateDebug({ lastError: errMsg });

      if (onConnectRejectRef.current) {
        onConnectRejectRef.current(error instanceof Error ? error : new Error(errMsg));
        onConnectResolveRef.current = null;
        onConnectRejectRef.current = null;
      }
    },
    clientTools: {
      // Summaries & Overview
      get_today_summary: async () => await callGeorgeWebhook("get_today_summary", {}, contextRef.current),
      get_week_ahead_summary: async () => await callGeorgeWebhook("get_week_ahead_summary", {}, contextRef.current),
      get_todays_jobs: async () => await callGeorgeWebhook("get_todays_jobs", {}, contextRef.current),
      get_upcoming_jobs: async (params: { days?: number }) => await callGeorgeWebhook("get_upcoming_jobs", params, contextRef.current),
      get_financial_summary: async (params: { period?: string }) => await callGeorgeWebhook("get_financial_summary", params, contextRef.current),

      // Jobs
      create_job: async (params: { customer_name: string; title: string; description?: string; scheduled_date?: string; scheduled_time?: string; estimated_value?: number }) =>
        await callGeorgeWebhook("create_job", params, contextRef.current),
      list_jobs: async (params: { status?: string; customer_name?: string; search?: string; date_from?: string; date_to?: string; limit?: number }) =>
        await callGeorgeWebhook("list_jobs", params, contextRef.current),
      reschedule_job: async (params: { job_title?: string; client_name?: string; new_date: string; new_time?: string }) =>
        await callGeorgeWebhook("reschedule_job", params, contextRef.current),
      update_job_status: async (params: { job_title: string; new_status: string }) =>
        await callGeorgeWebhook("update_job_status", params, contextRef.current),
      delete_job: async (params: { job_id?: string; job_title?: string; client_name?: string }) =>
        await callGeorgeWebhook("delete_job", params, contextRef.current),

      // Customers
      list_customers: async (params: { search?: string; limit?: number }) =>
        await callGeorgeWebhook("list_customers", params, contextRef.current),
      search_customer: async (params: { query: string }) =>
        await callGeorgeWebhook("search_customer", params, contextRef.current),
      get_client_info: async (params: { client_name: string }) =>
        await callGeorgeWebhook("get_client_info", params, contextRef.current),
      create_customer: async (params: { name: string; email?: string; phone?: string; address?: string; contact_person?: string; notes?: string }) =>
        await callGeorgeWebhook("create_customer", params, contextRef.current),
      update_customer: async (params: { customer_name?: string; customer_id?: string; name?: string; email?: string; phone?: string; address?: string; contact_person?: string; notes?: string }) =>
        await callGeorgeWebhook("update_customer", params, contextRef.current),
      delete_customer: async (params: { customer_name?: string; customer_id?: string }) =>
        await callGeorgeWebhook("delete_customer", params, contextRef.current),

      // Quotes
      create_quote: async (params: { customer_name: string; items: Array<{ description: string; quantity: number; unit_price: number }>; notes?: string; valid_days?: number; job_id?: string }) =>
        await callGeorgeWebhook("create_quote", params, contextRef.current),
      list_quotes: async (params: { status?: string; customer_name?: string; search?: string; limit?: number }) =>
        await callGeorgeWebhook("list_quotes", params, contextRef.current),
      get_pending_quotes: async () => await callGeorgeWebhook("get_pending_quotes", {}, contextRef.current),
      update_quote_status: async (params: { quote_id?: string; display_number?: string; new_status: string }) =>
        await callGeorgeWebhook("update_quote_status", params, contextRef.current),
      delete_quote: async (params: { quote_id?: string; display_number?: string }) =>
        await callGeorgeWebhook("delete_quote", params, contextRef.current),

      // Invoices
      create_invoice: async (params: { customer_name: string; items: Array<{ description: string; quantity: number; unit_price: number }>; notes?: string; due_days?: number; job_id?: string; tax_rate?: number }) =>
        await callGeorgeWebhook("create_invoice", params, contextRef.current),
      list_invoices: async (params: { status?: string; customer_name?: string; search?: string; limit?: number }) =>
        await callGeorgeWebhook("list_invoices", params, contextRef.current),
      get_outstanding_invoices: async () => await callGeorgeWebhook("get_outstanding_invoices", {}, contextRef.current),
      get_overdue_invoices: async () => await callGeorgeWebhook("get_overdue_invoices", {}, contextRef.current),
      update_invoice_status: async (params: { invoice_id?: string; display_number?: string; new_status: string }) =>
        await callGeorgeWebhook("update_invoice_status", params, contextRef.current),
      send_invoice_reminder: async (params: { display_number?: string; invoice_id?: string }) =>
        await callGeorgeWebhook("send_invoice_reminder", params, contextRef.current),
      delete_invoice: async (params: { invoice_id?: string; display_number?: string }) =>
        await callGeorgeWebhook("delete_invoice", params, contextRef.current),

      // Expenses
      log_expense: async (params: { description: string; amount: number; category?: string; vendor?: string; job_title?: string }) =>
        await callGeorgeWebhook("log_expense", params, contextRef.current),
      list_expenses: async (params: { category?: string; vendor?: string; job_id?: string; date_from?: string; date_to?: string; limit?: number }) =>
        await callGeorgeWebhook("list_expenses", params, contextRef.current),
      delete_expense: async (params: { expense_id?: string; vendor?: string; amount?: number }) =>
        await callGeorgeWebhook("delete_expense", params, contextRef.current),

      // Templates
      get_templates: async (params?: { category?: string; search?: string }) =>
        await callGeorgeWebhook("get_templates", params || {}, contextRef.current),
      use_template_for_quote: async (params: { template_name?: string; template_id?: string; customer_name: string; notes?: string; quantity_overrides?: Record<string, number>; job_id?: string; job_title?: string; create_job?: boolean; scheduled_date?: string; scheduled_time?: string }) =>
        await callGeorgeWebhook("use_template_for_quote", params, contextRef.current),
      create_invoice_from_template: async (params: { template_name?: string; template_id?: string; customer_name: string; notes?: string; due_days?: number; quantity_overrides?: Record<string, number>; job_id?: string; job_title?: string; create_job?: boolean; scheduled_date?: string; scheduled_time?: string }) =>
        await callGeorgeWebhook("create_invoice_from_template", params, contextRef.current),
      suggest_template: async (params: { job_description: string }) =>
        await callGeorgeWebhook("suggest_template", params, contextRef.current),

      // Additional
      create_invoice_from_quote: async (params: { quote_id?: string; display_number?: string; due_days?: number }) =>
        await callGeorgeWebhook("create_invoice_from_quote", params, contextRef.current),
      get_jobs_for_date: async (params: { date: string }) =>
        await callGeorgeWebhook("get_jobs_for_date", params, contextRef.current),
      check_availability: async (params: { date: string; preferred_time?: string }) =>
        await callGeorgeWebhook("check_availability", params, contextRef.current),
      get_week_schedule: async (params: { start_date?: string }) =>
        await callGeorgeWebhook("get_week_schedule", params, contextRef.current),
      get_monthly_summary: async (params: { month?: number; year?: number }) =>
        await callGeorgeWebhook("get_monthly_summary", params, contextRef.current),
      get_outstanding_balance: async (params: { customer_name?: string }) =>
        await callGeorgeWebhook("get_outstanding_balance", params, contextRef.current),
      record_payment: async (params: { display_number?: string; invoice_id?: string; amount: number; payment_method?: string; notes?: string }) =>
        await callGeorgeWebhook("record_payment", params, contextRef.current),
      get_payment_history: async (params: { display_number?: string; invoice_id?: string; customer_name?: string; limit?: number }) =>
        await callGeorgeWebhook("get_payment_history", params, contextRef.current),
      get_template_details: async (params: { template_name?: string; template_id?: string }) =>
        await callGeorgeWebhook("get_template_details", params, contextRef.current),
      search_templates: async (params: { query: string; category?: string }) =>
        await callGeorgeWebhook("search_templates", params, contextRef.current),
      list_template_categories: async () =>
        await callGeorgeWebhook("list_template_categories", {}, contextRef.current),
    },
  });

  /**
   * Start a single session attempt and wait for onConnect with timeout.
   * Returns only when onConnect fires OR throws on timeout/error.
   */
  const startAndWaitForConnect = useCallback((
    sessionOpts: Record<string, unknown>,
    dynamicVariables: Record<string, string>,
    label: string
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (onConnectResolveRef.current === wrappedResolve) {
          onConnectResolveRef.current = null;
          onConnectRejectRef.current = null;
          reject(new Error(`${label} timed out (${WEBRTC_CONNECT_TIMEOUT_MS}ms)`));
        }
      }, WEBRTC_CONNECT_TIMEOUT_MS);

      const wrappedResolve = () => { clearTimeout(timeout); resolve(); };
      const wrappedReject = (err: Error) => { clearTimeout(timeout); reject(err); };

      onConnectResolveRef.current = wrappedResolve;
      onConnectRejectRef.current = wrappedReject;

      try {
        conversation.startSession({ ...sessionOpts, dynamicVariables });
      } catch (err: unknown) {
        clearTimeout(timeout);
        onConnectResolveRef.current = null;
        onConnectRejectRef.current = null;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }, [conversation]);

  // Pre-warm: fetch token in background
  const preWarmToken = useCallback(() => {
    if (cachedTokenRef.current && Date.now() - cachedTokenRef.current.fetchedAt < TOKEN_TTL_MS) return;
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

  /**
   * Cancel an in-progress connection attempt.
   * Bumps attemptId so any async callbacks from the old attempt are ignored.
   */
  const cancelConnection = useCallback(() => {
    currentAttemptRef.current++;
    addDebugEvent("🚫 Connection cancelled by user");
    updateDebug({ connectionPhase: "idle", attemptCancelled: true });
    setConnectionPhase("idle");
    setRetryAttempt(0);
    toast.dismiss("voice-retry");

    // Clear pending onConnect promises
    if (onConnectRejectRef.current) {
      onConnectRejectRef.current(new Error("Cancelled by user"));
      onConnectResolveRef.current = null;
      onConnectRejectRef.current = null;
    }

    // Best-effort teardown
    try { conversation.endSession(); } catch (_) { /* noop */ }
  }, [conversation, addDebugEvent, updateDebug]);

  const startConversation = useCallback(async (context?: AgentContext) => {
    if (connectionPhase !== "idle" && connectionPhase !== "failed") return;

    const attemptId = ++currentAttemptRef.current;
    const isStale = () => currentAttemptRef.current !== attemptId;

    // Reset
    setDebugState({ ...initialDebugState, timeline: [] });
    setConnectionPhase("requesting_mic");
    updateDebug({ connectionPhase: "requesting_mic", attemptCancelled: false });
    setRetryAttempt(0);
    setVoiceUnavailable(false);
    addDebugEvent("🎙️ Starting voice connection...");

    if (context) contextRef.current = { ...contextRef.current, ...context };

    try {
      // 1. Mic permission
      addDebugEvent("🎤 Requesting microphone...");
      updateDebug({ micPermission: "requesting" });

      let micStream: MediaStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        if (isStale()) return;
        const reason = (micErr as Error).name === "NotAllowedError" ? "microphone_denied" : "microphone_unavailable";
        addDebugEvent(`❌ Mic ${reason}`);
        updateDebug({ micPermission: "denied", lastError: `Microphone: ${reason}`, connectionPhase: "failed" });
        setConnectionPhase("failed");
        handleFailure({ reason, error: micErr });
        return;
      }

      if (isStale()) { micStream.getTracks().forEach(t => t.stop()); return; }

      updateDebug({ micPermission: "granted" });
      addDebugEvent("✅ Microphone granted");

      // Resume AudioContext on mobile
      try {
        const audioCtx = new AudioContext();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        audioCtx.close();
      } catch (_) { /* best-effort */ }
      micStream.getTracks().forEach(t => t.stop());

      // 2. Fetch token
      if (isStale()) return;
      setConnectionPhase("fetching_token");
      updateDebug({ connectionPhase: "fetching_token", tokenFetch: "pending" });
      addDebugEvent("🔑 Fetching token...");

      let token: string;
      let signedUrl: string | undefined;

      if (cachedTokenRef.current && Date.now() - cachedTokenRef.current.fetchedAt < TOKEN_TTL_MS) {
        token = cachedTokenRef.current.token;
        signedUrl = cachedTokenRef.current.signedUrl;
        updateDebug({ tokenFetch: "success" });
        addDebugEvent("✅ Using pre-warmed token");
      } else {
        const { data, error } = await supabase.functions.invoke("elevenlabs-agent-token", { body: {} });
        if (isStale()) return;

        if (error || !data?.token) {
          const errorMsg = data?.error || error?.message || "Token fetch failed";
          addDebugEvent(`❌ Token failed: ${errorMsg}`);
          updateDebug({ tokenFetch: "failed", lastError: errorMsg, connectionPhase: "failed" });
          setConnectionPhase("failed");
          toast.error("Voice Service Unavailable", { description: errorMsg, duration: 6000 });
          setVoiceUnavailable(true);
          return;
        }

        token = data.token;
        signedUrl = data.signed_url;
        updateDebug({ tokenFetch: "success" });
        addDebugEvent("✅ Token received");
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
      dynamicVariables.current_datetime = now.toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

      // 3. WebRTC attempt
      if (isStale()) return;
      setConnectionPhase("dialing_webrtc");
      updateDebug({ connectionPhase: "dialing_webrtc", transportPath: "webrtc" });
      setRetryAttempt(1);
      addDebugEvent("🚀 Trying WebRTC...");

      try {
        await startAndWaitForConnect({ conversationToken: token }, dynamicVariables, "WebRTC");
        if (isStale()) return;
        addDebugEvent("✅ WebRTC connected!");

        // Create DB conversation
        const userId = contextRef.current.userId;
        const teamId2 = contextRef.current.teamId;
        if (teamId2 && userId) {
          supabase.from("george_conversations")
            .insert({ team_id: teamId2, user_id: userId, title: `Voice call - ${new Date().toLocaleString()}` })
            .select().single()
            .then(({ data: conv }) => {
              if (conv) { conversationIdRef.current = conv.id; setCurrentConversationId(conv.id); }
            });
        }
        return; // SUCCESS
      } catch (webrtcErr) {
        if (isStale()) return;
        const errMsg = webrtcErr instanceof Error ? webrtcErr.message : String(webrtcErr);
        addDebugEvent(`⚠️ WebRTC failed: ${errMsg}`);
        updateDebug({ lastError: errMsg });
      }

      // 4. Teardown stale session and wait for SDK lock to clear
      addDebugEvent("🔄 Tearing down before fallback...");
      try { await conversation.endSession(); } catch (_) { /* noop */ }
      await new Promise(r => setTimeout(r, SESSION_TEARDOWN_DELAY_MS));

      // 5. WebSocket fallback
      if (isStale()) return;
      if (!signedUrl) {
        addDebugEvent("❌ No signed URL for WebSocket fallback");
        updateDebug({ connectionPhase: "failed", lastError: "No WebSocket fallback available" });
        setConnectionPhase("failed");
        toast.error("Unable to connect to Foreman AI", { description: "WebRTC failed and no fallback available." });
        setVoiceUnavailable(true);
        return;
      }

      setConnectionPhase("dialing_websocket");
      updateDebug({ connectionPhase: "dialing_websocket", transportPath: "websocket" });
      setRetryAttempt(2);
      addDebugEvent("🔄 Trying WebSocket fallback...");

      try {
        await startAndWaitForConnect({ signedUrl }, dynamicVariables, "WebSocket");
        if (isStale()) return;
        addDebugEvent("✅ WebSocket connected!");

        const userId = contextRef.current.userId;
        const teamId2 = contextRef.current.teamId;
        if (teamId2 && userId) {
          supabase.from("george_conversations")
            .insert({ team_id: teamId2, user_id: userId, title: `Voice call - ${new Date().toLocaleString()}` })
            .select().single()
            .then(({ data: conv }) => {
              if (conv) { conversationIdRef.current = conv.id; setCurrentConversationId(conv.id); }
            });
        }
        return; // SUCCESS
      } catch (wsErr) {
        if (isStale()) return;
        const errMsg = wsErr instanceof Error ? wsErr.message : String(wsErr);
        addDebugEvent(`❌ WebSocket also failed: ${errMsg}`);
        updateDebug({ lastError: errMsg });
        try { await conversation.endSession(); } catch (_) { /* noop */ }
      }

      // Both failed
      if (isStale()) return;
      setConnectionPhase("failed");
      updateDebug({ connectionPhase: "failed" });
      toast.error("Unable to connect to Foreman AI", {
        description: "Both WebRTC and WebSocket failed. Please try again or use text chat.",
      });
      setVoiceUnavailable(true);

    } catch (error: unknown) {
      if (isStale()) return;
      const errMsg = error instanceof Error ? error.message : String(error);
      addDebugEvent(`❌ Unexpected error: ${errMsg}`);
      updateDebug({ lastError: errMsg, connectionPhase: "failed" });
      setConnectionPhase("failed");
      const reason = getFailureReason(error);
      handleFailure({ reason, error });
      setVoiceUnavailable(true);
    } finally {
      if (!isStale()) {
        setRetryAttempt(0);
        toast.dismiss("voice-retry");
      }
    }
  }, [connectionPhase, conversation, handleFailure, getFailureReason, startAndWaitForConnect, addDebugEvent, updateDebug]);

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

  const callWebhook = useCallback(async (functionName: string, parameters: Record<string, unknown> = {}) => {
    return callGeorgeWebhook(functionName, parameters, contextRef.current);
  }, [callGeorgeWebhook]);

  const setContext = useCallback((context: AgentContext) => {
    contextRef.current = context;
  }, []);

  const resetVoiceAvailability = useCallback(() => {
    setVoiceUnavailable(false);
    setConnectionPhase("idle");
  }, []);

  useEffect(() => {
    return () => { if (keepAliveRef.current) clearInterval(keepAliveRef.current); };
  }, []);

  const isConnecting = connectionPhase === "requesting_mic" || connectionPhase === "fetching_token" || connectionPhase === "dialing_webrtc" || connectionPhase === "dialing_websocket";

  return (
    <VoiceAgentContext.Provider
      value={{
        status: conversation.status as "connected" | "disconnected",
        isSpeaking: conversation.isSpeaking,
        isConnecting,
        connectionPhase,
        currentConversationId,
        voiceUnavailable,
        retryAttempt,
        maxRetries: 2,
        debugState,
        startConversation,
        stopConversation,
        cancelConnection,
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
