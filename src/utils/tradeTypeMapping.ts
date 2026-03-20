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
  "Locksmith": "locksmith",
  "Handyman": "handyman",
  "Cleaning Services": "general",
  "Pest Control": "pest_control",
  "Pool & Spa": "pool_spa",
  "Pressure Washing": "pressure_washing",
  "Fencing": "fencing",
  "Appliance Repair": "appliance_repair",
  "Auto Detailing": "auto_detailing",
  "Garage Door Services": "garage_door",
  "Tree Services": "tree_service",
  "Restoration": "restoration",
  "Solar": "solar",
  "Flooring": "flooring",
  "Tiler": "tiler",
  "Property Maintenance": "general",
  "Concrete & Masonry": "concrete_masonry",
  "Window & Door Installation": "window_door",
  "Other": "general",
};

export function mapTradeTypeToCategory(tradeType: string | null | undefined): TradeCategory | undefined {
  if (!tradeType) return undefined;
  return TRADE_TYPE_TO_CATEGORY[tradeType] || "general";
}
