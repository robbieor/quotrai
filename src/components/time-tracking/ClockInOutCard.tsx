import { useState, useEffect } from "react";
import { format, differenceInSeconds } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  MapPin,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Navigation,
} from "lucide-react";
import {
  useActiveTimeEntry,
  useClockIn,
  useClockOut,
  useGeolocation,
  useJobSites,
  isWithinGeofence,
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
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const { getCurrentPosition } = useGeolocation();

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

  // Fetch location on mount
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

  const handleClockIn = async () => {
    if (!selectedJobId) return;

    await fetchLocation();

    clockIn.mutate({
      job_id: selectedJobId,
      latitude: currentLocation?.lat,
      longitude: currentLocation?.lng,
      accuracy: currentLocation?.accuracy,
    });
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;

    await fetchLocation();

    clockOut.mutate(
      {
        time_entry_id: activeEntry.id,
        latitude: currentLocation?.lat,
        longitude: currentLocation?.lng,
        accuracy: currentLocation?.accuracy,
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

  // Find nearby job site
  const nearbyJobSite = jobSites?.find((site) => {
    if (!currentLocation) return false;
    return isWithinGeofence(
      currentLocation.lat,
      currentLocation.lng,
      site.latitude,
      site.longitude,
      site.geofence_radius
    );
  });

  // Auto-select job if nearby
  useEffect(() => {
    if (nearbyJobSite && !selectedJobId && !activeEntry) {
      setSelectedJobId(nearbyJobSite.job_id);
    }
  }, [nearbyJobSite, selectedJobId, activeEntry]);

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
        <CardContent className="space-y-4">
          {/* Current Time */}
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
                <span className="text-muted-foreground">
                  Getting location...
                </span>
              </>
            ) : locationError ? (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{locationError}</span>
                <Button variant="ghost" size="sm" onClick={fetchLocation}>
                  Retry
                </Button>
              </>
            ) : currentLocation ? (
              <>
                <Navigation className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  Location: ±{Math.round(currentLocation.accuracy)}m accuracy
                </span>
              </>
            ) : null}
          </div>

          {/* Nearby Job Site Alert */}
          {nearbyJobSite && !activeEntry && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <MapPin className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  You're near: {nearbyJobSite.jobs?.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nearbyJobSite.address}
                </p>
              </div>
            </div>
          )}

          {activeEntry ? (
            /* Clocked In State */
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
            /* Clocked Out State */
            <div className="space-y-4">
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job to clock in" />
                </SelectTrigger>
                <SelectContent>
                  {jobs
                    ?.filter(
                      (job) =>
                        job.status === "scheduled" ||
                        job.status === "in_progress"
                    )
                    .map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} - {job.customers?.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                size="lg"
                onClick={handleClockIn}
                disabled={!selectedJobId || clockIn.isPending}
              >
                {clockIn.isPending ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Play className="h-5 w-5 mr-2" />
                )}
                Clock In
              </Button>
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
