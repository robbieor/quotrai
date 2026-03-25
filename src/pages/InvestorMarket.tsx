import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield, Globe, TrendingUp, Users, Target, XCircle, CheckCircle2,
  ArrowRight, MapPin, BarChart3, Zap, Layers, DollarSign, Rocket,
  Clock, Building2, Smartphone, Bot
} from "lucide-react";
import { Link } from "react-router-dom";
import quotrLogo from "@/assets/quotr-logo.png";

const TAM_SAM_SOM = [
  {
    label: "TAM",
    full: "Total Addressable Market",
    value: "€18B",
    desc: "11M+ trade SMBs globally × €135/mo blended ARPU (seats + 2.5% platform fee on invoiced revenue)",
    color: "bg-primary/10 border-primary/30",
  },
  {
    label: "SAM",
    full: "Serviceable Addressable Market",
    value: "€5.4B",
    desc: "4.5M English-speaking trade SMBs (UK 350K, US 4M, ANZ 200K) — our launch languages & compliance",
    color: "bg-primary/20 border-primary/40",
  },
  {
    label: "SOM",
    full: "Serviceable Obtainable Market",
    value: "€270M",
    desc: "Year 3 target: 1.5% penetration → 67K customers × €335/mo blended ARPU incl. platform fees",
    color: "bg-primary/30 border-primary/50",
  },
];

const TAM_BOTTOM_UP = [
  { segment: "Sole traders (1 person)", businesses: "6,500,000", arpu: "€12/mo (1 Starter seat)", annual: "€936M", pct: 59 },
  { segment: "Micro teams (2–5 people)", businesses: "3,200,000", arpu: "€87/mo (3 seats blended)", annual: "€3.3B", pct: 29 },
  { segment: "Small firms (6–20 people)", businesses: "1,100,000", arpu: "€290/mo (10 seats blended)", annual: "€3.8B", pct: 10 },
  { segment: "Mid-market (21–100)", businesses: "200,000", arpu: "€1,450/mo (50 seats)", annual: "€3.5B", pct: 2 },
];

const PLATFORM_FEE_OPPORTUNITY = [
  { metric: "Avg invoiced revenue per trade SMB", value: "€8,500/mo", note: "UK avg from BEIS Small Business Survey 2024" },
  { metric: "% using online payments", value: "38% → 65%", note: "Growing 8pp/year as customer portals become standard" },
  { metric: "Quotr platform fee", value: "2.5%", note: "Per transaction via Stripe Connect — passive, recurring" },
  { metric: "Platform fee per customer", value: "€130–€220/mo", note: "On top of seat revenue — success-aligned" },
];

const MARKET_DRIVERS = [
  { title: "AI Cost Collapse", desc: "Voice AI costs dropped 90% in 18 months (ElevenLabs, OpenAI). What cost €50/user/mo in 2024 costs €5 today — making AI-native trade software viable at €29/seat for the first time.", icon: Bot },
  { title: "Generational Shift", desc: "Millennials now represent 40%+ of trade business owners. They expect mobile-first, voice-driven tools — not desktop-era software designed for office managers they don't have.", icon: Smartphone },
  { title: "Late Payment Crisis", desc: "UK government data: 50,000 SMBs close annually due to late payments. The Prompt Payment Code and Making Tax Digital are pushing trades toward digital invoicing — or face penalties.", icon: Clock },
  { title: "Post-COVID Digital Permanence", desc: "COVID forced 3–5 years of digital adoption in 12 months. Unlike retail, trades are only 35% digitised — the largest remaining vertical to convert.", icon: TrendingUp },
  { title: "Labour Shortage = Admin Intolerance", desc: "350,000 unfilled trade roles across the UK alone. Every hour spent on admin is an hour not billing. Automation isn't a nice-to-have — it's survival.", icon: Users },
  { title: "Embedded Finance Tailwind", desc: "Stripe Connect, GoCardless, and open banking have made embedded payments trivial. Quotr's 2.5% platform fee would have required a banking licence 5 years ago.", icon: DollarSign },
];

const ADJACENT_MARKETS = [
  { title: "Embedded Insurance", desc: "Trade businesses need public liability, tool cover, and van insurance. White-label embedded insurance at quote/job creation = new revenue stream. Market: €4B+.", icon: Shield },
  { title: "Materials Marketplace", desc: "Tradespeople spend €15K–€50K/yr on materials. Supplier partnerships with affiliate/wholesale pricing through the platform. Comparable: Amazon Business for trades.", icon: Building2 },
  { title: "Trade Finance & BNPL", desc: "Offer customers 'Pay in 3' on large quotes (kitchens, extensions). Quotr earns interchange. Adjacent fintech market growing 25% CAGR.", icon: DollarSign },
  { title: "Certification & Compliance", desc: "Gas Safe, NICEIC, EICR certificates are already in-product. Expand to automated compliance filing, CPD tracking, and accreditation renewals.", icon: CheckCircle2 },
  { title: "Workforce Marketplace", desc: "When demand exceeds capacity, match overflow jobs to verified tradespeople on the platform. Take rate model (10–15%). Similar to Bark/Checkatrade but embedded.", icon: Users },
  { title: "Training & Upskilling", desc: "Micro-courses on pricing, business growth, compliance — delivered via Foreman AI. Sponsored by tool manufacturers and suppliers.", icon: Rocket },
];

const VENTURE_RETURN_PATH = [
  { milestone: "Year 1", customers: "5,000", arr: "€4M", multiple: "15x", valuation: "€60M", note: "Prove PMF in UK, expand to ANZ" },
  { milestone: "Year 2", customers: "25,000", arr: "€25M", multiple: "12x", valuation: "€300M", note: "US launch, platform fees compound" },
  { milestone: "Year 3", customers: "67,000", arr: "€80M", multiple: "10x", valuation: "€800M", note: "Adjacent markets, Series B" },
  { milestone: "Year 5", customers: "200,000", arr: "€300M", multiple: "8x", valuation: "€2.4B", note: "Category leader, IPO-ready" },
];

const COMPETITORS = [
  {
    name: "Jobber",
    customers: "200K+",
    region: "North America",
    arr: "~€200M",
    price: "From €39/mo",
    strengths: ["Large customer base", "Strong brand", "Good scheduling"],
    gaps: ["No AI assistant", "Limited invoicing", "No photo-to-quote", "High price point"],
  },
  {
    name: "ServiceTitan",
    customers: "100K+",
    region: "North America",
    arr: "~€500M",
    price: "Custom (€10K+/yr)",
    strengths: ["Enterprise features", "Deep integrations", "Large teams"],
    gaps: ["Enterprise only", "€10K+ annual", "No SMB focus", "Complex onboarding"],
  },
  {
    name: "Tradify",
    customers: "25K",
    region: "ANZ/UK",
    arr: "~€26M",
    price: "€30/user",
    strengths: ["Good UX", "Trade-focused", "Growing UK presence"],
    gaps: ["No AI", "No payment processing", "No automated chasers", "No photo quoting"],
  },
  {
    name: "ServiceM8",
    customers: "40K",
    region: "Global",
    arr: "~€42M",
    price: "From €30/mo",
    strengths: ["Mobile-first", "Job management", "Forms/checklists"],
    gaps: ["No AI voice agent", "No Stripe Connect", "No recurring invoices", "Limited reports"],
  },
  {
    name: "Fergus",
    customers: "12K",
    region: "ANZ/UK",
    arr: "~€13M",
    price: "€40/user",
    strengths: ["NZ/AUS strong", "Project costing", "Scheduling"],
    gaps: ["No AI features", "No payment chasers", "No multi-currency", "No customer portal"],
  },
];

const GEOGRAPHIC_MARKETS = [
  { region: "UK & Ireland", businesses: "350K", status: "Primary launch market", flag: "🇬🇧🇮🇪", detail: "Highest late-payment rates in Europe. Making Tax Digital mandate drives urgency." },
  { region: "Australia & NZ", businesses: "200K", status: "Month 3 expansion", flag: "🇦🇺🇳🇿", detail: "English-speaking, similar trade structure. Tradify & Fergus prove demand." },
  { region: "North America", businesses: "4M+", status: "Month 6 expansion", flag: "🇺🇸🇨🇦", detail: "Largest market. Jobber proves scale. Quotr undercuts on price with superior AI." },
  { region: "Western Europe", businesses: "500K+", status: "Year 2 target", flag: "🇩🇪🇫🇷🇳🇱", detail: "Multi-language expansion. E-invoicing mandates (Germany 2025, France 2026) create tailwind." },
];

export default function InvestorMarket() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={quotrLogo} alt="Quotr" className="h-9 w-9 rounded-lg" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Quotr — Market Analysis</h1>
              <p className="text-xs text-muted-foreground">TAM/SAM/SOM, Timing & Competitive Landscape — March 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-4 text-sm mr-4">
              <Link to="/pitch" className="text-muted-foreground hover:text-foreground transition-colors">Pitch</Link>
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
        {/* TAM SAM SOM */}
        <div className="text-center max-w-3xl mx-auto space-y-2 py-4">
          <h2 className="text-gradient-teal">€18B Market Opportunity</h2>
          <p className="text-muted-foreground">
            11M+ trade businesses globally remain largely undigitised. The field-service software market is growing at 18% CAGR — 
            and no incumbent has built an AI-native platform for SMB trades. This is the last major vertical to convert.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TAM_SAM_SOM.map((item) => (
            <Card key={item.label} className={`border-2 ${item.color}`}>
              <CardContent className="p-6 text-center space-y-3">
                <Badge variant="outline" className="text-xs">{item.full}</Badge>
                <p className="text-5xl font-bold text-foreground">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom-Up TAM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Bottom-Up TAM by Segment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 font-medium text-muted-foreground">Segment</th>
                    <th className="text-right py-3 font-medium text-muted-foreground">Businesses</th>
                    <th className="text-right py-3 font-medium text-muted-foreground">Blended ARPU</th>
                    <th className="text-right py-3 font-medium text-muted-foreground">Annual Revenue</th>
                    <th className="text-right py-3 font-medium text-muted-foreground">% of Market</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {TAM_BOTTOM_UP.map((row) => (
                    <tr key={row.segment} className="border-b border-border/50">
                      <td className="py-2.5 font-medium">{row.segment}</td>
                      <td className="text-right">{row.businesses}</td>
                      <td className="text-right text-muted-foreground">{row.arpu}</td>
                      <td className="text-right font-semibold text-primary">{row.annual}</td>
                      <td className="text-right text-muted-foreground">{row.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> ARPU excludes platform fees. Including 2.5% on avg €8,500/mo invoiced revenue adds €130–€220/mo per customer — 
              pushing blended ARPU to €135–€510/mo depending on segment. This is the "Stripe for trades" revenue layer that competitors don't have.
            </p>
          </CardContent>
        </Card>

        {/* Platform Fee as Revenue Multiplier */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Platform Fee — The Hidden Revenue Multiplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLATFORM_FEE_OPPORTUNITY.map((item) => (
                <div key={item.metric} className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-sm text-muted-foreground mb-1">{item.metric}</p>
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-2">{item.note}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Unlike pure SaaS competitors, Quotr earns revenue on both sides: predictable seat subscriptions <strong className="text-foreground">plus</strong> transaction-based 
              platform fees that grow as the customer's business grows. A plumber processing €10K/mo through Quotr generates €250/mo in platform fees alone — 
              more than 8x the Starter seat price. This is why our blended ARPU compounds faster than any competitor.
            </p>
          </CardContent>
        </Card>

        {/* Market Sizing Logic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Top-Down Market Sizing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 font-medium text-muted-foreground">Metric</th>
                    <th className="text-right py-3 font-medium text-muted-foreground">Value</th>
                    <th className="text-left py-3 pl-4 font-medium text-muted-foreground">Source</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  <tr className="border-b border-border/50"><td className="py-2.5">Global trade SMBs</td><td className="text-right font-medium">11,000,000+</td><td className="pl-4 text-muted-foreground">IBIS World, ONS, ABS, US Census Bureau</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2.5">English-speaking markets</td><td className="text-right font-medium">4,500,000</td><td className="pl-4 text-muted-foreground">UK 350K, US 4M, AUS/NZ 200K</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2.5">Current digital adoption</td><td className="text-right font-medium">~35%</td><td className="pl-4 text-muted-foreground">65% still pen & paper (ONS 2025)</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2.5">Field service software CAGR</td><td className="text-right font-medium">18.2%</td><td className="pl-4 text-muted-foreground">Grand View Research 2025</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2.5">Avg invoiced revenue per SMB</td><td className="text-right font-medium">€8,500/mo</td><td className="pl-4 text-muted-foreground">BEIS Small Business Survey 2024</td></tr>
                  <tr><td className="py-2.5">AI in field service CAGR</td><td className="text-right font-medium">28.4%</td><td className="pl-4 text-muted-foreground">Markets & Markets 2025</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Why Now — 6 timing drivers */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Why Now? — Six Converging Tailwinds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MARKET_DRIVERS.map((item) => (
                <div key={item.title} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Path to Venture Returns */}
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Rocket className="h-5 w-5 text-primary" />
              Path to Venture Returns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              At a €3–5M pre-money valuation, a €500K investment buys 10–15% equity. Here's how that reaches venture-scale returns 
              based on comparable field-service software valuations (ServiceTitan: $9.5B at IPO, Jobber: $680M Series D).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 font-medium text-muted-foreground">Milestone</th>
                    <th className="text-right py-3 font-medium text-muted-foreground">Customers</th>
                    <th className="text-right py-3 font-medium text-muted-foreground">ARR</th>
                    <th className="text-right py-3 font-medium text-muted-foreground">Multiple</th>
                    <th className="text-right py-3 font-medium text-muted-foreground">Valuation</th>
                    <th className="text-left py-3 pl-4 font-medium text-muted-foreground">Key Event</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {VENTURE_RETURN_PATH.map((row) => (
                    <tr key={row.milestone} className={`border-b border-border/50 ${row.milestone === "Year 5" ? "bg-primary/10 font-semibold" : ""}`}>
                      <td className="py-2.5 font-medium">{row.milestone}</td>
                      <td className="text-right">{row.customers}</td>
                      <td className="text-right text-primary font-semibold">{row.arr}</td>
                      <td className="text-right">{row.multiple}</td>
                      <td className="text-right font-bold">{row.valuation}</td>
                      <td className="pl-4 text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 rounded-xl border border-primary/20 bg-card">
              <p className="text-sm text-foreground font-semibold mb-1">💰 Investor Return Scenario</p>
              <p className="text-xs text-muted-foreground">
                €500K at €5M pre-money = 10% equity. At Year 3 (€800M valuation) = <strong className="text-primary">€80M</strong> = <strong className="text-primary">160x return</strong>. 
                Even at conservative 5x ARR multiples, Year 3 = €400M = <strong className="text-foreground">80x return</strong>. 
                ServiceTitan's IPO at 19x ARR proves these multiples are realistic for vertical SaaS leaders.
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Adjacent Markets */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Adjacent Market Expansion — Beyond SaaS
          </h3>
          <p className="text-muted-foreground text-sm">
            Once Quotr owns the workflow, it becomes the distribution platform for financial services, materials, and workforce — each a multi-billion-euro opportunity
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADJACENT_MARKETS.map((item) => (
            <Card key={item.title} className="card-hover">
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Competitive Landscape */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Competitive Landscape
          </h3>
          <p className="text-muted-foreground text-sm">No incumbent combines AI + embedded payments + SMB-affordable pricing. Quotr fills every gap.</p>
        </div>

        <div className="space-y-4">
          {COMPETITORS.map((comp) => (
            <Card key={comp.name}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="md:w-48 flex-shrink-0">
                    <p className="font-bold text-foreground text-lg">{comp.name}</p>
                    <p className="text-sm text-muted-foreground">{comp.region}</p>
                    <div className="flex gap-3 mt-2">
                      <Badge variant="secondary" className="text-xs">{comp.customers} customers</Badge>
                      <Badge variant="outline" className="text-xs">{comp.arr} ARR</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{comp.price}</p>
                  </div>
                  <div className="flex-1 grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Strengths</p>
                      {comp.strengths.map((s) => (
                        <div key={s} className="flex items-center gap-1.5 text-sm text-foreground mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {s}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-destructive uppercase tracking-wider mb-2">Quotr Advantages</p>
                      {comp.gaps.map((g) => (
                        <div key={g} className="flex items-center gap-1.5 text-sm text-foreground mb-1">
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                          {g}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Geographic Expansion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Geographic Expansion Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GEOGRAPHIC_MARKETS.map((market) => (
                <div key={market.region} className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                  <div className="text-center">
                    <p className="text-3xl mb-1">{market.flag}</p>
                    <p className="font-semibold text-foreground">{market.region}</p>
                    <p className="text-sm text-muted-foreground">{market.businesses} businesses</p>
                    <Badge variant="secondary" className="mt-1 text-xs">{market.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{market.detail}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Positioning Statement */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground mb-2">
              "Quotr is Jobber's features, at half the price, with AI that nobody else has — 
              and a payment layer that turns every invoice into revenue."
            </p>
            <p className="text-sm text-muted-foreground">
              We compete on price (€12 entry) with features that match €40+/user platforms, 
              plus an AI moat (Foreman AI) that no competitor can replicate without 12+ months of R&D, 
              and a 2.5% platform fee that creates a second, compounding revenue stream.
            </p>
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
