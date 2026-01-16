import { db } from "../db";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import { 
  clients, quotes, quoteItems, invoices, invoiceItems, 
  globalTemplates, globalTemplateItems, templateVersions,
  activityLogs, organizations
} from "@shared/schema";
import {
  DraftQuote, DraftLineItem,
  createDraftQuote, updateDraftQuote, getDraftQuote, 
  priceDraftQuote, finalizeDraftQuote, deleteDraftQuote,
  addItemToDraft, updateSession, getOrCreateSession
} from "./session-store";

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface AuditLogEntry {
  actionType: string;
  entityType: string;
  entityId?: number;
  payload: any;
  result: any;
  userId: string;
  organizationId: number;
  createdVia: "agent" | "manual";
  agentSessionId?: string;
}

export async function logAgentAction(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      userId: entry.userId,
      organizationId: entry.organizationId,
      action: entry.actionType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: JSON.stringify({
        ...entry.payload,
        createdVia: entry.createdVia,
        agentSessionId: entry.agentSessionId,
        result: entry.result
      })
    });
  } catch (error) {
    console.error("Failed to log agent action:", error);
  }
}

export async function findClient(
  organizationId: number,
  query: string
): Promise<ToolResult<typeof clients.$inferSelect[]>> {
  try {
    const results = await db.select()
      .from(clients)
      .where(and(
        eq(clients.organizationId, organizationId),
        ilike(clients.name, `%${query}%`)
      ))
      .limit(10);
    
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: `Failed to search clients: ${error}` };
  }
}

export async function createClient(
  organizationId: number,
  userId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    mobile?: string;
    address?: string;
  },
  agentSessionId?: string
): Promise<ToolResult<typeof clients.$inferSelect>> {
  try {
    const [client] = await db.insert(clients).values({
      userId,
      organizationId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      mobile: data.mobile || null,
      address: data.address || null,
    }).returning();
    
    await logAgentAction({
      actionType: "create_client",
      entityType: "client",
      entityId: client.id,
      payload: data,
      result: { clientId: client.id },
      userId,
      organizationId,
      createdVia: "agent",
      agentSessionId,
    });
    
    updateSession(organizationId, userId, {
      lastClientId: client.id,
      lastClientName: client.name,
    });
    
    return { success: true, data: client };
  } catch (error) {
    return { success: false, error: `Failed to create client: ${error}` };
  }
}

export async function getOrCreateClientByName(
  organizationId: number,
  userId: string,
  name: string,
  additionalData?: { email?: string; phone?: string; mobile?: string; address?: string },
  agentSessionId?: string
): Promise<ToolResult<typeof clients.$inferSelect>> {
  const searchResult = await findClient(organizationId, name);
  
  if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
    const exactMatch = searchResult.data.find(
      c => c.name.toLowerCase() === name.toLowerCase()
    );
    if (exactMatch) {
      updateSession(organizationId, userId, {
        lastClientId: exactMatch.id,
        lastClientName: exactMatch.name,
      });
      return { success: true, data: exactMatch };
    }
    
    if (searchResult.data.length === 1) {
      const client = searchResult.data[0];
      updateSession(organizationId, userId, {
        lastClientId: client.id,
        lastClientName: client.name,
      });
      return { success: true, data: client };
    }
    
    return {
      success: true,
      data: searchResult.data[0],
      requiresConfirmation: true,
      confirmationMessage: `Found ${searchResult.data.length} clients matching "${name}". Did you mean: ${searchResult.data.map(c => c.name).join(", ")}?`
    };
  }
  
  return createClient(organizationId, userId, { name, ...additionalData }, agentSessionId);
}

export async function listTemplates(
  tradeType: string,
  category?: string
): Promise<ToolResult<typeof globalTemplates.$inferSelect[]>> {
  try {
    let query = db.select()
      .from(globalTemplates)
      .where(and(
        eq(globalTemplates.tradeType, tradeType),
        eq(globalTemplates.isActive, true)
      ));
    
    const results = await query;
    
    const filtered = category 
      ? results.filter(t => t.category === category)
      : results;
    
    return { success: true, data: filtered };
  } catch (error) {
    return { success: false, error: `Failed to list templates: ${error}` };
  }
}

export async function getTemplate(
  templateId: number
): Promise<ToolResult<{
  template: typeof globalTemplates.$inferSelect;
  items: typeof globalTemplateItems.$inferSelect[];
  currentVersion: typeof templateVersions.$inferSelect | null;
}>> {
  try {
    const [template] = await db.select()
      .from(globalTemplates)
      .where(eq(globalTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return { success: false, error: "Template not found" };
    }
    
    const items = await db.select()
      .from(globalTemplateItems)
      .where(eq(globalTemplateItems.templateId, templateId))
      .orderBy(globalTemplateItems.sortOrder);
    
    const [currentVersion] = await db.select()
      .from(templateVersions)
      .where(and(
        eq(templateVersions.templateId, templateId),
        eq(templateVersions.isCurrent, true)
      ))
      .limit(1);
    
    return { 
      success: true, 
      data: { template, items, currentVersion: currentVersion || null } 
    };
  } catch (error) {
    return { success: false, error: `Failed to get template: ${error}` };
  }
}

export async function recommendTemplate(
  tradeType: string,
  keyword: string
): Promise<ToolResult<typeof globalTemplates.$inferSelect | null>> {
  try {
    const templates = await db.select()
      .from(globalTemplates)
      .where(and(
        eq(globalTemplates.tradeType, tradeType),
        eq(globalTemplates.isActive, true)
      ));
    
    const keywordLower = keyword.toLowerCase();
    
    const exactMatch = templates.find(
      t => t.name.toLowerCase() === keywordLower || 
           t.name.toLowerCase().includes(keywordLower)
    );
    
    if (exactMatch) {
      return { success: true, data: exactMatch };
    }
    
    const keywordMap: Record<string, string[]> = {
      "callout": ["callout", "call-out", "call out", "fault", "emergency", "breakdown"],
      "eicr": ["eicr", "electrical inspection", "periodic inspection", "condition report"],
      "ev": ["ev", "ev-charger", "electric vehicle", "charging point", "charger"],
      "cu": ["cu", "consumer unit", "fuse box", "fuseboard", "distribution board"],
      "rewire": ["rewire", "full rewire", "house rewire", "complete rewire"],
      "boiler": ["boiler", "boiler service", "boiler repair", "gas boiler"],
      "bathroom": ["bathroom", "bathroom fit", "bathroom install"],
    };
    
    for (const [templateKey, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(k => keywordLower.includes(k) || k.includes(keywordLower))) {
        const match = templates.find(t => 
          t.name.toLowerCase().includes(templateKey) ||
          t.category?.toLowerCase() === templateKey
        );
        if (match) return { success: true, data: match };
      }
    }
    
    const recommended = templates.find(t => t.isRecommended);
    if (recommended) {
      return { success: true, data: recommended };
    }
    
    return { success: true, data: templates[0] || null };
  } catch (error) {
    return { success: false, error: `Failed to recommend template: ${error}` };
  }
}

export async function createQuoteDraftFromTemplate(
  organizationId: number,
  userId: string,
  clientId: number,
  templateId: number,
  options?: {
    selectedOptions?: string[];
    notes?: string;
    priority?: "normal" | "rush" | "urgent" | "emergency";
    scheduledDate?: Date;
    scheduledTime?: string;
  }
): Promise<ToolResult<DraftQuote>> {
  try {
    const templateResult = await getTemplate(templateId);
    if (!templateResult.success || !templateResult.data) {
      return { success: false, error: templateResult.error || "Template not found" };
    }
    
    const { template, items, currentVersion } = templateResult.data;
    
    const [client] = await db.select()
      .from(clients)
      .where(and(
        eq(clients.id, clientId),
        eq(clients.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!client) {
      return { success: false, error: "Client not found" };
    }
    
    const draftItems: Omit<DraftLineItem, "id" | "amount">[] = items.map(item => ({
      type: item.isOptional ? "option" : "service",
      description: item.description,
      quantity: parseFloat(item.quantity || "1"),
      rate: parseFloat(item.rate || "0"),
      unit: item.unit || "each",
      isOptional: item.isOptional,
      isIncluded: item.isOptional 
        ? options?.selectedOptions?.some(o => 
            item.description.toLowerCase().includes(o.toLowerCase())
          ) || false
        : true,
    }));
    
    const draft = createDraftQuote(organizationId, userId, {
      clientId,
      clientName: client.name,
      templateVersionId: currentVersion?.id,
      templateName: template.name,
      options: options?.selectedOptions || [],
      notes: options?.notes,
      priority: options?.priority,
      scheduledDate: options?.scheduledDate,
      scheduledTime: options?.scheduledTime,
      vatRate: parseFloat(template.vatRate || "0.23"),
    });
    
    for (const item of draftItems) {
      addItemToDraft(draft.draftId, item);
    }
    
    const pricedDraft = priceDraftQuote(draft.draftId);
    
    return { success: true, data: pricedDraft! };
  } catch (error) {
    return { success: false, error: `Failed to create quote draft: ${error}` };
  }
}

export async function addLineItemToCurrentDraft(
  organizationId: number,
  userId: string,
  item: {
    type: "labour" | "material" | "service" | "callout";
    description: string;
    quantity: number;
    rate: number;
    unit?: string;
  }
): Promise<ToolResult<DraftQuote>> {
  const session = getOrCreateSession(organizationId, userId);
  
  if (!session.currentDraftId || session.currentDraftType !== "quote") {
    return { success: false, error: "No active quote draft. Create a quote first." };
  }
  
  const draft = addItemToDraft(session.currentDraftId, {
    ...item,
    isOptional: false,
    isIncluded: true,
  });
  
  if (!draft) {
    return { success: false, error: "Draft not found" };
  }
  
  return { success: true, data: draft };
}

export async function applyDiscountToCurrentDraft(
  organizationId: number,
  userId: string,
  discount: { percentage?: number; amount?: number; reason?: string }
): Promise<ToolResult<DraftQuote>> {
  const session = getOrCreateSession(organizationId, userId);
  
  if (!session.currentDraftId || session.currentDraftType !== "quote") {
    return { success: false, error: "No active quote draft" };
  }
  
  const draft = getDraftQuote(session.currentDraftId);
  if (!draft) {
    return { success: false, error: "Draft not found" };
  }
  
  let discountAmount = 0;
  if (discount.percentage) {
    if (discount.percentage > 20) {
      return {
        success: false,
        error: `Discount of ${discount.percentage}% exceeds maximum allowed (20%). Please confirm this override.`,
        requiresConfirmation: true,
        confirmationMessage: `Apply ${discount.percentage}% discount? This exceeds the standard limit.`
      };
    }
    discountAmount = draft.subtotal * (discount.percentage / 100);
  } else if (discount.amount) {
    discountAmount = discount.amount;
  }
  
  const updated = updateDraftQuote(session.currentDraftId, {
    discount: discountAmount,
    discountReason: discount.reason,
  });
  
  if (updated) {
    priceDraftQuote(session.currentDraftId);
  }
  
  return { success: true, data: getDraftQuote(session.currentDraftId)! };
}

export async function finalizeQuote(
  organizationId: number,
  userId: string,
  draftId: string,
  agentSessionId?: string
): Promise<ToolResult<typeof quotes.$inferSelect>> {
  try {
    const draft = getDraftQuote(draftId);
    if (!draft) {
      return { success: false, error: "Draft not found" };
    }
    
    if (!draft.clientId) {
      return { success: false, error: "Client is required to finalize quote" };
    }
    
    const existingQuotes = await db.select()
      .from(quotes)
      .where(eq(quotes.organizationId, organizationId));
    const quoteNumber = `QUO-${String(existingQuotes.length + 1).padStart(4, "0")}`;
    
    const [org] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    const [quote] = await db.insert(quotes).values({
      userId,
      organizationId,
      clientId: draft.clientId,
      quoteNumber,
      templateVersionId: draft.templateVersionId || null,
      tradeTypeAtCreation: org?.tradeType || null,
      date: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: draft.subtotal.toFixed(2),
      discount: draft.discount.toFixed(2),
      vatRate: draft.vatRate.toFixed(4),
      vatAmount: draft.vatAmount.toFixed(2),
      total: draft.total.toFixed(2),
      notes: draft.notes || null,
      status: "open",
    }).returning();
    
    const includedItems = draft.items.filter(
      item => !item.isOptional || item.isIncluded
    );
    
    if (includedItems.length > 0) {
      await db.insert(quoteItems).values(
        includedItems.map(item => ({
          quoteId: quote.id,
          description: item.description,
          quantity: item.quantity.toString(),
          rate: item.rate.toFixed(2),
          amount: item.amount.toFixed(2),
        }))
      );
    }
    
    await logAgentAction({
      actionType: "create_quote",
      entityType: "quote",
      entityId: quote.id,
      payload: {
        draftId,
        clientId: draft.clientId,
        templateVersionId: draft.templateVersionId,
        itemCount: includedItems.length,
        total: draft.total,
      },
      result: { quoteId: quote.id, quoteNumber },
      userId,
      organizationId,
      createdVia: "agent",
      agentSessionId,
    });
    
    finalizeDraftQuote(draftId);
    deleteDraftQuote(draftId);
    
    updateSession(organizationId, userId, {
      currentDraftId: undefined,
      currentDraftType: undefined,
    });
    
    return { success: true, data: quote };
  } catch (error) {
    return { success: false, error: `Failed to finalize quote: ${error}` };
  }
}

export async function createInvoiceFromQuote(
  organizationId: number,
  userId: string,
  quoteRef: string,
  dueDays?: number,
  agentSessionId?: string
): Promise<ToolResult<typeof invoices.$inferSelect>> {
  try {
    let quote: typeof quotes.$inferSelect | undefined;
    
    const upperRef = quoteRef.toUpperCase();
    if (upperRef.startsWith("Q-") || upperRef.startsWith("QUO-")) {
      const [found] = await db.select()
        .from(quotes)
        .where(and(
          eq(quotes.organizationId, organizationId),
          eq(quotes.quoteNumber, upperRef)
        ))
        .limit(1);
      quote = found;
    } else {
      const quoteId = parseInt(quoteRef);
      if (!isNaN(quoteId)) {
        const [found] = await db.select()
          .from(quotes)
          .where(and(
            eq(quotes.id, quoteId),
            eq(quotes.organizationId, organizationId)
          ))
          .limit(1);
        quote = found;
      }
    }
    
    if (!quote) {
      return { success: false, error: `Quote "${quoteRef}" not found` };
    }
    
    if (quote.status === "converted") {
      return { success: false, error: "This quote has already been converted to an invoice" };
    }
    
    const items = await db.select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quote.id));
    
    const existingInvoices = await db.select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId));
    const invoiceNumber = `INV-${String(existingInvoices.length + 1).padStart(4, "0")}`;
    
    const [client] = await db.select()
      .from(clients)
      .where(eq(clients.id, quote.clientId))
      .limit(1);
    const paymentTerms = dueDays ?? client?.paymentTerms ?? 30;
    
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    
    const [invoice] = await db.insert(invoices).values({
      userId,
      organizationId,
      clientId: quote.clientId,
      invoiceNumber,
      date: invoiceDate,
      dueDate,
      subtotal: quote.subtotal,
      discount: quote.discount,
      vatRate: quote.vatRate,
      vatAmount: quote.vatAmount,
      total: quote.total,
      notes: quote.notes,
      status: "draft",
    }).returning();
    
    if (items.length > 0) {
      await db.insert(invoiceItems).values(
        items.map(item => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
        }))
      );
    }
    
    await db.update(quotes)
      .set({
        status: "converted",
        convertedToInvoiceId: invoice.id,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quote.id));
    
    await logAgentAction({
      actionType: "convert_quote_to_invoice",
      entityType: "invoice",
      entityId: invoice.id,
      payload: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        dueDays: paymentTerms,
      },
      result: { invoiceId: invoice.id, invoiceNumber },
      userId,
      organizationId,
      createdVia: "agent",
      agentSessionId,
    });
    
    return { success: true, data: invoice };
  } catch (error) {
    return { success: false, error: `Failed to create invoice from quote: ${error}` };
  }
}

export async function searchEntities(
  organizationId: number,
  query: string
): Promise<ToolResult<{
  clients: typeof clients.$inferSelect[];
  quotes: typeof quotes.$inferSelect[];
  invoices: typeof invoices.$inferSelect[];
}>> {
  try {
    const clientResults = await db.select()
      .from(clients)
      .where(and(
        eq(clients.organizationId, organizationId),
        ilike(clients.name, `%${query}%`)
      ))
      .limit(5);
    
    const quoteResults = await db.select()
      .from(quotes)
      .where(and(
        eq(quotes.organizationId, organizationId),
        ilike(quotes.quoteNumber, `%${query}%`)
      ))
      .limit(5);
    
    const invoiceResults = await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        ilike(invoices.invoiceNumber, `%${query}%`)
      ))
      .limit(5);
    
    return {
      success: true,
      data: {
        clients: clientResults,
        quotes: quoteResults,
        invoices: invoiceResults,
      }
    };
  } catch (error) {
    return { success: false, error: `Search failed: ${error}` };
  }
}
