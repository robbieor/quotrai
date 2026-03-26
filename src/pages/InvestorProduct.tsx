import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield, FileText, Bot, Globe, RefreshCcw, Mail, CalendarDays,
  Clock, CreditCard, BarChart, Megaphone, Users, CheckCircle2,
  ArrowRight, Smartphone, Camera, Mic, MapPin, Receipt, Zap,
  MessageSquare, Bell, Settings
} from "lucide-react";
import InvestorLayout from "@/components/investor/InvestorLayout";

const FEATURE_SECTIONS = [
  {
    category: "Core Operations",
    color: "text-primary",
    features: [
      { icon: FileText, name: "Quoting & Invoicing", desc: "Create professional quotes and invoices with line items, tax auto-calculation, PDF generation. Multi-currency support across 20+ countries.", status: "shipped" },
      { icon: CalendarDays, name: "Job Calendar", desc: "Drag-and-drop scheduling with day, week, and month views. Customer SMS/email reminders for upcoming jobs.", status: "shipped" },
      { icon: Users, name: "Customer Management", desc: "Full CRM with contact details, job history, address autocomplete, and inline editing. Excel-style spreadsheet navigation.", status: "shipped" },
      { icon: Receipt, name: "Expense Tracking", desc: "Log expenses by category, attach receipts, link to jobs. Email forwarding auto-creates expense entries.", status: "shipped" },
    ],
  },
  {
    category: "AI & Automation",
    color: "text-primary",
    features: [
      { icon: Bot, name: "Foreman AI (George)", desc: "AI assistant that handles voice calls, answers questions, creates quotes, schedules jobs, and manages admin — all hands-free.", status: "shipped" },
      { icon: Camera, name: "Photo-to-Quote", desc: "Snap a photo of the job site. AI identifies components, estimates materials & labour, generates a professional quote in 30 seconds.", status: "shipped" },
      { icon: Mic, name: "Voice Agent", desc: "Real-time voice AI via ElevenLabs. Tradespeople talk to George while driving — he books jobs, creates quotes, updates statuses.", status: "shipped" },
      { icon: Mail, name: "Automated Payment Chasers", desc: "Escalating reminder emails for overdue invoices. Configurable schedules. Reduces avg payment time from 23 to 9 days.", status: "shipped" },
    ],
  },
  {
    category: "Payments & Revenue",
    color: "text-primary",
    features: [
      { icon: CreditCard, name: "Stripe Connect", desc: "Customers pay invoices online via the customer portal. 2.5% platform fee on every transaction — passive revenue stream.", status: "shipped" },
      { icon: RefreshCcw, name: "Recurring Invoices", desc: "Set up weekly, monthly, or quarterly auto-generated invoices. Perfect for maintenance contracts and retainers.", status: "shipped" },
      { icon: Globe, name: "Customer Portal", desc: "Branded portal where customers view quotes, approve them, and pay invoices. Magic link authentication — no passwords.", status: "shipped" },
      { icon: Bell, name: "Payment Reminders", desc: "Multi-stage reminder system: friendly nudge → firm follow-up → final notice. Tracks which reminders were sent.", status: "shipped" },
    ],
  },
  {
    category: "Team & Field Operations",
    color: "text-primary",
    features: [
      { icon: Clock, name: "GPS Time Tracking", desc: "Geofenced clock-in/out. Staff arrive on-site, phone detects location, auto-prompts clock-in. Manager sees live map.", status: "shipped" },
      { icon: MapPin, name: "Staff Location Map", desc: "Real-time map showing where all team members are. Battery level, last ping time, moving/stationary status.", status: "shipped" },
      { icon: Megaphone, name: "Lead Management", desc: "Full pipeline: new leads → qualified → quoted → won/lost. Source tracking, priority levels, follow-up dates.", status: "shipped" },
      { icon: Settings, name: "Role-Based Access", desc: "Owner, manager, and member roles. Control who can see financials, delete records, or manage team settings.", status: "shipped" },
    ],
  },
  {
    category: "Analytics & Integrations",
    color: "text-primary",
    features: [
      { icon: BarChart, name: "Advanced Reports", desc: "Revenue charts, expense breakdowns, quote conversion funnels, job performance radar, top customers.", status: "shipped" },
      { icon: Zap, name: "Xero Integration", desc: "Two-way sync with Xero accounting. Invoices, payments, and expenses flow automatically.", status: "shipped" },
      { icon: MessageSquare, name: "QuickBooks Integration", desc: "Connect to QuickBooks Online for seamless accounting sync. One-click connection.", status: "shipped" },
      { icon: Smartphone, name: "Mobile PWA", desc: "Install to homescreen, works offline, push notifications. Full functionality on any device.", status: "shipped" },
    ],
  },
];

const TECH_STACK = [
  { label: "Frontend", value: "React + TypeScript + Tailwind CSS" },
  { label: "Backend", value: "Lovable Cloud (Supabase)" },
  { label: "AI Engine", value: "GPT-5 + Gemini 2.5 Pro (multi-model)" },
  { label: "Voice AI", value: "ElevenLabs Conversational AI" },
  { label: "Payments", value: "Stripe Connect" },
  { label: "Hosting", value: "Edge-deployed globally (Lovable Cloud)" },
  { label: "Auth", value: "Email/password + Google OAuth + Magic Links" },
  { label: "Database", value: "PostgreSQL with Row-Level Security" },
];

const ROADMAP = [
  { quarter: "Q1 2026", items: ["Native iOS/Android app via Capacitor", "Offline mode with sync", "WhatsApp integration for customer comms"] },
  { quarter: "Q2 2026", items: ["AI scheduling optimisation", "Parts/materials catalogue", "Sub-contractor management"] },
  { quarter: "Q3 2026", items: ["Custom forms & checklists", "Fleet/van tracking", "Certification expiry automation"] },
  { quarter: "Q4 2026", items: ["Marketplace (supplier discounts)", "API for integrations", "Multi-language support"] },
];

export default function InvestorProduct() {
  return (
    <InvestorLayout title="Foreman — Product Overview" subtitle="Feature Walkthrough & Technical Architecture">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4 py-4">
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            20 Features Shipped & Production-Ready
          </Badge>
          <h2 className="text-gradient-teal">Everything a Tradesperson Needs</h2>
          <p className="text-muted-foreground">
            From first customer call to final payment — Foreman handles the entire workflow with AI automation at every step
          </p>
        </div>

        {/* Feature Sections */}
        {FEATURE_SECTIONS.map((section) => (
          <div key={section.category} className="space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              {section.category}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {section.features.map((feat) => (
                <Card key={feat.name} className="card-hover">
                  <CardContent className="p-5">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <feat.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{feat.name}</p>
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {feat.status === "shipped" ? "✓ Live" : feat.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{feat.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        <Separator />

        {/* Tech Stack */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Technology Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TECH_STACK.map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Roadmap */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Product Roadmap — 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ROADMAP.map((q) => (
                <div key={q.quarter} className="p-4 rounded-xl bg-card border border-border">
                  <p className="font-bold text-foreground mb-3">{q.quarter}</p>
                  <div className="space-y-2">
                    {q.items.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="grid sm:grid-cols-3 gap-4 pt-4">
          <Link to="/pitch">
            <Card className="card-hover cursor-pointer group">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Executive Summary</p>
                  <p className="text-sm text-muted-foreground">Problem, solution & ask</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/market">
            <Card className="card-hover cursor-pointer group">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Market Analysis</p>
                  <p className="text-sm text-muted-foreground">TAM, competitors, timing</p>
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
    </InvestorLayout>
  );
}