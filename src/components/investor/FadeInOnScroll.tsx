import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FadeInOnScrollProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right";
}

export default function FadeInOnScroll({
  children,
  delay = 0,
  className,
  direction = "up",
}: FadeInOnScrollProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const transforms = {
    up: "translateY(40px)",
    left: "translateX(40px)",
    right: "translateX(-40px)",
  };

  return (
    <div
      ref={ref}
      className={cn("transition-all duration-700 ease-out", className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0)" : transforms[direction],
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
