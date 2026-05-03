import { useState, useCallback, useRef } from 'react';

export interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  // Legacy fields kept for compatibility
  address_id?: string;
  type?: string;
  text?: string;
  description?: string;
}

export interface GeocodedAddress {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  postcode?: string;
  city?: string;
  county?: string;
  country?: string;
  countryCode?: string;
  line1?: string;
  line2?: string;
  region?: string;
  confidence?: 'high' | 'medium' | 'low' | 'none';
  isPOBox?: boolean;
}

export type PostcodeType = 'eircode' | 'uk' | 'us' | 'unknown';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const UK_POSTCODE_PATTERN = /^([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i;
const UK_POSTCODE_PARTIAL = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d?[A-Z]{0,2}$/i;
const EIRCODE_PATTERN = /^([A-Z]\d{2}\s?[A-Z0-9]{4})$/i;
const EIRCODE_PARTIAL = /^[A-Z]\d{2}\s?[A-Z0-9]{0,4}$/i;
const US_ZIP_PATTERN = /^(\d{5})(-\d{4})?$/;
const US_ZIP_PARTIAL = /^\d{1,5}(-\d{0,4})?$/;

export function detectPostcodeType(input: string): PostcodeType {
  const normalized = input.trim().toUpperCase();
  if (/^\d/.test(normalized)) {
    if (US_ZIP_PATTERN.test(normalized) || US_ZIP_PARTIAL.test(normalized)) return 'us';
  }
  if (EIRCODE_PATTERN.test(normalized)) return 'eircode';
  if (UK_POSTCODE_PATTERN.test(normalized)) return 'uk';
  if (/^[A-Z]\d{2}/i.test(normalized) && EIRCODE_PARTIAL.test(normalized)) return 'eircode';
  if (UK_POSTCODE_PARTIAL.test(normalized)) return 'uk';
  return 'unknown';
}

export function isValidEircode(input: string): boolean {
  const normalized = input.replace(/\s+/g, '').toUpperCase();
  return EIRCODE_PATTERN.test(normalized) || /^[A-Z]\d{2}[A-Z0-9]{4}$/.test(normalized);
}

export function isValidUKPostcode(input: string): boolean {
  return UK_POSTCODE_PATTERN.test(input.trim().toUpperCase());
}

export function isValidUSZip(input: string): boolean {
  return US_ZIP_PATTERN.test(input.trim());
}

export function looksLikePostcode(input: string): boolean {
  const normalized = input.trim().toUpperCase();
  return /^[A-Z]\d/.test(normalized) || /^\d{3,}/.test(normalized);
}

export interface PostcodeValidation {
  isValid: boolean;
  isPartial: boolean;
  type: PostcodeType;
  message?: string;
  example?: string;
}

export function validatePostcode(input: string): PostcodeValidation {
  const normalized = input.replace(/\s+/g, '').toUpperCase();
  if (!normalized || normalized.length < 3) {
    return { isValid: false, isPartial: true, type: 'unknown' };
  }
  const detectedType = detectPostcodeType(input);
  if (detectedType === 'eircode') {
    if (isValidEircode(input)) return { isValid: true, isPartial: false, type: 'eircode' };
    if (EIRCODE_PARTIAL.test(normalized) && normalized.length < 7) {
      return { isValid: false, isPartial: true, type: 'eircode', message: 'Keep typing to complete the Eircode', example: 'e.g., D02 X285' };
    }
    if (normalized.length >= 7) {
      return { isValid: false, isPartial: false, type: 'eircode', message: 'Invalid Eircode format', example: 'Format: A99 XXXX (e.g., D02 X285, T12 AB34)' };
    }
  }
  if (detectedType === 'uk') {
    if (isValidUKPostcode(input)) return { isValid: true, isPartial: false, type: 'uk' };
    if (UK_POSTCODE_PARTIAL.test(normalized) && normalized.length < 6) {
      return { isValid: false, isPartial: true, type: 'uk', message: 'Keep typing to complete the postcode', example: 'e.g., SW1A 1AA' };
    }
    if (normalized.length >= 5) {
      return { isValid: false, isPartial: false, type: 'uk', message: 'Invalid UK postcode format', example: 'Format: AA9A 9AA (e.g., SW1A 1AA, M1 1AE)' };
    }
  }
  if (detectedType === 'us') {
    if (isValidUSZip(input)) return { isValid: true, isPartial: false, type: 'us' };
    if (US_ZIP_PARTIAL.test(normalized) && normalized.replace('-', '').length < 5) {
      return { isValid: false, isPartial: true, type: 'us', message: 'Keep typing to complete the ZIP code', example: 'e.g., 10001 or 10001-1234' };
    }
    if (normalized.length >= 5) {
      return { isValid: false, isPartial: false, type: 'us', message: 'Invalid US ZIP code format', example: 'Format: 12345 or 12345-6789' };
    }
  }
  return { isValid: false, isPartial: true, type: 'unknown' };
}

export function formatPostcode(input: string, type: PostcodeType): string {
  const normalized = input.replace(/\s+/g, '').toUpperCase();
  if (type === 'eircode' && normalized.length === 7) return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
  if (type === 'uk' && normalized.length >= 5) return `${normalized.slice(0, -3)} ${normalized.slice(-3)}`;
  if (type === 'us') {
    const digits = normalized.replace('-', '');
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  }
  return input;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

function getEdgeFunctionUrl(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/eircode-lookup`;
}

export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<PostcodeType>('unknown');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Autocomplete via Nominatim directly (faster for typing)
  const searchAddress = useCallback(async (query: string, countryCode?: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const type = detectPostcodeType(query);
      if (type !== 'unknown') setDetectedCountry(type);

      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
      });
      if (countryCode) params.set('countrycodes', countryCode);

      const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Revamo-App/1.0' },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Failed to fetch suggestions');

      const results = await response.json();
      const mapped: AddressSuggestion[] = results.map((r: any) => ({
        display_name: r.display_name,
        lat: r.lat,
        lon: r.lon,
        address: r.address || {},
      }));
      setSuggestions(mapped);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to search addresses');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((query: string, countryCode?: string) => {
      searchAddress(query, countryCode);
    }, 300),
    [searchAddress]
  );

  // Geocode via edge function (for postcode lookups)
  const geocodeAddress = useCallback(async (address: string, _country?: string): Promise<GeocodedAddress | null> => {
    if (!address) return null;
    const url = getEdgeFunctionUrl();
    if (!url) return null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: address, mode: 'lookup' }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (!data.latitude && !data.longitude) return null;

      return {
        formattedAddress: data.formattedAddress || address,
        latitude: data.latitude,
        longitude: data.longitude,
        postcode: data.postcode,
        city: data.city,
        county: data.region,
        country: data.country,
        countryCode: data.countryCode,
        line1: data.line1,
        line2: data.line2,
        region: data.region,
        confidence: data.confidence || 'medium',
        isPOBox: false,
      };
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  }, []);

  const lookupEircode = useCallback(async (eircode: string): Promise<GeocodedAddress | null> => {
    if (!isValidEircode(eircode)) return null;
    setDetectedCountry('eircode');
    return geocodeAddress(eircode);
  }, [geocodeAddress]);

  const lookupUKPostcode = useCallback(async (postcode: string): Promise<GeocodedAddress | null> => {
    if (!isValidUKPostcode(postcode)) return null;
    setDetectedCountry('uk');
    return geocodeAddress(postcode);
  }, [geocodeAddress]);

  const lookupUSZip = useCallback(async (zip: string): Promise<GeocodedAddress | null> => {
    if (!isValidUSZip(zip)) return null;
    setDetectedCountry('us');
    return geocodeAddress(zip);
  }, [geocodeAddress]);

  const lookupPostcode = useCallback(async (postcode: string): Promise<GeocodedAddress | null> => {
    const type = detectPostcodeType(postcode);
    setDetectedCountry(type);
    switch (type) {
      case 'eircode': return lookupEircode(postcode);
      case 'uk': return lookupUKPostcode(postcode);
      case 'us': return lookupUSZip(postcode);
      default: return geocodeAddress(postcode);
    }
  }, [lookupEircode, lookupUKPostcode, lookupUSZip, geocodeAddress]);

  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<GeocodedAddress | null> => {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        addressdetails: '1',
      });

      const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Revamo-App/1.0' },
      });

      if (!response.ok) throw new Error('Failed to reverse geocode');

      const result = await response.json();
      const countryCode = result.address?.country_code?.toLowerCase();
      if (countryCode === 'ie') setDetectedCountry('eircode');
      else if (countryCode === 'gb') setDetectedCountry('uk');
      else if (countryCode === 'us') setDetectedCountry('us');

      return {
        formattedAddress: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        postcode: result.address?.postcode,
        city: result.address?.city || result.address?.town || result.address?.village,
        country: result.address?.country,
        countryCode: result.address?.country_code,
      };
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return null;
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Keep retrieveAddress as a no-op for backward compatibility
  const retrieveAddress = useCallback(async (_addressId: string): Promise<GeocodedAddress | null> => {
    return null;
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    detectedCountry,
    searchAddress: debouncedSearch,
    geocodeAddress,
    retrieveAddress,
    lookupEircode,
    lookupUKPostcode,
    lookupUSZip,
    lookupPostcode,
    reverseGeocode,
    clearSuggestions,
    detectPostcodeType,
  };
}

// PO Box detection
const PO_BOX_PATTERNS = [
  /\bP\.?\s*O\.?\s*Box\b/i,
  /\bPost\s*Office\s*Box\b/i,
  /\bPOB\s*\d/i,
  /\bP\.?\s*O\.?\s*B\.?\s*\d/i,
  /\bBosca\s*Poist\b/i,
];

export function isPOBoxAddress(address: string): boolean {
  return PO_BOX_PATTERNS.some((pattern) => pattern.test(address));
}

export function getGeocodingConfidence(
  suggestion: AddressSuggestion | null,
  postcodeType: PostcodeType
): 'high' | 'medium' | 'low' | 'none' {
  if (!suggestion) return 'none';
  if (postcodeType === 'eircode' && suggestion.address?.postcode) return 'high';
  if (suggestion.address?.house_number && suggestion.address?.road) return 'high';
  if (suggestion.address?.road) return 'medium';
  return 'low';
}

export function formatAddressFromSuggestion(suggestion: AddressSuggestion): string {
  const parts: string[] = [];
  const addr = suggestion.address;
  if (addr.house_number && addr.road) parts.push(`${addr.house_number} ${addr.road}`);
  else if (addr.road) parts.push(addr.road);
  if (addr.suburb) parts.push(addr.suburb);
  const locality = addr.city || addr.town || addr.village;
  if (locality) parts.push(locality);
  if (addr.county) parts.push(addr.county);
  if (addr.postcode) parts.push(addr.postcode);
  if (addr.country) parts.push(addr.country);
  return parts.join(', ');
}
