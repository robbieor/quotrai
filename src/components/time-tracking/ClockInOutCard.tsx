import { useState, useEffect, useMemo } from "react";
import { format, differenceInSeconds, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Coffee,
  Timer,
  Briefcase,
  MapPinOff,
} from "lucide-react";
import {
  useActiveTimeEntry,
  useClockIn,
  useClockOut,
  useGeolocation,
  useTimeEntries,
  useJobSites,
} from "@/hooks/useTimeTracking";
import { useJobs } from "@/hooks/useJobs";

export function ClockInOutCard() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { data: activeEntry, isLoading: loadingActive } = useActiveTimeEntry();
  const { data: jobs } = useJobs();
  const { data: jobSites } = useJobSites();
  const { data: allEntries } = useTimeEntries();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const { getCurrentPosition } = useGeolocation();

  // Today's scheduled/in-progress jobs
  const todaysJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(
      (job) =>
        (job.status === "scheduled" || job.status === "in_progress") &&
        job.scheduled_date &&
        isToday(new Date(job.scheduled_date))
    );
  }, [jobs]);

  // Available jobs (all scheduled/in_progress, for fallback)
  const availableJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(
      (job) => job.status === "scheduled" || job.status === "in_progress"
    );
  }, [jobs]);

  // Map job_id → job_site for GPS status
  const jobSiteMap = useMemo(() => {
    const map = new Map<string, { hasLocation: boolean; validForGps: boolean }>();
    if (jobSites) {
      for (const site of jobSites) {
        map.set(site.job_id, {
          hasLocation: !!(site.latitude && site.longitude),
          validForGps: (site as any).location_valid_for_gps !== false,
        });
      }
    }
    return map;
  }, [jobSites]);

  // Daily summary
  const dailySummary = useMemo(() => {
    if (!allEntries) return { totalSeconds: 0, entryCount: 0 };
    const todayEntries = allEntries.filter((e) =>
      isToday(new Date(e.clock_in_at))
    );
    const totalSeconds = todayEntries.reduce((sum, e) => {
      const end = e.clock_out_at ? new Date(e.clock_out_at) : new Date();
      return sum + differenceInSeconds(end, new Date(e.clock_in_at));
    }, 0);
    return { totalSeconds, entryCount: todayEntries.length };
  }, [allEntries]);

  // Get current location
  const fetchLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);
    try {
      const position = await getCurrentPosition();
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Could not get location"
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  // Timer for elapsed time when clocked in
  useEffect(() => {
    if (!activeEntry) {
      setElapsedTime(0);
      return;
    }
    const updateElapsed = () => {
      const seconds = differenceInSeconds(
        new Date(),
        new Date(activeEntry.clock_in_at)
      );
      setElapsedTime(seconds);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const formatElapsed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatHoursMinutes = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleClockIn = async (jobId: string) => {
    setIsGettingLocation(true);
    setLocationError(null);
    let freshLocation: { lat: number; lng: number; accuracy: number } | null = null;
    try {
      const position = await getCurrentPosition();
      freshLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      setCurrentLocation(freshLocation);
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Could not get location"
      );
    } finally {
      setIsGettingLocation(false);
    }

    clockIn.mutate({
      job_id: jobId,
      latitude: freshLocation?.lat,
      longitude: freshLocation?.lng,
      accuracy: freshLocation?.accuracy,
    });
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    setIsGettingLocation(true);
    setLocationError(null);
    let freshLocation: { lat: number; lng: number; accuracy: number } | null = null;
    try {
      const position = await getCurrentPosition();
      freshLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      setCurrentLocation(freshLocation);
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Could not get location"
      );
    } finally {
      setIsGettingLocation(false);
    }

    clockOut.mutate(
      {
        time_entry_id: activeEntry.id,
        latitude: freshLocation?.lat,
        longitude: freshLocation?.lng,
        accuracy: freshLocation?.accuracy,
        notes: clockOutNotes || undefined,
      },
      {
        onSuccess: () => {
          setShowClockOutDialog(false);
          setClockOutNotes("");
        },
      }
    );
  };

  if (loadingActive) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Clock
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Current Time & Date */}
          <div className="text-center">
            <div className="text-3xl font-bold">
              {format(new Date(), "HH:mm")}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </div>
          </div>

          {/* Location Status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            {isGettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Getting location...</span>
              </>
            ) : locationError ? (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive text-xs">{locationError}</span>
                <Button variant="ghost" size="sm" onClick={fetchLocation}>
                  Retry
                </Button>
              </>
            ) : currentLocation ? (
              <>
                <Navigation className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  ±{Math.round(currentLocation.accuracy)}m accuracy
                </span>
              </>
            ) : null}
          </div>

          {/* Daily Summary Strip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <Timer className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-sm font-semibold">
                  {formatHoursMinutes(dailySummary.totalSeconds)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <Briefcase className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Entries</p>
                <p className="text-sm font-semibold">{dailySummary.entryCount}</p>
              </div>
            </div>
          </div>

          {activeEntry ? (
            /* ===== CLOCKED IN STATE ===== */
            <div className="space-y-4">
              <div className="text-center p-6 rounded-lg bg-primary/10">
                <div className="text-4xl font-mono font-bold text-primary">
                  {formatElapsed(elapsedTime)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Clocked in since{" "}
                  {format(new Date(activeEntry.clock_in_at), "h:mm a")}
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <div className="flex-1">
                  <p className="font-medium">{activeEntry.jobs?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {activeEntry.jobs?.customers?.name}
                  </p>
                </div>
                {activeEntry.clock_in_verified ? (
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-600 border-green-200"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    On-site
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-yellow-500/10 text-yellow-600 border-yellow-200"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Off-site
                  </Badge>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                variant="destructive"
                onClick={() => setShowClockOutDialog(true)}
              >
                <Square className="h-5 w-5 mr-2" />
                Clock Out
              </Button>
            </div>
          ) : (
            /* ===== CLOCKED OUT STATE — Today's Schedule ===== */
            <div className="space-y-4">
              {todaysJobs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Today's Schedule
                  </h3>
                  {todaysJobs.map((job) => {
                    const gpsStatus = jobSiteMap.get(job.id);
                    return (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.customers?.name}
                          {job.scheduled_date &&
                            ` • ${format(new Date(job.scheduled_date), "h:mm a")}`}
                        </p>
                        {!gpsStatus && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                            <MapPinOff className="h-3 w-3" />
                            No GPS location set
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleClockIn(job.id)}
                        disabled={clockIn.isPending}
                      >
                        {clockIn.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
                        Start
                      </Button>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Fallback: all available jobs if none today */}
              {todaysJobs.length === 0 && availableJobs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Available Jobs
                  </h3>
                  {availableJobs.slice(0, 5).map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.customers?.name}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleClockIn(job.id)}
                        disabled={clockIn.isPending}
                      >
                        {clockIn.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
                        Start
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {availableJobs.length === 0 && (
                <div className="text-center py-8">
                  <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mt-2">
                    No active jobs to clock into
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clock Out Dialog */}
      <Dialog open={showClockOutDialog} onOpenChange={setShowClockOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock Out</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <div className="flex-1">
                <p className="font-medium">{activeEntry?.jobs?.title}</p>
                <p className="text-sm text-muted-foreground">
                  Total time: {formatElapsed(elapsedTime)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add any notes about the work completed..."
                value={clockOutNotes}
                onChange={(e) => setClockOutNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClockOutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClockOut}
              disabled={clockOut.isPending}
            >
              {clockOut.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm Clock Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
