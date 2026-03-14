import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Users, Clock, Battery, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useStaffLocations, useJobSites } from "@/hooks/useTimeTracking";

interface StaffMember {
  user_id: string;
  name: string;
  email: string | null;
  status: "clocked_in" | "clocked_out";
  current_job: string | null;
  location: { lat: number; lng: number } | null;
  last_updated: string | null;
  battery_level: number | null;
  is_moving: boolean;
}

export function StaffLocationMap() {
  const { data: staffLocations, isLoading: loadingStaff } = useStaffLocations();
  const { data: jobSites } = useJobSites();
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const activeStaff = staffLocations?.filter((s) => s.status === "clocked_in") || [];
  const inactiveStaff = staffLocations?.filter((s) => s.status === "clocked_out") || [];

  // Simple map visualization (in production, you'd use Mapbox/Google Maps)
  const renderMapPlaceholder = () => (
    <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden">
      {/* Map background pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(var(--foreground) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(var(--foreground) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Map content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Map visualization
          </p>
          <p className="text-xs text-muted-foreground">
            {activeStaff.length} staff on-site
          </p>
        </div>
      </div>

      {/* Staff location pins (positioned randomly for demo) */}
      {activeStaff.map((staff, index) => {
        const angle = (index / activeStaff.length) * 2 * Math.PI;
        const radius = 100 + Math.random() * 50;
        const x = 50 + (Math.cos(angle) * radius) / 4;
        const y = 50 + (Math.sin(angle) * radius) / 4;

        return (
          <div
            key={staff.user_id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => setSelectedStaff(staff as StaffMember)}
          >
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium shadow-lg">
                {staff.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
          </div>
        );
      })}

      {/* Job site markers */}
      {jobSites?.map((site, index) => {
        const x = 20 + (index * 20) % 60;
        const y = 30 + (index * 15) % 40;

        return (
          <div
            key={site.id}
            className="absolute transform -translate-x-1/2 -translate-y-full"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="flex flex-col items-center">
              <MapPin className="h-6 w-6 text-primary fill-primary/20" />
              <span className="text-[10px] bg-background/80 px-1 rounded mt-1 truncate max-w-[80px]">
                {site.jobs?.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (loadingStaff) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Locations
          </div>
          <Badge variant="outline">
            {activeStaff.length}/{staffLocations?.length || 0} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map */}
        {renderMapPlaceholder()}

        {/* Selected Staff Info */}
        {selectedStaff && (
          <div className="p-4 rounded-lg bg-muted space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                  {selectedStaff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{selectedStaff.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStaff.current_job || "No active job"}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  selectedStaff.status === "clocked_in"
                    ? "bg-green-500/10 text-green-600"
                    : "bg-muted text-muted-foreground"
                }
              >
                {selectedStaff.status === "clocked_in"
                  ? "On-site"
                  : "Clocked out"}
              </Badge>
            </div>
            {selectedStaff.last_updated && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(selectedStaff.last_updated), {
                    addSuffix: true,
                  })}
                </span>
                {selectedStaff.battery_level && (
                  <span className="flex items-center gap-1">
                    <Battery className="h-3 w-3" />
                    {selectedStaff.battery_level}%
                  </span>
                )}
                {selectedStaff.is_moving && (
                  <span className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    Moving
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Staff List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">All Staff</h4>
          <div className="divide-y">
            {staffLocations?.map((staff) => (
              <div
                key={staff.user_id}
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                onClick={() => setSelectedStaff(staff as StaffMember)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      staff.status === "clocked_in"
                        ? "bg-green-500"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <div>
                    <p className="font-medium">{staff.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {staff.current_job || "Not clocked in"}
                    </p>
                  </div>
                </div>
                {staff.last_updated && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(staff.last_updated), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
