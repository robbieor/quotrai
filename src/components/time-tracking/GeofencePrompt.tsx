import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, LogIn, LogOut, X } from 'lucide-react';
import { useIsNative } from '@/hooks/useIsNative';

/**
 * GeofencePrompt — only renders in native (Capacitor) context.
 * In the browser it returns null immediately to prevent crashes from
 * useCapacitorGeolocation and useGeofenceMonitoring.
 */
export function GeofencePrompt() {
  const isNative = useIsNative();

  // Never render geofence logic in browser — the Capacitor geolocation
  // APIs are unavailable and would throw.
  if (!isNative) return null;

  return <GeofencePromptNative />;
}

/** Inner component that safely uses Capacitor-only hooks. */
function GeofencePromptNative() {
  // Lazy-import native-only hooks so they never execute in browser context
  // This component only mounts when useIsNative() === true
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // In a real native build the geofence monitoring hooks would be loaded here.
    // For now this is a placeholder — the native geofence prompt UI is deferred
    // until Capacitor background-geolocation is wired up.
    setReady(true);
  }, []);

  if (!ready) return null;

  // Placeholder: native geofence prompts will be implemented when the
  // Capacitor background-geolocation plugin is integrated.
  return null;
}
