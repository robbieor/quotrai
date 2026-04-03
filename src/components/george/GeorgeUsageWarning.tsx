import { AlertTriangle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useGeorgeAccess } from "@/hooks/useGeorgeAccess";
import { useNavigate } from "react-router-dom";

export function GeorgeUsageWarning() {
  const { voiceMinutesUsed, voiceMinutesLimit, remainingMinutes, isMinutesExhausted, georgeVoiceSeats } = useGeorgeAccess();
  const navigate = useNavigate();

  // Don't show if no voice seats or no limit set
  if (georgeVoiceSeats === 0 || voiceMinutesLimit === 0) return null;

  const usagePercentage = (voiceMinutesUsed / voiceMinutesLimit) * 100;

  // Show exhausted warning
  if (isMinutesExhausted) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Voice minutes exhausted. Add more seats to continue.</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/settings?tab=team-billing")}
            className="ml-2"
          >
            Add Seats
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show 80% warning
  if (usagePercentage >= 80) {
    return (
      <Alert className="mb-4 border-warning/50 bg-warning/10 text-warning-foreground">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            {Math.round(remainingMinutes)} mins remaining ({Math.round(usagePercentage)}% used)
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/settings?tab=team-billing")}
            className="ml-2"
          >
            View Usage
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
