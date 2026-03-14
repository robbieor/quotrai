import { Menu, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import tomAvatar from "@/assets/tom-avatar.png";

interface GeorgeMobileHeaderProps {
  onMenuClick: () => void;
}

export function GeorgeMobileHeader({ onMenuClick }: GeorgeMobileHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 safe-area-pt bg-background border-b border-border">
      {/* Left side - Menu button and title pill */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-muted"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2 bg-white border border-border rounded-full px-3 py-1.5 shadow-sm">
          <div className="w-6 h-6 rounded-full overflow-hidden">
            <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
          </div>
          <span className="font-medium text-sm">Foreman AI</span>
        </div>
      </div>

      {/* Right side - Action icons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-muted"
        >
          <Scan className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
