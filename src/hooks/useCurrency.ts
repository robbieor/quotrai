import { useProfile } from "./useProfile";

export type CurrencyCode = "EUR" | "GBP" | "USD" | "AUD" | "CAD" | "NZD" | "CHF";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  EUR: { code: "EUR", symbol: "€", name: "Euro", locale: "en-IE" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  USD: { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
};

export const CURRENCY_OPTIONS = Object.values(CURRENCIES);

export function useCurrency() {
  const { profile, isLoading } = useProfile();
  
  const currencyCode = (profile?.currency as CurrencyCode) || "EUR";
  const config = CURRENCIES[currencyCode] || CURRENCIES.EUR;

  const formatCurrency = (amount: number | null | undefined, opts?: { decimals?: number }): string => {
    if (amount == null) return `${config.symbol}0`;
    const decimals = opts?.decimals ?? (Number.isInteger(amount) ? 0 : 2);
    
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  const formatCompact = (amount: number | null | undefined): string => {
    if (amount == null) return `${config.symbol}0`;
    
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const formatRate = (rate: number | null | undefined, unit: string = "hr"): string => {
    if (rate == null) return "—";
    return `${formatCurrency(rate)}/${unit}`;
  };

  return {
    currency: config,
    currencyCode,
    symbol: config.symbol,
    formatCurrency,
    formatCompact,
    formatRate,
    isLoading,
  };
}
