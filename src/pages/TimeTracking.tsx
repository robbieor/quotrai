import { useState, lazy, Suspense, Component, type ReactNode } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, List, Bell } from "lucide-react";
import { ClockInOutCard } from "@/components/time-tracking/ClockInOutCard";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";
import { GeofenceSettings } from "@/components/time-tracking/GeofenceSettings";
import { JobLocationPanel } from "@/components/time-tracking/JobLocationPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveTimeEntry, useGeolocation, useJobSites } from "@/hooks/useTimeTracking";
import { useJobs } from "@/hooks/useJobs";

const StaffLocationMap = lazy(() => import("@/components/time-tracking/StaffLocationMap").then(m => ({ default: m.StaffLocationMap })));

class TimeTrackingErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("TimeTracking error boundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
          <p className="font-medium">Something went wrong loading this section.</p>
          <p className="text-sm mt-1">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const MapFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-[300px] rounded-lg" />
  </div>
);

function ClockTabContent() {
  const [selectedJobId, setSelectedJobId] = useState("");
  const { data: activeEntry } = useActiveTimeEntry();
  const { data: jobSites } = useJobSites();
  const { data: jobs } = useJobs();
  const { getCurrentPosition } = useGeolocation();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const fetchLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);
    try {
      const position = await getCurrentPosition();
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "Could not get location");
    } finally {
      setIsGettingLocation(false);
    }
  };

  useState(() => {
    void fetchLocation();
    return null;
  });

  const selectedSite = (() => {
    const activeJobId = activeEntry?.job_id;
    const effectiveJobId = activeJobId || selectedJobId;
    if (!effectiveJobId || !jobSites) return null;
    const site = jobSites.find((item) => item.job_id === effectiveJobId);
    if (!site) return null;
    const job = jobs?.find((item) => item.id === effectiveJobId);
    return {
      latitude: site.latitude,
      longitude: site.longitude,
      geofence_radius: site.geofence_radius || 200,
      address: site.address || "",
      jobTitle: job?.title || site.jobs?.title || "Job Site",
      customerName: job?.customers?.name || site.customers?.name || "",
      validForGps: site.location_valid_for_gps !== false,
    };
  })();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TimeTrackingErrorBoundary>
        <ClockInOutCard selectedJobId={selectedJobId} onSelectedJobChange={setSelectedJobId} />
      </TimeTrackingErrorBoundary>
      <TimeTrackingErrorBoundary fallback={<MapFallback />}>
        <JobLocationPanel
          jobSite={selectedSite}
          userLocation={userLocation}
          locationError={locationError}
          isGettingLocation={isGettingLocation}
          onRetryLocation={fetchLocation}
          isClocked={!!activeEntry}
          clockInVerified={activeEntry?.clock_in_verified}
        />
      </TimeTrackingErrorBoundary>
    </div>
  );
}

export default function TimeTracking() {
  const [activeTab, setActiveTab] = useState("clock");

  return (
    <DashboardLayout>
      <TimeTrackingErrorBoundary>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
            <p className="text-muted-foreground">
              GPS-verified clock-in/out linked to your jobs
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 lg:w-[560px]">
              <TabsTrigger value="clock" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Time Clock</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Staff</span>
              </TabsTrigger>
              <TabsTrigger value="entries" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Entries</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clock" className="mt-6">
              <ClockTabContent />
            </TabsContent>

            <TabsContent value="staff" className="mt-6">
              <TimeTrackingErrorBoundary fallback={<MapFallback />}>
                <Suspense fallback={<MapFallback />}>
                  <StaffLocationMap />
                </Suspense>
              </TimeTrackingErrorBoundary>
            </TabsContent>

            <TabsContent value="entries" className="mt-6">
              <TimeTrackingErrorBoundary>
                <TimeEntriesList />
              </TimeTrackingErrorBoundary>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <div className="max-w-2xl">
                <TimeTrackingErrorBoundary>
                  <GeofenceSettings />
                </TimeTrackingErrorBoundary>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </TimeTrackingErrorBoundary>
    </DashboardLayout>
  );
}
