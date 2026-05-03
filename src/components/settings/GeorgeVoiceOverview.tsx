import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mic, Users, Clock } from "lucide-react";
import { useGeorgeAccess, useTeamGeorgeUsers } from "@/hooks/useGeorgeAccess";
import { format } from "date-fns";

export function GeorgeVoiceOverview() {
  const { 
    georgeVoiceSeats, 
    voiceMinutesUsed, 
    voiceMinutesLimit, 
    remainingMinutes,
    resetDate 
  } = useGeorgeAccess();
  const { data: georgeUsers = [] } = useTeamGeorgeUsers();

  const usagePercentage = voiceMinutesLimit > 0 
    ? Math.min(100, (voiceMinutesUsed / voiceMinutesLimit) * 100) 
    : 0;

  const formattedResetDate = resetDate 
    ? format(new Date(resetDate), "MMM d, yyyy")
    : "next month";

  const usersWithVoice = georgeUsers.filter(u => u.has_george_voice);
  const monthlyVoiceCost = georgeVoiceSeats * 29;

  if (georgeVoiceSeats === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Revamo AI Voice
          </CardTitle>
          <CardDescription>
            No team members have Revamo AI voice enabled yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enable Revamo AI voice for team members in the Team section below. 
            Each voice seat costs €29/month and includes 60 minutes of voice interaction.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Revamo AI Voice Access
        </CardTitle>
        <CardDescription>
          {georgeVoiceSeats} voice seat{georgeVoiceSeats !== 1 ? "s" : ""} active (€{monthlyVoiceCost}/month)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Voice Minutes Used
            </span>
            <span className="font-medium">
              {Math.round(voiceMinutesUsed)} / {voiceMinutesLimit} mins
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {remainingMinutes > 0 
              ? `${Math.round(remainingMinutes)} minutes remaining • Resets ${formattedResetDate}`
              : `Minutes exhausted • Resets ${formattedResetDate}`
            }
          </p>
        </div>

        {/* Users with Voice */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Team members with voice</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {usersWithVoice.map((user) => (
              <Badge key={user.user_id} variant="secondary" className="gap-1">
                <Mic className="h-3 w-3" />
                {user.full_name || user.email || "Team member"}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
