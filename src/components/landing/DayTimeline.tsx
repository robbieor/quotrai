import { useEffect, useRef, useState } from "react";
import { 
  Coffee, 
  MapPin, 
  Mic, 
  CheckCircle, 
  Send, 
  BarChart3,
  Clock
} from "lucide-react";

const timelineSteps = [
  {
    time: "7:00 AM",
    title: "Morning Briefing",
    description: "Foreman AI gives you a rundown of today's jobs, pending quotes, and invoices due.",
    icon: Coffee,
    color: "from-orange-400 to-amber-500",
  },
  {
    time: "9:00 AM",
    title: "GPS Clock-In",
    description: "Arrive at the job site and clock in automatically with verified location.",
    icon: MapPin,
    color: "from-blue-400 to-cyan-500",
  },
  {
    time: "11:30 AM",
    title: "Voice Quote",
    description: "Create a professional quote from your van with just your voice.",
    icon: Mic,
    color: "from-primary to-teal-400",
  },
  {
    time: "2:00 PM",
    title: "Quote Approved",
    description: "Customer approves via portal. Job automatically added to your schedule.",
    icon: CheckCircle,
    color: "from-green-400 to-emerald-500",
  },
  {
    time: "5:00 PM",
    title: "Invoice Sent",
    description: "Job complete. Invoice generated and sent to customer automatically.",
    icon: Send,
    color: "from-purple-400 to-violet-500",
  },
  {
    time: "6:00 PM",
    title: "Daily Summary",
    description: "Review your earnings, completed jobs, and tomorrow's schedule.",
    icon: BarChart3,
    color: "from-pink-400 to-rose-500",
  },
];

export function DayTimeline() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((step) => (step + 1) % timelineSteps.length);
          return 0;
        }
        return prev + 2;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <div ref={containerRef} className="w-full py-8">
      {/* Mobile: Vertical layout */}
      <div className="md:hidden space-y-4 px-4">
        {timelineSteps.map((step, index) => {
          const isActive = index === activeStep;
          const isPast = index < activeStep;
          
          return (
            <div
              key={step.time}
              className={`relative pl-12 pb-8 transition-all duration-500 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Timeline line */}
              {index < timelineSteps.length - 1 && (
                <div className="absolute left-[18px] top-10 w-0.5 h-full bg-border">
                  <div
                    className={`w-full bg-gradient-to-b ${step.color} transition-all duration-500`}
                    style={{ height: isPast || isActive ? "100%" : "0%" }}
                  />
                </div>
              )}
              
              {/* Icon */}
              <div
                className={`absolute left-0 p-2.5 rounded-full bg-gradient-to-br ${step.color} shadow-lg transition-all duration-300 ${
                  isActive ? "scale-110 ring-4 ring-primary/20" : ""
                }`}
              >
                <step.icon className="w-4 h-4 text-white" />
              </div>
              
              {/* Content */}
              <div className={`transition-all duration-300 ${isActive ? "opacity-100" : "opacity-70"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{step.time}</span>
                </div>
                <h4 className="text-base font-semibold text-foreground mb-1">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden md:block">
        {/* Progress bar */}
        <div className="relative h-1 bg-muted rounded-full mb-8 mx-8">
          <div
            className="absolute h-full bg-gradient-to-r from-primary via-teal-400 to-primary rounded-full transition-all duration-300"
            style={{
              width: `${((activeStep * 100 + progress) / timelineSteps.length)}%`,
            }}
          />
          {/* Step dots */}
          {timelineSteps.map((_, index) => (
            <div
              key={index}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background transition-all duration-300"
              style={{
                left: `${(index / (timelineSteps.length - 1)) * 100}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor: index <= activeStep ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
            />
          ))}
        </div>

        {/* Timeline cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 px-4">
          {timelineSteps.map((step, index) => {
            const isActive = index === activeStep;
            
            return (
              <div
                key={step.time}
                className={`relative p-4 rounded-xl border transition-all duration-500 cursor-pointer ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-lg scale-105"
                    : "border-border bg-card hover:border-primary/50"
                } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${index * 100}ms` }}
                onClick={() => {
                  setActiveStep(index);
                  setProgress(0);
                }}
              >
                {/* Icon */}
                <div
                  className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${step.color} shadow-md mb-3`}
                >
                  <step.icon className="w-4 h-4 text-white" />
                </div>
                
                {/* Time */}
                <div className="flex items-center gap-1 mb-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{step.time}</span>
                </div>
                
                {/* Title */}
                <h4 className="text-sm font-semibold text-foreground mb-1">{step.title}</h4>
                
                {/* Description - only show on active */}
                <p
                  className={`text-xs text-muted-foreground transition-all duration-300 ${
                    isActive ? "opacity-100 max-h-20" : "opacity-0 max-h-0 overflow-hidden"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
