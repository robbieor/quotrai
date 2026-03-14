import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, Navigation, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAddressAutocomplete,
  formatAddressFromSuggestion,
  detectPostcodeType,
  validatePostcode,
  looksLikePostcode,
  type AddressSuggestion,
  type GeocodedAddress,
  type PostcodeType,
} from "@/hooks/useAddressAutocomplete";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: GeocodedAddress) => void;
  placeholder?: string;
  countryCode?: string;
  showCurrentLocation?: boolean;
  showValidation?: boolean;
  className?: string;
  disabled?: boolean;
}

const COUNTRY_LABELS: Record<PostcodeType, string> = {
  eircode: '🇮🇪 Ireland',
  uk: '🇬🇧 UK',
  us: '🇺🇸 US',
  unknown: '',
};

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address, Eircode, UK postcode, or US ZIP...",
  countryCode = "ie,gb,us",
  showCurrentLocation = false,
  showValidation = true,
  className,
  disabled,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [postcodeHint, setPostcodeHint] = useState<PostcodeType>('unknown');
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { suggestions, isLoading, searchAddress, lookupPostcode, reverseGeocode, clearSuggestions } = useAddressAutocomplete();

  const validation = useMemo(() => {
    if (!value || value.length < 3 || hasSelectedAddress) return null;
    if (!looksLikePostcode(value)) return null;
    return validatePostcode(value);
  }, [value, hasSelectedAddress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setHasSelectedAddress(false);
    const detectedType = detectPostcodeType(newValue);
    setPostcodeHint(detectedType);
    const normalizedValue = newValue.replace(/\s+/g, '');
    const isLikelyCompletePostcode =
      (detectedType === 'eircode' && normalizedValue.length >= 7) ||
      (detectedType === 'uk' && normalizedValue.length >= 5) ||
      (detectedType === 'us' && normalizedValue.replace('-', '').length >= 5);
    if (isLikelyCompletePostcode) {
      lookupPostcode(newValue).then((result) => {
        if (result && onAddressSelect) {
          onAddressSelect(result);
          setHasSelectedAddress(true);
        }
      });
    }
    searchAddress(newValue, countryCode);
    setIsOpen(true);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const formattedAddress = formatAddressFromSuggestion(suggestion);
    onChange(formattedAddress);
    setHasSelectedAddress(true);
    if (onAddressSelect) {
      onAddressSelect({
        formattedAddress,
        latitude: parseFloat(suggestion.lat),
        longitude: parseFloat(suggestion.lon),
        postcode: suggestion.address.postcode,
        city: suggestion.address.city || suggestion.address.town || suggestion.address.village,
        country: suggestion.address.country,
        countryCode: suggestion.address.country_code,
      });
    }
    setIsOpen(false);
    clearSuggestions();
    setPostcodeHint('unknown');
  };

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const result = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      if (result) {
        onChange(result.formattedAddress);
        setHasSelectedAddress(true);
        if (onAddressSelect) onAddressSelect(result);
      }
    } catch (err) {
      console.error("Failed to get current location:", err);
    } finally {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = isOpen && isFocused && (suggestions.length > 0 || isLoading);
  const showCountryHint = postcodeHint !== 'unknown' && value.length >= 3;
  const showValidationMessage = showValidation && validation && !validation.isValid && !validation.isPartial && !hasSelectedAddress;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={() => { setIsFocused(true); if (suggestions.length > 0) setIsOpen(true); }}
            onBlur={() => { setTimeout(() => setIsFocused(false), 200); }}
            placeholder={placeholder}
            className={cn("pl-9", showCountryHint && "pr-20", showValidationMessage && "border-destructive focus-visible:ring-destructive")}
            disabled={disabled}
          />
          {hasSelectedAddress && !isLoading && <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />}
          {showCountryHint && !isLoading && !hasSelectedAddress && (
            <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs py-0.5">{COUNTRY_LABELS[postcodeHint]}</Badge>
          )}
          {isLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {showCurrentLocation && (
          <Button type="button" variant="outline" size="icon" onClick={handleGetCurrentLocation} disabled={disabled || isGettingLocation} title="Use current location">
            {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          </Button>
        )}
      </div>
      {showValidationMessage && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{validation.message}</p>
            {validation.example && <p className="text-muted-foreground">{validation.example}</p>}
          </div>
        </div>
      )}
      {showValidation && validation?.isPartial && !hasSelectedAddress && validation.type !== 'unknown' && (
        <p className="mt-1 text-xs text-muted-foreground">{validation.message} • {validation.example}</p>
      )}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {isLoading && suggestions.length === 0 ? (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />Searching...
            </div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.lat}-${suggestion.lon}-${index}`} className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground" onClick={() => handleSelectSuggestion(suggestion)}>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{suggestion.address.road || suggestion.address.suburb || "Address"}{suggestion.address.house_number && ` ${suggestion.address.house_number}`}</p>
                      <p className="truncate text-xs text-muted-foreground">{[suggestion.address.city || suggestion.address.town || suggestion.address.village, suggestion.address.postcode, suggestion.address.country].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
