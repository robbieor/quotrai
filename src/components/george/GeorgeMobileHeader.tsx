import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { UserMenu } from "@/components/layout/UserMenu";

interface GeorgeMobileHeaderProps {
  onMenuClick: () => void;
}

export function GeorgeMobileHeader({ onMenuClick }: GeorgeMobileHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 safe-area-pt bg-background border-b border-border flex-shrink-0">
      {/* Left — sidebar trigger + AI identity */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-muted"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <ForemanAvatar size="md" />
        <div className="flex flex-col">
          <span className="font-semibold text-[15px] leading-tight">Foreman AI</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[12px] text-muted-foreground">Online</span>
          </div>
        </div>
      </div>

      {/* Right — notifications + avatar */}
      <div className="flex items-center gap-1">
        <NotificationCenter />
        <UserMenu />
      </div>
    </div>
  );
}
