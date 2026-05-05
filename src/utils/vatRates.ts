// Country VAT/GST/Sales Tax tables for launch markets.
// Materials and Labour can carry different rates (e.g. Ireland reduced rate
// for construction labour). Users can also override with "Custom".

export type LineGroupKey = "Materials" | "Labour" | "Other";

export interface CountryVatConfig {
  code: string;          // ISO-2 uppercase
  label: string;
  taxName: string;       // 'VAT' | 'GST' | 'Sales Tax'
  currency: string;
  /** Allowed quick-pick rates per line group */
  rates: Record<LineGroupKey, number[]>;
  /** Default rate per line group when adding a new line */
  defaults: Record<LineGroupKey, number>;
}

// Launch markets (Phase 1): IE, GB, US, CA, AU, NZ.
// Other countries fall back to a no-tax config so flow keeps working.
export const COUNTRY_VAT_CONFIGS: Record<string, CountryVatConfig> = {
  IE: {
    code: "IE",
    label: "Ireland",
    taxName: "VAT",
    currency: "EUR",
    rates: {
      Materials: [23, 13.5, 9, 0],
      Labour: [13.5, 23, 9, 0],
      Other: [23, 13.5, 9, 0],
    },
    defaults: { Materials: 23, Labour: 13.5, Other: 23 },
  },
  GB: {
    code: "GB",
    label: "United Kingdom",
    taxName: "VAT",
    currency: "GBP",
    rates: {
      Materials: [20, 5, 0],
      Labour: [20, 5, 0],
      Other: [20, 5, 0],
    },
    defaults: { Materials: 20, Labour: 20, Other: 20 },
  },
  US: {
    code: "US",
    label: "United States",
    taxName: "Sales Tax",
    currency: "USD",
    // Sales tax varies by state. Default to 0 — user enters per-line if needed.
    rates: {
      Materials: [0],
      Labour: [0],
      Other: [0],
    },
    defaults: { Materials: 0, Labour: 0, Other: 0 },
  },
  CA: {
    code: "CA",
    label: "Canada",
    taxName: "GST/HST",
    currency: "CAD",
    // Province-dependent; we expose common rates for quick pick.
    rates: {
      Materials: [5, 13, 15, 0],
      Labour: [5, 13, 15, 0],
      Other: [5, 13, 15, 0],
    },
    defaults: { Materials: 5, Labour: 5, Other: 5 },
  },
  AU: {
    code: "AU",
    label: "Australia",
    taxName: "GST",
    currency: "AUD",
    rates: {
      Materials: [10, 0],
      Labour: [10, 0],
      Other: [10, 0],
    },
    defaults: { Materials: 10, Labour: 10, Other: 10 },
  },
  NZ: {
    code: "NZ",
    label: "New Zealand",
    taxName: "GST",
    currency: "NZD",
    rates: {
      Materials: [15, 0],
      Labour: [15, 0],
      Other: [15, 0],
    },
    defaults: { Materials: 15, Labour: 15, Other: 15 },
  },
};

const DEFAULT_FALLBACK: CountryVatConfig = {
  code: "XX",
  label: "Other",
  taxName: "Tax",
  currency: "EUR",
  rates: { Materials: [0], Labour: [0], Other: [0] },
  defaults: { Materials: 0, Labour: 0, Other: 0 },
};

function normalize(code: string | null | undefined): string {
  return (code || "").toUpperCase();
}

function normalizeGroup(group: string | null | undefined): LineGroupKey {
  if (group === "Labour" || group === "Labor") return "Labour";
  if (group === "Materials") return "Materials";
  return "Other";
}

export function getVatConfig(country: string | null | undefined): CountryVatConfig {
  const c = normalize(country);
  return COUNTRY_VAT_CONFIGS[c] ?? DEFAULT_FALLBACK;
}

/** True if we have an explicit launch-market config for the country. */
export function hasVatConfig(country: string | null | undefined): boolean {
  return !!COUNTRY_VAT_CONFIGS[normalize(country)];
}

export function getDefaultLineRate(
  country: string | null | undefined,
  lineGroup: string | null | undefined
): number {
  const cfg = getVatConfig(country);
  return cfg.defaults[normalizeGroup(lineGroup)];
}

export function getAllowedRates(
  country: string | null | undefined,
  lineGroup: string | null | undefined
): number[] {
  const cfg = getVatConfig(country);
  return cfg.rates[normalizeGroup(lineGroup)];
}

export function getTaxName(country: string | null | undefined): string {
  return getVatConfig(country).taxName;
}

/** Launch-market countries for profile/settings selectors. */
export function getSupportedVatCountries(): { code: string; label: string }[] {
  return Object.values(COUNTRY_VAT_CONFIGS).map((c) => ({
    code: c.code,
    label: c.label,
  }));
}

/** Compute totals from per-line tax rates. Returns subtotal, tax, total + breakdown. */
export interface LineForTotals {
  quantity: number;
  unit_price: number;
  tax_rate?: number | null;
}

export interface TaxBreakdownEntry {
  rate: number;
  base: number;
  tax: number;
}

export interface TotalsResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  /** Sorted descending by rate */
  breakdown: TaxBreakdownEntry[];
  /** Single rate if all lines share one, else null */
  uniformRate: number | null;
}

export function calculateTotals(items: LineForTotals[]): TotalsResult {
  const buckets = new Map<number, { base: number; tax: number }>();
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const lineSubtotal = qty * price;
    const rate = Number(item.tax_rate) || 0;
    const lineTax = lineSubtotal * (rate / 100);
    subtotal += lineSubtotal;
    taxAmount += lineTax;
    const bucket = buckets.get(rate) ?? { base: 0, tax: 0 };
    bucket.base += lineSubtotal;
    bucket.tax += lineTax;
    buckets.set(rate, bucket);
  }

  const breakdown: TaxBreakdownEntry[] = Array.from(buckets.entries())
    .map(([rate, { base, tax }]) => ({ rate, base, tax }))
    .sort((a, b) => b.rate - a.rate);

  const nonZero = breakdown.filter((b) => b.rate > 0);
  const uniformRate =
    breakdown.length === 1
      ? breakdown[0].rate
      : nonZero.length === 1 && breakdown.find((b) => b.rate === 0) === undefined
      ? nonZero[0].rate
      : null;

  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
    breakdown,
    uniformRate,
  };
}
