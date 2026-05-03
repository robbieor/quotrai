import { HardHat } from "lucide-react";
import { cn } from "@/lib/utils";

type ForemanAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ForemanAvatarProps {
  size?: ForemanAvatarSize;
  className?: string;
}

const sizeMap: Record<ForemanAvatarSize, { container: string; icon: number }> = {
  xs: { container: "w-6 h-6", icon: 14 },
  sm: { container: "w-7 h-7", icon: 16 },
  md: { container: "w-8 h-8", icon: 18 },
  lg: { container: "w-12 h-12", icon: 24 },
  xl: { container: "w-16 h-16", icon: 32 },
};

export function ForemanAvatar({ size = "md", className }: ForemanAvatarProps) {
  const { container, icon } = sizeMap[size];

  return (
    <div
      className={cn(
        container,
        "rounded-full bg-sidebar flex items-center justify-center shrink-0",
        className
      )}
    >
      <HardHat size={icon} className="text-primary" />
    </div>
  );
}
