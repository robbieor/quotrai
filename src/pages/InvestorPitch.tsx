import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield, Target, Zap, Bot, Globe, TrendingUp, DollarSign,
  CheckCircle2, ArrowRight, Lightbulb, AlertTriangle, Users,
  Clock, Receipt, Smartphone, BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import foremanLogo from "@/assets/foreman-logo.png";

const PROBLEM_STATS = [
  { stat: "65%", label: "of trade businesses still use pen & paper for admin", icon: AlertTriangle },
  { stat: "8hrs", label: "lost per week to invoicing, scheduling & chasing payments", icon: Clock },
  { stat: "42%", label: "of trade invoices are paid late — avg 23 days overdue", icon: Receipt },
  { stat: "11M+", label: "trade SMBs globally — the last major vertical to digitise", icon: DollarSign },
];

const SOLUTION_PILLARS = [
  { title: "All-in-One Platform", desc: "Jobs, quotes, invoices, scheduling, expenses, time tracking — replaces 5+ tools", icon: Smartphone },
  { title: "AI-First Approach", desc: "Foreman George handles calls, generates quotes from photos, automates admin hands-free", icon: Bot },
  { title: "Built-In Payments", desc: "Stripe Connect with automated chasers — 2.5% platform fee turns every invoice into revenue", icon: DollarSign },
  { title: "Multi-Market Ready", desc: "20+ currencies, GDPR-compliant, launched for UK, Ireland, ANZ & North America", icon: Globe },
];

const TRACTION = [
  { metric: "12", label: "Core features shipped & production-ready" },
  { metric: "3", label: "Revenue streams (seats + AI + platform fees)" },
  { metric: "20+", label: "Trade verticals with dedicated landing pages" },
  { metric: "€12–€29", label: "Per-seat pricing validated against competitors" },
];

const USE_OF_FUNDS = [
  { pct: 40, label: "Product & Engineering", detail: "Mobile app, offline mode, deeper AI capabilities" },
  { pct: 25, label: "Sales & Marketing", detail: "Professional video production, paid acquisition, trade partnerships" },
  { pct: 20, label: "Customer Success", detail: "Onboarding team, support, activation optimisation" },
  { pct: 15, label: "Operations & Legal", detail: "Compliance, accounting integrations, infrastructure" },
];

const ASK = {
  raising: "€500K–€1M",
  type: "Pre-Seed / Seed",
  valuation: "€3M–€5M pre-money",
  runway: "18 months",
  milestones: [
    "1,000 paying customers within 6 months",
    "€100K MRR within 9 months",
    "Series A readiness at month 15",
    "Expand to 3 additional markets",
  ],
};

export default function InvestorPitch() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={foremanLogo} alt="Foreman" className="h-9 w-9 rounded-lg" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Foreman — Executive Summary</h1>
              <p className="text-xs text-muted-foreground">Investment Pitch — March 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-4 text-sm mr-4">
              <Link to="/market" className="text-muted-foreground hover:text-foreground transition-colors">Market</Link>
              <Link to="/product" className="text-muted-foreground hover:text-foreground transition-colors">Product</Link>
              <Link to="/team" className="text-muted-foreground hover:text-foreground transition-colors">Team</Link>
              <Link to="/founder" className="text-muted-foreground hover:text-foreground transition-colors">Financials</Link>
            </nav>
            <Badge variant="outline" className="gap-1.5 border-destructive/30 text-destructive">
              <Shield className="h-3 w-3" />
              Confidential
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Hero / Vision */}
        <div className="text-center max-w-3xl mx-auto space-y-4 py-8">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
            <Zap className="h-3.5 w-3.5 mr-1" />
            Pre-Seed Opportunity
          </Badge>
          <h2 className="text-gradient-teal">The Operating System for Trade Businesses</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Foreman replaces pen & paper, spreadsheets, and 5+ disconnected tools with a single AI-powered 
            platform — enabling plumbers, electricians, builders and 20+ trades to quote, invoice, schedule, 
            and get paid faster. An €18B TAM with 65% still undigitised. The last great vertical SaaS opportunity.
          </p>
        </div>

        {/* The Problem */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              The Problem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PROBLEM_STATS.map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-card border border-border">
                  <item.icon className="h-5 w-5 text-destructive mb-2" />
                  <p className="text-2xl font-bold text-foreground">{item.stat}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              The trades industry is one of the last major sectors to digitise. Most tradespeople manage their 
              entire business from a phone contacts list, WhatsApp messages, and handwritten invoices. They lose 
              thousands annually to late payments, missed jobs, and inefficient admin — yet no incumbent offers 
              an affordable, AI-native solution built for their workflow.
            </p>
          </CardContent>
        </Card>

        {/* The Solution */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              The Solution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {SOLUTION_PILLARS.map((item) => (
                <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Traction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Traction & Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {TRACTION.map((item) => (
                <div key={item.label} className="text-center p-4 rounded-xl bg-muted/50">
                  <p className="text-3xl font-bold text-foreground">{item.metric}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Business Model Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-5 text-center">
              <Users className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Seat Revenue</p>
              <p className="text-xl font-bold text-foreground">€12–€29/seat/mo</p>
              <p className="text-xs text-muted-foreground mt-1">2 tiers: Starter (€12) & Pro (€29)</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-5 text-center">
              <Receipt className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Platform Fee</p>
              <p className="text-xl font-bold text-foreground">2.5% per transaction</p>
              <p className="text-xs text-muted-foreground mt-1">On all Stripe Connect invoice payments</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-5 text-center">
              <BarChart3 className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Target Gross Margin</p>
              <p className="text-xl font-bold text-foreground">80%+</p>
              <p className="text-xs text-muted-foreground mt-1">AI COGS ~€8/Pro seat, SaaS-standard margins</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* The Ask */}
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              The Ask
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border text-center">
                <p className="text-sm text-muted-foreground">Raising</p>
                <p className="text-2xl font-bold text-primary">{ASK.raising}</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border text-center">
                <p className="text-sm text-muted-foreground">Round</p>
                <p className="text-2xl font-bold text-foreground">{ASK.type}</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border text-center">
                <p className="text-sm text-muted-foreground">Valuation</p>
                <p className="text-2xl font-bold text-foreground">{ASK.valuation}</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border text-center">
                <p className="text-sm text-muted-foreground">Runway</p>
                <p className="text-2xl font-bold text-foreground">{ASK.runway}</p>
              </div>
            </div>

            {/* Use of Funds */}
            <div>
              <p className="font-semibold text-foreground mb-3">Use of Funds</p>
              <div className="space-y-3">
                {USE_OF_FUNDS.map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <div className="w-12 text-right font-bold text-primary">{item.pct}%</div>
                    <div className="flex-1">
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/80"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div>
              <p className="font-semibold text-foreground mb-3">Key Milestones</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {ASK.milestones.map((m) => (
                  <div key={m} className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm text-foreground">{m}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation to other investor pages */}
        <div className="grid sm:grid-cols-3 gap-4 pt-4">
          <Link to="/market">
            <Card className="card-hover cursor-pointer group">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Market Analysis</p>
                  <p className="text-sm text-muted-foreground">TAM, SAM, SOM & competitors</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/product">
            <Card className="card-hover cursor-pointer group">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Product Demo</p>
                  <p className="text-sm text-muted-foreground">Feature walkthrough</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/founder">
            <Card className="card-hover cursor-pointer group">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Financial Model</p>
                  <p className="text-sm text-muted-foreground">Interactive projections</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}