import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Briefcase, FileText, Receipt, CalendarDays, Mic } from "lucide-react";
import tomAvatar from "@/assets/tom-avatar.png";

interface HeroSectionProps {
  formatPrice: (eur: number, decimals?: number) => string;
}

export function HeroSection({ formatPrice }: HeroSectionProps) {
  return (
    <section className="pt-28 sm:pt-40 pb-20 sm:pb-32 px-4 sm:px-6 relative overflow-hidden">
      {/* Background glows — subtle, asymmetric */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] right-[10%] w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full bg-primary/[0.05] blur-[100px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[80px]" />
      </div>

      <div className="container mx-auto max-w-6xl relative">
        <div className="grid lg:grid-cols-[1fr_0.9fr] gap-12 lg:gap-20 items-center">

          {/* ── LEFT — Copy ── */}
          <div className="animate-fade-up">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 pill-teal mb-6 sm:mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Field Service. Simplified.
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-[3.5rem] lg:text-[3.75rem] font-extrabold tracking-tight text-foreground leading-[1.08] mb-5 sm:mb-6">
              Run your business
              <br />
              without running yourself
              <br />
              <span className="text-gradient-teal">into the ground.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mb-4 sm:mb-5">
              Foreman brings your jobs, quotes, invoices, and team into one place — so you stay in control.
            </p>

            <p className="text-sm font-semibold text-foreground/80 mb-8 sm:mb-10 tracking-wide">
              Talk to your business. It talks back.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-5">
              <Link to="/signup">
                <Button size="lg" className="text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 font-bold rounded-2xl btn-hover-lift gap-2 shadow-lg shadow-primary/20">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="ghost" size="lg" className="text-base px-6 py-6 sm:py-7 font-medium gap-2 text-muted-foreground hover:text-foreground">
                  <Play className="h-4 w-4" />
                  See how it works
                </Button>
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              30-day free trial · No credit card · Cancel anytime
            </p>
          </div>

          {/* ── RIGHT — Floating UI cards with depth ── */}
          <div className="relative animate-fade-up-delay-2 hidden sm:block">
            {/* Central glow orb */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[380px] h-[380px] rounded-full bg-primary/[0.07] blur-[60px]" />
            </div>

            <div className="relative w-full max-w-md mx-auto" style={{ minHeight: 420 }}>

              {/* Main card: Foreman AI chat */}
              <div className="relative z-10 bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-primary/[0.06] animate-float">
                <div className="px-5 py-3 border-b border-border/60 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-primary/20">
                    <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-foreground">Foreman AI</p>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] text-muted-foreground">Ready</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-primary/8 border border-primary/12 rounded-xl rounded-br-sm px-3.5 py-2 max-w-[80%]">
                      <p className="text-xs text-foreground">"Quote Mrs. Patterson — EV charger, 7kW"</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full overflow-hidden flex-shrink-0 border border-border mt-0.5">
                      <img src={tomAvatar} alt="AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-muted/30 border border-border/60 rounded-xl rounded-bl-sm px-3.5 py-2">
                      <p className="text-xs text-foreground">Done — <span className="font-semibold text-primary">Q-0048</span> for {formatPrice(1300)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Sent to her email ✓</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2.5 border-t border-border/40">
                  <div className="flex items-center gap-2 bg-background/80 rounded-lg border border-border/50 px-3 py-2">
                    <Mic className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground/60">Talk or type...</span>
                  </div>
                </div>
              </div>

              {/* Floating satellite card — Job scheduled */}
              <div
                className="absolute -top-3 -right-6 z-20 bg-card border border-border rounded-xl px-4 py-3 shadow-lift animate-float"
                style={{ animationDelay: "0.5s", animationDuration: "5s" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Job Scheduled</p>
                    <p className="text-[10px] text-muted-foreground">Tomorrow 9am · EV Install</p>
                  </div>
                </div>
              </div>

              {/* Floating satellite card — Invoice paid */}
              <div
                className="absolute -bottom-2 -left-8 z-20 bg-card border border-border rounded-xl px-4 py-3 shadow-lift animate-float"
                style={{ animationDelay: "1.2s", animationDuration: "5.5s" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Invoice Paid</p>
                    <p className="text-[10px] text-muted-foreground">{formatPrice(2450)} · O'Brien job</p>
                  </div>
                </div>
              </div>

              {/* Floating satellite card — Quote approved */}
              <div
                className="absolute top-1/2 -right-10 z-20 bg-card border border-border rounded-xl px-4 py-3 shadow-lift animate-float"
                style={{ animationDelay: "0.8s", animationDuration: "4.8s" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Quote Approved ✓</p>
                    <p className="text-[10px] text-muted-foreground">{formatPrice(3200)} · Patterson</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-only: simplified visual */}
          <div className="sm:hidden animate-fade-up-delay-1">
            <div className="relative">
              <div className="absolute -inset-3 rounded-2xl bg-primary/[0.05] blur-xl" />
              <div className="relative bg-card border border-border rounded-2xl p-4 shadow-xl shadow-primary/[0.06]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-primary/20">
                    <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">Foreman AI</p>
                    <span className="text-[10px] text-primary font-medium">Ready</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                  <Mic className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Talk or type a command...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature pills — below fold, subtle */}
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mt-16 sm:mt-24 animate-fade-up-delay-3">
          {[
            "Voice-powered quoting",
            "Job scheduling",
            "Auto invoicing",
            "Payment tracking",
            "AI follow-ups",
          ].map((item) => (
            <span
              key={item}
              className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-card border border-border text-muted-foreground shadow-sm"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
