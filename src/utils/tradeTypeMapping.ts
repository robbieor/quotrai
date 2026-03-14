import type { TradeCategory } from "@/hooks/useTemplates";

// Maps the user-friendly trade type strings from onboarding to database category values
const TRADE_TYPE_TO_CATEGORY: Record<string, TradeCategory> = {
  "Electrician": "electrician",
  "Plumber": "plumber",
  "HVAC Technician": "hvac",
  "Carpenter": "carpenter",
  "Painter & Decorator": "painter",
  "Roofer": "roofer",
  "Landscaper": "landscaper",
  "Builder / General Contractor": "general",
  "Locksmith": "general",
  "Other": "general",
};

export function mapTradeTypeToCategory(tradeType: string | null | undefined): TradeCategory | undefined {
  if (!tradeType) return undefined;
  return TRADE_TYPE_TO_CATEGORY[tradeType] || "general";
}
