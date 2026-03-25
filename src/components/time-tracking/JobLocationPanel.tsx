import { useMemo } from "react";
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

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBbox(lat: number, lon: number, zoom: number): string {
  const degreesPerPixel = 360 / Math.pow(2, zoom) / 256;
  const width = degreesPerPixel * 800;
  const height = degreesPerPixel * 500;
  return `${lon - width / 2},${lat - height / 2},${lon + width / 2},${lat + height / 2}`;
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

function LiveMapEmbed({ lat, lng, zoom = 15, markerLat, markerLng }: {
  lat: number;
  lng: number;
  zoom?: number;
  markerLat?: number;
  markerLng?: number;
}) {
  const bbox = calculateBbox(lat, lng, zoom);
  const marker = markerLat && markerLng ? `&marker=${markerLat},${markerLng}` : "";
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${marker}`;

  return (
    <iframe
      title="Live Location Map"
      src={src}
      className="w-full h-full border-0"
      loading="eager"
      referrerPolicy="no-referrer"
    />
  );
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

  // Map center: job site > user location > Dublin fallback
  const mapCenter = jobSite
    ? { lat: jobSite.latitude, lng: jobSite.longitude }
    : userLocation
    ? { lat: userLocation.lat, lng: userLocation.lng }
    : { lat: 53.3498, lng: -6.2603 };

  const markerLat = jobSite?.latitude ?? userLocation?.lat;
  const markerLng = jobSite?.longitude ?? userLocation?.lng;

  // GPS accuracy indicator
  const accuracyIndicator = (() => {
    if (isGettingLocation) return <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Updating…</span>;
    if (!userLocation) return null;
    const acc = userLocation.accuracy;
    if (acc <= 30) return <span className="text-xs text-primary flex items-center gap-1"><Signal className="h-3 w-3" />GPS Locked (±{Math.round(acc)}m)</span>;
    if (acc <= 100) return <span className="text-xs flex items-center gap-1" style={{ color: "hsl(var(--warning, 38 92% 50%))" }}><SignalLow className="h-3 w-3" />Approximate (±{Math.round(acc)}m)</span>;
    return <span className="text-xs text-destructive flex items-center gap-1"><SignalZero className="h-3 w-3" />Weak signal (±{Math.round(acc)}m)</span>;
  })();

  // Status badge
  const statusBadge = (() => {
    if (!jobSite) {
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <Navigation className="h-3 w-3" />
          No job selected
        </Badge>
      );
    }
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
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {jobSite ? "Job Location" : "Live Location"}
          </div>
          {statusBadge}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        {/* Job info when a job is selected */}
        {jobSite && (
          <div className="space-y-1">
            <p className="font-medium text-sm">{jobSite.jobTitle}</p>
            <p className="text-xs text-muted-foreground">{jobSite.customerName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {jobSite.address}
            </p>
          </div>
        )}

        {/* Live map — always rendered */}
        <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden border relative bg-muted">
          <LiveMapEmbed
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            zoom={jobSite ? 16 : 14}
            markerLat={markerLat}
            markerLng={markerLng}
          />

          {/* Geofence radius overlay label */}
          {jobSite && (
            <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-1 shadow-sm z-[10]">
              <Crosshair className="h-3 w-3 text-primary" />
              {jobSite.geofence_radius}m geofence
            </div>
          )}

          {/* Open in maps link */}
          <a
            href={`https://www.openstreetmap.org/?mlat=${mapCenter.lat}&mlon=${mapCenter.lng}#map=16/${mapCenter.lat}/${mapCenter.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs hover:bg-background transition-colors shadow-sm flex items-center gap-1 z-[10]"
          >
            <MapPin className="h-3 w-3" />
            Open map
          </a>

          {/* No location overlay */}
          {!userLocation && !jobSite && !isGettingLocation && (
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

          {/* Loading overlay */}
          {isGettingLocation && !userLocation && !jobSite && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 z-[10]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
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

        {/* Location warning */}
        {!userLocation && !isGettingLocation && locationError && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {locationError.includes("denied")
                    ? "Location permission denied"
                    : "Current location unavailable"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {locationError.includes("denied")
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

        {/* No job selected hint */}
        {!jobSite && (
          <p className="text-xs text-muted-foreground text-center">
            Select a job to see its site location and geofence.
          </p>
        )}

        {/* Verification status when clocked in */}
        {isClocked && (
          <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
            clockInVerified
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
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
