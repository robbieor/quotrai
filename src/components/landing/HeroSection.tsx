import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic } from "lucide-react";
import tomAvatar from "@/assets/tom-avatar.png";

interface HeroSectionProps {
  formatPrice: (eur: number, decimals?: number) => string;
}

export function HeroSection({ formatPrice }: HeroSectionProps) {
  return (
    <section className="pt-32 sm:pt-44 pb-20 sm:pb-32 px-4 sm:px-6 relative overflow-hidden">
      {/* Premium background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] glow-orb" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] glow-orb-warm" />
      </div>

      <div className="container mx-auto max-w-5xl relative">
        {/* Centered hero — one dominant focal point */}
        <div className="text-center max-w-3xl mx-auto animate-fade-up">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 pill-teal mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            The operating system for field service
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight text-foreground mb-6 sm:mb-8 leading-[1.05]">
            Talk to your business.
            <br />
            <span className="text-gradient-teal">
              It talks back.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 sm:mb-14 max-w-xl mx-auto leading-relaxed">
            Quotes, jobs, invoices, payments — all voice-powered.
            Foreman runs your admin so you stay on the tools.
          </p>

          {/* Single bold CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link to="/signup">
              <Button size="lg" className="text-lg sm:text-xl px-10 sm:px-14 py-7 sm:py-8 font-bold rounded-2xl btn-hover-lift gap-2.5 shadow-lg shadow-primary/20">
                Start Free Trial
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mb-16 sm:mb-20">
            30-day free trial · No credit card · Cancel anytime
          </p>
        </div>

        {/* Floating Foreman AI mockup — premium card with glow */}
        <div className="max-w-lg mx-auto animate-fade-up-delay-2">
          <div className="relative">
            {/* Glow behind card */}
            <div className="absolute -inset-4 rounded-3xl bg-primary/[0.06] blur-2xl" />

            <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-primary/[0.08]">
              {/* Chat header */}
              <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-primary/20 animate-pulse-glow">
                  <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">Foreman AI</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">Ready</span>
                  </div>
                </div>
              </div>

              {/* Minimal chat — 2 exchanges max */}
              <div className="p-5 space-y-4">
                <div className="flex justify-end">
                  <div className="bg-primary/8 border border-primary/15 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground">"Quote Mrs. Patterson — EV charger, 7kW"</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="h-7 w-7 rounded-full overflow-hidden flex-shrink-0 border border-border mt-0.5">
                    <img src={tomAvatar} alt="AI" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-muted/40 border border-border rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground">Done. Quote <span className="font-semibold text-primary">Q-0048</span> — {formatPrice(1300, 2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sent to her email ✓</p>
                  </div>
                </div>
              </div>

              {/* Input mock */}
              <div className="px-5 py-3.5 border-t border-border bg-muted/10">
                <div className="flex items-center gap-2.5 bg-background rounded-xl border border-border px-4 py-2.5">
                  <Mic className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground flex-1">Talk or type...</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature pills — floating capsules instead of bullet list */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-14 sm:mt-20 animate-fade-up-delay-3">
          {[
            "Voice-powered quoting",
            "Job scheduling",
            "Auto invoicing",
            "Payment tracking",
            "AI follow-ups",
          ].map((item) => (
            <span
              key={item}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-card border border-border text-foreground shadow-sm"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
