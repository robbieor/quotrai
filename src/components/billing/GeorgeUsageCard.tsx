import { Mic } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { format } from "date-fns";

export function GeorgeUsageCard() {
  const { teamSubscription, canUseVoice, remainingVoiceMinutes } = useSubscriptionTier();

  if (!teamSubscription) return null;

  const usedMinutes = teamSubscription.george_voice_minutes_used || 0;
  const limitMinutes = teamSubscription.george_voice_minutes_limit || 0;
  const usagePercent = limitMinutes > 0 ? (usedMinutes / limitMinutes) * 100 : 0;
  const resetDate = teamSubscription.george_usage_reset_date 
    ? format(new Date(teamSubscription.george_usage_reset_date), "MMMM d, yyyy")
    : "next month";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className={`h-5 w-5 ${canUseVoice ? "text-primary" : "text-muted-foreground"}`} />
          Revamo AI Voice Usage
        </CardTitle>
        <CardDescription>
          Resets on {resetDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{Math.round(usedMinutes)} minutes used</span>
            <span className="text-muted-foreground">{limitMinutes} minutes total</span>
          </div>
          <Progress 
            value={usagePercent} 
            className={usagePercent >= 90 ? "[&>div]:bg-destructive" : ""}
          />
        </div>
        
        {!canUseVoice && limitMinutes > 0 && (
          <p className="text-sm text-muted-foreground">
            You've used all your voice minutes this month.
          </p>
        )}
        
        <p className="text-sm text-muted-foreground">
          {Math.round(remainingVoiceMinutes)} minutes remaining
        </p>
      </CardContent>
    </Card>
  );
}
