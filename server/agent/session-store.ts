export interface AgentSessionContext {
  sessionId: string;
  organizationId: number;
  userId: string;
  lastClientId?: number;
  lastClientName?: string;
  lastTemplateId?: number;
  lastTemplateKeyword?: string;
  currentDraftId?: string;
  currentDraftType?: "quote" | "invoice";
  conversationHistory: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  commandParsed?: any;
}

export interface DraftQuote {
  draftId: string;
  organizationId: number;
  userId: string;
  clientId?: number;
  clientName?: string;
  templateVersionId?: number;
  templateName?: string;
  items: DraftLineItem[];
  options: string[];
  subtotal: number;
  discount: number;
  discountReason?: string;
  vatRate: number;
  vatAmount: number;
  total: number;
  notes?: string;
  priority?: "normal" | "rush" | "urgent" | "emergency";
  scheduledDate?: Date;
  scheduledTime?: string;
  status: "draft" | "priced" | "confirmed" | "finalized" | "cancelled";
  createdVia: "agent" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftInvoice {
  draftId: string;
  organizationId: number;
  userId: string;
  clientId?: number;
  clientName?: string;
  sourceQuoteId?: number;
  items: DraftLineItem[];
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  dueDate?: Date;
  notes?: string;
  status: "draft" | "priced" | "confirmed" | "finalized" | "cancelled";
  createdVia: "agent" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftLineItem {
  id: string;
  type: "labour" | "material" | "service" | "callout" | "option";
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  unit?: string;
  isOptional?: boolean;
  isIncluded?: boolean;
}

const sessionStore = new Map<string, AgentSessionContext>();
const draftQuotes = new Map<string, DraftQuote>();
const draftInvoices = new Map<string, DraftInvoice>();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateSession(
  organizationId: number,
  userId: string
): AgentSessionContext {
  const key = `${organizationId}:${userId}`;
  
  let session = sessionStore.get(key);
  if (!session) {
    session = {
      sessionId: generateId(),
      organizationId,
      userId,
      conversationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    sessionStore.set(key, session);
  }
  
  return session;
}

export function updateSession(
  organizationId: number,
  userId: string,
  updates: Partial<Omit<AgentSessionContext, "sessionId" | "organizationId" | "userId" | "createdAt">>
): AgentSessionContext {
  const session = getOrCreateSession(organizationId, userId);
  
  Object.assign(session, updates, { updatedAt: new Date() });
  
  const key = `${organizationId}:${userId}`;
  sessionStore.set(key, session);
  
  return session;
}

export function addConversationMessage(
  organizationId: number,
  userId: string,
  message: Omit<ConversationMessage, "timestamp">
): void {
  const session = getOrCreateSession(organizationId, userId);
  
  session.conversationHistory.push({
    ...message,
    timestamp: new Date(),
  });
  
  if (session.conversationHistory.length > 50) {
    session.conversationHistory = session.conversationHistory.slice(-50);
  }
  
  session.updatedAt = new Date();
}

export function clearSession(organizationId: number, userId: string): void {
  const key = `${organizationId}:${userId}`;
  sessionStore.delete(key);
}

export function createDraftQuote(
  organizationId: number,
  userId: string,
  initialData: Partial<Omit<DraftQuote, "draftId" | "organizationId" | "userId" | "status" | "createdAt" | "updatedAt">>
): DraftQuote {
  const draftId = generateId();
  
  const draft: DraftQuote = {
    draftId,
    organizationId,
    userId,
    items: [],
    options: [],
    subtotal: 0,
    discount: 0,
    vatRate: 0.23,
    vatAmount: 0,
    total: 0,
    status: "draft",
    createdVia: "agent",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...initialData,
  };
  
  draftQuotes.set(draftId, draft);
  
  updateSession(organizationId, userId, {
    currentDraftId: draftId,
    currentDraftType: "quote",
  });
  
  return draft;
}

export function getDraftQuote(draftId: string): DraftQuote | undefined {
  return draftQuotes.get(draftId);
}

export function updateDraftQuote(
  draftId: string,
  updates: Partial<Omit<DraftQuote, "draftId" | "organizationId" | "userId" | "createdAt">>
): DraftQuote | undefined {
  const draft = draftQuotes.get(draftId);
  if (!draft) return undefined;
  
  Object.assign(draft, updates, { updatedAt: new Date() });
  draftQuotes.set(draftId, draft);
  
  return draft;
}

export function addItemToDraft(
  draftId: string,
  item: Omit<DraftLineItem, "id" | "amount">
): DraftQuote | undefined {
  const draft = draftQuotes.get(draftId);
  if (!draft) return undefined;
  
  const newItem: DraftLineItem = {
    id: generateId(),
    ...item,
    amount: item.quantity * item.rate,
  };
  
  draft.items.push(newItem);
  
  recalculateDraftTotals(draft);
  draft.updatedAt = new Date();
  draftQuotes.set(draftId, draft);
  
  return draft;
}

export function recalculateDraftTotals(draft: DraftQuote): void {
  const includedItems = draft.items.filter(
    item => !item.isOptional || item.isIncluded
  );
  
  draft.subtotal = includedItems.reduce((sum, item) => sum + item.amount, 0);
  const taxableAmount = Math.max(0, draft.subtotal - draft.discount);
  draft.vatAmount = taxableAmount * draft.vatRate;
  draft.total = taxableAmount + draft.vatAmount;
}

export function priceDraftQuote(draftId: string): DraftQuote | undefined {
  const draft = draftQuotes.get(draftId);
  if (!draft) return undefined;
  
  recalculateDraftTotals(draft);
  draft.status = "priced";
  draft.updatedAt = new Date();
  draftQuotes.set(draftId, draft);
  
  return draft;
}

export function confirmDraftQuote(draftId: string): DraftQuote | undefined {
  const draft = draftQuotes.get(draftId);
  if (!draft) return undefined;
  
  draft.status = "confirmed";
  draft.updatedAt = new Date();
  draftQuotes.set(draftId, draft);
  
  return draft;
}

export function cancelDraftQuote(draftId: string): void {
  const draft = draftQuotes.get(draftId);
  if (draft) {
    draft.status = "cancelled";
    draftQuotes.set(draftId, draft);
  }
}

export function finalizeDraftQuote(draftId: string): DraftQuote | undefined {
  const draft = draftQuotes.get(draftId);
  if (!draft) return undefined;
  
  draft.status = "finalized";
  draft.updatedAt = new Date();
  draftQuotes.set(draftId, draft);
  
  return draft;
}

export function deleteDraftQuote(draftId: string): void {
  draftQuotes.delete(draftId);
}

export function createDraftInvoice(
  organizationId: number,
  userId: string,
  initialData: Partial<Omit<DraftInvoice, "draftId" | "organizationId" | "userId" | "status" | "createdAt" | "updatedAt">>
): DraftInvoice {
  const draftId = generateId();
  
  const draft: DraftInvoice = {
    draftId,
    organizationId,
    userId,
    items: [],
    subtotal: 0,
    discount: 0,
    vatRate: 0.23,
    vatAmount: 0,
    total: 0,
    status: "draft",
    createdVia: "agent",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...initialData,
  };
  
  draftInvoices.set(draftId, draft);
  
  updateSession(organizationId, userId, {
    currentDraftId: draftId,
    currentDraftType: "invoice",
  });
  
  return draft;
}

export function getDraftInvoice(draftId: string): DraftInvoice | undefined {
  return draftInvoices.get(draftId);
}

export function getCurrentDraft(
  organizationId: number,
  userId: string
): { type: "quote" | "invoice"; draft: DraftQuote | DraftInvoice } | undefined {
  const session = getOrCreateSession(organizationId, userId);
  
  if (!session.currentDraftId || !session.currentDraftType) {
    return undefined;
  }
  
  if (session.currentDraftType === "quote") {
    const draft = draftQuotes.get(session.currentDraftId);
    if (draft) return { type: "quote", draft };
  } else {
    const draft = draftInvoices.get(session.currentDraftId);
    if (draft) return { type: "invoice", draft };
  }
  
  return undefined;
}

export function clearCurrentDraft(organizationId: number, userId: string): void {
  const session = getOrCreateSession(organizationId, userId);
  
  if (session.currentDraftId) {
    if (session.currentDraftType === "quote") {
      draftQuotes.delete(session.currentDraftId);
    } else {
      draftInvoices.delete(session.currentDraftId);
    }
  }
  
  updateSession(organizationId, userId, {
    currentDraftId: undefined,
    currentDraftType: undefined,
  });
}
