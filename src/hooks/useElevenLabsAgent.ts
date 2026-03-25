import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// Map webhook function names to React Query keys that should be invalidated
const QUERY_INVALIDATION_MAP: Record<string, string[]> = {
  create_job: ["jobs", "dashboard"],
  reschedule_job: ["jobs", "dashboard"],
  delete_job: ["jobs", "dashboard"],
  update_job_status: ["jobs", "dashboard"],
  create_quote: ["quotes"],
  use_template_for_quote: ["quotes", "jobs"],
  add_template_to_quote: ["quotes"],
  update_quote_status: ["quotes"],
  delete_quote: ["quotes"],
  merge_quotes: ["quotes"],
  create_invoice: ["invoices"],
  create_invoice_from_template: ["invoices", "jobs"],
  create_invoice_from_quote: ["invoices", "quotes"],
  add_template_to_invoice: ["invoices"],
  update_invoice_status: ["invoices"],
  delete_invoice: ["invoices"],
  send_invoice_reminder: ["invoices"],
  record_payment: ["payments", "invoices"],
  log_expense: ["expenses"],
  delete_expense: ["expenses"],
  create_customer: ["customers"],
  update_customer: ["customers"],
  delete_customer: ["customers"],
  create_enquiry: ["enquiries"],
  list_enquiries: ["enquiries"],
  update_enquiry: ["enquiries"],
  update_enquiry_status: ["enquiries"],
  convert_enquiry_to_customer: ["enquiries", "customers"],
  convert_enquiry_to_quote: ["enquiries", "quotes", "customers"],
};

const ELEVENLABS_AGENT_ID = "agent_2701kffwpjhvf4gvt2cxpsx6j3rb";

interface AgentContext {
  userId?: string;
  teamId?: string;
  userName?: string;
}

// Client tool handler that calls george-webhook
async function callGeorgeWebhook(
  functionName: string, 
  parameters: Record<string, unknown>,
  _context: AgentContext,
  queryClient?: ReturnType<typeof useQueryClient>
): Promise<string> {
  try {
    console.log(`Calling george-webhook: ${functionName}`, parameters);
    
    const response = await supabase.functions.invoke("george-webhook", {
      body: {
        function_name: functionName,
        parameters,
      },
    });

    if (response.error) {
      console.error("george-webhook error:", response.error);
      return `Sorry, there was an error: ${response.error.message}`;
    }

    // Invalidate relevant React Query caches so UI updates
    if (queryClient) {
      const keysToInvalidate = QUERY_INVALIDATION_MAP[functionName];
      if (keysToInvalidate) {
        keysToInvalidate.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
        console.log(`[ElevenLabs] Invalidated queries: ${keysToInvalidate.join(", ")}`);
      }
    }

    return response.data?.message || "Done!";
  } catch (error) {
    console.error("Failed to call george-webhook:", error);
    return "Sorry, I couldn't complete that action. Please try again.";
  }
}

export function useElevenLabsAgent() {
  const [isConnecting, setIsConnecting] = useState(false);
  const contextRef = useRef<AgentContext>({});
  const queryClientRef = useRef<ReturnType<typeof useQueryClient> | null>(null);
  const queryClient = useQueryClient();
  queryClientRef.current = queryClient;

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] ✅ Connected to Foreman AI agent");
      toast.success("Connected to Foreman AI");
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] 🔌 Disconnected from Foreman AI agent");
      toast.info("Disconnected from Foreman AI");
    },
    onMessage: (message) => {
      console.log("[ElevenLabs] 📨 Message received:", message);
    },
    onError: (error) => {
      console.error("[ElevenLabs] ❌ Error:", error);
      const errorMessage = typeof error === 'object' && error !== null 
        ? JSON.stringify(error) 
        : String(error);
      toast.error(`Connection error: ${errorMessage}`);
    },
    // Handle client tool calls from ElevenLabs
    clientTools: {
      get_today_summary: async () => {
        return await callGeorgeWebhook("get_today_summary", {}, contextRef.current, queryClientRef.current || undefined);
      },
      get_week_ahead_summary: async () => {
        return await callGeorgeWebhook("get_week_ahead_summary", {}, contextRef.current, queryClientRef.current || undefined);
      },
      get_todays_jobs: async () => {
        return await callGeorgeWebhook("get_todays_jobs", {}, contextRef.current, queryClientRef.current || undefined);
      },
      create_job: async (params: { client_name: string; job_title: string; scheduled_date: string; scheduled_time?: string }) => {
        return await callGeorgeWebhook("create_job", params, contextRef.current, queryClientRef.current || undefined);
      },
      create_quote: async (params: { client_name: string; items: Array<{ description: string; quantity: number; unit_price: number }> }) => {
        return await callGeorgeWebhook("create_quote", params, contextRef.current, queryClientRef.current || undefined);
      },
      log_expense: async (params: { vendor_name: string; amount: number; category?: string }) => {
        return await callGeorgeWebhook("log_expense", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_overdue_invoices: async () => {
        return await callGeorgeWebhook("get_overdue_invoices", {}, contextRef.current, queryClientRef.current || undefined);
      },
      send_invoice_reminder: async (params: { display_number?: string; invoice_id?: string }) => {
        return await callGeorgeWebhook("send_invoice_reminder", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_client_info: async (params: { client_name: string }) => {
        return await callGeorgeWebhook("get_client_info", params, contextRef.current, queryClientRef.current || undefined);
      },
      reschedule_job: async (params: { job_title?: string; client_name?: string; new_date: string; new_time?: string }) => {
        return await callGeorgeWebhook("reschedule_job", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_templates: async (params: { category?: string; search?: string }) => {
        return await callGeorgeWebhook("get_templates", params, contextRef.current, queryClientRef.current || undefined);
      },
      use_template_for_quote: async (params: { template_name?: string; template_id?: string; client_name: string; notes?: string; quantity_overrides?: Record<string, number>; job_id?: string; job_title?: string; create_job?: boolean; scheduled_date?: string; scheduled_time?: string }) => {
        return await callGeorgeWebhook("use_template_for_quote", params, contextRef.current, queryClientRef.current || undefined);
      },
      create_invoice_from_template: async (params: { template_name?: string; template_id?: string; client_name: string; notes?: string; due_days?: number; quantity_overrides?: Record<string, number>; job_id?: string; job_title?: string; create_job?: boolean; scheduled_date?: string; scheduled_time?: string }) => {
        return await callGeorgeWebhook("create_invoice_from_template", params, contextRef.current, queryClientRef.current || undefined);
      },
      suggest_template: async (params: { job_description: string }) => {
        return await callGeorgeWebhook("suggest_template", params, contextRef.current, queryClientRef.current || undefined);
      },
      create_invoice_from_quote: async (params: { quote_id?: string; display_number?: string; due_days?: number }) => {
        return await callGeorgeWebhook("create_invoice_from_quote", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_jobs_for_date: async (params: { date: string }) => {
        return await callGeorgeWebhook("get_jobs_for_date", params, contextRef.current, queryClientRef.current || undefined);
      },
      check_availability: async (params: { date: string; preferred_time?: string }) => {
        return await callGeorgeWebhook("check_availability", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_week_schedule: async (params: { start_date?: string }) => {
        return await callGeorgeWebhook("get_week_schedule", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_monthly_summary: async (params: { month?: number; year?: number }) => {
        return await callGeorgeWebhook("get_monthly_summary", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_outstanding_balance: async (params: { customer_name?: string }) => {
        return await callGeorgeWebhook("get_outstanding_balance", params, contextRef.current, queryClientRef.current || undefined);
      },
      record_payment: async (params: { display_number?: string; invoice_id?: string; amount: number; payment_method?: string; notes?: string }) => {
        return await callGeorgeWebhook("record_payment", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_payment_history: async (params: { display_number?: string; invoice_id?: string; customer_name?: string; limit?: number }) => {
        return await callGeorgeWebhook("get_payment_history", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_template_details: async (params: { template_name?: string; template_id?: string }) => {
        return await callGeorgeWebhook("get_template_details", params, contextRef.current, queryClientRef.current || undefined);
      },
      search_templates: async (params: { query: string; category?: string }) => {
        return await callGeorgeWebhook("search_templates", params, contextRef.current, queryClientRef.current || undefined);
      },
      list_template_categories: async () => {
        return await callGeorgeWebhook("list_template_categories", {}, contextRef.current, queryClientRef.current || undefined);
      },
      list_customers: async (params: { search?: string; limit?: number }) => {
        return await callGeorgeWebhook("list_customers", params, contextRef.current, queryClientRef.current || undefined);
      },
      create_customer: async (params: { name: string; email?: string; phone?: string; address?: string; contact_person?: string; notes?: string }) => {
        return await callGeorgeWebhook("create_customer", params, contextRef.current, queryClientRef.current || undefined);
      },
      update_customer: async (params: { customer_name?: string; customer_id?: string; name?: string; email?: string; phone?: string; address?: string; contact_person?: string; notes?: string }) => {
        return await callGeorgeWebhook("update_customer", params, contextRef.current, queryClientRef.current || undefined);
      },
      delete_customer: async (params: { customer_name?: string; customer_id?: string }) => {
        return await callGeorgeWebhook("delete_customer", params, contextRef.current, queryClientRef.current || undefined);
      },
      search_customer: async (params: { query: string }) => {
        return await callGeorgeWebhook("search_customer", params, contextRef.current, queryClientRef.current || undefined);
      },
      list_jobs: async (params: { status?: string; customer_name?: string; search?: string; date_from?: string; date_to?: string; limit?: number }) => {
        return await callGeorgeWebhook("list_jobs", params, contextRef.current, queryClientRef.current || undefined);
      },
      delete_job: async (params: { job_id?: string; job_title?: string; client_name?: string }) => {
        return await callGeorgeWebhook("delete_job", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_upcoming_jobs: async (params: { days?: number }) => {
        return await callGeorgeWebhook("get_upcoming_jobs", params, contextRef.current, queryClientRef.current || undefined);
      },
      list_quotes: async (params: { status?: string; customer_name?: string; search?: string; limit?: number }) => {
        return await callGeorgeWebhook("list_quotes", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_pending_quotes: async () => {
        return await callGeorgeWebhook("get_pending_quotes", {}, contextRef.current, queryClientRef.current || undefined);
      },
      update_quote_status: async (params: { quote_id?: string; display_number?: string; new_status: string }) => {
        return await callGeorgeWebhook("update_quote_status", params, contextRef.current, queryClientRef.current || undefined);
      },
      delete_quote: async (params: { quote_id?: string; display_number?: string }) => {
        return await callGeorgeWebhook("delete_quote", params, contextRef.current, queryClientRef.current || undefined);
      },
      create_invoice: async (params: { client_name: string; items: Array<{ description: string; quantity: number; unit_price: number }>; notes?: string; due_days?: number; tax_rate?: number }) => {
        return await callGeorgeWebhook("create_invoice", params, contextRef.current, queryClientRef.current || undefined);
      },
      list_invoices: async (params: { status?: string; customer_name?: string; search?: string; limit?: number }) => {
        return await callGeorgeWebhook("list_invoices", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_outstanding_invoices: async () => {
        return await callGeorgeWebhook("get_outstanding_invoices", {}, contextRef.current, queryClientRef.current || undefined);
      },
      update_invoice_status: async (params: { invoice_id?: string; display_number?: string; new_status: string }) => {
        return await callGeorgeWebhook("update_invoice_status", params, contextRef.current, queryClientRef.current || undefined);
      },
      delete_invoice: async (params: { invoice_id?: string; display_number?: string }) => {
        return await callGeorgeWebhook("delete_invoice", params, contextRef.current, queryClientRef.current || undefined);
      },
      list_expenses: async (params: { category?: string; vendor?: string; job_id?: string; date_from?: string; date_to?: string; limit?: number }) => {
        return await callGeorgeWebhook("list_expenses", params, contextRef.current, queryClientRef.current || undefined);
      },
      delete_expense: async (params: { expense_id?: string; vendor?: string; amount?: number }) => {
        return await callGeorgeWebhook("delete_expense", params, contextRef.current, queryClientRef.current || undefined);
      },
      get_financial_summary: async (params: { period?: string }) => {
        return await callGeorgeWebhook("get_financial_summary", params, contextRef.current, queryClientRef.current || undefined);
      },
      // --- Enquiry tools ---
      create_enquiry: async (params: { contact_name: string; phone?: string; email?: string; description?: string; source?: string; address?: string; urgency?: string }) => {
        return await callGeorgeWebhook("create_enquiry", params, contextRef.current, queryClientRef.current || undefined);
      },
      list_enquiries: async (params: { status?: string; source?: string; search?: string; limit?: number }) => {
        return await callGeorgeWebhook("list_enquiries", params, contextRef.current, queryClientRef.current || undefined);
      },
      update_enquiry: async (params: { enquiry_id?: string; contact_name?: string; phone?: string; email?: string; description?: string; notes?: string; address?: string; urgency?: string }) => {
        return await callGeorgeWebhook("update_enquiry", params, contextRef.current, queryClientRef.current || undefined);
      },
      update_enquiry_status: async (params: { enquiry_id?: string; contact_name?: string; new_status: string }) => {
        return await callGeorgeWebhook("update_enquiry_status", params, contextRef.current, queryClientRef.current || undefined);
      },
      convert_enquiry_to_customer: async (params: { enquiry_id?: string; contact_name?: string }) => {
        return await callGeorgeWebhook("convert_enquiry_to_customer", params, contextRef.current, queryClientRef.current || undefined);
      },
      convert_enquiry_to_quote: async (params: { enquiry_id?: string; contact_name?: string; template_name?: string; template_id?: string; notes?: string }) => {
        return await callGeorgeWebhook("convert_enquiry_to_quote", params, contextRef.current, queryClientRef.current || undefined);
      },
      // --- Job status tool ---
      update_job_status: async (params: { job_id?: string; job_title?: string; client_name?: string; new_status: string }) => {
        return await callGeorgeWebhook("update_job_status", params, contextRef.current, queryClientRef.current || undefined);
      },
      // --- Multi-service tools ---
      add_template_to_quote: async (params: { quote_id?: string; display_number?: string; template_name?: string; template_id?: string; quantity_overrides?: Record<string, number> }) => {
        return await callGeorgeWebhook("add_template_to_quote", params, contextRef.current, queryClientRef.current || undefined);
      },
      add_template_to_invoice: async (params: { invoice_id?: string; display_number?: string; template_name?: string; template_id?: string; quantity_overrides?: Record<string, number> }) => {
        return await callGeorgeWebhook("add_template_to_invoice", params, contextRef.current, queryClientRef.current || undefined);
      },
      merge_quotes: async (params: { quote_ids?: string[]; display_numbers?: string[]; customer_name?: string }) => {
        return await callGeorgeWebhook("merge_quotes", params, contextRef.current, queryClientRef.current || undefined);
      },
      // --- AI / advisory tools ---
      get_business_insights: async (params: { period?: string; focus?: string }) => {
        return await callGeorgeWebhook("get_business_insights", params, contextRef.current, queryClientRef.current || undefined);
      },
      draft_customer_message: async (params: { customer_name?: string; customer_id?: string; message_type: string; context?: string }) => {
        return await callGeorgeWebhook("draft_customer_message", params, contextRef.current, queryClientRef.current || undefined);
      },
      estimate_job_cost: async (params: { job_description: string; trade_category?: string }) => {
        return await callGeorgeWebhook("estimate_job_cost", params, contextRef.current, queryClientRef.current || undefined);
      },
      ask_foreman: async (params: { question: string; trade_category?: string }) => {
        return await callGeorgeWebhook("ask_foreman", params, contextRef.current, queryClientRef.current || undefined);
      },
    },
  });

  const startConversation = useCallback(async (context?: AgentContext) => {
    console.log("[ElevenLabs] 🚀 startConversation called, current status:", conversation.status);
    
    if (conversation.status === "connected") {
      console.log("[ElevenLabs] Already connected, skipping");
      return;
    }
    
    setIsConnecting(true);
    try {
      // Store context for client tools
      if (context) {
        contextRef.current = context;
        console.log("[ElevenLabs] Context set:", context);
      }

      // Request microphone permission
      console.log("[ElevenLabs] 🎤 Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[ElevenLabs] ✅ Microphone permission granted, tracks:", stream.getAudioTracks().length);

      // Build dynamic variables for agent context
      const dynamicVariables: Record<string, string> = {};
      if (context?.userName) {
        dynamicVariables.user_name = context.userName;
      }
      if (context?.teamId) {
        dynamicVariables.team_id = context.teamId;
      }
      
      // Add current date and time so the agent knows "today"
      const now = new Date();
      dynamicVariables.current_date = now.toISOString().split("T")[0]; // YYYY-MM-DD
      dynamicVariables.current_time = now.toTimeString().slice(0, 5); // HH:MM
      dynamicVariables.current_day = now.toLocaleDateString("en-US", { weekday: "long" }); // e.g., "Friday"
      dynamicVariables.current_datetime = now.toLocaleString("en-US", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }); // e.g., "Friday, January 24, 2025, 3:30 PM"
      
      console.log("[ElevenLabs] 📡 Starting session with agent:", ELEVENLABS_AGENT_ID);
      console.log("[ElevenLabs] Dynamic variables:", dynamicVariables);

      // Connect directly with public agent ID using WebRTC
      await conversation.startSession({
        agentId: ELEVENLABS_AGENT_ID,
        connectionType: "webrtc",
        dynamicVariables,
      });
      
      console.log("[ElevenLabs] ✅ startSession completed successfully");
    } catch (error) {
      console.error("[ElevenLabs] ❌ Failed to start conversation:", error);
      console.error("[ElevenLabs] Error details:", {
        name: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Microphone access is required for voice features");
      } else {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to connect to George: ${errorMsg}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const sendTextMessage = useCallback((text: string) => {
    if (conversation.status === "connected") {
      // Use sendUserMessage for text input to the agent
      conversation.sendUserMessage(text);
    }
  }, [conversation]);

  // Call george-webhook directly (for non-voice interactions)
  const callWebhook = useCallback(async (functionName: string, parameters: Record<string, unknown> = {}) => {
    return await callGeorgeWebhook(functionName, parameters, contextRef.current, queryClientRef.current || undefined);
  }, []);

  // Set context without starting conversation
  const setContext = useCallback((context: AgentContext) => {
    contextRef.current = context;
  }, []);

  return {
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    isConnecting,
    startConversation,
    stopConversation,
    sendTextMessage,
    callWebhook,
    setContext,
  };
}
