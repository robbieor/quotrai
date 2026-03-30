import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, Users, DollarSign, Target, BarChart3, Rocket,
  Building2, PoundSterling, ArrowUpRight, Shield, Zap, Bot,
  Globe, Receipt, CalendarDays, Clock, FileText, Megaphone,
  CreditCard, Mail, RefreshCcw, BarChart, CheckCircle2,
  AlertTriangle, Hammer, BanknoteIcon, Timer, XCircle, Percent,
  Video, Play, TrendingDown, Flame
} from "lucide-react";
import InvestorLayout from "@/components/investor/InvestorLayout";

// Market data
const UK_TRADE_BUSINESSES = 300_000;
const GLOBAL_TRADE_BUSINESSES = 5_000_000;
const MARKET_CAGR = 0.18;

// 3-tier pricing: Lite, Connect, Grow
const TIERS = {
  lite: { price: 19, label: "Lite Seat", hasAI: false },
  connect: { price: 39, label: "Connect Seat", hasAI: true },
  grow: { price: 69, label: "Grow Seat", hasAI: true },
};
const ANNUAL_DISCOUNT = 0.15;
const PLATFORM_FEE_RATE = 0.025; // 2.5% on invoice payments
const VOICE_COST_PER_SEAT = 8;

// Valuation multiples
const SAAS_MULTIPLES: Record<string, { low: number; high: number; label: string }> = {
  early: { low: 5, high: 8, label: "Early Stage (Pre-Series A)" },
  growth: { low: 8, high: 15, label: "Growth Stage (Series A-B)" },
  scale: { low: 12, high: 25, label: "Scale (Series C+)" },
};

// Competitor benchmarks with gap analysis
const COMPETITORS = [
  { name: "Tradify", customers: 25_000, region: "ANZ/UK", arr: "~€26M", price: "€30/user", gaps: ["No AI", "No payment processing", "No automated chasers", "No photo quoting"] },
  { name: "ServiceM8", customers: 40_000, region: "Global", arr: "~€42M", price: "From €30/mo", gaps: ["No AI voice agent", "No Stripe Connect", "No recurring invoices", "Limited reports"] },
  { name: "Fergus", customers: 12_000, region: "ANZ/UK", arr: "~€13M", price: "€40/user", gaps: ["No AI features", "No payment chasers", "No multi-currency", "No customer portal"] },
  { name: "Jobber", customers: 200_000, region: "North America", arr: "~€200M", price: "From €39/mo", gaps: ["No AI assistant", "Limited invoicing", "No photo-to-quote", "High price point"] },
  { name: "ServiceTitan", customers: 100_000, region: "North America", arr: "~€500M", price: "Custom", gaps: ["Enterprise only", "€10K+ annual", "No SMB focus", "Complex onboarding"] },
];

// Pen & Paper market opportunity
const PEN_PAPER_STATS = {
  pctManual: 65, // % of trade businesses still using manual/paper processes
  avgTimeLostWeekly: 8, // hours lost to admin per week
  avgOverdueRate: 42, // % of invoices paid late in trades
  avgDaysOverdue: 23, // average days late
  cashJobPct: 30, // % of jobs paid cash (won't use platform payments)
  invoicedJobPct: 70, // % that invoice — our payment fee opportunity
};

// Payment chasing revenue model
const CHASER_IMPACT = {
  avgDaysReduced: 14, // days faster payment with auto-chasers
  collectionRate: 92, // % collection rate with chasers vs 73% without
  customerRetention: 35, // % higher retention for businesses that get paid faster
};

// Launch scenario — professional video + paid ads campaign
const LAUNCH_SCENARIO = {
  adSpendMonth1: 8000, // €
  adSpendMonth2: 12000,
  adSpendMonth3: 15000,
  channels: [
    { name: "Google Ads", budget: 35, ctr: 4.2, cpc: 1.80, convRate: 12, note: "High-intent 'invoice software for [trade]' keywords" },
    { name: "Meta/Instagram", budget: 40, ctr: 5.8, cpc: 0.95, convRate: 8, note: "Reels of AI voice agent in van, photo quoting on-site" },
    { name: "YouTube Pre-roll", budget: 15, ctr: 2.1, cpc: 2.40, convRate: 6, note: "60s cinematic demo — professional producer quality" },
    { name: "Organic/Viral", budget: 10, ctr: 0, cpc: 0, convRate: 18, note: "Trade Facebook groups, WhatsApp shares, word-of-mouth" },
  ],
  // 90-day projections
  month1: { signups: 800, trialToPaid: 12, paidCustomers: 96 },
  month2: { signups: 1400, trialToPaid: 15, paidCustomers: 210 },
  month3: { signups: 2200, trialToPaid: 18, paidCustomers: 396 },
  videoAssets: [
    "Dashcam POV: tradesperson uses George AI to schedule jobs hands-free while driving",
    "On-site: snap photo of boiler → AI generates quote in 30 seconds → customer approves on portal",
    "End-of-day: GPS auto clock-out, invoices auto-sent, payment chasers running — zero admin",
    "Split-screen: pen & paper chaos vs Foreman — same job, 10x faster",
    "Testimonial-style: real tradesperson shows dashboard, \"I got paid €4K in 2 days instead of 3 weeks\"",
  ],
};

const FEATURES_SHIPPED = [
  { icon: FileText, label: "Quoting & Invoicing", detail: "Multi-currency, PDF generation, tax auto-detect" },
  { icon: Bot, label: "Foreman AI (George)", detail: "Voice agent, chat, photo quoting, AI scheduling" },
  { icon: Globe, label: "Multi-Currency", detail: "20+ countries, auto-detect from customer country" },
  { icon: RefreshCcw, label: "Recurring Invoices", detail: "Weekly/monthly/quarterly auto-generation" },
  { icon: Mail, label: "Automated Payment Chasers", detail: "Escalating reminders for overdue invoices" },
  { icon: CalendarDays, label: "Job Calendar & Reminders", detail: "Drag-drop scheduling, customer SMS/email alerts" },
  { icon: Clock, label: "GPS Time Tracking", detail: "Geofenced clock-in/out, staff location map" },
  { icon: CreditCard, label: "Stripe Connect Payments", detail: "2.5% platform fee on invoice payments" },
  { icon: BarChart, label: "Advanced Reports", detail: "Revenue, expenses, quote conversion, job trends" },
  { icon: Megaphone, label: "Lead Management", detail: "Pipeline tracking, source attribution, follow-ups" },
  { icon: Users, label: "Team Management", detail: "Role-based access, seat invitations, activity feed" },
  { icon: CheckCircle2, label: "Onboarding & Activation", detail: "Guided checklist, churn prevention emails" },
];

const GROWTH_LEVERS = [
  { label: "SEO Trade Landing Pages", detail: "/for/electrician, /for/plumber — 20 trade verticals" },
  { label: "Referral Programme", detail: "Users earn free months for each referral conversion" },
  { label: "Xero & QuickBooks Sync", detail: "Two-way accounting integration for stickiness" },
  { label: "Customer Portal", detail: "Clients approve quotes & pay invoices online" },
  { label: "Mobile PWA", detail: "Install-to-homescreen, offline-ready, push notifications" },
  { label: "Bulk Operations", detail: "Mass send invoices/quotes, batch status updates" },
  { label: "Annual Billing", detail: "15% discount drives LTV, reduces churn" },
  { label: "Drip Email Sequences", detail: "Automated onboarding & re-engagement campaigns" },
];

export default function FounderProjections() {
  const [customers, setCustomers] = useState(500);
  const [avgSeats, setAvgSeats] = useState(3);
  const [tierMix, setTierMix] = useState({ starter: 40, pro: 45, enterprise: 15 }); // %
  const [churnRate, setChurnRate] = useState(3);
  const [growthRate, setGrowthRate] = useState(12);
  const [stage, setStage] = useState("early");
  const [equityOwned, setEquityOwned] = useState(80);
  const [annualBillingPct, setAnnualBillingPct] = useState(30); // % on annual
  const [avgInvoiceVolume, setAvgInvoiceVolume] = useState(5000); // €/customer/month

  // Revenue calculations
  const totalSeats = customers * avgSeats;
  const starterSeats = Math.round(totalSeats * (tierMix.starter / 100));
  const proSeats = Math.round(totalSeats * (tierMix.pro / 100));
  const enterpriseSeats = Math.round(totalSeats * (tierMix.enterprise / 100));

  const monthlyBillingFactor = 1 - (annualBillingPct / 100) * ANNUAL_DISCOUNT;
  const seatMRR = (
    starterSeats * TIERS.starter.price +
    proSeats * TIERS.pro.price +
    enterpriseSeats * TIERS.enterprise.price
  ) * monthlyBillingFactor;

  const platformFeeMRR = customers * avgInvoiceVolume * PLATFORM_FEE_RATE;
  const totalMRR = seatMRR + platformFeeMRR;
  const totalARR = totalMRR * 12;

  // Costs
  const aiSeats = proSeats + enterpriseSeats;
  const voiceCOGS = aiSeats * VOICE_COST_PER_SEAT;
  const grossMargin = totalMRR > 0 ? ((totalMRR - voiceCOGS) / totalMRR) * 100 : 0;

  // Churn
  const netRevenueRetention = 100 - churnRate + 2;

  // Growth projections (12 months)
  const projections = Array.from({ length: 13 }, (_, month) => {
    const custAtMonth = Math.round(customers * Math.pow(1 + growthRate / 100, month));
    const seatsAtMonth = custAtMonth * avgSeats;
    const seatRev = (
      Math.round(seatsAtMonth * (tierMix.starter / 100)) * TIERS.starter.price +
      Math.round(seatsAtMonth * (tierMix.pro / 100)) * TIERS.pro.price +
      Math.round(seatsAtMonth * (tierMix.enterprise / 100)) * TIERS.enterprise.price
    ) * monthlyBillingFactor;
    const feeRev = custAtMonth * avgInvoiceVolume * PLATFORM_FEE_RATE;
    const mrr = seatRev + feeRev;
    return { month, customers: custAtMonth, mrr, arr: mrr * 12 };
  });

  const mrr12 = projections[12].mrr;
  const arr12 = projections[12].arr;
  const customers12 = projections[12].customers;

  // Valuation
  const multiple = SAAS_MULTIPLES[stage];
  const valuationLow = arr12 * multiple.low;
  const valuationHigh = arr12 * multiple.high;
  const yourEquityLow = valuationLow * (equityOwned / 100);
  const yourEquityHigh = valuationHigh * (equityOwned / 100);

  // Market penetration
  const ukPenetration = (customers / UK_TRADE_BUSINESSES) * 100;
  const globalPenetration12 = (customers12 / GLOBAL_TRADE_BUSINESSES) * 100;

  const formatCurrency = (val: number, currency = "€") => {
    if (val >= 1_000_000) return `${currency}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${currency}${(val / 1_000).toFixed(0)}K`;
    return `${currency}${Math.round(val).toLocaleString()}`;
  };

  return (
    <InvestorLayout title="Foreman — Investor Revenue Model" subtitle="Confidential — March 2026">
        {/* Mission Statement */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <p className="text-lg font-semibold text-foreground mb-2">
              Foreman is the all-in-one operating system for trade businesses.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We combine job management, quoting, invoicing, GPS time tracking, and AI-powered automation 
              into a single platform — replacing 5+ disconnected tools. Our AI assistant "Foreman George" 
              handles phone calls, generates quotes from photos, and automates admin. 
              <strong className="text-foreground"> Target: €10M ARR within 12 months</strong> across 
              UK, Ireland, Australia, and North America — requiring ~33,000 paid seats or significant invoice volume.
            </p>
          </CardContent>
        </Card>

        {/* Key Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Current MRR"
            value={formatCurrency(totalMRR)}
            sub={`${formatCurrency(totalARR)} ARR`}
            accent
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="12-Month MRR"
            value={formatCurrency(mrr12)}
            sub={`${formatCurrency(arr12)} ARR`}
          />
          <MetricCard
            icon={<Users className="h-5 w-5" />}
            label="12-Month Customers"
            value={customers12.toLocaleString()}
            sub={`${globalPenetration12.toFixed(3)}% global TAM`}
          />
          <MetricCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Gross Margin"
            value={`${grossMargin.toFixed(1)}%`}
            sub={`NRR: ${netRevenueRetention.toFixed(0)}%`}
          />
          <MetricCard
            icon={<Building2 className="h-5 w-5" />}
            label="Valuation Range"
            value={`${formatCurrency(valuationLow)} – ${formatCurrency(valuationHigh)}`}
            sub={`${multiple.low}–${multiple.high}x ARR`}
          />
        </div>

        {/* Pricing Tiers */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Revenue Model — 3 Tiers + Platform Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border bg-muted/50">
                <p className="font-semibold text-foreground">Starter Seat</p>
                <p className="text-2xl font-bold text-foreground">€{TIERS.starter.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">Jobs, quotes, invoices, calendar, reports. No AI.</p>
                <Badge variant="secondary" className="mt-2 text-xs">{tierMix.starter}% of seats</Badge>
              </div>
              <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
                <p className="font-semibold text-primary">Pro Seat</p>
                <p className="text-2xl font-bold text-primary">€{TIERS.pro.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">Everything + Foreman AI voice agent & chat.</p>
                <Badge className="mt-2 text-xs bg-primary">{tierMix.pro}% of seats</Badge>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/50">
                <p className="font-semibold text-foreground">Enterprise</p>
                <p className="text-2xl font-bold text-foreground">€{TIERS.enterprise.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">Priority support, higher AI limits, SSO.</p>
                <Badge variant="secondary" className="mt-2 text-xs">{tierMix.enterprise}% of seats</Badge>
              </div>
              <div className="p-4 rounded-xl border border-border bg-accent/5">
                <p className="font-semibold text-foreground">Platform Fee</p>
                <p className="text-2xl font-bold text-foreground">2.5%<span className="text-sm font-normal text-muted-foreground"> per txn</span></p>
                <p className="text-xs text-muted-foreground mt-1">On all invoice payments via Stripe Connect.</p>
                <Badge variant="secondary" className="mt-2 text-xs">{formatCurrency(platformFeeMRR)}/mo</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Model Inputs
                </CardTitle>
                <CardDescription>Adjust to model scenarios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <SliderInput label="Paying Customers" value={customers} onChange={setCustomers} min={10} max={50000} step={10} format={(v) => v.toLocaleString()} />
                <SliderInput label="Avg Seats / Customer" value={avgSeats} onChange={setAvgSeats} min={1} max={20} step={0.5} format={(v) => v.toString()} />
                <SliderInput label="Avg Invoice Vol (€/cust/mo)" value={avgInvoiceVolume} onChange={setAvgInvoiceVolume} min={0} max={30000} step={500} format={(v) => `€${v.toLocaleString()}`} />
                <SliderInput label="Annual Billing %" value={annualBillingPct} onChange={setAnnualBillingPct} min={0} max={80} step={5} format={(v) => `${v}%`} />
                <Separator />
                <SliderInput label="Monthly Customer Growth" value={growthRate} onChange={setGrowthRate} min={0} max={30} step={1} format={(v) => `${v}%`} />
                <SliderInput label="Monthly Churn" value={churnRate} onChange={setChurnRate} min={0} max={15} step={0.5} format={(v) => `${v}%`} />
                <SliderInput label="Your Equity" value={equityOwned} onChange={setEquityOwned} min={10} max={100} step={5} format={(v) => `${v}%`} />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Stage</label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SAAS_MULTIPLES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revenue Breakdown */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Revenue Breakdown (MRR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">Starter Seats</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(starterSeats * TIERS.starter.price * monthlyBillingFactor)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{starterSeats.toLocaleString()} × €{TIERS.starter.price}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Pro Seats</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(proSeats * TIERS.pro.price * monthlyBillingFactor)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{proSeats.toLocaleString()} × €{TIERS.pro.price}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">Enterprise</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(enterpriseSeats * TIERS.enterprise.price * monthlyBillingFactor)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{enterpriseSeats.toLocaleString()} × €{TIERS.enterprise.price}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                    <p className="text-sm text-muted-foreground">Platform Fees</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(platformFeeMRR)}</p>
                    <p className="text-xs text-muted-foreground mt-1">2.5% × {formatCurrency(customers * avgInvoiceVolume)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 12-Month Growth Table */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  12-Month Projection
                </CardTitle>
                <CardDescription>
                  {growthRate}% monthly growth, {churnRate}% churn, {annualBillingPct}% annual billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Month</th>
                        <th className="text-right py-2 px-4 text-muted-foreground font-medium">Customers</th>
                        <th className="text-right py-2 px-4 text-muted-foreground font-medium">MRR</th>
                        <th className="text-right py-2 pl-4 text-muted-foreground font-medium">ARR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projections.filter((_, i) => i === 0 || i === 3 || i === 6 || i === 9 || i === 12).map((p) => (
                        <tr key={p.month} className={`border-b border-border/50 ${p.month === 0 ? "bg-primary/5" : ""} ${p.month === 12 ? "bg-primary/10 font-semibold" : ""}`}>
                          <td className="py-2.5 pr-4 font-medium">
                            {p.month === 0 ? "Now" : `Month ${p.month}`}
                          </td>
                          <td className="text-right py-2.5 px-4">{p.customers.toLocaleString()}</td>
                          <td className="text-right py-2.5 px-4 font-semibold text-primary">{formatCurrency(p.mrr)}</td>
                          <td className="text-right py-2.5 pl-4">{formatCurrency(p.arr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Valuation & Equity */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PoundSterling className="h-5 w-5 text-primary" />
                  Equity Value (12-Month)
                </CardTitle>
                <CardDescription>{multiple.label} — {equityOwned}% ownership</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Conservative</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(yourEquityLow)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{multiple.low}x ARR</p>
                  </div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Optimistic</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(yourEquityHigh)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{multiple.high}x ARR</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Features Shipped */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Platform Features (Shipped)
                </CardTitle>
                <CardDescription>{FEATURES_SHIPPED.length} core modules live in production</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {FEATURES_SHIPPED.map((f) => (
                    <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <f.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.label}</p>
                        <p className="text-xs text-muted-foreground">{f.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Growth Levers */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Growth Levers & GTM
                </CardTitle>
                <CardDescription>Strategies driving €10M ARR target</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {GROWTH_LEVERS.map((g) => (
                    <div key={g.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                      <ArrowUpRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{g.label}</p>
                        <p className="text-xs text-muted-foreground">{g.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Competitor Benchmarks */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Competitive Landscape
                </CardTitle>
                <CardDescription>None have AI voice agent or integrated payment processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {COMPETITORS.map((c) => (
                    <div key={c.name} className="p-3 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.region} · {c.price}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{c.customers.toLocaleString()} customers</p>
                          <p className="text-xs text-muted-foreground">{c.arr} est. ARR</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.gaps.map((gap) => (
                          <Badge key={gap} variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                            <XCircle className="h-2.5 w-2.5 mr-1" />
                            {gap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-bold text-primary">Foreman (You)</p>
                        <p className="text-xs text-muted-foreground">UK/IE → Global · AI-first · All gaps filled</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{customers.toLocaleString()} → {customers12.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(totalARR)} → {formatCurrency(arr12)} ARR</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pen & Paper Market Grab */}
            <Card className="border-accent/30">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hammer className="h-5 w-5 text-primary" />
                  Pen & Paper Market Grab — The Massive Opportunity
                </CardTitle>
                <CardDescription>
                  {PEN_PAPER_STATS.pctManual}% of trade businesses still run on paper, WhatsApp, and spreadsheets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                    <Timer className="h-6 w-6 text-destructive mx-auto mb-2" />
                    <p className="text-2xl font-bold text-destructive">{PEN_PAPER_STATS.avgTimeLostWeekly}h</p>
                    <p className="text-xs text-muted-foreground">Admin hours lost per week</p>
                  </div>
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                    <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
                    <p className="text-2xl font-bold text-destructive">{PEN_PAPER_STATS.avgOverdueRate}%</p>
                    <p className="text-xs text-muted-foreground">Invoices paid late in trades</p>
                  </div>
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                    <BanknoteIcon className="h-6 w-6 text-destructive mx-auto mb-2" />
                    <p className="text-2xl font-bold text-destructive">{PEN_PAPER_STATS.avgDaysOverdue} days</p>
                    <p className="text-xs text-muted-foreground">Average days past due</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground mb-2">Why They'll Switch to Foreman:</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Zero learning curve</strong> — Foreman AI handles admin via voice/photo. No forms, no training.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Instant professional quotes</strong> — snap a photo on-site, AI generates quote in 30 seconds.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Get paid 14 days faster</strong> — automated chasers, "Pay Now" button, Stripe Connect.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">€12/mo entry price</strong> — cheaper than a single lost invoice. No commitment.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <p className="text-sm font-semibold text-foreground mb-1">💡 Cash Jobs Reality Check</p>
                  <p className="text-xs text-muted-foreground">
                    ~{PEN_PAPER_STATS.cashJobPct}% of trade work is cash-in-hand — we won't capture platform fees on those. 
                    But {PEN_PAPER_STATS.invoicedJobPct}% is invoiced, and that's where our 2.5% payment fee + automated chasers 
                    create massive value. Even cash-heavy businesses need quotes, scheduling, and job tracking — 
                    the €12 seat fee captures them regardless.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Chasing Revenue */}
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Automated Payment Chasers — Revenue Accelerator
                </CardTitle>
                <CardDescription>
                  The killer feature that sells itself: stop chasing, start getting paid
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                    <p className="text-2xl font-bold text-primary">-{CHASER_IMPACT.avgDaysReduced} days</p>
                    <p className="text-xs text-muted-foreground">Faster payment collection</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                    <p className="text-2xl font-bold text-primary">{CHASER_IMPACT.collectionRate}%</p>
                    <p className="text-xs text-muted-foreground">Collection rate (vs 73% manual)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                    <p className="text-2xl font-bold text-primary">+{CHASER_IMPACT.customerRetention}%</p>
                    <p className="text-xs text-muted-foreground">Higher user retention</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground mb-2">How It Drives Revenue:</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Percent className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">2.5% on every "Pay Now" click</strong> — auto-chasers include one-tap payment links via Stripe Connect. More chasers = more on-platform payments = more platform fee revenue.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <RefreshCcw className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Escalating 3-stage reminders</strong> — friendly → firm → final notice. Automated, branded, with portal link. Zero manual effort for the tradesperson.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Stickiness moat</strong> — once a plumber sees invoices paid 2 weeks faster, they'll never go back to manual chasing. This is the #1 retention feature.</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20">
                  <p className="text-sm font-semibold text-foreground mb-1">📊 Revenue Flywheel</p>
                  <p className="text-xs text-muted-foreground">
                    More auto-chasers → faster payments → tradespeople love it → tell their mates → more sign-ups → 
                    more invoice volume through platform → more 2.5% fees. 
                    At {customers.toLocaleString()} customers × €{avgInvoiceVolume.toLocaleString()}/mo invoiced volume × {PEN_PAPER_STATS.invoicedJobPct}% invoiced jobs 
                    = <strong className="text-primary">{formatCurrency(customers * avgInvoiceVolume * (PEN_PAPER_STATS.invoicedJobPct / 100) * PLATFORM_FEE_RATE)}/mo</strong> in platform fees alone.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Launch Scenario */}
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Launch Scenario — Professional Video + Paid Ads (90-Day)
                </CardTitle>
                <CardDescription>
                  Cinematic trade demo content produced by experienced filmmaker + targeted Google/Meta/Instagram ads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Ad spend & channel breakdown */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Channel Strategy & Expected Performance</p>
                  <div className="space-y-2">
                    {LAUNCH_SCENARIO.channels.map((ch) => (
                      <div key={ch.name} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                        <div className="w-24 shrink-0">
                          <p className="text-sm font-semibold text-foreground">{ch.name}</p>
                          <p className="text-xs text-muted-foreground">{ch.budget}% of budget</p>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                          {ch.cpc > 0 ? (
                            <>
                              <div>
                                <p className="text-sm font-bold text-primary">{ch.ctr}%</p>
                                <p className="text-[10px] text-muted-foreground">CTR</p>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">€{ch.cpc}</p>
                                <p className="text-[10px] text-muted-foreground">CPC</p>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-primary">{ch.convRate}%</p>
                                <p className="text-[10px] text-muted-foreground">Conv Rate</p>
                              </div>
                            </>
                          ) : (
                            <div className="col-span-3">
                              <p className="text-sm font-bold text-primary">{ch.convRate}% conv</p>
                              <p className="text-[10px] text-muted-foreground">Free traffic</p>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground max-w-[180px] text-right hidden sm:block">{ch.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 90-day funnel */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">90-Day Acquisition Funnel</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Month 1", data: LAUNCH_SCENARIO.month1, spend: LAUNCH_SCENARIO.adSpendMonth1 },
                      { label: "Month 2", data: LAUNCH_SCENARIO.month2, spend: LAUNCH_SCENARIO.adSpendMonth2 },
                      { label: "Month 3", data: LAUNCH_SCENARIO.month3, spend: LAUNCH_SCENARIO.adSpendMonth3 },
                    ].map((m) => {
                      const avgSeatRev = (TIERS.starter.price * 0.4 + TIERS.pro.price * 0.45 + TIERS.enterprise.price * 0.15);
                      const mrrAtMonth = m.data.paidCustomers * avgSeats * avgSeatRev;
                      const cac = m.spend / m.data.paidCustomers;
                      return (
                        <div key={m.label} className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                          <p className="text-sm font-semibold text-foreground">{m.label}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Ad Spend</span>
                              <span className="font-semibold text-foreground">€{m.spend.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Sign-ups</span>
                              <span className="font-semibold text-foreground">{m.data.signups.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Trial → Paid</span>
                              <span className="font-semibold text-primary">{m.data.trialToPaid}%</span>
                            </div>
                            <Separator className="my-1" />
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Paying Customers</span>
                              <span className="font-bold text-primary">{m.data.paidCustomers}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Est. MRR</span>
                              <span className="font-bold text-primary">{formatCurrency(mrrAtMonth)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">CAC</span>
                              <span className="font-semibold text-foreground">€{Math.round(cac)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">90-Day Cumulative:</strong>{" "}
                      <span className="text-primary font-bold">
                        {(LAUNCH_SCENARIO.month1.paidCustomers + LAUNCH_SCENARIO.month2.paidCustomers + LAUNCH_SCENARIO.month3.paidCustomers).toLocaleString()} paying customers
                      </span>
                      {" "}· €{(LAUNCH_SCENARIO.adSpendMonth1 + LAUNCH_SCENARIO.adSpendMonth2 + LAUNCH_SCENARIO.adSpendMonth3).toLocaleString()} total ad spend
                      {" "}· CAC improving as brand awareness compounds
                    </p>
                  </div>
                </div>

                {/* Video content strategy */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" />
                    Video Content Assets (Professional Production)
                  </p>
                  <div className="space-y-2">
                    {LAUNCH_SCENARIO.videoAssets.map((v, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                        <Badge variant="outline" className="shrink-0 mt-0.5 text-xs">{i + 1}</Badge>
                        <p className="text-sm text-muted-foreground">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Why this works */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20">
                  <p className="text-sm font-semibold text-foreground mb-2">🔥 Why Professional Video Changes Everything</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Flame className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">3-5x higher CTR</strong> vs stock footage ads — tradespeople trust real-world demos over corporate polish</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Flame className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Viral in trade groups</strong> — "bloke in his van" content gets shared organically in Facebook/WhatsApp trade communities</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Flame className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">AI voice agent = shock factor</strong> — no competitor has anything remotely close. Creates instant "I need this" reaction</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Flame className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">€12 impulse price point</strong> — lower than a takeaway. Combined with "get paid 2 weeks faster" = frictionless conversion</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pb-8">
          * Projections are estimates based on compound growth models. Actual results depend on execution, market conditions, and churn management. Not financial advice. Confidential — Foreman Ltd, Feb 2026.
        </p>
    </InvestorLayout>
  );
}

// --- Sub-components ---

function MetricCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className={`text-xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function SliderInput({ label, value, onChange, min, max, step, format }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; format: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <Badge variant="secondary" className="font-semibold">{format(value)}</Badge>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}
