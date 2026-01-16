export { parseSlashCommand, parseInput, detectNaturalLanguageIntent } from "./command-parser";
export type { ParsedCommand, CommandType } from "./command-parser";

export { 
  getOrCreateSession, updateSession, addConversationMessage, clearSession,
  createDraftQuote, getDraftQuote, updateDraftQuote, priceDraftQuote,
  confirmDraftQuote, cancelDraftQuote, finalizeDraftQuote, deleteDraftQuote,
  addItemToDraft, clearCurrentDraft,
  createDraftInvoice, getDraftInvoice
} from "./session-store";
export type { 
  AgentSessionContext, ConversationMessage, 
  DraftQuote, DraftInvoice, DraftLineItem 
} from "./session-store";

export {
  findClient, createClient, getOrCreateClientByName,
  listTemplates, getTemplate, recommendTemplate,
  createQuoteDraftFromTemplate, addLineItemToCurrentDraft,
  applyDiscountToCurrentDraft, finalizeQuote, createInvoiceFromQuote,
  searchEntities, logAgentAction
} from "./tools";
export type { ToolResult, AuditLogEntry } from "./tools";

export { processAgentCommand, confirmDraft, cancelDraft, getCurrentDraft } from "./router";
export type { AgentResponse, AgentAction } from "./router";

export { 
  recordCommandUsage, getPersonalizedSuggestions, getUserCommandStats 
} from "./patterns";
export type { PatternSuggestion } from "./patterns";
