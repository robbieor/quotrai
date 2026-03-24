import { useRef, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms for sequenced fade-ins */
  delay?: number;
}

/**
 * Wraps a dashboard section and replays a subtle fade+slide
 * animation whenever any dashboard filter changes.
 */
export function AnimatedSection({ children, className, delay = 0 }: AnimatedSectionProps) {
  const { timePreset, segment, staffId, customerId, jobType, crossFilter } = useDashboardFilters();
  const [animKey, setAnimKey] = useState(0);
  const isFirst = useRef(true);

  // Build a composite dependency string from all filter values
  const filterFingerprint = `${timePreset}|${segment}|${staffId}|${customerId}|${jobType}|${JSON.stringify(crossFilter)}`;

  useEffect(() => {
    // Skip the initial mount — only animate on filter *changes*
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setAnimKey((k) => k + 1);
  }, [filterFingerprint]);

  return (
    <div
      key={animKey}
      className={cn("animate-fade-in", className)}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}
