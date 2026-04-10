import { Link } from "react-router-dom";
import {
  AlertTriangle, Clock, Receipt, DollarSign,
  Smartphone, Bot, Globe, Target,
  CheckCircle2, ArrowRight, ChevronDown
} from "lucide-react";
import InvestorLayout from "@/components/investor/InvestorLayout";
import InvestorSection from "@/components/investor/InvestorSection";
import AnimatedCounter from "@/components/investor/AnimatedCounter";
import FadeInOnScroll from "@/components/investor/FadeInOnScroll";

const PROBLEM_STATS = [
  { end: 65, suffix: "%", label: "of trade businesses still use pen & paper", icon: AlertTriangle },
  { end: 8, suffix: "hrs", label: "lost per week to admin, chasing & scheduling", icon: Clock },
  { end: 42, suffix: "%", label: "of trade invoices paid late — avg 23 days overdue", icon: Receipt },
  { end: 11, suffix: "M+", label: "trade SMBs globally — last major vertical to digitise", icon: DollarSign },
];

const SOLUTION_PILLARS = [
  { title: "All-in-One Platform", desc: "Jobs, quotes, invoices, scheduling, expenses, time tracking — replaces 5+ tools", icon: Smartphone },
  { title: "AI-First Approach", desc: "Foreman AI handles calls, generates quotes from photos, automates admin hands-free", icon: Bot },
  { title: "Built-In Payments", desc: "Stripe Connect with automated chasers — 2.9% platform fee turns every invoice into revenue", icon: DollarSign },
  { title: "Multi-Market Ready", desc: "20+ currencies, GDPR-compliant, launched for UK, Ireland, ANZ & North America", icon: Globe },
];

const USE_OF_FUNDS = [
  { pct: 40, label: "Product & Engineering", detail: "Mobile app, offline mode, deeper AI" },
  { pct: 25, label: "Sales & Marketing", detail: "Video production, paid acquisition, trade partnerships" },
  { pct: 20, label: "Customer Success", detail: "Onboarding, support, activation" },
  { pct: 15, label: "Operations & Legal", detail: "Compliance, accounting integrations" },
];

const MILESTONES = [
  "1,000 paying customers within 6 months",
  "€100K MRR within 9 months",
  "Series A readiness at month 15",
  "Expand to 3 additional markets",
];

export default function InvestorPitch() {
  return (
    <InvestorLayout title="Foreman">
      {/* HERO */}
      <InvestorSection theme="dark" className="min-h-[90vh] relative">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <FadeInOnScroll>
            <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-4">Pre-Seed Opportunity</p>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight">
              The Operating System<br />
              <span className="text-primary">for Trade Businesses</span>
            </h1>
          </FadeInOnScroll>
          <FadeInOnScroll delay={200}>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              Foreman replaces pen & paper, spreadsheets, and 5+ disconnected tools with a single 
              AI-powered platform for 11M+ trade businesses worldwide.
            </p>
          </FadeInOnScroll>
          <FadeInOnScroll delay={400}>
            <div className="flex items-center justify-center gap-6 text-sm text-white/40">
              <span>€18B TAM</span>
              <span className="h-4 w-px bg-white/20" />
              <span>65% Undigitised</span>
              <span className="h-4 w-px bg-white/20" />
              <span>AI-Native</span>
            </div>
          </FadeInOnScroll>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-white/30" />
        </div>
      </InvestorSection>

      {/* THE PROBLEM */}
      <InvestorSection theme="dark" className="bg-gradient-to-b from-[#0f172a] to-[#1a1020]">
        <FadeInOnScroll>
          <p className="text-red-400 font-semibold tracking-widest uppercase text-sm mb-3">The Problem</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-16">
            The trades industry is<br />
            <span className="text-red-400">broken by design</span>
          </h2>
        </FadeInOnScroll>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROBLEM_STATS.map((item, i) => (
            <FadeInOnScroll key={item.label} delay={i * 150}>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center group hover:bg-white/10 transition-colors">
                <item.icon className="h-6 w-6 text-red-400 mx-auto mb-4" />
                <p className="text-4xl md:text-5xl font-extrabold text-white mb-2">
                  <AnimatedCounter end={item.end} suffix={item.suffix} />
                </p>
                <p className="text-sm text-white/50">{item.label}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
        <FadeInOnScroll delay={600}>
          <p className="text-white/40 text-center max-w-2xl mx-auto mt-12 leading-relaxed">
            Most tradespeople manage their entire business from WhatsApp, a contacts list, and handwritten invoices.
            They lose thousands annually to late payments, missed jobs, and inefficient admin.
          </p>
        </FadeInOnScroll>
      </InvestorSection>

      {/* THE SOLUTION */}
      <InvestorSection theme="light">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">The Solution</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            One platform.<br />Zero admin.
          </h2>
          <p className="text-muted-foreground max-w-xl mb-16">
            Foreman doesn't just track work — it runs the business. AI handles calls, generates quotes from photos,
            chases payments, and schedules jobs. Hands-free.
          </p>
        </FadeInOnScroll>
        <div className="grid sm:grid-cols-2 gap-6">
          {SOLUTION_PILLARS.map((item, i) => (
            <FadeInOnScroll key={item.title} delay={i * 120}>
              <div className="group p-8 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all cursor-default">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </InvestorSection>

      {/* BUSINESS MODEL */}
      <InvestorSection theme="dark">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Business Model</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-16">Three revenue engines</h2>
        </FadeInOnScroll>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { value: "€39", unit: "/mo", label: "One Plan", sub: "1 user included, +€15/extra seat" },
            { value: "2.9%", unit: " per txn", label: "Platform Fee", sub: "On all Stripe Connect payments" },
            { value: "80%+", unit: "", label: "Gross Margin", sub: "AI COGS ~€8/seat, SaaS-standard" },
          ].map((item, i) => (
            <FadeInOnScroll key={item.label} delay={i * 150}>
              <div className="p-8 rounded-2xl bg-white/5 border border-white/10 border-l-4 border-l-primary text-center">
                <p className="text-4xl md:text-5xl font-extrabold text-white">
                  {item.value}<span className="text-xl text-white/50">{item.unit}</span>
                </p>
                <p className="text-primary font-semibold mt-3">{item.label}</p>
                <p className="text-sm text-white/40 mt-1">{item.sub}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </InvestorSection>

      {/* THE ASK */}
      <InvestorSection theme="light">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">The Ask</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Raising <span className="text-primary">€500K–€1M</span>
          </h2>
          <p className="text-muted-foreground mb-12">Pre-Seed / Seed · €3M–€5M pre-money · 18 months runway</p>
        </FadeInOnScroll>

        {/* Use of Funds */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <FadeInOnScroll>
            <h3 className="text-xl font-bold text-foreground mb-6">Use of Funds</h3>
            <div className="space-y-5">
              {USE_OF_FUNDS.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-primary font-bold">{item.pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                </div>
              ))}
            </div>
          </FadeInOnScroll>
          <FadeInOnScroll delay={200}>
            <h3 className="text-xl font-bold text-foreground mb-6">Key Milestones</h3>
            <div className="space-y-4">
              {MILESTONES.map((m, i) => (
                <div key={m} className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="pt-1">
                    <p className="text-foreground font-medium">{m}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeInOnScroll>
        </div>
      </InvestorSection>

      {/* NAVIGATION */}
      <InvestorSection theme="dark" className="min-h-0 py-16">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { to: "/investor/market", label: "Market Analysis", sub: "TAM, competitors & timing" },
            { to: "/investor/product", label: "Product", sub: "Features & technology" },
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
