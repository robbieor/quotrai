import { Navigate } from "react-router-dom";
import { useSeatAccess } from "@/hooks/useSeatAccess";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { SeatType } from "@/hooks/useSubscriptionTier";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";

interface SeatGuardProps {
  requiredSeat: SeatType;
  children: React.ReactNode;
}

const SEAT_LABELS: Record<SeatType, string> = {
  lite: "Lite",
  connect: "Connect",
  grow: "Grow",
};

/**
 * Blocks access to pages that require a higher seat type.
 * Shows a branded upgrade prompt instead of just redirecting.
 */
export function SeatGuard({ requiredSeat, children }: SeatGuardProps) {
  const { user } = useAuth();
  const { canAccess, isLoading } = useSeatAccess();
  const isNative = useIsNative();

  // Don't guard if not logged in or still loading
  if (!user || isLoading) return <>{children}</>;

  if (!canAccess(requiredSeat)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center border-border/50">
          <CardHeader className="pb-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">
              {SEAT_LABELS[requiredSeat]}+ Feature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              This feature requires a <strong>{SEAT_LABELS[requiredSeat]}</strong> seat or higher.
              {isNative
                ? " Manage your subscription at quotr.work."
                : " Ask your team owner to upgrade your seat to access this page."}
            </p>
            {isNative ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => openExternalUrl("https://quotr.work/settings?tab=team-billing")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Browser
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/settings?tab=team-billing">View Plans</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
