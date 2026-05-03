import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Users, Clock, Battery, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useStaffLocations, useJobSites } from "@/hooks/useTimeTracking";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
// leaflet.css is imported globally in index.css

// Fix default marker icons for Leaflet + bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const staffIcon = new L.DivIcon({
  className: "staff-marker",
  html: `<div style="width:32px;height:32px;border-radius:50%;background:hsl(var(--primary));display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">●</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const siteIcon = new L.DivIcon({
  className: "site-marker",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:hsl(var(--destructive));display:flex;align-items:center;justify-content:center;color:white;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

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

// Force Leaflet to recalculate size after lazy-load mount
function MapReady() {
  const map = useMap();
  useEffect(() => {
    // Small delay to let the container fully render inside Suspense
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Auto-fit map bounds to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
}

export function StaffLocationMap() {
  const { data: staffLocations, isLoading: loadingStaff } = useStaffLocations();
  const { data: jobSites } = useJobSites();
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const activeStaff = staffLocations?.filter((s) => s.status === "clocked_in") || [];

  // Collect all positions for bounds fitting
  const allPositions: [number, number][] = [];
  staffLocations?.forEach((s) => {
    if (s.location) allPositions.push([s.location.lat, s.location.lng]);
  });
  jobSites?.forEach((site) => {
    allPositions.push([site.latitude, site.longitude]);
  });

  // Default center (Dublin, Ireland)
  const defaultCenter: [number, number] = [53.3498, -6.2603];
  const center = allPositions.length > 0 ? allPositions[0] : defaultCenter;

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
        {/* Leaflet Map */}
        <div className="h-[400px] rounded-lg overflow-hidden border">
          <MapContainer
            center={center}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <MapReady />
            {allPositions.length > 0 && <FitBounds positions={allPositions} />}

            {/* Job site markers with geofence circles */}
            {jobSites?.map((site) => (
              <React.Fragment key={site.id}>
                <Circle
                  center={[site.latitude, site.longitude]}
                  radius={site.geofence_radius || 200}
                  pathOptions={{
                    color: "hsl(var(--primary))",
                    fillColor: "hsl(var(--primary))",
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: "5, 5",
                  }}
                />
                <Marker
                  position={[site.latitude, site.longitude]}
                  icon={siteIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{site.jobs?.title || "Job Site"}</p>
                      <p className="text-muted-foreground">{site.address}</p>
                      <p className="text-xs mt-1">
                        Geofence: {site.geofence_radius || 200}m radius
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}

            {/* Staff location markers */}
            {staffLocations?.map((staff) => {
              if (!staff.location) return null;
              return (
                <Marker
                  key={staff.user_id}
                  position={[staff.location.lat, staff.location.lng]}
                  icon={staffIcon}
                  eventHandlers={{
                    click: () => setSelectedStaff(staff as StaffMember),
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{staff.name}</p>
                      <p>{staff.current_job || "Not clocked in"}</p>
                      {staff.last_updated && (
                        <p className="text-xs mt-1">
                          Updated{" "}
                          {formatDistanceToNow(new Date(staff.last_updated), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

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
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }
              >
                {selectedStaff.status === "clocked_in" ? "On-site" : "Clocked out"}
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
                        ? "bg-primary"
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
