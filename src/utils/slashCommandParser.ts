/**
 * Slash Command Parser — deterministic routing for common Revamo AI commands.
 * Bypasses LLM for well-formed commands, dramatically reducing latency.
 */

export interface ParsedSlashCommand {
  function_name: string;
  parameters: Record<string, any>;
  /** If true, the command was fully parsed and can skip the LLM */
  complete: boolean;
  /** Human-readable label for the intent */
  label: string;
  /** Original raw input */
  raw: string;
}

export interface SlashCommandHint {
  command: string;
  label: string;
  example: string;
}

export const SLASH_COMMANDS: SlashCommandHint[] = [
  { command: "/quote", label: "Create Quote", example: '/quote "Customer" description €amount' },
  { command: "/invoice", label: "Create Invoice", example: '/invoice "Customer" description €amount' },
  { command: "/expense", label: "Log Expense", example: "/expense €amount vendor description" },
  { command: "/job", label: "Schedule Job", example: '/job "Customer" title tomorrow 9am' },
  { command: "/client", label: "Create Customer", example: '/client "Name" email phone' },
];

/**
 * Check if a message starts with a slash command
 */
export function isSlashCommand(text: string): boolean {
  return /^\/[a-z]+/i.test(text.trim());
}

/**
 * Get matching slash command hints for autocomplete
 */
export function getSlashHints(text: string): SlashCommandHint[] {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed.startsWith("/")) return [];
  return SLASH_COMMANDS.filter(c => c.command.startsWith(trimmed));
}

/**
 * Parse a slash command into a webhook-ready payload.
 * Returns null if the text is not a slash command.
 */
export function parseSlashCommand(text: string): ParsedSlashCommand | null {
  const trimmed = text.trim();
  if (!isSlashCommand(trimmed)) return null;

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const rest = trimmed.slice(command.length).trim();

  switch (command) {
    case "/quote":
      return parseQuoteCommand(rest, trimmed);
    case "/invoice":
      return parseInvoiceCommand(rest, trimmed);
    case "/expense":
      return parseExpenseCommand(rest, trimmed);
    case "/job":
      return parseJobCommand(rest, trimmed);
    case "/client":
      return parseClientCommand(rest, trimmed);
    default:
      return null;
  }
}

// Extract quoted strings and €amounts from text
function extractQuoted(text: string): string | null {
  const match = text.match(/"([^"]+)"/);
  return match ? match[1] : null;
}

function extractAmount(text: string): number | null {
  const match = text.match(/€([\d,]+(?:\.\d{1,2})?)/);
  if (match) return parseFloat(match[1].replace(",", ""));
  const numMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(?:euro|eur)/i);
  if (numMatch) return parseFloat(numMatch[1]);
  return null;
}

function removeQuoted(text: string): string {
  return text.replace(/"[^"]*"/, "").trim();
}

function removeAmount(text: string): string {
  return text.replace(/€[\d,]+(?:\.\d{1,2})?/, "").replace(/\d+(?:\.\d{1,2})?\s*(?:euro|eur)/i, "").trim();
}

function parseQuoteCommand(rest: string, raw: string): ParsedSlashCommand {
  const customerName = extractQuoted(rest);
  const amount = extractAmount(rest);
  let description = removeQuoted(removeAmount(rest)).trim();
  // Clean up any remaining noise
  description = description.replace(/\s+/g, " ").trim();

  const params: Record<string, any> = {};
  if (customerName) params.customer_name = customerName;
  if (description) {
    params.items = [{ description, quantity: 1, unit_price: amount || 0 }];
  } else if (amount) {
    params.items = [{ description: "Service", quantity: 1, unit_price: amount }];
  }

  return {
    function_name: "create_quote",
    parameters: params,
    complete: !!(customerName && (description || amount)),
    label: "Create Quote",
    raw,
  };
}

function parseInvoiceCommand(rest: string, raw: string): ParsedSlashCommand {
  const customerName = extractQuoted(rest);
  const amount = extractAmount(rest);
  let description = removeQuoted(removeAmount(rest)).trim();
  description = description.replace(/\s+/g, " ").trim();

  const params: Record<string, any> = {};
  if (customerName) params.customer_name = customerName;
  if (description) {
    params.items = [{ description, quantity: 1, unit_price: amount || 0 }];
  } else if (amount) {
    params.items = [{ description: "Service", quantity: 1, unit_price: amount }];
  }

  return {
    function_name: "create_invoice",
    parameters: params,
    complete: !!(customerName && (description || amount)),
    label: "Create Invoice",
    raw,
  };
}

function parseExpenseCommand(rest: string, raw: string): ParsedSlashCommand {
  const amount = extractAmount(rest);
  const cleaned = removeAmount(rest).trim();
  // Try to split into vendor + description
  const words = cleaned.split(/\s+/);
  const vendor = words[0] || undefined;
  const description = words.slice(1).join(" ") || undefined;

  const params: Record<string, any> = {};
  if (amount) params.amount = amount;
  if (vendor) params.vendor_name = vendor;
  if (description) params.description = description;
  else if (vendor) params.description = vendor;
  params.category = "materials"; // default

  return {
    function_name: "log_expense",
    parameters: params,
    complete: !!(amount && (vendor || description)),
    label: "Log Expense",
    raw,
  };
}

function parseJobCommand(rest: string, raw: string): ParsedSlashCommand {
  const customerName = extractQuoted(rest);
  const cleaned = removeQuoted(rest).trim();
  const words = cleaned.split(/\s+/);

  const params: Record<string, any> = {};
  if (customerName) params.customer_name = customerName;
  if (words.length > 0) params.job_title = words.join(" ");

  return {
    function_name: "create_job",
    parameters: params,
    complete: !!(customerName && params.job_title),
    label: "Schedule Job",
    raw,
  };
}

function parseClientCommand(rest: string, raw: string): ParsedSlashCommand {
  const name = extractQuoted(rest);
  const cleaned = removeQuoted(rest).trim();
  const words = cleaned.split(/\s+/);

  const params: Record<string, any> = {};
  if (name) params.customer_name = name;

  // Try to detect email and phone from remaining words
  for (const word of words) {
    if (word.includes("@")) params.email = word;
    else if (/^[\d+\-()\s]{7,}$/.test(word)) params.phone = word;
  }

  return {
    function_name: "create_customer",
    parameters: params,
    complete: !!name,
    label: "Create Customer",
    raw,
  };
}
