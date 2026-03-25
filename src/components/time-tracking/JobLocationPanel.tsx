import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  MapPinOff,
  Navigation,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Signal,
  SignalLow,
  SignalZero,
  Crosshair,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const jobSiteIcon = new L.DivIcon({
  className: "job-site-marker",
  html: `<div style="width:36px;height:36px;border-radius:50%;background:hsl(var(--destructive));display:flex;align-items:center;justify-content:center;color:white;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid white;">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const userIcon = new L.DivIcon({
  className: "user-marker",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:hsl(var(--primary));box-shadow:0 0 0 4px hsla(var(--primary)/0.3),0 2px 8px rgba(0,0,0,0.3);border:3px solid white;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Force recalculate + fit bounds
function MapController({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (positions.length > 1) {
        map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], maxZoom: 16 });
      } else if (positions.length === 1) {
        map.setView(positions[0], 16);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [map, positions]);
  return null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface JobSiteInfo {
  latitude: number;
  longitude: number;
  geofence_radius: number;
  address: string;
  jobTitle: string;
  customerName: string;
  validForGps: boolean;
}

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface JobLocationPanelProps {
  jobSite: JobSiteInfo | null;
  userLocation: UserLocation | null;
  locationError: string | null;
  isGettingLocation: boolean;
  onRetryLocation: () => void;
  isClocked: boolean;
  clockInVerified?: boolean;
}

export function JobLocationPanel({
  jobSite,
  userLocation,
  locationError,
  isGettingLocation,
  onRetryLocation,
  isClocked,
  clockInVerified,
}: JobLocationPanelProps) {
  // Calculate proximity
  const proximity = useMemo(() => {
    if (!jobSite || !userLocation) return null;
    const dist = haversineDistance(userLocation.lat, userLocation.lng, jobSite.latitude, jobSite.longitude);
    const radius = jobSite.geofence_radius;
    return {
      distance: Math.round(dist),
      isOnSite: dist <= radius,
      isNearby: dist <= radius * 2,
      formattedDistance: dist > 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`,
    };
  }, [jobSite, userLocation]);

  // Default center: user location or Dublin fallback
  const defaultCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [53.3498, -6.2603];

  // STATE B: No job site — show live map centered on user location
  if (!jobSite) {
    const positions: [number, number][] = userLocation
      ? [[userLocation.lat, userLocation.lng]]
      : [defaultCenter];

    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Live Location
            </div>
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <Navigation className="h-3 w-3" />
              No job selected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden border relative">
            <MapContainer
              center={defaultCenter}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <MapController positions={positions} />
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
              )}
            </MapContainer>
            {!userLocation && !isGettingLocation && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-[10]">
                <div className="text-center space-y-2 p-4">
                  <MapPinOff className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Location unavailable</p>
                  <Button size="sm" variant="outline" onClick={onRetryLocation}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Retry
                  </Button>
                </div>
              </div>
            )}
            {isGettingLocation && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 z-[10]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Select a job to see its site location and geofence. GPS clock-in verification requires a job with a verified address.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Collect map positions
  const positions: [number, number][] = [[jobSite.latitude, jobSite.longitude]];
  if (userLocation) {
    positions.push([userLocation.lat, userLocation.lng]);
  }

  // Proximity status
  const statusBadge = (() => {
    if (!userLocation && locationError) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
          <MapPinOff className="h-3 w-3" />
          Location denied
        </Badge>
      );
    }
    if (!userLocation) {
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Locating…
        </Badge>
      );
    }
    if (proximity?.isOnSite) {
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          On site
        </Badge>
      );
    }
    if (proximity?.isNearby) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 gap-1">
          <Navigation className="h-3 w-3" />
          {proximity.formattedDistance} away
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
        <MapPinOff className="h-3 w-3" />
        {proximity?.formattedDistance} away
      </Badge>
    );
  })();

  // GPS accuracy indicator
  const accuracyIndicator = (() => {
    if (isGettingLocation) return <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Updating…</span>;
    if (!userLocation) return null;
    const acc = userLocation.accuracy;
    if (acc <= 30) return <span className="text-xs text-primary flex items-center gap-1"><Signal className="h-3 w-3" />GPS Locked (±{Math.round(acc)}m)</span>;
    if (acc <= 100) return <span className="text-xs text-amber-600 flex items-center gap-1"><SignalLow className="h-3 w-3" />Approximate (±{Math.round(acc)}m)</span>;
    return <span className="text-xs text-destructive flex items-center gap-1"><SignalZero className="h-3 w-3" />Weak signal (±{Math.round(acc)}m)</span>;
  })();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Job Location
          </div>
          {statusBadge}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        {/* Job info */}
        <div className="space-y-1">
          <p className="font-medium text-sm">{jobSite.jobTitle}</p>
          <p className="text-xs text-muted-foreground">{jobSite.customerName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {jobSite.address}
          </p>
        </div>

        {/* Live map — STATE A */}
        <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden border relative">
          <MapContainer
            center={[jobSite.latitude, jobSite.longitude]}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <MapController positions={positions} />

            {/* Geofence circle */}
            <Circle
              center={[jobSite.latitude, jobSite.longitude]}
              radius={jobSite.geofence_radius}
              pathOptions={{
                color: "hsl(var(--primary))",
                fillColor: "hsl(var(--primary))",
                fillOpacity: 0.08,
                weight: 2,
                dashArray: "6, 4",
              }}
            />

            {/* Job site marker */}
            <Marker position={[jobSite.latitude, jobSite.longitude]} icon={jobSiteIcon} />

            {/* User position marker */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
            )}
          </MapContainer>

          {/* Geofence radius label */}
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-1 shadow-sm z-[10]">
            <Crosshair className="h-3 w-3 text-primary" />
            {jobSite.geofence_radius}m geofence
          </div>
        </div>

        {/* Bottom info bar */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            {accuracyIndicator}
            {proximity && (
              <p className="text-xs text-muted-foreground">
                Distance: {proximity.formattedDistance}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetryLocation}
            disabled={isGettingLocation}
            className="h-8 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isGettingLocation ? "animate-spin" : ""}`} />
            <span className="text-xs">Refresh</span>
          </Button>
        </div>

        {/* STATE C: Device location unavailable — still show map with job site */}
        {!userLocation && !isGettingLocation && (
          <div className="p-3 rounded-lg border border-amber-300 bg-amber-500/5 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {locationError?.includes("denied")
                    ? "Location permission denied"
                    : "Current location unavailable"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {locationError?.includes("denied")
                    ? "Enable location in your browser settings to verify GPS clock-in."
                    : "Your GPS signal could not be acquired. Clock-in will be recorded without verification."}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onRetryLocation} className="w-full">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry Location
            </Button>
          </div>
        )}

        {/* Verification status when clocked in */}
        {isClocked && (
          <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
            clockInVerified
              ? "bg-primary/10 text-primary"
              : "bg-amber-500/10 text-amber-600"
          }`}>
            {clockInVerified ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-medium">Clock-in verified on site</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="font-medium">Clock-in recorded — manual review may be needed</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
