import { AlertCircle, MessageSquare, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";

interface VoiceFallbackBannerProps {
  onFocusTextInput?: () => void;
}

export function VoiceFallbackBanner({ onFocusTextInput }: VoiceFallbackBannerProps) {
  const { 
    voiceUnavailable, 
    resetVoiceAvailability, 
    retryAttempt, 
    maxRetries,
    isConnecting 
  } = useGlobalVoiceAgent();

  // Show retry progress if actively retrying
  if (retryAttempt > 0 && isConnecting) {
    const progress = (retryAttempt / maxRetries) * 100;
    return (
      <div className="mx-4 mb-3 p-3 bg-muted/50 border border-border rounded-lg">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              Reconnecting to revamo AI...
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attempt {retryAttempt} of {maxRetries}
            </p>
            <Progress value={progress} className="h-1 mt-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!voiceUnavailable) return null;

  return (
    <div className="mx-4 mb-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-warning">
            Voice temporarily unavailable
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Don't worry — revamo AI can still help you via text chat. We're working on restoring voice.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              onClick={onFocusTextInput}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Use Text Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={resetVoiceAvailability}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Try Voice Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
