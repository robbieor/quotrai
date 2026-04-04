import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FileText, Bot, CreditCard, Clock, BarChart,
  Camera, Mic, Mail, CalendarDays, Users,
  MapPin, Smartphone, ArrowRight, CheckCircle2, Zap
} from "lucide-react";
import InvestorLayout from "@/components/investor/InvestorLayout";
import InvestorSection from "@/components/investor/InvestorSection";
import AnimatedCounter from "@/components/investor/AnimatedCounter";
import FadeInOnScroll from "@/components/investor/FadeInOnScroll";

const KEY_WORKFLOWS = [
  { icon: Bot, title: "AI Voice Agent", desc: "Talk to Foreman while driving — book jobs, create quotes, update statuses. Fully hands-free.", tag: "AI" },
  { icon: Camera, title: "Photo-to-Quote", desc: "Snap a photo of the job. AI identifies components, estimates materials & labour, generates a quote in 30 seconds.", tag: "AI" },
  { icon: CreditCard, title: "Stripe Connect Payments", desc: "Customers pay online via branded portal. 1.5% platform fee on every transaction. Passive revenue.", tag: "Revenue" },
  { icon: Mail, title: "Auto Payment Chasers", desc: "Escalating reminder emails for overdue invoices. Reduces avg payment time from 23 to 9 days.", tag: "Automation" },
  { icon: Clock, title: "GPS Time Tracking", desc: "Geofenced clock-in/out. Staff arrive on-site, phone auto-prompts. Live map for managers.", tag: "Operations" },
];

const ALL_FEATURES = [
  { icon: FileText, name: "Quoting & Invoicing" },
  { icon: CalendarDays, name: "Job Calendar" },
  { icon: Users, name: "Customer CRM" },
  { icon: MapPin, name: "Staff Location Map" },
  { icon: BarChart, name: "Advanced Reports" },
  { icon: Smartphone, name: "Mobile PWA" },
  { icon: Zap, name: "Xero / QuickBooks" },
  { icon: Bot, name: "Foreman AI Chat" },
];

const TECH_PILLS = [
  "React + TypeScript", "Tailwind CSS", "PostgreSQL + RLS",
  "GPT-5 + Gemini", "ElevenLabs Voice", "Stripe Connect",
  "Edge Functions", "PWA + Capacitor",
];

const ROADMAP = [
  { q: "Q1 2026", items: ["Native iOS/Android", "Offline sync", "WhatsApp comms"] },
  { q: "Q2 2026", items: ["AI scheduling", "Parts catalogue", "Sub-contractors"] },
  { q: "Q3 2026", items: ["Custom forms", "Fleet tracking", "Cert automation"] },
  { q: "Q4 2026", items: ["Supplier marketplace", "Public API", "Multi-language"] },
];

const AI_COMMANDS = [
  "Hey George, create a quote for Mrs. Murphy — boiler service, €280 including parts",
  "Schedule a callback with Dave's Plumbing for Thursday at 2pm",
  "Chase all invoices overdue more than 7 days",
];

function TypingDemo() {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [showResponse, setShowResponse] = useState(false);

  useEffect(() => {
    const cmd = AI_COMMANDS[lineIdx];
    if (charIdx < cmd.length) {
      const timer = setTimeout(() => setCharIdx(charIdx + 1), 35);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShowResponse(true);
        const next = setTimeout(() => {
          setShowResponse(false);
          setCharIdx(0);
          setLineIdx((lineIdx + 1) % AI_COMMANDS.length);
        }, 2500);
        return () => clearTimeout(next);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [charIdx, lineIdx]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-sm font-medium text-white/60">Foreman AI</span>
        </div>
        <div className="p-6 min-h-[140px] flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <Mic className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-white font-medium">
              {AI_COMMANDS[lineIdx].slice(0, charIdx)}
              <span className="animate-pulse text-primary">|</span>
            </p>
          </div>
          {showResponse && (
            <div className="flex items-start gap-3 mt-4 animate-fade-in">
              <Bot className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-white/60 text-sm">Done ✓ — I've created that for you.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvestorProduct() {
  return (
    <InvestorLayout title="Foreman — Product">
      {/* HERO */}
      <InvestorSection theme="dark" className="min-h-[70vh]">
        <div className="text-center">
          <FadeInOnScroll>
            <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-6">Product</p>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1]">
              Built. Shipped.<br /><span className="text-primary">Live.</span>
            </h1>
            <p className="text-xl text-white/50 mt-6 max-w-lg mx-auto">
              <AnimatedCounter end={20} className="text-white font-bold text-2xl" /> features in production.
              Zero outsourced. One founder.
            </p>
          </FadeInOnScroll>
        </div>
      </InvestorSection>

      {/* KEY WORKFLOWS */}
      <InvestorSection theme="light">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Core Workflows</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-16">Five killer features</h2>
        </FadeInOnScroll>
        <div className="space-y-6">
          {KEY_WORKFLOWS.map((item, i) => (
            <FadeInOnScroll key={item.title} delay={i * 100}>
              <div className="flex flex-col sm:flex-row gap-6 p-6 md:p-8 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all group">
                <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{item.tag}</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </InvestorSection>

      {/* AI DEMO */}
      <InvestorSection theme="dark">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3 text-center">AI in Action</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center">
            Talk to Foreman.<br /><span className="text-primary">It just works.</span>
          </h2>
          <p className="text-white/40 text-center max-w-lg mx-auto mb-12">
            Voice commands, photo quoting, automated chasers — all powered by GPT-5, Gemini & ElevenLabs.
          </p>
        </FadeInOnScroll>
        <FadeInOnScroll delay={300}>
          <TypingDemo />
        </FadeInOnScroll>
      </InvestorSection>

      {/* FULL FEATURE LIST */}
      <InvestorSection theme="light" className="min-h-0 py-20">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Full Platform</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10">Everything else that ships</h2>
        </FadeInOnScroll>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {ALL_FEATURES.map((f, i) => (
            <FadeInOnScroll key={f.name} delay={i * 80}>
              <div className="p-5 rounded-xl border border-border bg-card text-center hover:border-primary/30 transition-colors">
                <f.icon className="h-6 w-6 text-primary mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">{f.name}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </InvestorSection>

      {/* TECH STACK */}
      <InvestorSection theme="dark" className="min-h-0 py-20">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Technology</p>
          <h2 className="text-2xl md:text-3xl font-bold mb-10">Modern stack. Zero tech debt.</h2>
        </FadeInOnScroll>
        <FadeInOnScroll delay={200}>
          <div className="flex flex-wrap gap-3 justify-center">
            {TECH_PILLS.map((t) => (
              <span key={t} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/70">
                {t}
              </span>
            ))}
          </div>
        </FadeInOnScroll>
      </InvestorSection>

      {/* ROADMAP */}
      <InvestorSection theme="light">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Roadmap</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12">2026 Product Plan</h2>
        </FadeInOnScroll>
        <div className="relative">
          {/* Timeline line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border" />
          <div className="grid md:grid-cols-4 gap-6">
            {ROADMAP.map((r, i) => (
              <FadeInOnScroll key={r.q} delay={i * 150}>
                <div className="relative p-6 rounded-2xl border border-border bg-card">
                  <div className="hidden md:block absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-primary border-4 border-background" />
                  <p className="font-bold text-primary mb-4">{r.q}</p>
                  <div className="space-y-2">
                    {r.items.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </InvestorSection>

      {/* NAV */}
      <InvestorSection theme="dark" className="min-h-0 py-16">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { to: "/investor/pitch", label: "Executive Summary", sub: "Problem, solution & ask" },
            { to: "/investor/team", label: "Team", sub: "Founders & hiring plan" },
            { to: "/investor/projections", label: "Financial Model", sub: "Interactive projections" },
          ].map((item) => (
            <Link key={item.to} to={item.to}>
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="text-sm text-white/40">{item.sub}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </InvestorSection>
    </InvestorLayout>
  );
}
