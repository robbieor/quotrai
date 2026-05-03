import { ChevronLeft, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";
import { NotificationCenter } from "@/components/layout/NotificationCenter";


interface GeorgeMobileHeaderProps {
  onMenuClick: () => void;
}

export function GeorgeMobileHeader({ onMenuClick }: GeorgeMobileHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-3 py-2.5 safe-area-pt bg-background border-b border-border flex-shrink-0">
      {/* Left — sidebar toggle + AI identity */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full hover:bg-muted"
          onClick={onMenuClick}
          aria-label="Chat history"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <ForemanAvatar size="sm" />
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[15px] leading-tight">Revamo AI</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Right — back to dashboard + notifications */}
      <div className="flex items-center gap-0.5">
        <NotificationCenter />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full hover:bg-muted"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
