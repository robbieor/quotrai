import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TimeEntry {
  id: string;
  team_id: string;
  user_id: string;
  job_id: string;
  job_site_id: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_in_accuracy: number | null;
  clock_out_accuracy: number | null;
  clock_in_verified: boolean;
  clock_out_verified: boolean;
  notes: string | null;
  is_billable: boolean;
  status: "active" | "completed" | "cancelled";
  device_id: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  jobs?: { title: string; customers?: { name: string } | null } | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

export interface JobSite {
  id: string;
  team_id: string;
  job_id: string;
  customer_id: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  location_confidence: string;
  location_valid_for_gps: boolean;
  geocode_source: string;
  created_at: string;
  updated_at: string;
  jobs?: { title: string } | null;
  customers?: { name: string } | null;
}

export interface LocationPing {
  id: string;
  team_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  is_moving: boolean | null;
  activity_type: string | null;
  recorded_at: string;
  synced_at: string;
}

export interface ClockInData {
  job_id: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  device_id?: string;
}

export interface ClockOutData {
  time_entry_id: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  notes?: string;
}

// Calculate distance between two coordinates in meters
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if location is within geofence
export function isWithinGeofence(
  lat: number,
  lng: number,
  siteLat: number,
  siteLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(lat, lng, siteLat, siteLng);
  return distance <= radiusMeters;
}

// Hook to get all time entries
export function useTimeEntries() {
  return useQuery({
    queryKey: ["time-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, jobs(title, customers(name))")
        .order("clock_in_at", { ascending: false });

      if (error) throw error;
      return data as TimeEntry[];
    },
  });
}

// Hook to get active time entry for current user
export function useActiveTimeEntry() {
  return useQuery({
    queryKey: ["active-time-entry"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("time_entries")
        .select("*, jobs(title, customers(name))")
        .eq("user_id", user.id)
        .eq("status", "active")
        .is("clock_out_at", null)
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TimeEntry | null;
    },
  });
}

// Hook to get job sites
export function useJobSites() {
  return useQuery({
    queryKey: ["job-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_sites")
        .select("*, jobs(title), customers(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as JobSite[];
    },
  });
}

// Hook to get staff locations (latest pings)
export function useStaffLocations() {
  return useQuery({
    queryKey: ["staff-locations"],
    queryFn: async () => {
      // Only fetch pings from the last 24 hours to avoid unbounded growth
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: pings, error: pingsError } = await supabase
        .from("location_pings")
        .select("*")
        .gte("recorded_at", last24h)
        .order("recorded_at", { ascending: false })
        .limit(500);

      if (pingsError) throw pingsError;

      // Get team profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (profilesError) throw profilesError;

      // Get active time entries
      const { data: activeEntries, error: entriesError } = await supabase
        .from("time_entries")
        .select("*, jobs(title)")
        .eq("status", "active")
        .is("clock_out_at", null);

      if (entriesError) throw entriesError;

      // Deduplicate pings - get latest for each user
      const latestPings = new Map<string, LocationPing>();
      pings?.forEach((ping) => {
        if (!latestPings.has(ping.user_id)) {
          latestPings.set(ping.user_id, ping as LocationPing);
        }
      });

      // Combine data
      return profiles?.map((profile) => {
        const ping = latestPings.get(profile.id);
        const activeEntry = activeEntries?.find((e) => e.user_id === profile.id);

        return {
          user_id: profile.id,
          name: profile.full_name || profile.email || "Unknown",
          email: profile.email,
          status: activeEntry ? "clocked_in" : "clocked_out",
          current_job: activeEntry?.jobs?.title || null,
          location: ping
            ? { lat: ping.latitude, lng: ping.longitude }
            : null,
          last_updated: ping?.recorded_at || null,
          battery_level: ping?.battery_level || null,
          is_moving: ping?.is_moving || false,
        };
      }) || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Clock in mutation with offline fallback
export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ClockInData) => {
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // GPS verification is now handled server-side by validate-clock-event
      const payload = {
        team_id: teamId,
        user_id: user.id,
        job_id: data.job_id,
        clock_in_at: new Date().toISOString(),
        clock_in_latitude: data.latitude || null,
        clock_in_longitude: data.longitude || null,
        clock_in_accuracy: data.accuracy || null,
        clock_in_verified: false,
        device_id: data.device_id || null,
        status: "active",
      };

      try {
        const { data: entry, error } = await supabase
          .from("time_entries")
          .insert(payload)
          .select("*, jobs(title, customers(name))")
          .single();

        if (error) throw error;

        // Also log location ping
        if (data.latitude && data.longitude) {
          await supabase.from("location_pings").insert({
            team_id: teamId,
            user_id: user.id,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy || null,
            recorded_at: new Date().toISOString(),
          });
        }

        // Trigger server-side validation async (don't await)
        supabase.functions.invoke("validate-clock-event", {
          body: { time_entry_id: entry.id, event_type: "clock_in" },
        }).catch((err) => console.warn("Server validation failed:", err));

        return entry;
      } catch (networkError) {
        // Offline fallback: enqueue for later sync
        if (!navigator.onLine) {
          const { enqueueOperation } = await import("@/lib/offlineQueue");
          await enqueueOperation("clock_in", payload);
          toast.info("Saved offline — will sync when connected");
          return payload;
        }
        throw networkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["active-time-entry"] });
      queryClient.invalidateQueries({ queryKey: ["staff-locations"] });
      toast.success("Clocked in successfully");
    },
    onError: (error) => {
      toast.error("Failed to clock in: " + error.message);
    },
  });
}

// Clock out mutation with offline fallback
export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ClockOutData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const clockOutPayload = {
        clock_out_at: new Date().toISOString(),
        clock_out_latitude: data.latitude || null,
        clock_out_longitude: data.longitude || null,
        clock_out_accuracy: data.accuracy || null,
        notes: data.notes || null,
        status: "completed" as const,
      };

      try {
        // GPS verification is now handled server-side by validate-clock-event
        const { data: updated, error } = await supabase
          .from("time_entries")
          .update(clockOutPayload)
          .eq("id", data.time_entry_id)
          .select("*, jobs(title, customers(name))")
          .single();

        if (error) throw error;

        // Log location ping
        if (data.latitude && data.longitude) {
          const { data: teamId } = await supabase.rpc("get_user_team_id");
          await supabase.from("location_pings").insert({
            team_id: teamId,
            user_id: user.id,
            latitude: data.latitude,
            longitude: data.longitude,
            recorded_at: new Date().toISOString(),
          });
        }

        // Trigger server-side validation async
        supabase.functions.invoke("validate-clock-event", {
          body: { time_entry_id: data.time_entry_id, event_type: "clock_out" },
        }).catch((err) => console.warn("Server validation failed:", err));

        return updated;
      } catch (networkError) {
        if (!navigator.onLine) {
          const { enqueueOperation } = await import("@/lib/offlineQueue");
          await enqueueOperation("clock_out", {
            time_entry_id: data.time_entry_id,
            ...clockOutPayload,
          });
          toast.info("Saved offline — will sync when connected");
          return clockOutPayload;
        }
        throw networkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["active-time-entry"] });
      queryClient.invalidateQueries({ queryKey: ["staff-locations"] });
      toast.success("Clocked out successfully");
    },
    onError: (error) => {
      toast.error("Failed to clock out: " + error.message);
    },
  });
}

// Create job site mutation
export function useCreateJobSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      job_id: string;
      customer_id: string;
      address: string;
      latitude: number;
      longitude: number;
      geofence_radius?: number;
    }) => {
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      const { data: site, error } = await supabase
        .from("job_sites")
        .insert({
          team_id: teamId,
          job_id: data.job_id,
          customer_id: data.customer_id,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          geofence_radius: data.geofence_radius || 200,
        })
        .select("*, jobs(title), customers(name)")
        .single();

      if (error) throw error;
      return site;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-sites"] });
      toast.success("Job site created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create job site: " + error.message);
    },
  });
}

// Update job site mutation
export function useUpdateJobSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      geofence_radius?: number;
    }) => {
      const { id, ...updates } = data;
      const { data: site, error } = await supabase
        .from("job_sites")
        .update(updates)
        .eq("id", id)
        .select("*, jobs(title), customers(name)")
        .single();

      if (error) throw error;
      return site;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-sites"] });
      toast.success("Job site updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update job site: " + error.message);
    },
  });
}

// Delete job site mutation
export function useDeleteJobSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-sites"] });
      toast.success("Job site deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete job site: " + error.message);
    },
  });
}

// Hook for geolocation
export function useGeolocation() {
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  };

  return { getCurrentPosition };
}

// Delete time entry mutation
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["active-time-entry"] });
      toast.success("Time entry deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete time entry: " + error.message);
    },
  });
}
