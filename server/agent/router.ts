import { parseInput, ParsedCommand } from "./command-parser";
import {
  getOrCreateSession, updateSession, addConversationMessage,
  getCurrentDraft as getCurrentDraftFromStore, clearCurrentDraft, getDraftQuote,
  DraftQuote, DraftInvoice
} from "./session-store";
import {
  findClient, createClient, getOrCreateClientByName,
  listTemplates, recommendTemplate, getTemplate,
  createQuoteDraftFromTemplate, addLineItemToCurrentDraft,
  applyDiscountToCurrentDraft, finalizeQuote, createInvoiceFromQuote,
  searchEntities, ToolResult
} from "./tools";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { organizations } from "@shared/schema";

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  
  if (!apiKey) return null;
  
  return new Anthropic({
    apiKey,
    baseURL: baseUrl,
  });
}

export interface AgentResponse {
  type: "success" | "draft" | "confirmation" | "error" | "question" | "search_results";
  message: string;
  data?: any;
  draft?: DraftQuote | DraftInvoice;
  draftType?: "quote" | "invoice";
  actions?: AgentAction[];
  suggestions?: string[];
}

export interface AgentAction {
  id: string;
  label: string;
  type: "confirm" | "edit" | "cancel" | "select";
  payload?: any;
}

export async function processAgentCommand(
  organizationId: number,
  userId: string,
  input: string
): Promise<AgentResponse> {
  const session = getOrCreateSession(organizationId, userId);
  
  addConversationMessage(organizationId, userId, {
    role: "user",
    content: input,
  });
  
  const parsed = parseInput(input);
  
  addConversationMessage(organizationId, userId, {
    role: "system",
    content: `Parsed command: ${JSON.stringify(parsed)}`,
    commandParsed: parsed,
  });
  
  let response: AgentResponse;
  
  if (parsed.needsLlm && parsed.confidence !== "high") {
    response = await handleWithLlm(organizationId, userId, parsed, session.sessionId);
  } else {
    response = await executeCommand(organizationId, userId, parsed, session.sessionId);
  }
  
  addConversationMessage(organizationId, userId, {
    role: "assistant",
    content: response.message,
  });
  
  return response;
}

async function executeCommand(
  organizationId: number,
  userId: string,
  parsed: ParsedCommand,
  sessionId: string
): Promise<AgentResponse> {
  switch (parsed.type) {
    case "quote":
      return handleQuoteCommand(organizationId, userId, parsed, sessionId);
    case "invoice":
      return handleInvoiceCommand(organizationId, userId, parsed, sessionId);
    case "client":
      return handleClientCommand(organizationId, userId, parsed, sessionId);
    case "add":
      return handleAddCommand(organizationId, userId, parsed, sessionId);
    case "search":
      return handleSearchCommand(organizationId, userId, parsed);
    case "pay":
      return handlePayCommand(organizationId, userId, parsed);
    default:
      return {
        type: "error",
        message: "I didn't understand that command. Try /quote, /invoice, /client, or /search.",
        suggestions: [
          "/quote callout \"Client Name\"",
          "/invoice from quote QUO-0001",
          "/client add \"New Client\"",
          "/search term"
        ]
      };
  }
}

async function handleQuoteCommand(
  organizationId: number,
  userId: string,
  parsed: ParsedCommand,
  sessionId: string
): Promise<AgentResponse> {
  const { params } = parsed;
  
  const [org] = await db.select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  
  if (!org?.tradeType) {
    return {
      type: "error",
      message: "Please complete your business setup first. I need to know your trade type to show the right templates."
    };
  }
  
  if (parsed.missingFields?.includes("client") && !params.clientName) {
    return {
      type: "question",
      message: "Who is this quote for?",
      suggestions: ["Type the client's name"]
    };
  }
  
  const clientName = params.clientName as string;
  const clientResult = await getOrCreateClientByName(
    organizationId,
    userId,
    clientName,
    undefined,
    sessionId
  );
  
  if (!clientResult.success || !clientResult.data) {
    return {
      type: "error",
      message: clientResult.error || "Failed to find or create client"
    };
  }
  
  if (clientResult.requiresConfirmation) {
    return {
      type: "confirmation",
      message: clientResult.confirmationMessage || "Please confirm the client",
      data: clientResult.data,
      actions: [
        { id: "confirm", label: "Use this client", type: "confirm", payload: { clientId: clientResult.data.id } },
        { id: "create_new", label: "Create new client", type: "select" }
      ]
    };
  }
  
  const client = clientResult.data;
  
  let template = null;
  if (params.templateKeyword) {
    const templateResult = await recommendTemplate(org.tradeType, params.templateKeyword as string);
    if (templateResult.success && templateResult.data) {
      template = templateResult.data;
    }
  }
  
  if (!template) {
    const templatesResult = await listTemplates(org.tradeType);
    if (templatesResult.success && templatesResult.data && templatesResult.data.length > 0) {
      return {
        type: "question",
        message: `What type of job is this for ${client.name}?`,
        suggestions: templatesResult.data.slice(0, 5).map(t => t.name),
        data: { clientId: client.id, clientName: client.name }
      };
    } else {
      template = null;
    }
  }
  
  if (template) {
    const draftResult = await createQuoteDraftFromTemplate(
      organizationId,
      userId,
      client.id,
      template.id,
      {
        selectedOptions: params.options as string[] | undefined,
        notes: params.notes as string | undefined,
        priority: params.priority as any,
        scheduledDate: params.when === "today" ? new Date() : 
                       params.when === "tomorrow" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
        scheduledTime: params.time as string | undefined,
      }
    );
    
    if (!draftResult.success || !draftResult.data) {
      return {
        type: "error",
        message: draftResult.error || "Failed to create quote draft"
      };
    }
    
    const draft = draftResult.data;
    
    return {
      type: "draft",
      message: `Draft quote created for ${client.name}`,
      draft,
      draftType: "quote",
      data: {
        templateName: template.name,
        clientName: client.name,
        itemCount: draft.items.length,
        total: draft.total,
      },
      actions: [
        { id: "confirm", label: "Confirm & Save", type: "confirm", payload: { draftId: draft.draftId } },
        { id: "edit", label: "Edit", type: "edit", payload: { draftId: draft.draftId } },
        { id: "cancel", label: "Cancel", type: "cancel", payload: { draftId: draft.draftId } }
      ]
    };
  }
  
  const draftResult = await createQuoteDraftFromTemplate(
    organizationId,
    userId,
    client.id,
    0,
    {
      notes: params.notes as string | undefined,
    }
  );
  
  return {
    type: "draft",
    message: `Started a blank quote for ${client.name}. Add items with /add`,
    draft: draftResult.data,
    draftType: "quote",
    actions: [
      { id: "add_item", label: "Add Item", type: "edit" },
      { id: "cancel", label: "Cancel", type: "cancel" }
    ],
    suggestions: [
      "/add labour 2h",
      "/add material \"RCBO\" 1 45",
      "/add callout 1 85"
    ]
  };
}

async function handleInvoiceCommand(
  organizationId: number,
  userId: string,
  parsed: ParsedCommand,
  sessionId: string
): Promise<AgentResponse> {
  const { params, action } = parsed;
  
  if (action === "convert" || params.action === "convert") {
    const quoteRef = params.quoteRef as string;
    if (!quoteRef) {
      return {
        type: "question",
        message: "Which quote should I convert to an invoice? Enter the quote number (e.g., QUO-0001)",
        suggestions: ["QUO-0001"]
      };
    }
    
    const result = await createInvoiceFromQuote(
      organizationId,
      userId,
      quoteRef,
      params.dueDays as number | undefined,
      sessionId
    );
    
    if (!result.success) {
      return {
        type: "error",
        message: result.error || "Failed to create invoice from quote"
      };
    }
    
    return {
      type: "success",
      message: `Invoice ${result.data!.invoiceNumber} created from quote ${quoteRef}`,
      data: result.data,
      actions: [
        { id: "view", label: "View Invoice", type: "select", payload: { invoiceId: result.data!.id } },
        { id: "send", label: "Send to Client", type: "confirm", payload: { invoiceId: result.data!.id } }
      ]
    };
  }
  
  if (action === "quick" || params.action === "quick") {
    return {
      type: "error",
      message: "Quick invoice not yet implemented. Use /invoice from quote <quoteNumber> to convert a quote."
    };
  }
  
  return {
    type: "question",
    message: "How would you like to create this invoice?",
    suggestions: [
      "/invoice from quote QUO-0001",
      "Convert from an existing quote"
    ]
  };
}

async function handleClientCommand(
  organizationId: number,
  userId: string,
  parsed: ParsedCommand,
  sessionId: string
): Promise<AgentResponse> {
  const { action, params } = parsed;
  
  if (action === "add") {
    if (!params.name) {
      return {
        type: "question",
        message: "What's the client's name?",
        suggestions: ["Type the full name or business name"]
      };
    }
    
    const result = await createClient(
      organizationId,
      userId,
      {
        name: params.name as string,
        email: params.email as string | undefined,
        phone: params.phone as string | undefined,
        mobile: params.mobile as string | undefined,
        address: params.address as string | undefined,
      },
      sessionId
    );
    
    if (!result.success) {
      return {
        type: "error",
        message: result.error || "Failed to create client"
      };
    }
    
    return {
      type: "success",
      message: `Client "${result.data!.name}" created`,
      data: result.data,
      suggestions: [
        `/quote callout "${result.data!.name}"`,
        "Create a quote for this client"
      ]
    };
  }
  
  if (action === "find") {
    const query = params.query as string;
    if (!query) {
      return {
        type: "question",
        message: "What client are you looking for?",
        suggestions: ["Type a name to search"]
      };
    }
    
    const result = await findClient(organizationId, query);
    
    if (!result.success) {
      return {
        type: "error",
        message: result.error || "Search failed"
      };
    }
    
    if (!result.data || result.data.length === 0) {
      return {
        type: "search_results",
        message: `No clients found matching "${query}"`,
        data: [],
        suggestions: [
          `/client add "${query}"`,
          "Create a new client with this name"
        ]
      };
    }
    
    return {
      type: "search_results",
      message: `Found ${result.data.length} client(s)`,
      data: result.data.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || c.mobile
      }))
    };
  }
  
  return {
    type: "question",
    message: "What would you like to do?",
    suggestions: [
      "/client add \"Name\"",
      "/client find \"Name\""
    ]
  };
}

async function handleAddCommand(
  organizationId: number,
  userId: string,
  parsed: ParsedCommand,
  sessionId: string
): Promise<AgentResponse> {
  const currentDraft = getCurrentDraft(organizationId, userId);
  
  if (!currentDraft || currentDraft.type !== "quote") {
    return {
      type: "error",
      message: "No active quote draft. Create a quote first with /quote",
      suggestions: ["/quote callout \"Client Name\""]
    };
  }
  
  const { action, params } = parsed;
  
  if (action === "labour") {
    const hours = params.hours as number || 1;
    const rate = params.rate as number || 55;
    
    const result = await addLineItemToCurrentDraft(
      organizationId,
      userId,
      {
        type: "labour",
        description: `Labour - ${hours} hour${hours !== 1 ? "s" : ""}`,
        quantity: hours,
        rate,
        unit: "hour",
      }
    );
    
    if (!result.success) {
      return { type: "error", message: result.error || "Failed to add item" };
    }
    
    return {
      type: "draft",
      message: `Added ${hours}h labour at €${rate}/hr`,
      draft: result.data,
      draftType: "quote",
      actions: [
        { id: "confirm", label: "Confirm & Save", type: "confirm", payload: { draftId: result.data!.draftId } },
        { id: "add_more", label: "Add More", type: "edit" },
        { id: "cancel", label: "Cancel", type: "cancel" }
      ]
    };
  }
  
  if (action === "material") {
    const description = params.description as string || "Material";
    const quantity = params.quantity as number || 1;
    const rate = params.rate as number || 0;
    
    const result = await addLineItemToCurrentDraft(
      organizationId,
      userId,
      {
        type: "material",
        description,
        quantity,
        rate,
        unit: "each",
      }
    );
    
    if (!result.success) {
      return { type: "error", message: result.error || "Failed to add item" };
    }
    
    return {
      type: "draft",
      message: `Added ${quantity}x ${description} at €${rate} each`,
      draft: result.data,
      draftType: "quote",
      actions: [
        { id: "confirm", label: "Confirm & Save", type: "confirm", payload: { draftId: result.data!.draftId } },
        { id: "add_more", label: "Add More", type: "edit" }
      ]
    };
  }
  
  if (action === "discount") {
    const result = await applyDiscountToCurrentDraft(
      organizationId,
      userId,
      {
        percentage: params.percentage as number | undefined,
        amount: params.amount as number | undefined,
        reason: params.reason as string | undefined,
      }
    );
    
    if (!result.success) {
      if (result.requiresConfirmation) {
        return {
          type: "confirmation",
          message: result.confirmationMessage || "Confirm discount?",
          draft: result.data,
          draftType: "quote",
          actions: [
            { id: "confirm", label: "Apply Discount", type: "confirm" },
            { id: "cancel", label: "Cancel", type: "cancel" }
          ]
        };
      }
      return { type: "error", message: result.error || "Failed to apply discount" };
    }
    
    return {
      type: "draft",
      message: `Discount applied. New total: €${result.data!.total.toFixed(2)}`,
      draft: result.data,
      draftType: "quote"
    };
  }
  
  return {
    type: "question",
    message: "What would you like to add?",
    suggestions: [
      "/add labour 2h",
      "/add material \"Item name\" 1 50",
      "/add discount 5%"
    ]
  };
}

async function handleSearchCommand(
  organizationId: number,
  userId: string,
  parsed: ParsedCommand
): Promise<AgentResponse> {
  const query = parsed.params.query as string;
  
  if (!query) {
    return {
      type: "question",
      message: "What are you looking for?",
      suggestions: ["Client name, quote number, or invoice number"]
    };
  }
  
  const result = await searchEntities(organizationId, query);
  
  if (!result.success) {
    return { type: "error", message: result.error || "Search failed" };
  }
  
  const { clients, quotes, invoices } = result.data!;
  const totalResults = clients.length + quotes.length + invoices.length;
  
  if (totalResults === 0) {
    return {
      type: "search_results",
      message: `No results for "${query}"`,
      data: { clients: [], quotes: [], invoices: [] }
    };
  }
  
  return {
    type: "search_results",
    message: `Found ${totalResults} result(s)`,
    data: {
      clients: clients.map(c => ({ id: c.id, name: c.name, email: c.email })),
      quotes: quotes.map(q => ({ id: q.id, number: q.quoteNumber, total: q.total, status: q.status })),
      invoices: invoices.map(i => ({ id: i.id, number: i.invoiceNumber, total: i.total, status: i.status }))
    }
  };
}

async function handlePayCommand(
  organizationId: number,
  userId: string,
  parsed: ParsedCommand
): Promise<AgentResponse> {
  return {
    type: "error",
    message: "Payment recording is not yet available through commands. Use the invoice screen to record payments."
  };
}

export async function confirmDraft(
  organizationId: number,
  userId: string,
  draftId: string
): Promise<AgentResponse> {
  const result = await finalizeQuote(organizationId, userId, draftId);
  
  if (!result.success) {
    return {
      type: "error",
      message: result.error || "Failed to save quote"
    };
  }
  
  return {
    type: "success",
    message: `Quote ${result.data!.quoteNumber} saved successfully!`,
    data: result.data,
    suggestions: [
      `/invoice from quote ${result.data!.quoteNumber}`,
      "Create another quote"
    ]
  };
}

export async function cancelDraft(
  organizationId: number,
  userId: string
): Promise<AgentResponse> {
  clearCurrentDraft(organizationId, userId);
  
  return {
    type: "success",
    message: "Draft cancelled",
    suggestions: [
      "/quote callout \"Client Name\"",
      "Start a new quote"
    ]
  };
}

export function getCurrentDraft(
  organizationId: number,
  userId: string
): { type: "quote" | "invoice" | null; draft: DraftQuote | DraftInvoice | null } {
  const draft = getCurrentDraftFromStore(organizationId, userId);
  
  if (!draft) {
    return { type: null, draft: null };
  }
  
  return draft;
}

async function handleWithLlm(
  organizationId: number,
  userId: string,
  parsed: ParsedCommand,
  sessionId: string
): Promise<AgentResponse> {
  try {
    const anthropic = getAnthropicClient();
    if (!anthropic) {
      return executeCommand(organizationId, userId, parsed, sessionId);
    }
    
    const [org] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    const systemPrompt = `You are an assistant for Quotr, an invoicing app for Irish tradespeople.
The user's business type is: ${org?.tradeType || "unknown"}.
Your job is to interpret natural language requests and map them to structured commands.

Available commands:
- /quote <template_keyword> "<client_name>" [today|tomorrow] [notes] [+option1] [+option2]
- /invoice from quote <quote_number> [due 14d|30d]
- /client add "<name>" [email x] [phone y]
- /client find "<name>"
- /add labour <hours>h [rate]
- /add material "<description>" <quantity> <rate>
- /add discount <percentage>% [reason "<reason>"]

Respond with a JSON object:
{
  "command": "the slash command to execute",
  "explanation": "brief explanation for the user",
  "needsMoreInfo": false,
  "question": null
}

If you need more information, set needsMoreInfo to true and provide a question.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: "user", content: parsed.rawInput }
      ]
    });
    
    const textBlock = response.content.find((b: Anthropic.ContentBlock) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return executeCommand(organizationId, userId, parsed, sessionId);
    }
    
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return executeCommand(organizationId, userId, parsed, sessionId);
    }
    
    const llmResult = JSON.parse(jsonMatch[0]);
    
    if (llmResult.needsMoreInfo) {
      return {
        type: "question",
        message: llmResult.question || llmResult.explanation,
        suggestions: []
      };
    }
    
    if (llmResult.command && llmResult.command.startsWith("/")) {
      const newParsed = parseInput(llmResult.command);
      return executeCommand(organizationId, userId, newParsed, sessionId);
    }
    
    return {
      type: "error",
      message: llmResult.explanation || "I couldn't understand that request. Try using a slash command.",
      suggestions: [
        "/quote callout \"Client Name\"",
        "/invoice from quote QUO-0001"
      ]
    };
  } catch (error) {
    console.error("LLM processing error:", error);
    return executeCommand(organizationId, userId, parsed, sessionId);
  }
}
