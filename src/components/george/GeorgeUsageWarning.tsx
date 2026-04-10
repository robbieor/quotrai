import { AlertTriangle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGeorgeAccess } from "@/hooks/useGeorgeAccess";
import { BuyMoreMinutesButton } from "./BuyMoreMinutesButton";
import { Link } from "react-router-dom";

export function GeorgeUsageWarning() {
  const { voiceMinutesUsed, voiceMinutesLimit, remainingMinutes, isMinutesExhausted, georgeVoiceSeats } = useGeorgeAccess();

  // Don't show if no voice seats or no limit set
  if (georgeVoiceSeats === 0 || voiceMinutesLimit === 0) return null;

  const usagePercentage = (voiceMinutesUsed / voiceMinutesLimit) * 100;

  // Show exhausted warning with buy more option
  if (isMinutesExhausted) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Voice minutes exhausted. <Link to="/voice-usage" className="underline">View usage</Link></span>
          <BuyMoreMinutesButton variant="outline" size="sm" className="ml-2" />
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
            {Math.round(remainingMinutes)} mins remaining ({Math.round(usagePercentage)}% used) · <Link to="/voice-usage" className="underline">View usage</Link>
          </span>
          <BuyMoreMinutesButton variant="outline" size="sm" className="ml-2" />
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
