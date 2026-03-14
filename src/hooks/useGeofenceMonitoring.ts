import { useState, useEffect, useCallback, useRef } from 'react';
import { useJobSites, calculateDistance, type JobSite } from '@/hooks/useTimeTracking';
import { useCapacitorGeolocation } from '@/hooks/useCapacitorGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type GeofenceEventType = 'ENTER' | 'EXIT' | 'DWELL';

export interface GeofenceEvent {
  type: GeofenceEventType;
  jobSite: JobSite;
  timestamp: Date;
  location: { lat: number; lng: number };
}

type GeofenceCallback = (event: GeofenceEvent) => void;

export function useGeofenceMonitoring() {
  const { data: jobSites } = useJobSites();
  const { currentLocation, isTracking, startTracking, showGeofenceNotification, isNative } = useCapacitorGeolocation();
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentGeofences, setCurrentGeofences] = useState<Set<string>>(new Set());
  const [lastEvent, setLastEvent] = useState<GeofenceEvent | null>(null);
  
  const callbacksRef = useRef<GeofenceCallback[]>([]);
  const previousGeofencesRef = useRef<Set<string>>(new Set());

  // Register callback for geofence events
  const onGeofenceEvent = useCallback((callback: GeofenceCallback) => {
    callbacksRef.current.push(callback);
    return () => {
      callbacksRef.current = callbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  // Notify all callbacks
  const notifyCallbacks = useCallback((event: GeofenceEvent) => {
    callbacksRef.current.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Geofence callback error:', error);
      }
    });
  }, []);

  // Log geofence event to database
  const logGeofenceEvent = useCallback(async (event: GeofenceEvent) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teamId } = await supabase.rpc('get_user_team_id');
      if (!teamId) return;

      await supabase.from('geofence_events').insert({
        team_id: teamId,
        user_id: user.id,
        job_site_id: event.jobSite.id,
        event_type: event.type,
        latitude: event.location.lat,
        longitude: event.location.lng,
        recorded_at: event.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Failed to log geofence event:', error);
    }
  }, []);

  // Show notification for geofence event
  const showNotification = useCallback(async (event: GeofenceEvent) => {
    const jobTitle = event.jobSite.jobs?.title || 'Job Site';
    
    if (event.type === 'ENTER') {
      const title = `Arrived at ${jobTitle}`;
      const body = `You're at ${event.jobSite.address}. Ready to clock in?`;
      
      if (isNative) {
        await showGeofenceNotification(title, body);
      } else {
        // Web notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
        toast.info(title, { description: body });
      }
    } else if (event.type === 'EXIT') {
      const title = `Leaving ${jobTitle}`;
      const body = `You've left ${event.jobSite.address}. Don't forget to clock out!`;
      
      if (isNative) {
        await showGeofenceNotification(title, body);
      } else {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
        toast.info(title, { description: body });
      }
    }
  }, [isNative, showGeofenceNotification]);

  // Check geofences when location updates
  useEffect(() => {
    if (!currentLocation || !jobSites || !isMonitoring) return;

    const newGeofences = new Set<string>();

    // Check each job site
    jobSites.forEach((site) => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        site.latitude,
        site.longitude
      );

      if (distance <= site.geofence_radius) {
        newGeofences.add(site.id);
      }
    });

    // Detect entries and exits
    const previousGeofences = previousGeofencesRef.current;

    // Check for entries (in new but not in previous)
    newGeofences.forEach((siteId) => {
      if (!previousGeofences.has(siteId)) {
        const site = jobSites.find(s => s.id === siteId);
        if (site) {
          const event: GeofenceEvent = {
            type: 'ENTER',
            jobSite: site,
            timestamp: new Date(),
            location: { lat: currentLocation.latitude, lng: currentLocation.longitude },
          };
          setLastEvent(event);
          notifyCallbacks(event);
          showNotification(event);
          logGeofenceEvent(event);
        }
      }
    });

    // Check for exits (in previous but not in new)
    previousGeofences.forEach((siteId) => {
      if (!newGeofences.has(siteId)) {
        const site = jobSites.find(s => s.id === siteId);
        if (site) {
          const event: GeofenceEvent = {
            type: 'EXIT',
            jobSite: site,
            timestamp: new Date(),
            location: { lat: currentLocation.latitude, lng: currentLocation.longitude },
          };
          setLastEvent(event);
          notifyCallbacks(event);
          showNotification(event);
          logGeofenceEvent(event);
        }
      }
    });

    // Update state
    previousGeofencesRef.current = newGeofences;
    setCurrentGeofences(newGeofences);
  }, [currentLocation, jobSites, isMonitoring, notifyCallbacks, showNotification, logGeofenceEvent]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    // Request web notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Start location tracking if not already
    if (!isTracking) {
      await startTracking();
    }

    setIsMonitoring(true);
  }, [isTracking, startTracking]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    previousGeofencesRef.current = new Set();
    setCurrentGeofences(new Set());
  }, []);

  // Get nearby job sites
  const getNearbyJobSites = useCallback((radiusMeters: number = 1000) => {
    if (!currentLocation || !jobSites) return [];

    return jobSites
      .map((site) => ({
        ...site,
        distance: calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          site.latitude,
          site.longitude
        ),
      }))
      .filter((site) => site.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);
  }, [currentLocation, jobSites]);

  return {
    isMonitoring,
    currentGeofences,
    lastEvent,
    startMonitoring,
    stopMonitoring,
    onGeofenceEvent,
    getNearbyJobSites,
  };
}
