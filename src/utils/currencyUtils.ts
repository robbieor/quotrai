// Country to currency mapping
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  ie: 'EUR',  // Ireland
  gb: 'GBP',  // United Kingdom
  uk: 'GBP',  // Alternative code for UK
  us: 'USD',  // United States
  de: 'EUR',  // Germany
  fr: 'EUR',  // France
  es: 'EUR',  // Spain
  it: 'EUR',  // Italy
  nl: 'EUR',  // Netherlands
  be: 'EUR',  // Belgium
  at: 'EUR',  // Austria
  pt: 'EUR',  // Portugal
  fi: 'EUR',  // Finland
  gr: 'EUR',  // Greece
  ca: 'CAD',  // Canada
  au: 'AUD',  // Australia
  nz: 'NZD',  // New Zealand
  ch: 'CHF',  // Switzerland
  se: 'SEK',  // Sweden
  no: 'NOK',  // Norway
  dk: 'DKK',  // Denmark
  pl: 'PLN',  // Poland
};

// Currency symbols and display info
export const CURRENCY_INFO: Record<string, { symbol: string; name: string; locale: string }> = {
  EUR: { symbol: '€', name: 'Euro', locale: 'en-IE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  SEK: { symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO' },
  DKK: { symbol: 'kr', name: 'Danish Krone', locale: 'da-DK' },
  PLN: { symbol: 'zł', name: 'Polish Zloty', locale: 'pl-PL' },
};

// Map country codes to their default VAT/tax rates
export const COUNTRY_VAT_RATES: Record<string, number> = {
  ie: 23,   // Ireland - 23% VAT
  gb: 20,   // United Kingdom - 20% VAT
  uk: 20,   // Alternative code for UK
  us: 0,    // United States - varies by state, default to 0
  ca: 5,    // Canada - 5% GST (provinces may have additional taxes)
  au: 10,   // Australia - 10% GST
  nz: 15,   // New Zealand - 15% GST
  de: 19,   // Germany - 19% VAT
  fr: 20,   // France - 20% VAT
  es: 21,   // Spain - 21% VAT
  it: 22,   // Italy - 22% VAT
  nl: 21,   // Netherlands - 21% VAT
  be: 21,   // Belgium - 21% VAT
  at: 20,   // Austria - 20% VAT
  ch: 8.1,  // Switzerland - 8.1% VAT
  se: 25,   // Sweden - 25% VAT
  no: 25,   // Norway - 25% VAT
  dk: 25,   // Denmark - 25% VAT
  fi: 24,   // Finland - 24% VAT
  pl: 23,   // Poland - 23% VAT
  pt: 23,   // Portugal - 23% VAT
};

export const DEFAULT_VAT_RATE = 0;

// Default currency when country is not recognized
export const DEFAULT_CURRENCY = 'EUR';

/**
 * Get VAT rate from country code
 */
export function getVatRateFromCountry(countryCode: string | null | undefined): number {
  if (!countryCode) return DEFAULT_VAT_RATE;
  const normalized = countryCode.toLowerCase();
  return COUNTRY_VAT_RATES[normalized] ?? DEFAULT_VAT_RATE;
}

/**
 * Get country VAT info for display
 */
export function getCountryVatInfo(countryCode: string | null | undefined): { rate: number; label: string } | null {
  if (!countryCode) return null;
  const normalized = countryCode.toLowerCase();
  const rate = COUNTRY_VAT_RATES[normalized];
  if (rate === undefined) return null;
  
  const countryNames: Record<string, string> = {
    ie: 'Ireland',
    gb: 'UK',
    uk: 'UK',
    de: 'Germany',
    fr: 'France',
    es: 'Spain',
    it: 'Italy',
    nl: 'Netherlands',
    be: 'Belgium',
    at: 'Austria',
    ch: 'Switzerland',
    se: 'Sweden',
    no: 'Norway',
    dk: 'Denmark',
    fi: 'Finland',
    pl: 'Poland',
    pt: 'Portugal',
    us: 'USA',
    ca: 'Canada',
    au: 'Australia',
    nz: 'New Zealand',
  };
  
  return { rate, label: `${countryNames[normalized] || normalized.toUpperCase()} ${rate}%` };
}

/**
 * Get currency code from country code
 */
export function getCurrencyFromCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return DEFAULT_CURRENCY;
  const normalized = countryCode.toLowerCase();
  return COUNTRY_CURRENCY_MAP[normalized] || DEFAULT_CURRENCY;
}

/**
 * Format a value as currency
 */
export function formatCurrencyValue(value: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const info = CURRENCY_INFO[currencyCode] || CURRENCY_INFO[DEFAULT_CURRENCY];
  const decimals = 0;
  return new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_INFO[currencyCode]?.symbol || currencyCode;
}

/**
 * Get list of supported currencies for dropdown
 */
export function getSupportedCurrencies(): { code: string; name: string; symbol: string }[] {
  return Object.entries(CURRENCY_INFO).map(([code, info]) => ({
    code,
    name: info.name,
    symbol: info.symbol,
  }));
}
