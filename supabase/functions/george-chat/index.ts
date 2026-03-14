import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  message: string;
  conversation_id: string | null;
}

// Define available tools for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "get_today_summary",
      description: "Get a morning briefing summary including today's jobs, recent payments, overdue invoices, and pending quotes",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_week_ahead_summary",
      description: "Get a weekly planning summary including upcoming jobs, expected income, invoices due, and expiring quotes for the next 7 days",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_todays_jobs",
      description: "Get jobs scheduled for today",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_jobs_for_date",
      description: "Get jobs scheduled for a specific date",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "The date in YYYY-MM-DD format" }
        },
        required: ["date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check available time slots for a specific date to see when the user is free or busy. Use this when the user asks about availability, free slots, or wants to know when they can schedule something.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "The date to check availability for in YYYY-MM-DD format" },
          preferred_time: { type: "string", description: "Optional preferred time to check in HH:MM format" }
        },
        required: ["date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_job",
      description: "Create a new job/appointment in the calendar",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Name of the client" },
          job_title: { type: "string", description: "Title/description of the job" },
          scheduled_date: { type: "string", description: "Date for the job in YYYY-MM-DD format" },
          scheduled_time: { type: "string", description: "Time for the job in HH:MM format (24-hour)" },
          description: { type: "string", description: "Additional details about the job" },
          estimated_value: { type: "number", description: "Estimated value/price of the job" }
        },
        required: ["client_name", "job_title", "scheduled_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reschedule_job",
      description: "Reschedule an existing job to a new date/time",
      parameters: {
        type: "object",
        properties: {
          job_title: { type: "string", description: "Title of the job to reschedule" },
          client_name: { type: "string", description: "Name of the client for the job" },
          new_date: { type: "string", description: "New date in YYYY-MM-DD format" },
          new_time: { type: "string", description: "New time in HH:MM format (24-hour)" }
        },
        required: ["new_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_job_status",
      description: "Update the status of a job (pending, scheduled, in_progress, completed, cancelled)",
      parameters: {
        type: "object",
        properties: {
          job_title: { type: "string", description: "Title of the job" },
          client_name: { type: "string", description: "Name of the client" },
          new_status: { type: "string", enum: ["pending", "scheduled", "in_progress", "completed", "cancelled"], description: "New status for the job" }
        },
        required: ["new_status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_quote",
      description: "Create a new quote/estimate for a client",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Name of the client" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "Description of the line item" },
                quantity: { type: "number", description: "Quantity" },
                unit_price: { type: "number", description: "Price per unit" }
              },
              required: ["description", "quantity", "unit_price"]
            },
            description: "Line items for the quote"
          },
          notes: { type: "string", description: "Additional notes for the quote" },
          tax_rate: { type: "number", description: "Tax rate percentage (e.g., 20 for 20%)" }
        },
        required: ["client_name", "items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_overdue_invoices",
      description: "Get list of overdue invoices",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "send_invoice_reminder",
      description: "Send a payment reminder for an invoice",
      parameters: {
        type: "object",
        properties: {
          invoice_number: { type: "string", description: "The invoice number (e.g., INV-0001)" },
          invoice_id: { type: "string", description: "The invoice ID" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_expense",
      description: "Log a business expense",
      parameters: {
        type: "object",
        properties: {
          vendor_name: { type: "string", description: "Name of the vendor/supplier" },
          amount: { type: "number", description: "Amount spent" },
          category: { type: "string", enum: ["materials", "fuel", "tools", "labor", "permits", "other"], description: "Expense category" },
          description: { type: "string", description: "Description of the expense" }
        },
        required: ["vendor_name", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_client_info",
      description: "Look up information about a client/customer",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Name of the client to look up" }
        },
        required: ["client_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_templates",
      description: "Get available quote/job templates",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "create_invoice_from_template",
      description: "Create an invoice for a client using a template",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Name of the client" },
          template_name: { type: "string", description: "Name of the template to use (e.g., 'EV charger installation', 'Bathroom Renovation')" },
          additional_notes: { type: "string", description: "Additional notes for the invoice" }
        },
        required: ["client_name", "template_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "use_template_for_quote",
      description: "Create a quote for a client using a template",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Name of the client" },
          template_name: { type: "string", description: "Name of the template to use" },
          additional_notes: { type: "string", description: "Additional notes for the quote" }
        },
        required: ["client_name", "template_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_template_details",
      description: "Get full details of a specific template including all line items, pricing, and estimated total. Use this when the user asks about what's in a template or wants to see the breakdown.",
      parameters: {
        type: "object",
        properties: {
          template_name: { type: "string", description: "Name of the template to look up" },
          template_id: { type: "string", description: "ID of the template (if known)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_templates",
      description: "Search for templates by keyword or job type. Use this when the user is looking for a template but doesn't know the exact name.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term (e.g., 'boiler', 'bathroom', 'rewire')" },
          category: { type: "string", description: "Optional category to filter by (e.g., 'plumber', 'electrician')" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_template_categories",
      description: "List all template categories the user has with counts. Use this when the user asks what types of templates they have or wants to browse by category.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_template",
      description: "Suggest the best template for a job based on description. Use this when the user describes a job and wants template recommendations.",
      parameters: {
        type: "object",
        properties: {
          job_description: { type: "string", description: "Description of the job to find a template for" }
        },
        required: ["job_description"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth token for verification
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Get the user's team from their profile using service role
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("team_id, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.team_id) {
      return new Response(
        JSON.stringify({ error: "User not in a team" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is actually a member of this team
    const { data: membership, error: membershipError } = await serviceSupabase
      .from("team_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("team_id", profile.team_id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "Not a team member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamId = profile.team_id;
    const userName = profile.full_name || "there";
    const { message, conversation_id }: ChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("george-chat: Processing message:", message);

    // Create or get conversation for persistence
    let activeConversationId = conversation_id;
    
    if (!activeConversationId) {
      // Create a new conversation
      const { data: newConv, error: convError } = await serviceSupabase
        .from("george_conversations")
        .insert({
          team_id: teamId,
          user_id: userId,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        })
        .select("id")
        .single();
      
      if (!convError && newConv) {
        activeConversationId = newConv.id;
      }
    }

    // Save user message to database
    if (activeConversationId) {
      await serviceSupabase
        .from("george_messages")
        .insert({
          conversation_id: activeConversationId,
          role: "user",
          content: message,
        });
    }

    // Get conversation history for context
    let history: { role: string; content: string }[] = [];
    if (activeConversationId) {
      const { data: messages } = await serviceSupabase
        .from("george_messages")
        .select("role, content")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true })
        .limit(20);
      history = (messages || []).slice(0, -1); // Exclude the message we just added
    }

    // Get today's date for context
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const year = now.getFullYear();
    
    // Calculate useful reference dates for the AI
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split("T")[0];

    // Build system prompt with explicit date context
    const systemPrompt = `You are Tom, a friendly AI assistant for a field service management app called Quotr. You help tradespeople (electricians, plumbers, contractors, etc.) manage their jobs, quotes, invoices, expenses, and clients.

CRITICAL DATE CONTEXT - READ THIS CAREFULLY:
- TODAY'S DATE: ${today} (${dayOfWeek})
- CURRENT YEAR: ${year}
- Tomorrow: ${tomorrowStr}
- Next week: ${nextWeekStr}
User's name: ${userName}

IMPORTANT: The current year is ${year}. When scheduling jobs or setting dates:
- ALWAYS use ${year} as the year unless the user explicitly specifies a different year
- "Tomorrow" = ${tomorrowStr}
- "Next week" = ${nextWeekStr}
- "Next Monday", "This Friday", etc. should be calculated from today (${today})
- NEVER use dates from past years like 2023, 2024, or 2025

You have access to tools to help manage their business. When users ask you to do something, use the appropriate tool. Be proactive - if they ask to "add a job to the calendar" or "create a quote", use the tools to actually do it.

TEMPLATE SUGGESTIONS - VERY IMPORTANT:
- When a user discusses a job type (e.g. "I need to do a rewire for Murphy", "boiler service at the O'Brien house"), proactively use the suggest_template tool to find a matching template.
- After suggesting a template, offer to create a quote or invoice from it immediately.
- When using use_template_for_quote or create_invoice_from_template, VAT is automatically applied based on the user's country setting — do NOT ask the user about VAT rates unless they explicitly mention a custom rate.
- You don't need to mention VAT percentages unless the user asks — just show the total including VAT.

Guidelines:
- Be conversational, helpful, and concise
- When creating jobs or quotes, extract all the details from the user's message
- For dates: Calculate from today (${today}). Tomorrow is ${tomorrowStr}. All dates should be in ${year}.
- For times: Convert casual times like "9am" to "09:00", "2pm" to "14:00"
- If you're missing required information, ask for it
- After completing an action, confirm what you did
- Don't mention "tools" or "functions" - just help naturally
- When a user mentions a job type, proactively suggest a relevant template before asking for manual line items`;

    // Use AI with function calling
    if (!lovableApiKey) {
      const fallbackMsg = "I can help you check today's jobs, create quotes, log expenses, or send invoice reminders. What would you like to do?";
      
      // Save fallback response
      if (activeConversationId) {
        await serviceSupabase
          .from("george_messages")
          .insert({
            conversation_id: activeConversationId,
            role: "assistant",
            content: fallbackMsg,
          });
      }
      
      return new Response(
        JSON.stringify({ message: fallbackMsg, conversation_id: activeConversationId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    console.log("george-chat: Calling AI with tools");

    let aiData: any;
    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI request failed:", errorText);
        throw new Error("AI request failed");
      }

      aiData = await aiResponse.json();
    } catch (aiErr) {
      // IMPORTANT: Don't crash the whole chat UI if the AI provider is temporarily unreachable.
      console.error("george-chat: AI call failed (falling back):", aiErr);
      const fallbackMsg =
        "I’m having trouble reaching the assistant right now. You can still use the app normally—please try again in a minute.";

      if (activeConversationId) {
        await serviceSupabase
          .from("george_messages")
          .insert({
            conversation_id: activeConversationId,
            role: "assistant",
            content: fallbackMsg,
          });

        await serviceSupabase
          .from("george_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeConversationId);
      }

      return new Response(
        JSON.stringify({ message: fallbackMsg, conversation_id: activeConversationId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const choice = aiData.choices?.[0];

    console.log("george-chat: AI response:", JSON.stringify(choice, null, 2));

    let finalMessage = "";

    // Check if the AI wants to call a tool
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResults: { name: string; result: any }[] = [];

      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;
        let parameters = {};
        
        try {
          parameters = JSON.parse(toolCall.function.arguments || "{}");
        } catch (e) {
          console.error("Failed to parse tool arguments:", toolCall.function.arguments);
        }

        console.log(`george-chat: Calling webhook function ${functionName}`, parameters);

        // Call the george-webhook function
        const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/george-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify({
            function_name: functionName,
            parameters,
          }),
        });

        const webhookData = await webhookResponse.json();
        console.log(`george-chat: Webhook response for ${functionName}:`, webhookData);
        
        toolResults.push({
          name: functionName,
          result: webhookData
        });
      }

      // Make a second AI call with the tool results to get a natural response
      const toolResultMessages = toolResults.map((tr, idx) => ({
        role: "tool" as const,
        tool_call_id: choice.message.tool_calls[idx].id,
        content: JSON.stringify(tr.result),
      }));

      const followUpMessages = [
        ...aiMessages,
        choice.message, // Include the assistant's tool call message
        ...toolResultMessages,
      ];

      console.log("george-chat: Making follow-up AI call with tool results");

      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: followUpMessages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        finalMessage = followUpData.choices?.[0]?.message?.content || 
          toolResults.map(tr => tr.result.message || `Completed ${tr.name}`).join("\n\n");
      } else {
        // Fallback to webhook messages if follow-up fails
        finalMessage = toolResults.map(tr => tr.result.message || `Completed ${tr.name}`).join("\n\n");
      }
    } else {
      // No tool calls, just return the AI's message
      finalMessage = choice?.message?.content || 
        "I'm here to help you manage your business. What would you like to do?";
    }

    // Save assistant response to database
    if (activeConversationId) {
      await serviceSupabase
        .from("george_messages")
        .insert({
          conversation_id: activeConversationId,
          role: "assistant",
          content: finalMessage,
        });
      
      // Update conversation timestamp
      await serviceSupabase
        .from("george_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId);
    }

    return new Response(
      JSON.stringify({ message: finalMessage, conversation_id: activeConversationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("george-chat error:", error);
    
    return new Response(
      JSON.stringify({ message: "Sorry, I encountered an issue. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
