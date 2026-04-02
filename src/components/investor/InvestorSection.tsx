import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InvestorSectionProps {
  children: ReactNode;
  theme?: "dark" | "light";
  className?: string;
  id?: string;
}

export default function InvestorSection({ children, theme = "light", className, id }: InvestorSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative w-full min-h-[60vh] flex items-center justify-center px-4 py-20 md:py-28",
        theme === "dark"
          ? "bg-[#0f172a] text-white"
          : "bg-background text-foreground",
        className
      )}
    >
      <div className="max-w-6xl mx-auto w-full">{children}</div>
    </section>
  );
}
