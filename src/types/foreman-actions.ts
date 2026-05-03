/**
 * Revamo AI — Live Action Mode types
 * Structured execution model for the AI operator experience.
 */

export type ActionStepStatus = "pending" | "running" | "complete" | "failed" | "awaiting_approval";
export type ActionStatus = "listening" | "interpreting" | "working" | "needs_confirmation" | "completed" | "failed";
export type InputSource = "voice" | "typed" | "quick_action";
export type SendMode = "draft" | "confirmed" | "blocked";

export interface ExtractedEntity {
  label: string;        // e.g. "Customer"
  value: string;        // e.g. "John Murphy"
  confidence: "high" | "medium" | "low";
  key: string;          // e.g. "client_name"
}

export interface ActionStep {
  id: string;
  label: string;
  status: ActionStepStatus;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

export interface ConfirmationGate {
  id: string;
  message: string;         // "This will send the quote to john@example.com"
  risk_level: "low" | "medium" | "high";
  actions: ConfirmationAction[];
}

export interface ConfirmationAction {
  label: string;
  action: "confirm" | "review" | "cancel";
  variant: "default" | "destructive" | "outline";
}

export interface ActionOutput {
  type: "quote" | "invoice" | "job" | "client" | "expense" | "reminder" | "info" | "text";
  title: string;
  summary?: string;
  record_id?: string;
  record_number?: string;
  preview_data?: Record<string, unknown>;
  quick_actions?: OutputQuickAction[];
}

export interface OutputQuickAction {
  label: string;
  action: string;
  variant?: "default" | "outline" | "destructive";
}

export interface MemoryContext {
  current_customer?: { id: string; name: string };
  current_job?: { id: string; title: string };
  current_quote?: { id: string; number: string };
  current_invoice?: { id: string; number: string };
  last_template?: string;
  unresolved_fields?: string[];
  session_entities?: Array<{ key: string; value: string; timestamp: string }>;
}

/** The full structured AI action plan returned from the edge function */
export interface AIActionPlan {
  action_id: string;
  status: ActionStatus;
  input_source: InputSource;
  command_text: string;
  timestamp: string;

  // Understanding
  intent: string;
  intent_label: string;       // Human-readable e.g. "Create Quote"
  entities: ExtractedEntity[];

  // Execution
  steps: ActionStep[];

  // Output
  output?: ActionOutput;
  text_response: string;

  // Safety
  confirmation_gate?: ConfirmationGate;

  // Deferred execution (when confirmation is needed, tool calls are stored here)
  pending_tool_calls?: Array<{ function_name: string; parameters: Record<string, unknown> }>;

  // Memory
  memory_context?: MemoryContext;

  // Conversation
  conversation_id?: string;
}

/** User preference memory (persisted in DB) */
export interface ForemanPreferences {
  always_create_drafts: boolean;
  default_payment_terms_days: number;
  itemised_format: boolean;
  require_confirmation_before_send: boolean;
  default_tax_rate?: number;
  labour_materials_split: boolean;
}

export const DEFAULT_FOREMAN_PREFERENCES: ForemanPreferences = {
  always_create_drafts: true,
  default_payment_terms_days: 14,
  itemised_format: true,
  require_confirmation_before_send: true,
  labour_materials_split: true,
};
