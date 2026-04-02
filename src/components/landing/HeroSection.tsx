import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, CheckCircle2, Play } from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";

interface HeroSectionProps {
  formatPrice: (eur: number, decimals?: number) => string;
  onTryDemo?: () => void;
}

export function HeroSection({ formatPrice }: HeroSectionProps) {
  return (
    <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="animate-fade-up text-center lg:text-left">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 sm:mb-8 leading-[1.1]">
              Talk to your business.<br />
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                It talks back.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-muted-foreground mb-4 sm:mb-6 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Foreman runs your quotes, jobs, invoices, and payments — so you don't have to.
            </p>

            <p className="text-sm sm:text-base font-semibold text-foreground mb-6 sm:mb-8">
              Not another app. An operating system for your trade business.
            </p>

            {/* Value bullets */}
            <ul className="space-y-2.5 mb-8 sm:mb-10 text-left max-w-md mx-auto lg:mx-0">
              {[
                "Quotes created and sent — without lifting a finger",
                "Overdue invoices chased automatically",
                "Your next best action — surfaced every morning",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span className="text-sm sm:text-base text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 sm:gap-4 mb-5">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 font-semibold btn-hover-lift gap-2 w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="text-base px-6 py-6 sm:py-7 font-medium gap-2 w-full sm:w-auto">
                  <Play className="h-4 w-4" />
                  See how it works
                </Button>
              </a>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              {"\n"}
            </p>
          </div>

          {/* Right — Foreman AI Chat Mockup */}
          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-primary/5">
              {/* Chat header */}
              <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-3">
                <ForemanAvatar size="md" className="border-2 border-[#059669]/30" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">Foreman AI</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                </div>
              </div>

              {/* Chat messages — tight, outcome-focused */}
              <div className="p-5 space-y-4">
                {/* User: create quote */}
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground">"Quote for Mrs. Patterson — EV charger, 7kW"</p>
                  </div>
                </div>

                {/* AI: quote created */}
                <div className="flex gap-2.5">
                  <ForemanAvatar size="sm" className="mt-0.5" />
                  <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground mb-2">Done. Quote <span className="font-semibold text-primary">Q-0048</span> — {formatPrice(1300, 2)}</p>
                    <p className="text-xs text-muted-foreground">Send it to her email?</p>
                  </div>
                </div>

                {/* User: send */}
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md px-4 py-2.5">
                    <p className="text-sm text-foreground">"Yes, send it"</p>
                  </div>
                </div>

                {/* AI: sent */}
                <div className="flex gap-2.5">
                  <ForemanAvatar size="sm" className="mt-0.5" />
                  <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-2.5">
                    <p className="text-sm text-foreground">✅ Sent. She can approve with one click.</p>
                  </div>
                </div>
              </div>

              {/* Chat input mock */}
              <div className="px-5 py-3 border-t border-border bg-muted/20">
                <div className="flex items-center gap-2 bg-background rounded-xl border border-border px-4 py-2.5">
                  <Mic className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground flex-1">Talk or type to Foreman AI...</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
