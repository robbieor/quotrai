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

// UK postcode regex patterns
// Formats: AA9A 9AA, A9A 9AA, A9 9AA, A99 9AA, AA9 9AA, AA99 9AA
const UK_POSTCODE_PATTERN = /^([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i;
const UK_POSTCODE_PARTIAL = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d?[A-Z]{0,2}$/i;

// Eircode regex patterns (Irish postcodes)
// Format: A99 XXXX (routing key + unique identifier)
const EIRCODE_PATTERN = /^([A-Z]\d{2}\s?[A-Z0-9]{4})$/i;
const EIRCODE_PARTIAL = /^[A-Z]\d{2}\s?[A-Z0-9]{0,4}$/i;

// US ZIP code regex patterns
// Formats: 12345 or 12345-6789
const US_ZIP_PATTERN = /^(\d{5})(-\d{4})?$/;
const US_ZIP_PARTIAL = /^\d{1,5}(-\d{0,4})?$/;

/**
 * Detect the type of postcode based on format
 */
export function detectPostcodeType(input: string): PostcodeType {
  const normalized = input.trim().toUpperCase();
  
  // Check for US ZIP code (starts with digits)
  if (/^\d/.test(normalized)) {
    if (US_ZIP_PATTERN.test(normalized) || US_ZIP_PARTIAL.test(normalized)) {
      return 'us';
    }
  }
  
  // Check for complete Eircode first (more specific pattern)
  if (EIRCODE_PATTERN.test(normalized)) {
    return 'eircode';
  }
  
  // Check for complete UK postcode
  if (UK_POSTCODE_PATTERN.test(normalized)) {
    return 'uk';
  }
  
  // For partial matches, try to detect based on pattern
  // Eircode always starts with letter + 2 digits
  if (/^[A-Z]\d{2}/i.test(normalized)) {
    if (EIRCODE_PARTIAL.test(normalized)) {
      return 'eircode';
    }
  }
  
  // UK postcodes have more varied starting patterns
  if (UK_POSTCODE_PARTIAL.test(normalized)) {
    return 'uk';
  }
  
  return 'unknown';
}

/**
 * Validate a complete Eircode
 */
export function isValidEircode(input: string): boolean {
  const normalized = input.replace(/\s+/g, '').toUpperCase();
  return EIRCODE_PATTERN.test(normalized) || /^[A-Z]\d{2}[A-Z0-9]{4}$/.test(normalized);
}

/**
 * Validate a complete UK postcode
 */
export function isValidUKPostcode(input: string): boolean {
  const normalized = input.trim().toUpperCase();
  return UK_POSTCODE_PATTERN.test(normalized);
}

/**
 * Validate a complete US ZIP code
 */
export function isValidUSZip(input: string): boolean {
  const normalized = input.trim();
  return US_ZIP_PATTERN.test(normalized);
}

/**
 * Check if input looks like a postcode attempt (partial or complete)
 */
export function looksLikePostcode(input: string): boolean {
  const normalized = input.trim().toUpperCase();
  // Starts with letter followed by digit(s) (IE/UK) or starts with digit (US ZIP)
  return /^[A-Z]\d/.test(normalized) || /^\d{3,}/.test(normalized);
}

/**
 * Get validation status for a postcode input
 */
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
  
  // Check for valid complete postcodes
  if (detectedType === 'eircode') {
    if (isValidEircode(input)) {
      return { isValid: true, isPartial: false, type: 'eircode' };
    }
    // Check if it's a valid partial Eircode
    if (EIRCODE_PARTIAL.test(normalized) && normalized.length < 7) {
      return { 
        isValid: false, 
        isPartial: true, 
        type: 'eircode',
        message: 'Keep typing to complete the Eircode',
        example: 'e.g., D02 X285'
      };
    }
    // Invalid Eircode format
    if (normalized.length >= 7) {
      return { 
        isValid: false, 
        isPartial: false, 
        type: 'eircode',
        message: 'Invalid Eircode format',
        example: 'Format: A99 XXXX (e.g., D02 X285, T12 AB34)'
      };
    }
  }
  
  if (detectedType === 'uk') {
    if (isValidUKPostcode(input)) {
      return { isValid: true, isPartial: false, type: 'uk' };
    }
    // Check if it's a valid partial UK postcode
    if (UK_POSTCODE_PARTIAL.test(normalized) && normalized.length < 6) {
      return { 
        isValid: false, 
        isPartial: true, 
        type: 'uk',
        message: 'Keep typing to complete the postcode',
        example: 'e.g., SW1A 1AA'
      };
    }
    // Invalid UK postcode format
    if (normalized.length >= 5) {
      return { 
        isValid: false, 
        isPartial: false, 
        type: 'uk',
        message: 'Invalid UK postcode format',
        example: 'Format: AA9A 9AA (e.g., SW1A 1AA, M1 1AE)'
      };
    }
  }
  
  if (detectedType === 'us') {
    if (isValidUSZip(input)) {
      return { isValid: true, isPartial: false, type: 'us' };
    }
    if (US_ZIP_PARTIAL.test(normalized) && normalized.replace('-', '').length < 5) {
      return { 
        isValid: false, 
        isPartial: true, 
        type: 'us',
        message: 'Keep typing to complete the ZIP code',
        example: 'e.g., 10001 or 10001-1234'
      };
    }
    if (normalized.length >= 5) {
      return { 
        isValid: false, 
        isPartial: false, 
        type: 'us',
        message: 'Invalid US ZIP code format',
        example: 'Format: 12345 or 12345-6789'
      };
    }
  }
  
  // Not clearly a postcode - could be regular address
  return { isValid: false, isPartial: true, type: 'unknown' };
}

/**
 * Format a postcode for display
 */
export function formatPostcode(input: string, type: PostcodeType): string {
  const normalized = input.replace(/\s+/g, '').toUpperCase();
  
  if (type === 'eircode' && normalized.length === 7) {
    return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
  }
  
  if (type === 'uk') {
    if (normalized.length >= 5) {
      return `${normalized.slice(0, -3)} ${normalized.slice(-3)}`;
    }
  }

  if (type === 'us') {
    // US ZIP+4: format as 12345-6789
    const digits = normalized.replace('-', '');
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  }
  
  return input;
}

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<PostcodeType>('unknown');
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchAddress = useCallback(async (query: string, countryCode?: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
      });

      // Add country bias for better results
      if (countryCode) {
        params.append('countrycodes', countryCode);
      }

      const response = await fetch(
        `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Foreman-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch address suggestions');
      }

      const data: AddressSuggestion[] = await response.json();
      setSuggestions(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      setError(err instanceof Error ? err.message : 'Failed to search addresses');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced version for real-time search
  const debouncedSearch = useCallback(
    debounce((query: string, countryCode?: string) => {
      searchAddress(query, countryCode);
    }, 300),
    [searchAddress]
  );

  // Geocode a specific address
  const geocodeAddress = useCallback(async (address: string, country?: string): Promise<GeocodedAddress | null> => {
    if (!address) return null;

    try {
      const searchQuery = country ? `${address}, ${country}` : address;
      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        addressdetails: '1',
        limit: '1',
      });

      const response = await fetch(
        `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Foreman-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }

      const data: AddressSuggestion[] = await response.json();
      
      if (data.length === 0) return null;

      const result = data[0];
      return {
        formattedAddress: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        postcode: result.address.postcode,
        city: result.address.city || result.address.town || result.address.village,
        country: result.address.country,
        countryCode: result.address.country_code,
      };
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  }, []);

  // Lookup Eircode via Autoaddress.ie edge function (falls back to Nominatim)
  const lookupEircode = useCallback(async (eircode: string): Promise<GeocodedAddress | null> => {
    if (!isValidEircode(eircode)) {
      return null;
    }

    setDetectedCountry('eircode');

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      if (projectId) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/eircode-lookup`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: eircode, mode: 'lookup' }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.latitude && data.longitude) {
            return {
              formattedAddress: data.formattedAddress || eircode,
              latitude: data.latitude,
              longitude: data.longitude,
              postcode: data.postcode || eircode,
              city: data.city,
              county: data.region,
              country: data.country || 'Ireland',
              countryCode: data.countryCode || 'ie',
              line1: data.line1,
              line2: data.line2,
              region: data.region,
              confidence: data.confidence || 'high',
              isPOBox: false,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Autoaddress lookup failed, falling back to Nominatim:', err);
    }

    // Fallback to Nominatim
    return geocodeAddress(eircode, 'Ireland');
  }, [geocodeAddress]);

  // Lookup UK postcode
  const lookupUKPostcode = useCallback(async (postcode: string): Promise<GeocodedAddress | null> => {
    if (!isValidUKPostcode(postcode)) {
      return null;
    }

    setDetectedCountry('uk');
    return geocodeAddress(postcode, 'United Kingdom');
  }, [geocodeAddress]);

  // Lookup US ZIP code
  const lookupUSZip = useCallback(async (zip: string): Promise<GeocodedAddress | null> => {
    if (!isValidUSZip(zip)) {
      return null;
    }

    setDetectedCountry('us');
    return geocodeAddress(zip, 'United States');
  }, [geocodeAddress]);

  // Smart postcode lookup - auto-detects country
  const lookupPostcode = useCallback(async (postcode: string): Promise<GeocodedAddress | null> => {
    const type = detectPostcodeType(postcode);
    setDetectedCountry(type);

    switch (type) {
      case 'eircode':
        return lookupEircode(postcode);
      case 'uk':
        return lookupUKPostcode(postcode);
      case 'us':
        return lookupUSZip(postcode);
      default:
        // Try all as fallback
        const ieResult = await geocodeAddress(postcode, 'Ireland');
        if (ieResult) {
          setDetectedCountry('eircode');
          return ieResult;
        }
        const ukResult = await geocodeAddress(postcode, 'United Kingdom');
        if (ukResult) {
          setDetectedCountry('uk');
          return ukResult;
        }
        const usResult = await geocodeAddress(postcode, 'United States');
        if (usResult) {
          setDetectedCountry('us');
          return usResult;
        }
        return null;
    }
  }, [lookupEircode, lookupUKPostcode, lookupUSZip, geocodeAddress]);

  // Reverse geocode (get address from coordinates)
  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<GeocodedAddress | null> => {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        addressdetails: '1',
      });

      const response = await fetch(
        `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Foreman-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reverse geocode');
      }

      const result: AddressSuggestion = await response.json();
      
      // Detect country from result
      const countryCode = result.address.country_code?.toLowerCase();
      if (countryCode === 'ie') {
        setDetectedCountry('eircode');
      } else if (countryCode === 'gb') {
        setDetectedCountry('uk');
      } else if (countryCode === 'us') {
        setDetectedCountry('us');
      }
      
      return {
        formattedAddress: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        postcode: result.address.postcode,
        city: result.address.city || result.address.town || result.address.village,
        country: result.address.country,
        countryCode: result.address.country_code,
      };
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return null;
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    detectedCountry,
    searchAddress: debouncedSearch,
    geocodeAddress,
    lookupEircode,
    lookupUKPostcode,
    lookupUSZip,
    lookupPostcode,
    reverseGeocode,
    clearSuggestions,
    detectPostcodeType,
  };
}

/**
 * Detect if an address is a PO Box (not suitable for GPS geofencing)
 */
const PO_BOX_PATTERNS = [
  /\bP\.?\s*O\.?\s*Box\b/i,
  /\bPost\s*Office\s*Box\b/i,
  /\bPOB\s*\d/i,
  /\bP\.?\s*O\.?\s*B\.?\s*\d/i,
  /\bBosca\s*Poist\b/i, // Irish for PO Box
];

export function isPOBoxAddress(address: string): boolean {
  return PO_BOX_PATTERNS.some((pattern) => pattern.test(address));
}

/**
 * Determine geocoding confidence from result quality
 */
export function getGeocodingConfidence(
  suggestion: AddressSuggestion | null,
  postcodeType: PostcodeType
): 'high' | 'medium' | 'low' | 'none' {
  if (!suggestion) return 'none';
  // Eircode resolves to individual property
  if (postcodeType === 'eircode' && suggestion.address.postcode) return 'high';
  // Has house number = specific building
  if (suggestion.address.house_number && suggestion.address.road) return 'high';
  // Has road = street level
  if (suggestion.address.road) return 'medium';
  // Only has area info
  return 'low';
}

// Format a suggestion into a clean address string
export function formatAddressFromSuggestion(suggestion: AddressSuggestion): string {
  const parts: string[] = [];
  const addr = suggestion.address;

  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${addr.road}`);
  } else if (addr.road) {
    parts.push(addr.road);
  }

  if (addr.suburb) parts.push(addr.suburb);
  
  const locality = addr.city || addr.town || addr.village;
  if (locality) parts.push(locality);
  
  if (addr.county) parts.push(addr.county);
  if (addr.postcode) parts.push(addr.postcode);
  if (addr.country) parts.push(addr.country);

  return parts.join(', ');
}
