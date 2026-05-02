import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { VoiceConversation } from "@elevenlabs/client";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useVoiceFailureHandler } from "@/hooks/useVoiceFailureHandler";
import {
  AGENT_ROUTES,
  AGENT_RECORDS,
  AGENT_SECTIONS,
  isRoute,
  isRecord,
  isSection,
} from "@/lib/agentRegistry";
import {
  emitAgentNavigate,
  emitAgentScroll,
  emitAgentHighlight,
  emitAgentProgress,
} from "@/lib/agentEvents";

interface AgentContext {
  userId?: string;
  teamId?: string;
  userName?: string;
}

type ConnectionStatus = "connected" | "connecting" | "disconnecting" | "disconnected" | "error";

export type ConnectionPhase =
  | "idle"
  | "requesting_mic"
  | "fetching_token"
  | "dialing_webrtc"
  | "dialing_websocket"
  | "connected"
  | "failed";

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
  status: ConnectionStatus;
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

const TOAST_DEBOUNCE_MS = 10000;
const CONNECT_TIMEOUT_MS = 8000;
const TOKEN_TTL_MS = 30_000;
const SESSION_TEARDOWN_DELAY_MS = 500;

const stopMicStream = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
};

// iOS/Android keep audio session + screen alive for the duration of a call.
// On mobile Safari, opening + closing an AudioContext briefly does NOT keep the
// audio session active long enough for the WS handshake — we need a persistent
// silent oscillator running through the call to prevent the browser from
// dropping the WebSocket immediately after onConnect.
type CallAudioKeepAlive = {
  ctx: AudioContext;
  osc: OscillatorNode;
  gain: GainNode;
};

const startCallAudioKeepAlive = async (): Promise<CallAudioKeepAlive | null> => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    const ctx: AudioContext = new Ctx();
    if (ctx.state === "suspended") await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0; // fully silent
    osc.frequency.value = 440;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    return { ctx, osc, gain };
  } catch {
    return null;
  }
};

const stopCallAudioKeepAlive = (ka: CallAudioKeepAlive | null) => {
  if (!ka) return;
  try { ka.osc.stop(); } catch { /* noop */ }
  try { ka.osc.disconnect(); } catch { /* noop */ }
  try { ka.gain.disconnect(); } catch { /* noop */ }
  try { void ka.ctx.close(); } catch { /* noop */ }
};

const acquireWakeLock = async (): Promise<any | null> => {
  try {
    const wl = (navigator as any).wakeLock;
    if (wl?.request) return await wl.request("screen");
  } catch {
    // noop — feature unsupported or denied
  }
  return null;
};

const releaseWakeLock = async (sentinel: any | null) => {
  try { await sentinel?.release?.(); } catch { /* noop */ }
};

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
  create_enquiry: [["leads"]],
  get_enquiries: [["leads"]],
  update_enquiry: [["leads"]],
  delete_enquiry: [["leads"]],
  convert_enquiry_to_quote: [["leads"], ["quotes"], ["customers"]],
  convert_enquiry_to_job: [["leads"], ["jobs"], ["customers"]],
  send_invoice_reminder: [["invoices"]],
  record_payment: [["payments"], ["invoices"], ["dashboard"]],
  create_invoice_from_quote: [["invoices"], ["quotes"], ["dashboard"]],
};

function VoiceAgentProviderInner({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>("idle");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [debugState, setDebugState] = useState<VoiceDebugState>(initialDebugState);

  const queryClient = useQueryClient();
  const { handleFailure, getFailureReason } = useVoiceFailureHandler();

  const contextRef = useRef<AgentContext>({});
  const phaseRef = useRef<ConnectionPhase>("idle");
  const conversationRef = useRef<VoiceConversation | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastToastRef = useRef<number>(0);
  const currentAttemptRef = useRef(0);
  const cachedTokenRef = useRef<{ token: string; signedUrl?: string; fetchedAt: number } | null>(null);
  const onConnectResolveRef = useRef<(() => void) | null>(null);
  const onConnectRejectRef = useRef<((err: Error) => void) | null>(null);
  const callStartRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const callAudioRef = useRef<CallAudioKeepAlive | null>(null);
  const wakeLockRef = useRef<any | null>(null);

  const addDebugEvent = useCallback((event: string) => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    console.log(`[VoiceDebug] ${event}`);
    setDebugState((prev) => ({
      ...prev,
      timeline: [...prev.timeline.slice(-29), { time, event }],
    }));
  }, []);

  const updateDebug = useCallback((partial: Partial<VoiceDebugState>) => {
    setDebugState((prev) => ({ ...prev, ...partial }));
  }, []);

  const setPhase = useCallback((phase: ConnectionPhase) => {
    phaseRef.current = phase;
    setConnectionPhase(phase);
    updateDebug({ connectionPhase: phase });
  }, [updateDebug]);

  const debouncedToast = useCallback((type: "success" | "info", message: string, opts?: any) => {
    const now = Date.now();
    if (now - lastToastRef.current < TOAST_DEBOUNCE_MS) return;
    lastToastRef.current = now;
    if (type === "success") toast.success(message, opts);
    else toast.info(message, opts);
  }, []);

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
        addDebugEvent(`❌ Webhook error: ${error.message}`);
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

  const createConversationRecord = useCallback(async () => {
    const userId = contextRef.current.userId;
    const teamId = contextRef.current.teamId;
    if (!userId || !teamId) return;

    const { data } = await supabase
      .from("george_conversations")
      .insert({
        team_id: teamId,
        user_id: userId,
        title: `Voice call - ${new Date().toLocaleString()}`,
      })
      .select()
      .single();

    if (data) {
      conversationIdRef.current = data.id;
      setCurrentConversationId(data.id);
      addDebugEvent(`📝 DB conversation created: ${data.id.substring(0, 8)}`);
    }
  }, [addDebugEvent]);

  const handleConnectedCleanup = useCallback(() => {
    callStartRef.current = Date.now();
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    keepAliveRef.current = setInterval(() => {
      try {
        conversationRef.current?.sendUserActivity();
      } catch {
        // noop
      }
    }, 15_000);
  }, []);

  const clientTools = {
    // ===== REGISTRY-DRIVEN SCREEN CONTROL (controlled vocabulary) =====
    navigate_to: (params: { route: string; reason?: string }) => {
      if (!params || !isRoute(params.route)) {
        return `Unknown route: ${params?.route}. Allowed: ${Object.keys(AGENT_ROUTES).join(", ")}`;
      }
      const { path, label } = AGENT_ROUTES[params.route];
      emitAgentNavigate(path, params.reason ?? `Opening ${label}`);
      return `Navigated to ${label}`;
    },
    open_record: (params: { type: string; id: string; reason?: string }) => {
      if (!params || !isRecord(params.type)) {
        return `Unknown record type: ${params?.type}. Allowed: ${Object.keys(AGENT_RECORDS).join(", ")}`;
      }
      if (!params.id) return "Missing record id";
      const path = AGENT_RECORDS[params.type](params.id);
      emitAgentNavigate(path, params.reason ?? `Opening ${params.type} ${params.id}`);
      return `Opened ${params.type} ${params.id}`;
    },
    scroll_to: (params: { section: string }) => {
      if (!params || !isSection(params.section)) {
        return `Unknown section: ${params?.section}. Allowed: ${Object.keys(AGENT_SECTIONS).join(", ")}`;
      }
      emitAgentScroll(params.section);
      return `Scrolled to ${AGENT_SECTIONS[params.section]}`;
    },
    highlight_element: (params: { section: string; label?: string }) => {
      if (!params || !isSection(params.section)) {
        return `Unknown section: ${params?.section}. Allowed: ${Object.keys(AGENT_SECTIONS).join(", ")}`;
      }
      emitAgentHighlight(params.section, params.label ?? AGENT_SECTIONS[params.section]);
      return `Highlighted ${AGENT_SECTIONS[params.section]}`;
    },
    report_progress: (params: { message: string; status?: "running" | "done" | "error" }) => {
      if (!params?.message) return "Missing message";
      emitAgentProgress(params.message, params.status ?? "running");
      return "Progress reported";
    },

    // ===== LEGACY SCREEN CONTROL (kept for backwards compatibility) =====
    show_progress_toast: (params: { message: string; intent?: string; complete?: boolean }) => {
      window.dispatchEvent(new CustomEvent("george:progress", { detail: params }));
      return "ok";
    },
    navigate_to_screen: (params: { route: string }) => {
      if (typeof params?.route === "string" && params.route.startsWith("/")) {
        window.dispatchEvent(new CustomEvent("george:navigate", { detail: { route: params.route } }));
        return `Navigating to ${params.route}`;
      }
      return "Invalid route";
    },
    highlight_record: (params: { record_type: string; record_id: string }) => {
      window.dispatchEvent(new CustomEvent("george:highlight", { detail: params }));
      return "Highlighted";
    },

    // ===== DATA TOOLS =====
    get_today_summary: async () => await callGeorgeWebhook("get_today_summary", {}, contextRef.current),
    get_week_ahead_summary: async () => await callGeorgeWebhook("get_week_ahead_summary", {}, contextRef.current),
    get_todays_jobs: async () => await callGeorgeWebhook("get_todays_jobs", {}, contextRef.current),
    get_upcoming_jobs: async (params: { days?: number }) => await callGeorgeWebhook("get_upcoming_jobs", params, contextRef.current),
    get_financial_summary: async (params: { period?: string }) => await callGeorgeWebhook("get_financial_summary", params, contextRef.current),

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

    create_quote: async (params: { customer_name: string; items: Array<{ description: string; quantity: number; unit_price: number }>; notes?: string; valid_days?: number; job_id?: string }) =>
      await callGeorgeWebhook("create_quote", params, contextRef.current),
    list_quotes: async (params: { status?: string; customer_name?: string; search?: string; limit?: number }) =>
      await callGeorgeWebhook("list_quotes", params, contextRef.current),
    get_pending_quotes: async () => await callGeorgeWebhook("get_pending_quotes", {}, contextRef.current),
    update_quote_status: async (params: { quote_id?: string; display_number?: string; new_status: string }) =>
      await callGeorgeWebhook("update_quote_status", params, contextRef.current),
    delete_quote: async (params: { quote_id?: string; display_number?: string }) =>
      await callGeorgeWebhook("delete_quote", params, contextRef.current),

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

    log_expense: async (params: { description: string; amount: number; category?: string; vendor?: string; job_title?: string }) =>
      await callGeorgeWebhook("log_expense", params, contextRef.current),
    list_expenses: async (params: { category?: string; vendor?: string; job_id?: string; date_from?: string; date_to?: string; limit?: number }) =>
      await callGeorgeWebhook("list_expenses", params, contextRef.current),
    delete_expense: async (params: { expense_id?: string; vendor?: string; amount?: number }) =>
      await callGeorgeWebhook("delete_expense", params, contextRef.current),

    get_templates: async (params?: { category?: string; search?: string }) =>
      await callGeorgeWebhook("get_templates", params || {}, contextRef.current),
    use_template_for_quote: async (params: { template_name?: string; template_id?: string; customer_name: string; notes?: string; quantity_overrides?: Record<string, number>; job_id?: string; job_title?: string; create_job?: boolean; scheduled_date?: string; scheduled_time?: string }) =>
      await callGeorgeWebhook("use_template_for_quote", params, contextRef.current),
    create_invoice_from_template: async (params: { template_name?: string; template_id?: string; customer_name: string; notes?: string; due_days?: number; quantity_overrides?: Record<string, number>; job_id?: string; job_title?: string; create_job?: boolean; scheduled_date?: string; scheduled_time?: string }) =>
      await callGeorgeWebhook("create_invoice_from_template", params, contextRef.current),
    suggest_template: async (params: { job_description: string }) =>
      await callGeorgeWebhook("suggest_template", params, contextRef.current),

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

    // --- Enquiry tools ---
    create_enquiry: async (params: { name: string; phone?: string; email?: string; description?: string; address?: string; source?: string; priority?: string; estimated_value?: number; job_type?: string; notes?: string; follow_up_date?: string }) =>
      await callGeorgeWebhook("create_enquiry", params, contextRef.current),
    get_enquiries: async (params: { status?: string; limit?: number }) =>
      await callGeorgeWebhook("get_enquiries", params, contextRef.current),
    update_enquiry: async (params: { enquiry_id?: string; enquiry_name?: string; status?: string; priority?: string; description?: string; notes?: string; follow_up_date?: string; estimated_value?: number }) =>
      await callGeorgeWebhook("update_enquiry", params, contextRef.current),
    delete_enquiry: async (params: { enquiry_id?: string; enquiry_name?: string }) =>
      await callGeorgeWebhook("delete_enquiry", params, contextRef.current),
    convert_enquiry_to_quote: async (params: { enquiry_id?: string; enquiry_name?: string }) =>
      await callGeorgeWebhook("convert_enquiry_to_quote", params, contextRef.current),
    convert_enquiry_to_job: async (params: { enquiry_id?: string; enquiry_name?: string; scheduled_date?: string; scheduled_time?: string }) =>
      await callGeorgeWebhook("convert_enquiry_to_job", params, contextRef.current),
  };

  const startAndWaitForConnect = useCallback(async (
    sessionOpts: Record<string, unknown>,
    dynamicVariables: Record<string, string>,
    label: string,
    attemptId: number
  ) => {
    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const finishResolve = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        onConnectResolveRef.current = null;
        onConnectRejectRef.current = null;
        resolve();
      };

      const finishReject = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        onConnectResolveRef.current = null;
        onConnectRejectRef.current = null;
        reject(error);
      };

      const timeout = setTimeout(() => {
        finishReject(new Error(`${label} timed out waiting for onConnect (${CONNECT_TIMEOUT_MS}ms)`));
      }, CONNECT_TIMEOUT_MS);

      onConnectResolveRef.current = finishResolve;
      onConnectRejectRef.current = finishReject;

      void (async () => {
        try {
          const greetingName = contextRef.current.userName?.split(" ")[0];
          const firstMessage = greetingName
            ? `Howya ${greetingName}, George here. What can I sort for ya?`
            : "Howya, George here. What can I sort for ya?";
          const conv = await VoiceConversation.startSession({
            ...(sessionOpts as any),
            dynamicVariables,
            clientTools,
            overrides: {
              agent: {
                firstMessage,
              },
            },
            ...(micStreamRef.current ? { mediaStream: micStreamRef.current } : {}),
            connectionType: ("signedUrl" in sessionOpts ? "websocket" : "webrtc") as "webrtc" | "websocket",
            onConnect: () => {
              if (currentAttemptRef.current !== attemptId) return;
              addDebugEvent("✅ onConnect fired — session truly connected");
              updateDebug({ sessionConnected: true, onConnectFired: true });
              setStatus("connected");
              setPhase("connected");
              debouncedToast("success", "Connected to Foreman AI", { duration: 2000 });
              handleConnectedCleanup();
              finishResolve();
            },
            onDisconnect: (details?: unknown) => {
              if (currentAttemptRef.current !== attemptId && phaseRef.current !== "connected") return;
              const detailText = details ? `: ${JSON.stringify(details).substring(0, 160)}` : "";
              addDebugEvent(`🔌 Disconnected${detailText}`);

              // Extract a human-friendly reason from the SDK details payload
              // e.g. { reason: "error", message: "...payment issue...", closeCode: 1002 }
              const d = (details as any) || {};
              const reasonMsg: string =
                d.message || d.reason || (typeof details === "string" ? details : "") || "Connection closed";
              const closeCode = d.closeCode ? ` (code ${d.closeCode})` : "";

              // If we dropped before ever fully connecting, that's a connection
              // failure — surface it to the user instead of silently dying.
              const wasConnecting = phaseRef.current !== "connected";

              updateDebug({
                sessionConnected: false,
                onConnectFired: false,
                lastError: details ? `Disconnected: ${JSON.stringify(details).substring(0, 240)}` : "",
              });
              setStatus("disconnected");
              setIsSpeaking(false);
              if (phaseRef.current === "connected") setPhase("idle");
              conversationRef.current = null;
              conversationIdRef.current = null;
              setCurrentConversationId(null);
              if (keepAliveRef.current) {
                clearInterval(keepAliveRef.current);
                keepAliveRef.current = null;
              }

              // Tear down the silent audio keep-alive + wake lock on every disconnect
              stopCallAudioKeepAlive(callAudioRef.current);
              callAudioRef.current = null;
              void releaseWakeLock(wakeLockRef.current);
              wakeLockRef.current = null;

              // Always invalidate the cached token so the next attempt mints a
              // fresh one (prevents a token issued under a previously-blocked
              // billing state from being reused).
              cachedTokenRef.current = null;

              if (wasConnecting) {
                setPhase("failed");
                toast.error("Voice disconnected", {
                  description: `${reasonMsg}${closeCode}`.slice(0, 200),
                  duration: 7000,
                });
                // Reject the pending connect promise so the outer flow knows
                if (onConnectRejectRef.current) {
                  onConnectRejectRef.current(new Error(`${reasonMsg}${closeCode}`));
                  onConnectResolveRef.current = null;
                  onConnectRejectRef.current = null;
                }
              }
            },
            onError: (message, context) => {
              if (currentAttemptRef.current !== attemptId) return;
              const errMsg = context ? `${message}: ${JSON.stringify(context)}` : message;
              addDebugEvent(`❌ SDK Error: ${errMsg}`);
              updateDebug({ lastError: errMsg });
              setStatus("error");
              finishReject(new Error(errMsg));
            },
            onModeChange: ({ mode }) => {
              if (currentAttemptRef.current !== attemptId) return;
              setIsSpeaking(mode === "speaking");
            },
            onStatusChange: ({ status: sdkStatus }) => {
              if (currentAttemptRef.current !== attemptId) return;
              setStatus(sdkStatus as ConnectionStatus);
            },
            onMessage: (message: any) => {
              if (currentAttemptRef.current !== attemptId) return;
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
          });

          if (currentAttemptRef.current !== attemptId) {
            await conv.endSession();
            return;
          }

          conversationRef.current = conv;
        } catch (error) {
          finishReject(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    });
  }, [addDebugEvent, clientTools, debouncedToast, handleConnectedCleanup, saveMessage, setPhase, updateDebug]);

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
        addDebugEvent(`❌ Token pre-warm exception: ${String(err)}`);
        cachedTokenRef.current = null;
      });
  }, [addDebugEvent]);

  const cancelConnection = useCallback(() => {
    currentAttemptRef.current++;
    addDebugEvent("🚫 Connection cancelled by user");
    updateDebug({ attemptCancelled: true });
    setStatus("disconnected");
    setIsSpeaking(false);
    setRetryAttempt(0);
    setPhase("idle");
    toast.dismiss("voice-retry");

    // Clean up mic stream + audio keep-alive + wake lock
    stopMicStream(micStreamRef.current);
    micStreamRef.current = null;
    stopCallAudioKeepAlive(callAudioRef.current);
    callAudioRef.current = null;
    void releaseWakeLock(wakeLockRef.current);
    wakeLockRef.current = null;
    cachedTokenRef.current = null;

    if (onConnectRejectRef.current) {
      onConnectRejectRef.current(new Error("Cancelled by user"));
      onConnectResolveRef.current = null;
      onConnectRejectRef.current = null;
    }

    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    void conversationRef.current?.endSession();
    conversationRef.current = null;
  }, [addDebugEvent, setPhase, updateDebug]);

  const startConversation = useCallback(async (context?: AgentContext) => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "failed") return;

    const attemptId = ++currentAttemptRef.current;
    const isStale = () => currentAttemptRef.current !== attemptId;

    setDebugState({ ...initialDebugState, timeline: [] });
    setVoiceUnavailable(false);
    setRetryAttempt(0);
    setStatus("connecting");
    setIsSpeaking(false);
    setPhase("requesting_mic");
    addDebugEvent("🎙️ Starting voice connection...");

    if (context) {
      contextRef.current = { ...contextRef.current, ...context };
    }

    try {
      updateDebug({ micPermission: "requesting", attemptCancelled: false });
      addDebugEvent("🎤 Requesting microphone...");

      let micStream: MediaStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        if (isStale()) return;
        const reason = (micErr as Error).name === "NotAllowedError" ? "microphone_denied" : "microphone_unavailable";
        addDebugEvent(`❌ Mic ${reason}`);
        updateDebug({ micPermission: "denied", lastError: `Microphone: ${reason}` });
        setStatus("error");
        setPhase("failed");
        handleFailure({ reason, error: micErr });
        return;
      }

      if (isStale()) {
        micStream.getTracks().forEach((track) => track.stop());
        return;
      }

      updateDebug({ micPermission: "granted" });
      addDebugEvent("✅ Microphone granted");

      // Hold a persistent silent audio keep-alive for the duration of the call.
      // On iOS Safari this is the only reliable way to keep the audio session
      // open between mic grant and the WS handshake — without it, the OS often
      // tears down audio just as ElevenLabs sends the first audio frame and the
      // session disconnects within ~1s of onConnect.
      stopCallAudioKeepAlive(callAudioRef.current);
      callAudioRef.current = await startCallAudioKeepAlive();
      if (callAudioRef.current) addDebugEvent("🔊 Audio keep-alive started");

      // Acquire a screen wake lock so the OS doesn't suspend the tab on mobile
      // mid-call (regardless of which route initiated the call).
      void releaseWakeLock(wakeLockRef.current);
      wakeLockRef.current = await acquireWakeLock();
      if (wakeLockRef.current) addDebugEvent("🔒 Wake lock acquired");

      // Keep micStream alive — pass it to the SDK so it doesn't call getUserMedia again (critical for mobile)
      micStreamRef.current = micStream;

      if (isStale()) return;
      setPhase("fetching_token");
      updateDebug({ tokenFetch: "pending" });
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
          updateDebug({ tokenFetch: "failed", lastError: errorMsg });
          setStatus("error");
          setPhase("failed");
          setVoiceUnavailable(true);
          toast.error("Voice Service Unavailable", { description: errorMsg, duration: 6000 });
          return;
        }

        token = data.token;
        signedUrl = data.signed_url;
        updateDebug({ tokenFetch: "success" });
        addDebugEvent("✅ Token received");
      }
      cachedTokenRef.current = null;

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

      // WebRTC path is currently broken upstream ("v1 RTC path not found" from
      // ElevenLabs' LiveKit server against the bundled @elevenlabs/client).
      // It always times out after 8s and falls back to WebSocket anyway, so
      // we skip it entirely and go straight to WebSocket for a fast, reliable
      // connect. Re-enable when the SDK is upgraded.
      if (isStale()) return;
      if (!signedUrl) {
        addDebugEvent("❌ No signed URL available");
        updateDebug({ lastError: "No WebSocket signed URL available" });
        setStatus("error");
        setPhase("failed");
        setVoiceUnavailable(true);
        toast.error("Unable to connect to Foreman AI", { description: "Voice session could not be initialised." });
        return;
      }

      setRetryAttempt(1);
      setPhase("dialing_websocket");
      updateDebug({ transportPath: "websocket" });
      addDebugEvent("🚀 Connecting via WebSocket...");

      try {
        await startAndWaitForConnect({ signedUrl, connectionType: "websocket" }, dynamicVariables, "WebSocket", attemptId);
        if (isStale()) return;
        await createConversationRecord();
        return;
      } catch (wsErr) {
        if (isStale()) return;
        const errMsg = wsErr instanceof Error ? wsErr.message : String(wsErr);
        addDebugEvent(`❌ WebSocket also failed: ${errMsg}`);
        updateDebug({ lastError: errMsg });
      }

      if (isStale()) return;
      setStatus("error");
      setPhase("failed");
      setVoiceUnavailable(true);
      // The onDisconnect handler already toasts the precise reason when the SDK
      // emits one. We only fall back to this generic toast if no disconnect
      // detail was captured (e.g. the connect simply timed out).
      const lastErr = (debugState as any)?.lastError as string | undefined;
      if (!lastErr || !/Disconnected/i.test(lastErr)) {
        toast.error("Unable to connect to Foreman AI", {
          description: lastErr ? lastErr.slice(0, 200) : "Connection timed out. Please try again or use text chat.",
        });
      }
    } catch (error) {
      if (isStale()) return;
      const errMsg = error instanceof Error ? error.message : String(error);
      addDebugEvent(`❌ Unexpected error: ${errMsg}`);
      updateDebug({ lastError: errMsg });
      setStatus("error");
      setPhase("failed");
      setVoiceUnavailable(true);
      handleFailure({ reason: getFailureReason(error), error });
    } finally {
      // Clean up mic stream + audio keep-alive + wake lock if connection didn't succeed
      if (!conversationRef.current) {
        if (micStreamRef.current) {
          stopMicStream(micStreamRef.current);
          micStreamRef.current = null;
        }
        stopCallAudioKeepAlive(callAudioRef.current);
        callAudioRef.current = null;
        void releaseWakeLock(wakeLockRef.current);
        wakeLockRef.current = null;
        // Drop any cached token so the next attempt mints a fresh one
        cachedTokenRef.current = null;
      }
      if (!isStale()) {
        setRetryAttempt(0);
        toast.dismiss("voice-retry");
      }
    }
  }, [addDebugEvent, createConversationRecord, getFailureReason, handleFailure, setPhase, startAndWaitForConnect, updateDebug]);

  const stopConversation = useCallback(async () => {
    const callStart = callStartRef.current;
    const userId = contextRef.current.userId;
    const teamId = contextRef.current.teamId;
    const convId = conversationIdRef.current;

    try {
      addDebugEvent("🛑 Ending session...");
      setStatus("disconnecting");
      await conversationRef.current?.endSession();
    } catch (error) {
      console.error("[VoiceAgent] Error stopping conversation:", error);
    } finally {
      conversationRef.current = null;
      callStartRef.current = null;
      setIsSpeaking(false);
      setStatus("disconnected");
      setPhase("idle");

      // Clean up mic stream + audio keep-alive + wake lock
      stopMicStream(micStreamRef.current);
      micStreamRef.current = null;
      stopCallAudioKeepAlive(callAudioRef.current);
      callAudioRef.current = null;
      void releaseWakeLock(wakeLockRef.current);
      wakeLockRef.current = null;

      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }

      // Track voice minutes usage
      if (callStart && userId && teamId) {
        const durationSeconds = Math.round((Date.now() - callStart) / 1000);
        const durationMinutes = Math.ceil(durationSeconds / 60); // Round up to nearest minute

        // Log to george_usage_log
        (async () => {
          try {
            await supabase.from("george_usage_log").insert({
              team_id: teamId,
              user_id: userId,
              conversation_id: convId || undefined,
              duration_seconds: durationSeconds,
              usage_type: "voice",
              skill_used: "conversation",
              credits_used: durationMinutes,
            });
            addDebugEvent(`📊 Logged ${durationMinutes} min usage`);
          } catch (err) {
            console.error("[VoiceAgent] Failed to log usage:", err);
          }

          try {
            await supabase.rpc("increment_voice_minutes" as any, {
              p_team_id: teamId,
              p_minutes: durationMinutes,
            });
            queryClient.invalidateQueries({ queryKey: ["teamGeorgeData"] });
            queryClient.invalidateQueries({ queryKey: ["teamSubscription"] });
          } catch (err) {
            console.error("[VoiceAgent] Failed to increment voice minutes:", err);
          }
        })();
      }
    }
  }, [addDebugEvent, setPhase, queryClient]);

  const sendTextMessage = useCallback((text: string) => {
    if (conversationRef.current && phaseRef.current === "connected") {
      conversationRef.current.sendUserMessage(text);
    }
  }, []);

  const callWebhook = useCallback(async (functionName: string, parameters: Record<string, unknown> = {}) => {
    return callGeorgeWebhook(functionName, parameters, contextRef.current);
  }, [callGeorgeWebhook]);

  const setContext = useCallback((context: AgentContext) => {
    contextRef.current = context;
  }, []);

  const resetVoiceAvailability = useCallback(() => {
    setVoiceUnavailable(false);
    setStatus("disconnected");
    setPhase("idle");
  }, [setPhase]);

  useEffect(() => {
    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      stopMicStream(micStreamRef.current);
      micStreamRef.current = null;
      stopCallAudioKeepAlive(callAudioRef.current);
      callAudioRef.current = null;
      void releaseWakeLock(wakeLockRef.current);
      wakeLockRef.current = null;
      void conversationRef.current?.endSession();
    };
  }, []);

  const isConnecting = ["requesting_mic", "fetching_token", "dialing_webrtc", "dialing_websocket"].includes(connectionPhase);

  return (
    <VoiceAgentContext.Provider
      value={{
        status,
        isSpeaking,
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
  return <VoiceAgentProviderInner>{children}</VoiceAgentProviderInner>;
}

export function useGlobalVoiceAgent() {
  const context = useContext(VoiceAgentContext);
  if (!context) {
    throw new Error("useGlobalVoiceAgent must be used within VoiceAgentProvider");
  }
  return context;
}
