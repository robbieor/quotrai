import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: string;
  className?: string;
  geofenceRadius?: number;
  showMarker?: boolean;
}

export function MapPreview({ latitude, longitude, zoom = 15, height = "200px", className, geofenceRadius, showMarker = true }: MapPreviewProps) {
  const mapUrl = useMemo(() => {
    const bbox = calculateBbox(latitude, longitude, zoom);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  }, [latitude, longitude, zoom]);

  if (!latitude || !longitude || (latitude === 0 && longitude === 0)) return null;

  return (
    <div className={cn("relative rounded-lg overflow-hidden border bg-muted", className)} style={{ height }}>
      <iframe title="Location Map" src={mapUrl} className="w-full h-full border-0" style={{ minHeight: height }} loading="lazy" referrerPolicy="no-referrer" />
      {geofenceRadius && (
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-1 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
          <span>{geofenceRadius}m geofence</span>
        </div>
      )}
      <a href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs hover:bg-background transition-colors shadow-sm flex items-center gap-1">
        <MapPin className="h-3 w-3" />Open map
      </a>
    </div>
  );
}

function calculateBbox(lat: number, lon: number, zoom: number): string {
  const degreesPerPixel = 360 / Math.pow(2, zoom) / 256;
  const width = degreesPerPixel * 600;
  const height = degreesPerPixel * 300;
  return `${lon - width / 2},${lat - height / 2},${lon + width / 2},${lat + height / 2}`;
}

interface StaticMapPreviewProps {
  latitude: number;
  longitude: number;
  className?: string;
}

export function StaticMapPreview({ latitude, longitude, className }: StaticMapPreviewProps) {
  if (!latitude || !longitude || (latitude === 0 && longitude === 0)) return null;
  return (
    <a href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`} target="_blank" rel="noopener noreferrer" className={cn("block rounded-md overflow-hidden border hover:opacity-90 transition-opacity", className)}>
      <img src={`https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=400x150&maptype=mapnik&markers=${latitude},${longitude},red-pushpin`} alt="Location preview" className="w-full h-auto" loading="lazy" />
    </a>
  );
}
