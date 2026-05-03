import { useEffect } from "react";
import { SEOHead } from "@/components/shared/SEOHead";
import { useParams, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle2,
  Bot,
  Mic,
  FileText,
  Receipt,
  MapPin,
  Calendar,
  BarChart3,
} from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";
import { track } from "@/utils/analytics";

import { TRADES } from "@/components/landing/trade/TradeConfig";
import { TradePainPoints } from "@/components/landing/trade/TradePainPoints";
import { TradeObjections } from "@/components/landing/trade/TradeObjections";
import { TradeSegments } from "@/components/landing/trade/TradeSegments";
import { TradeValueProps } from "@/components/landing/trade/TradeValueProps";

export default function TradeLanding() {
  const { tradeSlug } = useParams<{ tradeSlug: string }>();
  const config = tradeSlug ? TRADES[tradeSlug] : undefined;

  useEffect(() => {
    if (config) {
      track("trade_landing_view", { trade: config.slug });
    }
  }, [config]);

  if (!config) return <Navigate to="/" replace />;

  const Icon = config.icon;

  const features = [
    { icon: FileText, title: "Trade-Specific Templates", desc: `Pre-built quote templates designed for ${config.plural.toLowerCase()}. Customise pricing, add line items, send in seconds.` },
    { icon: Receipt, title: "One-Click Invoicing", desc: "Convert approved quotes to invoices instantly. Track payments and send automated reminders." },
    { icon: MapPin, title: "GPS Time Tracking", desc: "Geofenced clock-in/out so you know exactly who's on-site and for how long." },
    { icon: Calendar, title: "Smart Scheduling", desc: "Drag-and-drop calendar with job assignments. Never double-book again." },
    { icon: Bot, title: "Revamo AI Assistant", desc: `Tell Revamo AI "${config.quoteExample}" — voice or text, it handles the rest.` },
    { icon: BarChart3, title: "Business Reports", desc: "Revenue, job performance, quote conversion — real-time dashboards that help you grow." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={config.seoTitle}
        description={config.seoDescription}
        path={`/for/${config.slug}`}
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={foremanLogo} alt="Revamo" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight font-manrope lowercase">revamo</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-5xl relative text-center">
          <Badge variant="outline" className="gap-2 mb-6 text-sm px-4 py-1.5 border-primary/30">
            <Icon className="h-4 w-4 text-primary" />
            Built for {config.plural}
          </Badge>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
            {config.heroHeadline}
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            {config.heroSub}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-10 py-7 font-semibold gap-2">
                Start Free Trial <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            14-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* Pain Points — ICP-driven */}
      <TradePainPoints config={config} />

      {/* Features Grid */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-4">
              Everything a {config.name.toLowerCase()} needs.{" "}
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                Nothing you don't.
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voice AI Showcase */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30 border-y border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <Badge variant="outline" className="gap-1.5 mb-4 border-primary/30">
                <Mic className="h-3.5 w-3.5 text-primary" />
                Voice-First AI
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-4 text-foreground">
                On-site? Just talk to Revamo AI.
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Covered in muck and can't type? Say "{config.quoteExample}" and Revamo AI creates it using your templates and pricing.
              </p>
              <ul className="space-y-3">
                {["Works in noisy environments", "Understands trade terminology", "50+ skills and growing", "Voice or text — your choice"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <ForemanAvatar size="xl" className="w-32 h-32 rounded-2xl shadow-xl border-4 border-[#059669]/20" />
            </div>
          </div>
        </div>
      </section>

      {/* Segments — solo / crew / firm */}
      <TradeSegments config={config} />

      {/* Objections — "But will it work for me?" */}
      <TradeObjections config={config} />

      {/* Emotional + Financial value + Switch reasons */}
      <TradeValueProps config={config} />

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-4">
            Ready to run your {config.name.toLowerCase()} business smarter?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            14-day free trial. Cancel anytime.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-lg px-10 py-7 font-semibold gap-2">
              Start Free Trial <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src={foremanLogo} alt="Revamo" className="h-6 w-6 rounded" />
          <span className="font-semibold font-manrope lowercase">revamo</span>
        </div>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </footer>
    </div>
  );
}
