import { useState, useEffect } from "react";

type CurrencyCode = "EUR" | "GBP" | "AUD" | "CAD" | "NZD" | "USD";

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  rate: number; // rate from EUR
}

const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  IE: { code: "EUR", symbol: "€", rate: 1 },
  DE: { code: "EUR", symbol: "€", rate: 1 },
  FR: { code: "EUR", symbol: "€", rate: 1 },
  ES: { code: "EUR", symbol: "€", rate: 1 },
  IT: { code: "EUR", symbol: "€", rate: 1 },
  NL: { code: "EUR", symbol: "€", rate: 1 },
  GB: { code: "GBP", symbol: "£", rate: 0.86 },
  AU: { code: "AUD", symbol: "A$", rate: 1.67 },
  CA: { code: "CAD", symbol: "C$", rate: 1.48 },
  NZ: { code: "NZD", symbol: "NZ$", rate: 1.79 },
};

const DEFAULT_CURRENCY: CurrencyInfo = { code: "USD", symbol: "$", rate: 1.08 };
const FALLBACK_CURRENCY: CurrencyInfo = { code: "EUR", symbol: "€", rate: 1 };

const CACHE_KEY = "quotr_landing_currency";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function useLandingCurrency() {
  const [currency, setCurrency] = useState<CurrencyInfo>(FALLBACK_CURRENCY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setCurrency(data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore cache errors
    }

    const controller = new AbortController();

    fetch("https://ipapi.co/json/", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const countryCode = data?.country_code as string;
        const detected = CURRENCY_MAP[countryCode] || DEFAULT_CURRENCY;
        setCurrency(detected);
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: detected, timestamp: Date.now() })
          );
        } catch {
          // ignore storage errors
        }
      })
      .catch(() => {
        // On error, keep EUR fallback
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  /** Format a EUR base price into the detected currency */
  const formatPrice = (eurAmount: number, decimals = 0): string => {
    const converted = Math.round(eurAmount * currency.rate);
    return `${currency.symbol}${converted.toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  return { currency, loading, formatPrice };
}
