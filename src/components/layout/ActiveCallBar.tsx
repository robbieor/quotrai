import { PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import tomAvatar from "@/assets/tom-avatar.png";

// Pages where call bar should NOT appear
const EXCLUDED_PATHS = ["/", "/login", "/signup", "/request-access", "/forgot-password", "/reset-password", "/portal", "/customer"];

export function ActiveCallBar() {
  const { status, isSpeaking, stopConversation } = useGlobalVoiceAgent();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on excluded pages
  const isExcluded = EXCLUDED_PATHS.some(path => 
    location.pathname === path || location.pathname.startsWith("/portal/") || location.pathname.startsWith("/customer")
  );
  
  if (status !== "connected" || isExcluded) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "bg-primary text-primary-foreground",
        "px-4 py-2",
        "flex items-center justify-between gap-4",
        "shadow-lg",
        "animate-fade-in"
      )}
    >
      {/* Left: Avatar and status indicator */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/30">
          <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full bg-white",
              isSpeaking ? "animate-pulse" : "opacity-60"
            )}
          />
          <span className="font-medium text-sm">
            {isSpeaking ? "Foreman AI is speaking..." : "Listening..."}
          </span>
        </div>
      </div>

      {/* Center: Navigation hint */}
      <button
        onClick={() => navigate("/foreman-ai")}
        className="text-sm opacity-80 hover:opacity-100 transition-opacity underline underline-offset-2"
      >
        Open Foreman AI Chat
      </button>

      {/* Right: End call button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={stopConversation}
        className="bg-white/20 hover:bg-destructive hover:text-destructive-foreground text-white border-0 gap-2 transition-colors"
      >
        <PhoneOff className="h-4 w-4" />
        End Call
      </Button>
    </div>
  );
}
