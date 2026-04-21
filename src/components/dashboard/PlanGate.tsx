import { useSeatAccess } from "@/hooks/useSeatAccess";
import { Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { SeatType } from "@/hooks/useSubscriptionTier";

interface PlanGateProps {
  /** Minimum seat required to show children */
  requiredSeat: SeatType;
  children: React.ReactNode;
  /** Compact inline hint instead of blocking */
  inline?: boolean;
  /** Override the upgrade label */
  featureLabel?: string;
}

const SEAT_LABELS: Record<SeatType, string> = {
  lite: "Solo",
  connect: "Crew",
  grow: "Business",
};

/**
 * Inline plan gate for dashboard widgets.
 * Shows a subtle upgrade prompt instead of hiding content completely.
 */
export function PlanGate({ requiredSeat, children, inline, featureLabel }: PlanGateProps) {
  const { canAccess, isLoading } = useSeatAccess();

  if (isLoading) return <>{children}</>;

  if (canAccess(requiredSeat)) {
    return <>{children}</>;
  }

  if (inline) {
    return null;
  }

  // Show a compact upgrade card in place of the gated content
  return (
    <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center text-center min-h-[160px]">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        {featureLabel || `${SEAT_LABELS[requiredSeat]}+ Feature`}
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Upgrade to {SEAT_LABELS[requiredSeat]} to unlock this.
      </p>
      <Button asChild size="sm" variant="outline" className="gap-1 text-xs h-7">
        <Link to="/pricing">
          Upgrade <ArrowRight className="h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
