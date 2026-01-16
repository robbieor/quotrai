import { z } from "zod";

export type CommandType = "quote" | "invoice" | "client" | "add" | "search" | "job" | "pay" | "unknown";

export interface ParsedCommand {
  type: CommandType;
  action?: string;
  params: Record<string, string | number | boolean | string[]>;
  rawInput: string;
  confidence: "high" | "medium" | "low";
  needsLlm: boolean;
  missingFields?: string[];
}

const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  electrician: [
    "callout", "eicr", "ev", "ev-charger", "socket", "light", "lighting",
    "fuse", "fuseboard", "cu", "consumer-unit", "rewire", "cable", "wiring",
    "rcbo", "rcd", "pir", "sensor", "alarm", "smoke-detector", "fault",
    "emergency", "breakdown", "diagnostic"
  ],
  plumber: [
    "callout", "boiler", "heating", "radiator", "bathroom", "kitchen",
    "sink", "tap", "toilet", "shower", "bath", "leak", "pipe", "drain",
    "blockage", "cylinder", "immersion", "water-heater", "pressure",
    "emergency", "breakdown"
  ],
  carpentry_joinery: [
    "callout", "door", "window", "frame", "cabinet", "wardrobe", "shelf",
    "deck", "decking", "fence", "gate", "staircase", "floor", "flooring",
    "skirting", "trim", "molding", "repair", "custom"
  ]
};

const TIME_PATTERNS: Record<string, RegExp> = {
  today: /\btoday\b/i,
  tomorrow: /\btomorrow\b/i,
  time: /\b(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i,
  dayOfWeek: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  dateFormat: /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/,
};

const PAYMENT_TERMS: Record<string, number> = {
  "7d": 7, "14d": 14, "30d": 30, "due7": 7, "due14": 14, "due30": 30,
  "net7": 7, "net14": 14, "net30": 30, "cod": 0, "immediate": 0
};

export function parseSlashCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  
  if (!trimmed.startsWith("/")) {
    return {
      type: "unknown",
      params: {},
      rawInput: input,
      confidence: "low",
      needsLlm: true
    };
  }

  const parts = tokenize(trimmed.slice(1));
  if (parts.length === 0) {
    return {
      type: "unknown",
      params: {},
      rawInput: input,
      confidence: "low",
      needsLlm: false
    };
  }

  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case "quote":
      return parseQuoteCommand(args, input);
    case "invoice":
      return parseInvoiceCommand(args, input);
    case "client":
      return parseClientCommand(args, input);
    case "add":
      return parseAddCommand(args, input);
    case "search":
    case "find":
      return parseSearchCommand(args, input);
    case "job":
      return parseJobCommand(args, input);
    case "pay":
    case "payment":
      return parsePayCommand(args, input);
    default:
      return {
        type: "unknown",
        params: { attemptedCommand: command },
        rawInput: input,
        confidence: "low",
        needsLlm: true
      };
  }
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (const char of input) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else if (char === " " && !inQuotes) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function parseQuoteCommand(args: string[], rawInput: string): ParsedCommand {
  const params: Record<string, any> = {};
  const missingFields: string[] = [];
  let confidence: "high" | "medium" | "low" = "high";

  if (args.length === 0) {
    return {
      type: "quote",
      action: "create",
      params: {},
      rawInput,
      confidence: "low",
      needsLlm: true,
      missingFields: ["template", "client"]
    };
  }

  let idx = 0;
  const first = args[idx]?.toLowerCase();
  
  const allKeywords = Object.values(TEMPLATE_KEYWORDS).flat();
  if (allKeywords.includes(first)) {
    params.templateKeyword = first;
    idx++;
  } else {
    missingFields.push("template");
    confidence = "medium";
  }

  if (args[idx] && !args[idx].startsWith("+") && !isTimeOrOption(args[idx])) {
    params.clientName = args[idx];
    idx++;
  } else {
    missingFields.push("client");
    confidence = "low";
  }

  const options: string[] = [];
  const notes: string[] = [];

  for (; idx < args.length; idx++) {
    const arg = args[idx];
    const lower = arg.toLowerCase();

    if (TIME_PATTERNS.today.test(lower)) {
      params.when = "today";
    } else if (TIME_PATTERNS.tomorrow.test(lower)) {
      params.when = "tomorrow";
    } else if (TIME_PATTERNS.time.test(lower)) {
      params.time = arg;
    } else if (TIME_PATTERNS.dayOfWeek.test(lower)) {
      params.dayOfWeek = lower;
    } else if (TIME_PATTERNS.dateFormat.test(arg)) {
      params.date = arg;
    } else if (arg.startsWith("+")) {
      options.push(arg.slice(1));
    } else if (lower === "include" && args[idx + 1]) {
      options.push(args[idx + 1]);
      idx++;
    } else if (lower === "rush" || lower === "urgent" || lower === "emergency") {
      params.priority = lower;
    } else {
      notes.push(arg);
    }
  }

  if (options.length > 0) {
    params.options = options;
  }
  if (notes.length > 0) {
    params.notes = notes.join(" ");
  }

  return {
    type: "quote",
    action: "create",
    params,
    rawInput,
    confidence,
    needsLlm: confidence !== "high" || missingFields.length > 0,
    missingFields: missingFields.length > 0 ? missingFields : undefined
  };
}

function parseInvoiceCommand(args: string[], rawInput: string): ParsedCommand {
  const params: Record<string, any> = {};
  let confidence: "high" | "medium" | "low" = "high";

  if (args.length === 0) {
    return {
      type: "invoice",
      action: "create",
      params: {},
      rawInput,
      confidence: "low",
      needsLlm: true,
      missingFields: ["source"]
    };
  }

  const first = args[0]?.toLowerCase();

  if (first === "from" && args[1]?.toLowerCase() === "quote") {
    params.action = "convert";
    params.quoteRef = args[2];
    
    for (let i = 3; i < args.length; i++) {
      const term = args[i].toLowerCase();
      if (PAYMENT_TERMS[term]) {
        params.dueDays = PAYMENT_TERMS[term];
      } else if (term === "due" && args[i + 1]) {
        const dueTerm = args[i + 1].toLowerCase();
        if (PAYMENT_TERMS[dueTerm]) {
          params.dueDays = PAYMENT_TERMS[dueTerm];
          i++;
        }
      }
    }
    
    if (!params.quoteRef) {
      confidence = "low";
    }
    
    return {
      type: "invoice",
      action: "convert",
      params,
      rawInput,
      confidence,
      needsLlm: !params.quoteRef
    };
  }

  if (first === "quick") {
    params.action = "quick";
    let idx = 1;
    
    if (args[idx]) {
      params.clientName = args[idx];
      idx++;
    }
    if (args[idx]) {
      params.description = args[idx];
      idx++;
    }
    if (args[idx]) {
      const amount = parseFloat(args[idx]);
      if (!isNaN(amount)) {
        params.amount = amount;
        idx++;
      }
    }
    
    return {
      type: "invoice",
      action: "quick",
      params,
      rawInput,
      confidence: params.clientName && params.amount ? "high" : "medium",
      needsLlm: !params.clientName || !params.amount
    };
  }

  return {
    type: "invoice",
    params: { freeformArgs: args },
    rawInput,
    confidence: "low",
    needsLlm: true
  };
}

function parseClientCommand(args: string[], rawInput: string): ParsedCommand {
  const params: Record<string, any> = {};

  if (args.length === 0) {
    return {
      type: "client",
      params: {},
      rawInput,
      confidence: "low",
      needsLlm: true,
      missingFields: ["action"]
    };
  }

  const action = args[0]?.toLowerCase();

  if (action === "add" || action === "create" || action === "new") {
    let idx = 1;
    
    if (args[idx]) {
      params.name = args[idx];
      idx++;
    }
    
    for (; idx < args.length; idx++) {
      const key = args[idx]?.toLowerCase();
      const value = args[idx + 1];
      
      if (key === "email" && value) {
        params.email = value;
        idx++;
      } else if (key === "phone" && value) {
        params.phone = value;
        idx++;
      } else if (key === "mobile" && value) {
        params.mobile = value;
        idx++;
      } else if (key === "address" && value) {
        params.address = value;
        idx++;
      }
    }
    
    return {
      type: "client",
      action: "add",
      params,
      rawInput,
      confidence: params.name ? "high" : "low",
      needsLlm: !params.name,
      missingFields: !params.name ? ["name"] : undefined
    };
  }

  if (action === "find" || action === "search") {
    const query = args.slice(1).join(" ");
    return {
      type: "client",
      action: "find",
      params: { query },
      rawInput,
      confidence: query ? "high" : "low",
      needsLlm: false
    };
  }

  return {
    type: "client",
    params: { freeformArgs: args },
    rawInput,
    confidence: "low",
    needsLlm: true
  };
}

function parseAddCommand(args: string[], rawInput: string): ParsedCommand {
  const params: Record<string, any> = {};

  if (args.length === 0) {
    return {
      type: "add",
      params: {},
      rawInput,
      confidence: "low",
      needsLlm: true,
      missingFields: ["itemType"]
    };
  }

  const itemType = args[0]?.toLowerCase();

  if (itemType === "labour" || itemType === "labor") {
    params.itemType = "labour";
    if (args[1]) {
      const match = args[1].match(/^(\d+(?:\.\d+)?)(h|hr|hrs|hour|hours)?$/i);
      if (match) {
        params.hours = parseFloat(match[1]);
      }
    }
    if (args[2]) {
      params.rate = parseFloat(args[2]);
    }
    
    return {
      type: "add",
      action: "labour",
      params,
      rawInput,
      confidence: params.hours ? "high" : "medium",
      needsLlm: false
    };
  }

  if (itemType === "material" || itemType === "materials") {
    params.itemType = "material";
    let idx = 1;
    
    if (args[idx]) {
      params.description = args[idx];
      idx++;
    }
    if (args[idx]) {
      const qty = parseFloat(args[idx]);
      if (!isNaN(qty)) {
        params.quantity = qty;
        idx++;
      }
    }
    if (args[idx]) {
      const rate = parseFloat(args[idx]);
      if (!isNaN(rate)) {
        params.rate = rate;
        idx++;
      }
    }
    
    return {
      type: "add",
      action: "material",
      params,
      rawInput,
      confidence: params.description ? "high" : "medium",
      needsLlm: false
    };
  }

  if (itemType === "discount") {
    params.itemType = "discount";
    if (args[1]) {
      const match = args[1].match(/^(\d+(?:\.\d+)?)(%)$/);
      if (match) {
        params.percentage = parseFloat(match[1]);
      } else {
        const amount = parseFloat(args[1]);
        if (!isNaN(amount)) {
          params.amount = amount;
        }
      }
    }
    
    const reasonIdx = args.findIndex(a => a.toLowerCase() === "reason");
    if (reasonIdx > -1) {
      params.reason = args.slice(reasonIdx + 1).join(" ");
    }
    
    return {
      type: "add",
      action: "discount",
      params,
      rawInput,
      confidence: params.percentage || params.amount ? "high" : "medium",
      needsLlm: false
    };
  }

  return {
    type: "add",
    params: { freeformArgs: args },
    rawInput,
    confidence: "low",
    needsLlm: true
  };
}

function parseSearchCommand(args: string[], rawInput: string): ParsedCommand {
  const query = args.join(" ");
  return {
    type: "search",
    params: { query },
    rawInput,
    confidence: query ? "high" : "low",
    needsLlm: false
  };
}

function parseJobCommand(args: string[], rawInput: string): ParsedCommand {
  const params: Record<string, any> = {};

  if (args.length === 0) {
    return {
      type: "job",
      params: {},
      rawInput,
      confidence: "low",
      needsLlm: true
    };
  }

  const action = args[0]?.toLowerCase();

  if (action === "schedule") {
    params.action = "schedule";
    return {
      type: "job",
      action: "schedule",
      params: { freeformArgs: args.slice(1) },
      rawInput,
      confidence: "medium",
      needsLlm: true
    };
  }

  return {
    type: "job",
    params: { freeformArgs: args },
    rawInput,
    confidence: "low",
    needsLlm: true
  };
}

function parsePayCommand(args: string[], rawInput: string): ParsedCommand {
  const params: Record<string, any> = {};

  if (args.length === 0) {
    return {
      type: "pay",
      params: {},
      rawInput,
      confidence: "low",
      needsLlm: true
    };
  }

  if (args[0]) {
    params.invoiceRef = args[0];
  }

  const methodKeywords = ["cash", "card", "transfer", "bank", "cheque", "check"];
  for (const arg of args) {
    if (methodKeywords.includes(arg.toLowerCase())) {
      params.method = arg.toLowerCase();
      break;
    }
  }

  return {
    type: "pay",
    action: "record",
    params,
    rawInput,
    confidence: params.invoiceRef ? "high" : "low",
    needsLlm: !params.invoiceRef
  };
}

function isTimeOrOption(arg: string): boolean {
  const lower = arg.toLowerCase();
  return (
    TIME_PATTERNS.today.test(lower) ||
    TIME_PATTERNS.tomorrow.test(lower) ||
    TIME_PATTERNS.time.test(lower) ||
    TIME_PATTERNS.dayOfWeek.test(lower) ||
    TIME_PATTERNS.dateFormat.test(arg) ||
    arg.startsWith("+") ||
    lower === "include" ||
    lower === "rush" ||
    lower === "urgent" ||
    lower === "emergency"
  );
}

export function detectNaturalLanguageIntent(input: string): ParsedCommand {
  const lower = input.toLowerCase().trim();
  
  const quotePatterns = [
    /quote\s+(?:for\s+)?(?:a\s+)?(.+?)\s+(?:for|to)\s+(.+)/i,
    /create\s+(?:a\s+)?quote\s+(?:for\s+)?(.+)/i,
    /need\s+(?:a\s+)?quote\s+(?:for\s+)?(.+)/i,
  ];
  
  for (const pattern of quotePatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        type: "quote",
        action: "create",
        params: {
          naturalDescription: match[1] || input,
          clientHint: match[2]
        },
        rawInput: input,
        confidence: "medium",
        needsLlm: true
      };
    }
  }
  
  const invoicePatterns = [
    /invoice\s+(?:for\s+)?(.+)/i,
    /create\s+(?:an?\s+)?invoice/i,
    /bill\s+(.+)/i,
  ];
  
  for (const pattern of invoicePatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        type: "invoice",
        params: { naturalDescription: match[1] || input },
        rawInput: input,
        confidence: "medium",
        needsLlm: true
      };
    }
  }
  
  const clientPatterns = [
    /add\s+(?:a\s+)?(?:new\s+)?client\s+(.+)/i,
    /create\s+(?:a\s+)?client\s+(.+)/i,
    /new\s+client\s+(.+)/i,
  ];
  
  for (const pattern of clientPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        type: "client",
        action: "add",
        params: { naturalDescription: match[1] },
        rawInput: input,
        confidence: "medium",
        needsLlm: true
      };
    }
  }
  
  return {
    type: "unknown",
    params: { naturalDescription: input },
    rawInput: input,
    confidence: "low",
    needsLlm: true
  };
}

export function parseInput(input: string): ParsedCommand {
  const trimmed = input.trim();
  
  if (trimmed.startsWith("/")) {
    return parseSlashCommand(trimmed);
  }
  
  return detectNaturalLanguageIntent(trimmed);
}
