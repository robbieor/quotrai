import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LITE_SEAT_DETAILS, CONNECT_SEAT_DETAILS, GROW_SEAT_DETAILS } from "@/hooks/useSubscriptionTier";

const PLAN_MAP: Record<string, { name: string }> = {
  lite: LITE_SEAT_DETAILS,
  connect: CONNECT_SEAT_DETAILS,
  grow: GROW_SEAT_DETAILS,
};

export default function SubscriptionConfirmed() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const planCode = params.get("plan") || "connect";
  const interval = params.get("interval") || "month";
  const planName = PLAN_MAP[planCode]?.name || "Connect";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">You're all set!</h1>
            <p className="text-muted-foreground">
              Your <span className="font-semibold text-foreground">{planName}</span> plan is now active
              {interval === "year" ? " (billed annually)" : ""}.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground space-y-1">
            <p>✓ Full access to all {planName} features</p>
            <p>✓ Your team can start using Foreman immediately</p>
            <p>✓ Manage billing anytime in Settings</p>
          </div>

          <Button size="lg" className="w-full gap-2" onClick={() => navigate("/dashboard")}>
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
