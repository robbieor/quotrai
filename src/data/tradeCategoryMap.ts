/**
 * Relational trade_type → category → subcategory mapping.
 * Used for cascading filters and form dropdowns.
 */
export interface TradeCategory {
  name: string;
  subcategories: string[];
}

export interface TradeType {
  name: string;
  categories: TradeCategory[];
}

export const TRADE_CATEGORY_MAP: TradeType[] = [
  {
    name: "Electrical",
    categories: [
      { name: "Lighting", subcategories: ["LED", "Floodlights", "Emergency", "Downlights", "Battens", "Bulkheads", "Strip Lighting", "Outdoor"] },
      { name: "Cable", subcategories: ["Twin & Earth", "SWA", "Flex", "Data Cable", "Coaxial", "Fire Rated"] },
      { name: "Switches & Sockets", subcategories: ["Switches", "Sockets", "Dimmers", "USB Sockets", "Outdoor Sockets"] },
      { name: "Distribution", subcategories: ["Consumer Units", "MCBs", "RCBOs", "RCDs", "Isolators", "Busbars"] },
      { name: "Trunking & Containment", subcategories: ["Mini Trunking", "Dado Trunking", "Cable Tray", "Conduit", "Clips & Fixings"] },
      { name: "Fire Safety", subcategories: ["Smoke Detectors", "Heat Detectors", "Fire Alarm Panels", "Emergency Lighting"] },
      { name: "Accessories", subcategories: ["Junction Boxes", "Back Boxes", "Connectors", "Terminals", "Glands"] },
      { name: "Tools & Testing", subcategories: ["Multimeters", "Installation Testers", "Hand Tools", "Power Tools"] },
      { name: "Renewable Energy", subcategories: ["Solar Panels", "Inverters", "EV Chargers", "Batteries"] },
    ],
  },
  {
    name: "Plumbing",
    categories: [
      { name: "Pipes & Fittings", subcategories: ["Copper", "PVC", "Push-Fit", "Compression", "Press-Fit"] },
      { name: "Heating", subcategories: ["Radiators", "Boilers", "Thermostats", "Valves", "Cylinders"] },
      { name: "Bathroom", subcategories: ["Taps", "Showers", "Toilets", "Basins", "Baths"] },
      { name: "Water Treatment", subcategories: ["Filters", "Softeners", "Pumps"] },
      { name: "Tools & Accessories", subcategories: ["Pipe Cutters", "Soldering", "Wrenches", "PTFE & Sealants"] },
    ],
  },
  {
    name: "HVAC",
    categories: [
      { name: "Air Conditioning", subcategories: ["Split Units", "Multi-Split", "Ducted", "Portable"] },
      { name: "Ventilation", subcategories: ["Extractor Fans", "Ducting", "Grilles", "Heat Recovery"] },
      { name: "Refrigeration", subcategories: ["Compressors", "Condensers", "Evaporators", "Refrigerants"] },
      { name: "Controls", subcategories: ["Thermostats", "Sensors", "BMS", "Timers"] },
    ],
  },
  {
    name: "Carpentry",
    categories: [
      { name: "Timber", subcategories: ["Softwood", "Hardwood", "Sheet Materials", "Mouldings"] },
      { name: "Fixings", subcategories: ["Screws", "Nails", "Bolts", "Anchors", "Adhesives"] },
      { name: "Doors & Windows", subcategories: ["Internal Doors", "External Doors", "Door Furniture", "Window Hardware"] },
      { name: "Insulation", subcategories: ["Thermal", "Acoustic", "Membranes"] },
      { name: "Tools", subcategories: ["Saws", "Drills", "Sanders", "Measuring"] },
    ],
  },
  {
    name: "Painting",
    categories: [
      { name: "Paint", subcategories: ["Emulsion", "Gloss", "Primer", "Exterior", "Specialist"] },
      { name: "Preparation", subcategories: ["Filler", "Sandpaper", "Sugar Soap", "Masking"] },
      { name: "Tools", subcategories: ["Brushes", "Rollers", "Sprayers", "Trays"] },
      { name: "Wallcoverings", subcategories: ["Wallpaper", "Adhesive", "Lining Paper"] },
    ],
  },
  {
    name: "Roofing",
    categories: [
      { name: "Tiles & Slates", subcategories: ["Concrete Tiles", "Clay Tiles", "Slates", "Ridge Tiles"] },
      { name: "Flat Roofing", subcategories: ["Felt", "EPDM", "GRP", "Lead"] },
      { name: "Guttering", subcategories: ["PVC", "Cast Iron", "Aluminium", "Downpipes"] },
      { name: "Insulation", subcategories: ["PIR Board", "Mineral Wool", "Breathable Membrane"] },
    ],
  },
  {
    name: "General",
    categories: [
      { name: "Labour", subcategories: ["Standard Rate", "Overtime", "Apprentice", "Subcontractor"] },
      { name: "Materials", subcategories: ["Consumables", "Safety Equipment", "Sundries"] },
      { name: "Plant & Equipment", subcategories: ["Hire", "Purchase", "Fuel"] },
    ],
  },
];

/** Get categories for a given trade type */
export function getCategoriesForTrade(tradeName?: string): string[] {
  if (!tradeName) return getAllCategories();
  const trade = TRADE_CATEGORY_MAP.find((t) => t.name === tradeName);
  return trade ? trade.categories.map((c) => c.name) : [];
}

/** Get subcategories for a given trade type + category */
export function getSubcategoriesForCategory(tradeName?: string, categoryName?: string): string[] {
  if (!tradeName || !categoryName) return [];
  const trade = TRADE_CATEGORY_MAP.find((t) => t.name === tradeName);
  if (!trade) return [];
  const cat = trade.categories.find((c) => c.name === categoryName);
  return cat ? cat.subcategories : [];
}

/** All trade type names */
export function getAllTradeTypes(): string[] {
  return TRADE_CATEGORY_MAP.map((t) => t.name);
}

/** All unique categories across all trades */
export function getAllCategories(): string[] {
  const all = new Set<string>();
  TRADE_CATEGORY_MAP.forEach((t) => t.categories.forEach((c) => all.add(c.name)));
  return [...all];
}
