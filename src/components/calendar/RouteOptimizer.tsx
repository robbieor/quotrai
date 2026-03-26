import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Route, Loader2, ArrowDown } from "lucide-react";
import type { Job } from "@/hooks/useJobs";
import { toast } from "sonner";

interface RouteOptimizerProps {
  jobs: Job[];
  onReorder: (orderedJobIds: string[]) => void;
}

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimate travel time at 40 km/h average
function travelMinutes(km: number): number {
  return Math.round((km / 40) * 60);
}

// Nearest-neighbour TSP
function optimizeRoute(jobs: Array<{ id: string; lat: number; lng: number }>): string[] {
  if (jobs.length <= 1) return jobs.map((j) => j.id);
  const remaining = [...jobs];
  const route: typeof jobs = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let nearest = 0;
    let nearestDist = Infinity;
    remaining.forEach((j, i) => {
      const d = haversine(last.lat, last.lng, j.lat, j.lng);
      if (d < nearestDist) { nearestDist = d; nearest = i; }
    });
    route.push(remaining.splice(nearest, 1)[0]);
  }

  return route.map((j) => j.id);
}

export function RouteOptimizer({ jobs, onReorder }: RouteOptimizerProps) {
  const [optimizing, setOptimizing] = useState(false);

  const geoJobs = jobs.filter((j) => j.latitude && j.longitude);

  if (geoJobs.length < 2) return null;

  const handleOptimize = () => {
    setOptimizing(true);
    setTimeout(() => {
      const ordered = optimizeRoute(
        geoJobs.map((j) => ({ id: j.id, lat: j.latitude!, lng: j.longitude! }))
      );
      onReorder(ordered);
      toast.success("Route optimized — jobs reordered to minimize travel");
      setOptimizing(false);
    }, 300);
  };

  // Calculate total travel
  let totalKm = 0;
  for (let i = 0; i < geoJobs.length - 1; i++) {
    totalKm += haversine(geoJobs[i].latitude!, geoJobs[i].longitude!, geoJobs[i + 1].latitude!, geoJobs[i + 1].longitude!);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleOptimize} disabled={optimizing} className="gap-1.5">
        {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Route className="h-3.5 w-3.5" />}
        Optimize Route
      </Button>
      {totalKm > 0 && (
        <Badge variant="secondary" className="text-xs">
          ~{totalKm.toFixed(1)}km · {travelMinutes(totalKm)} min travel
        </Badge>
      )}
    </div>
  );
}

// Utility: compute travel chip between two jobs
export function TravelChip({ from, to }: { from: Job; to: Job }) {
  if (!from.latitude || !from.longitude || !to.latitude || !to.longitude) return null;
  const km = haversine(from.latitude, from.longitude, to.latitude, to.longitude);
  if (km < 0.1) return null;
  const mins = travelMinutes(km);
  return (
    <div className="flex items-center justify-center py-0.5">
      <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
        🚗 ~{mins} min
        <ArrowDown className="h-2.5 w-2.5" />
      </span>
    </div>
  );
}
