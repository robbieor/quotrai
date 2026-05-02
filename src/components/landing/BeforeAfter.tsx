import { useEffect, useRef, useState } from "react";
import { 
  X, 
  Check, 
  FileSpreadsheet, 
  PhoneMissed, 
  Clock, 
  Moon,
  Mic,
  BarChart3,
  Bell,
  Sun
} from "lucide-react";

const beforeItems = [
  { text: "Paper quotes & spreadsheets", icon: FileSpreadsheet },
  { text: "Missed calls from customers", icon: PhoneMissed },
  { text: "Hours of evening admin", icon: Moon },
  { text: "Chasing late payments", icon: Clock },
];

const afterItems = [
  { text: "Voice-powered quotes in seconds", icon: Mic },
  { text: "Real-time dashboard & insights", icon: BarChart3 },
  { text: "Automated reminders & follow-ups", icon: Bell },
  { text: "Work done, home on time", icon: Sun },
];

const stats = [
  { value: "10+", label: "hours saved weekly" },
  { value: "40%", label: "faster payments" },
  { value: "100%", label: "follow-up rate" },
];

export function BeforeAfter() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <div className="grid md:grid-cols-2 gap-6 md:gap-8">
        {/* Before */}
        <div
          className={`relative p-6 md:p-8 rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent transition-all duration-700 ${
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
          }`}
        >
          <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20">
            <span className="text-xs font-medium text-destructive">The Old Way</span>
          </div>
          
          <div className="mt-4 space-y-4">
            {beforeItems.map((item, index) => (
              <div
                key={item.text}
                className={`flex items-center gap-4 transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                }`}
                style={{ transitionDelay: `${300 + index * 100}ms` }}
              >
                <div className="flex-shrink-0 p-2 rounded-lg bg-destructive/10">
                  <item.icon className="w-5 h-5 text-destructive/70" />
                </div>
                <span className="text-foreground/70 line-through decoration-destructive/50 decoration-2">
                  {item.text}
                </span>
                <X className="w-5 h-5 text-destructive ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* Decorative cross-out effect */}
          <div
            className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: "800ms" }}
          >
            <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
              <line
                x1="5%"
                y1="95%"
                x2="95%"
                y2="5%"
                stroke="hsl(var(--destructive))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="600"
                strokeDashoffset={isVisible ? "0" : "600"}
                style={{ transition: "stroke-dashoffset 1s ease-out 1s" }}
                opacity="0.3"
              />
            </svg>
          </div>
        </div>

        {/* After */}
        <div
          className={`relative p-6 md:p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent transition-all duration-700 ${
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-xs font-medium text-primary">With Foreman</span>
          </div>
          
          <div className="mt-4 space-y-4">
            {afterItems.map((item, index) => (
              <div
                key={item.text}
                className={`flex items-center gap-4 transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                }`}
                style={{ transitionDelay: `${500 + index * 100}ms` }}
              >
                <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-foreground font-medium">{item.text}</span>
                <Check className="w-5 h-5 text-primary ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/20 via-teal-400/20 to-primary/20 -z-10 blur-xl opacity-50" />
        </div>
      </div>

      {/* Stats row */}
      <div
        className={`mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
        style={{ transitionDelay: "1000ms" }}
      >
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="text-center p-4 rounded-xl bg-card border border-border/50"
          >
            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
