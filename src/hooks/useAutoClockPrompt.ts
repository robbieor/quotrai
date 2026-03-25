import { useState, useEffect, useCallback, useRef } from 'react';
import { useJobSites, useActiveTimeEntry, calculateDistance } from '@/hooks/useTimeTracking';
import { useGeolocation } from '@/hooks/useTimeTracking';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type AutoClockMode = 'auto' | 'prompt' | 'manual';

interface GeofencePrompt {
  type: 'clock_in' | 'clock_out';
  jobSiteId: string;
  jobTitle: string;
  address: string;
  jobId: string;
}

const EXIT_DELAY_MS = 3 * 60 * 1000; // 3 minutes before triggering exit

export function useAutoClockPrompt() {
  const { data: jobSites } = useJobSites();
  const { data: activeEntry } = useActiveTimeEntry();
  const { user } = useAuth();
  const [mode, setMode] = useState<AutoClockMode>(() => {
    return (localStorage.getItem('quotr_auto_clock_mode') as AutoClockMode) || 'prompt';
  });
  const [pendingPrompt, setPendingPrompt] = useState<GeofencePrompt | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const insideGeofencesRef = useRef<Set<string>>(new Set());
  const exitTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load mode from profile on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('auto_clock_mode')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.auto_clock_mode) {
          const dbMode = data.auto_clock_mode as AutoClockMode;
          setMode(dbMode);
          localStorage.setItem('quotr_auto_clock_mode', dbMode);
        }
      });
  }, [user?.id]);

  // Persist mode preference to DB + localStorage
  const updateMode = useCallback((newMode: AutoClockMode) => {
    setMode(newMode);
    localStorage.setItem('quotr_auto_clock_mode', newMode);
    if (user?.id) {
      supabase.from('profiles').update({ auto_clock_mode: newMode } as any).eq('id', user.id).then(() => {});
    }
  }, [user?.id]);

  const dismissPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  // Check position against all job site geofences
  const checkGeofences = useCallback((lat: number, lng: number) => {
    if (!jobSites || mode === 'manual') return;

    const nowInside = new Set<string>();

    for (const site of jobSites) {
      if (!site.latitude || !site.longitude) continue;
      const distance = calculateDistance(lat, lng, site.latitude, site.longitude);
      if (distance <= (site.geofence_radius || 200)) {
        nowInside.add(site.id);
      }
    }

    const prevInside = insideGeofencesRef.current;

    // ENTER: newly inside a geofence and not clocked in
    if (!activeEntry) {
      for (const siteId of nowInside) {
        if (!prevInside.has(siteId)) {
          const site = jobSites.find(s => s.id === siteId);
          if (site) {
            // Clear any pending exit timer for this site
            const exitTimer = exitTimersRef.current.get(siteId);
            if (exitTimer) {
              clearTimeout(exitTimer);
              exitTimersRef.current.delete(siteId);
            }

            setPendingPrompt({
              type: 'clock_in',
              jobSiteId: siteId,
              jobTitle: site.jobs?.title || 'Job Site',
              address: site.address,
              jobId: site.job_id,
            });

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Arrived at ${site.jobs?.title || 'Job Site'}`, {
                body: `You're at ${site.address}. Clock in?`,
                icon: '/favicon.ico',
              });
            }
          }
        }
      }
    }

    // EXIT: was inside, now outside, and clocked in
    if (activeEntry) {
      for (const siteId of prevInside) {
        if (!nowInside.has(siteId)) {
          const site = jobSites.find(s => s.id === siteId);
          if (site && activeEntry.job_id === site.job_id) {
            // Start 3-minute exit delay
            if (!exitTimersRef.current.has(siteId)) {
              const timer = setTimeout(() => {
                setPendingPrompt({
                  type: 'clock_out',
                  jobSiteId: siteId,
                  jobTitle: site.jobs?.title || 'Job Site',
                  address: site.address,
                  jobId: site.job_id,
                });

                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(`Leaving ${site.jobs?.title || 'Job Site'}`, {
                    body: `You've left ${site.address}. Clock out?`,
                    icon: '/favicon.ico',
                  });
                }

                exitTimersRef.current.delete(siteId);
              }, EXIT_DELAY_MS);
              exitTimersRef.current.set(siteId, timer);
            }
          }
        }
      }

      // Cancel exit timers if user re-enters
      for (const siteId of nowInside) {
        const timer = exitTimersRef.current.get(siteId);
        if (timer) {
          clearTimeout(timer);
          exitTimersRef.current.delete(siteId);
        }
      }
    }

    insideGeofencesRef.current = nowInside;
  }, [jobSites, activeEntry, mode]);

  // Start/stop watching based on mode
  useEffect(() => {
    if (mode === 'manual' || !jobSites?.length) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsWatching(false);
      }
      return;
    }

    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        checkGeofences(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Auto-clock geolocation error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );

    watchIdRef.current = id;
    setIsWatching(true);

    return () => {
      navigator.geolocation.clearWatch(id);
      watchIdRef.current = null;
      setIsWatching(false);
      // Clear all exit timers
      exitTimersRef.current.forEach(timer => clearTimeout(timer));
      exitTimersRef.current.clear();
    };
  }, [mode, jobSites, checkGeofences]);

  return {
    mode,
    updateMode,
    pendingPrompt,
    dismissPrompt,
    isWatching,
  };
}
