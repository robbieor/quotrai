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
import { MapPin, Clock, LogIn, LogOut, X } from 'lucide-react';
import { useGeofenceMonitoring, type GeofenceEvent } from '@/hooks/useGeofenceMonitoring';
import { useActiveTimeEntry, useClockIn, useClockOut, useGeolocation } from '@/hooks/useTimeTracking';

export function GeofencePrompt() {
  const [pendingEvent, setPendingEvent] = useState<GeofenceEvent | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const { onGeofenceEvent, isMonitoring, startMonitoring } = useGeofenceMonitoring();
  const { data: activeEntry } = useActiveTimeEntry();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const { getCurrentPosition } = useGeolocation();

  // Start monitoring on mount
  useEffect(() => {
    startMonitoring();
  }, [startMonitoring]);

  // Listen for geofence events
  useEffect(() => {
    const unsubscribe = onGeofenceEvent((event) => {
      // Only show prompt for relevant events
      if (event.type === 'ENTER' && !activeEntry) {
        // Arrived at site, not clocked in - prompt to clock in
        setPendingEvent(event);
        setShowDialog(true);
      } else if (event.type === 'EXIT' && activeEntry && activeEntry.job_id === event.jobSite.job_id) {
        // Left site while clocked in to that job - prompt to clock out
        setPendingEvent(event);
        setShowDialog(true);
      }
    });

    return unsubscribe;
  }, [onGeofenceEvent, activeEntry]);

  const handleClockIn = async () => {
    if (!pendingEvent) return;

    const position = await getCurrentPosition();

    clockIn.mutate(
      {
        job_id: pendingEvent.jobSite.job_id,
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
        accuracy: position?.coords.accuracy,
      },
      {
        onSuccess: () => {
          setShowDialog(false);
          setPendingEvent(null);
        },
      }
    );
  };

  const handleClockOut = async () => {
    if (!pendingEvent || !activeEntry) return;

    const position = await getCurrentPosition();

    clockOut.mutate(
      {
        time_entry_id: activeEntry.id,
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
        accuracy: position?.coords.accuracy,
      },
      {
        onSuccess: () => {
          setShowDialog(false);
          setPendingEvent(null);
        },
      }
    );
  };

  const handleDismiss = () => {
    setShowDialog(false);
    setPendingEvent(null);
  };

  if (!pendingEvent) return null;

  const isEnterEvent = pendingEvent.type === 'ENTER';
  const jobTitle = pendingEvent.jobSite.jobs?.title || 'Job Site';

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEnterEvent ? (
              <>
                <MapPin className="h-5 w-5 text-primary" />
                You've Arrived
              </>
            ) : (
              <>
                <LogOut className="h-5 w-5 text-primary" />
                Leaving Site
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{jobTitle}</p>
              <p className="text-sm text-muted-foreground">
                {pendingEvent.jobSite.address}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(pendingEvent.timestamp, 'h:mm a')}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {isEnterEvent ? 'Arrived' : 'Leaving'}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {isEnterEvent
              ? 'Would you like to clock in to this job?'
              : "Don't forget to clock out before you leave!"}
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Dismiss
          </Button>
          {isEnterEvent ? (
            <Button
              onClick={handleClockIn}
              disabled={clockIn.isPending}
              className="flex-1"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Clock In
            </Button>
          ) : (
            <Button
              onClick={handleClockOut}
              disabled={clockOut.isPending}
              variant="destructive"
              className="flex-1"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Clock Out
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
