import { useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToggleGeorgeVoice } from "@/hooks/useToggleGeorgeVoice";
import { TeamGeorgeUser } from "@/hooks/useGeorgeAccess";

interface GeorgeVoiceToggleProps {
  user: TeamGeorgeUser;
  currentUserId: string | undefined;
  isOwner: boolean;
  disabled?: boolean;
}

export function GeorgeVoiceToggle({ 
  user, 
  currentUserId, 
  isOwner,
  disabled = false,
}: GeorgeVoiceToggleProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingState, setPendingState] = useState<boolean | null>(null);
  const toggleGeorgeVoice = useToggleGeorgeVoice();

  const isCurrentUser = user.user_id === currentUserId;
  const hasVoice = user.has_george_voice;

  const handleToggleRequest = (checked: boolean) => {
    setPendingState(checked);
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (pendingState !== null) {
      toggleGeorgeVoice.mutate({
        targetUserId: user.user_id,
        enable: pendingState,
      });
    }
    setShowConfirmDialog(false);
    setPendingState(null);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setPendingState(null);
  };

  const displayName = user.full_name || user.email || "Team member";

  if (!isOwner) {
    // Non-owners just see the status badge
    return hasVoice ? (
      <Badge variant="default" className="gap-1">
        <Mic className="h-3 w-3" />
        Voice Enabled
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <MicOff className="h-3 w-3" />
        Text Only
      </Badge>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Switch
          checked={hasVoice}
          onCheckedChange={handleToggleRequest}
          disabled={disabled || toggleGeorgeVoice.isPending}
        />
        {toggleGeorgeVoice.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : hasVoice ? (
          <Badge variant="default" className="gap-1">
            <Mic className="h-3 w-3" />
            Voice
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <MicOff className="h-3 w-3" />
            Text
          </Badge>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingState ? "Enable Revamo AI Voice" : "Disable Revamo AI Voice"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingState ? (
                <>
                  Enable Revamo AI voice for <strong>{displayName}</strong>?
                  {isCurrentUser && " You'll have immediate access to voice features."}
                </>
              ) : (
                <>
                  Disable Revamo AI voice for <strong>{displayName}</strong>?
                  <br /><br />
                  They'll still have access to Revamo AI text chat.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {pendingState ? "Enable" : "Disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
