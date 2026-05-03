import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Users, Star, Wrench } from "lucide-react";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";
import { useState, useEffect } from "react";

interface HeroSectionProps {
  formatPrice: (eur: number, decimals?: number) => string;
  onTryDemo?: () => void;
}

const carouselSlides = [
  {
    messages: [
      { role: "user" as const, text: '"Quote for Mrs. Patterson — EV charger, 7kW"' },
      { role: "ai" as const, text: 'Done. Quote Q-0048 — €1,300.00. Send it to her email?' },
    ],
  },
  {
    messages: [
      { role: "user" as const, text: '"Chase the overdue invoices from last week"' },
      { role: "ai" as const, text: '3 overdue invoices found — €4,200 total. Reminders sent to all three.' },
    ],
  },
  {
    messages: [
      { role: "user" as const, text: '"Schedule the boiler install for Thursday 9am"' },
      { role: "ai" as const, text: 'Booked. Job J-0112 set for Thursday 9:00 AM. Customer notified.' },
    ],
  },
  {
    messages: [
      { role: "user" as const, text: '"Log £85 expense for copper pipe — Screwfix"' },
      { role: "ai" as const, text: 'Expense logged — £85.00, Screwfix, linked to current job.' },
    ],
  },
];

export function HeroSection({ formatPrice, onTryDemo }: HeroSectionProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const slide = carouselSlides[activeSlide];

  return (
    <section className="pt-24 sm:pt-32 pb-8 sm:pb-16 px-4 sm:px-6 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-[hsl(160,40%,96%)] to-background" />
        <div className="absolute top-20 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="animate-fade-up text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground mb-6 sm:mb-8 leading-[1.08]">
              The AI that{" "}
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                runs your business.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Revamo watches every quote, job, and invoice — chases what's slipping, briefs you each morning, and handles the admin while you stay on the tools.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 sm:gap-5 mb-4">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 font-semibold btn-hover-lift gap-2 w-full sm:w-auto rounded-full">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <p className="text-xs sm:text-sm text-muted-foreground">
                14-day free trial · No card required · Cancel anytime
              </p>
            </div>
          </div>

          {/* Right — Revamo AI Chat Carousel */}
          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-primary/5">
              {/* Chat header */}
              <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-3">
                <ForemanAvatar size="md" className="border-2 border-[#059669]/30" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">Revamo AI</p>
                  <span className="text-xs text-primary">Online</span>
                </div>
                <Mic className="h-5 w-5 text-primary" />
              </div>

              {/* Chat carousel area */}
              <div className="p-5 min-h-[220px] flex flex-col justify-end">
                <div className="space-y-3 animate-fade-in" key={activeSlide}>
                  {slide.messages.map((msg, i) =>
                    msg.role === "user" ? (
                      <div key={i} className="flex justify-end">
                        <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                          <p className="text-sm text-foreground">{msg.text}</p>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex gap-2.5">
                        <ForemanAvatar size="sm" className="mt-0.5" />
                        <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                          <p className="text-sm text-foreground">{msg.text}</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Carousel dots */}
              <div className="flex items-center justify-center gap-1.5 pb-3">
                {carouselSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === activeSlide
                        ? "w-5 h-2 bg-primary"
                        : "w-2 h-2 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {/* Chat input mock */}
              <div className="px-5 py-3 border-t border-border bg-muted/20">
                <div className="flex items-center gap-2 bg-background rounded-full border border-border px-4 py-2.5">
                  <span className="text-sm text-muted-foreground flex-1">Say something or type...</span>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Mic className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
