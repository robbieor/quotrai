import { useState, useEffect, useCallback } from 'react';
import { geolocationService, type LocationUpdate } from '@/lib/capacitor/geolocation';

export function useCapacitorGeolocation() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(geolocationService.isNative());
    
    // Check initial permissions
    geolocationService.checkPermissions().then(setHasPermission);
  }, []);

  useEffect(() => {
    // Subscribe to location updates
    const unsubscribe = geolocationService.onLocationUpdate((update) => {
      setCurrentLocation(update);
    });

    return unsubscribe;
  }, []);

  const requestPermissions = useCallback(async () => {
    const granted = await geolocationService.requestPermissions();
    setHasPermission(granted);
    return granted;
  }, []);

  const startTracking = useCallback(async () => {
    const success = await geolocationService.startTracking();
    setIsTracking(success);
    return success;
  }, []);

  const stopTracking = useCallback(async () => {
    await geolocationService.stopTracking();
    setIsTracking(false);
  }, []);

  const getCurrentPosition = useCallback(async () => {
    const position = await geolocationService.getCurrentPosition();
    if (position) {
      const update: LocationUpdate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        isBackground: false,
      };
      setCurrentLocation(update);
      return update;
    }
    return null;
  }, []);

  const showGeofenceNotification = useCallback(async (title: string, body: string) => {
    await geolocationService.showGeofenceNotification(title, body);
  }, []);

  const isWithinGeofence = useCallback((
    siteLat: number,
    siteLng: number,
    radiusMeters: number
  ) => {
    if (!currentLocation) return false;
    return geolocationService.isWithinGeofence(
      currentLocation.latitude,
      currentLocation.longitude,
      siteLat,
      siteLng,
      radiusMeters
    );
  }, [currentLocation]);

  return {
    isNative,
    isTracking,
    currentLocation,
    hasPermission,
    requestPermissions,
    startTracking,
    stopTracking,
    getCurrentPosition,
    showGeofenceNotification,
    isWithinGeofence,
  };
}
