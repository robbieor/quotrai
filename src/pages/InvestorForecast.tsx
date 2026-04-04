import InvestorLayout from "@/components/investor/InvestorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  Target, TrendingUp, DollarSign, Globe, Users, CheckCircle2,
  ArrowRight, Rocket, Shield, Zap, Bot, Camera, CreditCard,
  Mic, Smartphone, Mail, Clock, MapPin
} from "lucide-react";

// Revenue model constants
const BLENDED_SEAT_PRICE = 0.40 * 19 + 0.45 * 39 + 0.15 * 59; // €34.00
const AVG_SEATS = 3;
const AVG_INVOICE_VOLUME = 5000; // €/customer/month
const PLATFORM_FEE_RATE = 0.015;
const PLATFORM_FEE_PER_CUSTOMER = AVG_INVOICE_VOLUME * PLATFORM_FEE_RATE; // €75
const BLENDED_ARPU = (BLENDED_SEAT_PRICE * AVG_SEATS) + PLATFORM_FEE_PER_CUSTOMER; // €227

const MILESTONES = [
  { customers: 50, label: "Launch" },
  { customers: 100, label: "Traction" },
  { customers: 300, label: "Product-Market Fit" },
  { customers: 500, label: "Seed milestone" },
  { customers: 1_000, label: "Series A ready" },
  { customers: 5_000, label: "Scale-up" },
  { customers: 25_000, label: "≈ Tradify" },
  { customers: 110_000, label: "1% global" },
  { customers: 550_000, label: "5% global" },
];

const computeRevenue = (customers: number) => {
  const seatMRR = customers * AVG_SEATS * BLENDED_SEAT_PRICE;
  const platformMRR = customers * PLATFORM_FEE_PER_CUSTOMER;
  const totalMRR = seatMRR + platformMRR;
  const totalARR = totalMRR * 12;
  return { seatMRR, platformMRR, totalMRR, totalARR };
};

const formatCurrency = (val: number) => {
  if (val >= 1_000_000_000) return `€${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `€${(val / 1_000).toFixed(0)}K`;
  return `€${Math.round(val).toLocaleString()}`;
};

// Competitors for market share chart
const COMPETITORS = [
  { name: "Fergus", customers: 12_000, arr: 13_000_000, color: "hsl(var(--muted-foreground))" },
  { name: "Tradify", customers: 25_000, arr: 26_000_000, color: "hsl(var(--muted-foreground))" },
  { name: "ServiceM8", customers: 40_000, arr: 42_000_000, color: "hsl(var(--muted-foreground))" },
  { name: "Jobber", customers: 200_000, arr: 200_000_000, color: "hsl(var(--muted-foreground))" },
  { name: "ServiceTitan", customers: 100_000, arr: 500_000_000, color: "hsl(var(--muted-foreground))" },
];

const FOREMAN_MILESTONES_CHART = [
  { name: "Foreman Y1", customers: 1_000, color: "hsl(var(--primary))" },
  { name: "Foreman Y2", customers: 5_000, color: "hsl(var(--primary))" },
  { name: "Fergus", customers: 12_000, color: "hsl(var(--muted-foreground))" },
  { name: "Tradify", customers: 25_000, color: "hsl(var(--muted-foreground))" },
  { name: "ServiceM8", customers: 40_000, color: "hsl(var(--muted-foreground))" },
  { name: "Foreman Y3", customers: 25_000, color: "hsl(var(--primary))" },
  { name: "ServiceTitan", customers: 100_000, color: "hsl(var(--muted-foreground))" },
  { name: "Jobber", customers: 200_000, color: "hsl(var(--muted-foreground))" },
  { name: "Foreman 5%", customers: 550_000, color: "hsl(var(--primary))" },
];

// Valuation multiples by stage
const VALUATION_STAGES = [
  { customers: 500, multiple: 8, stage: "Pre-Seed" },
  { customers: 1_000, multiple: 10, stage: "Seed" },
  { customers: 5_000, multiple: 12, stage: "Series A" },
  { customers: 25_000, multiple: 12, stage: "Series B" },
  { customers: 110_000, multiple: 15, stage: "Growth" },
  { customers: 550_000, multiple: 15, stage: "Scale" },
];

// Feature gap matrix
const GAP_DIMENSIONS = [
  { feature: "AI Voice Agent", foreman: true, fergus: false, tradify: false, jobber: false, serviceTitan: false },
  { feature: "Photo-to-Quote AI", foreman: true, fergus: false, tradify: false, jobber: false, serviceTitan: false },
  { feature: "AI Chat Assistant", foreman: true, fergus: false, tradify: false, jobber: false, serviceTitan: false },
  { feature: "Built-in Payments (1.5%)", foreman: true, fergus: false, tradify: false, jobber: true, serviceTitan: true },
  { feature: "Customer Portal", foreman: true, fergus: false, tradify: false, jobber: true, serviceTitan: true },
  { feature: "Multi-Currency", foreman: true, fergus: false, tradify: false, jobber: false, serviceTitan: false },
  { feature: "GPS Time Tracking", foreman: true, fergus: true, tradify: true, jobber: true, serviceTitan: true },
  { feature: "Automated Payment Chasers", foreman: true, fergus: false, tradify: false, jobber: false, serviceTitan: false },
  { feature: "Recurring Invoices", foreman: true, fergus: false, tradify: false, jobber: true, serviceTitan: true },
  { feature: "SMB Pricing (<€60/mo)", foreman: true, fergus: false, tradify: true, jobber: true, serviceTitan: false },
];

const EXPANSION_TIMELINE = [
  { year: "Y1", region: "UK & Ireland", flag: "🇬🇧🇮🇪", target: "1,000 customers", detail: "Primary launch. Making Tax Digital tailwind." },
  { year: "Y2", region: "Australia & NZ", flag: "🇦🇺🇳🇿", target: "5,000 total", detail: "English-speaking. Tradify/Fergus prove demand." },
  { year: "Y3", region: "North America", flag: "🇺🇸🇨🇦", target: "25,000 total", detail: "4M+ trade SMBs. Undercut Jobber with AI." },
  { year: "Y4", region: "Western Europe", flag: "🇩🇪🇫🇷🇳🇱", target: "110,000 total", detail: "Multi-language. E-invoicing mandates." },
  { year: "Y5", region: "Global", flag: "🌍", target: "550,000 (5%)", detail: "Full multi-market, AI-native market leader." },
];

export default function InvestorForecast() {
  return (
    <InvestorLayout title="Foreman — TAM Forecast" subtitle="Revenue Milestones, Market Share & 20% Equity Proposition">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4 py-6">
        <Badge className="bg-primary/10 text-primary border-primary/30 text-sm px-4 py-1">
          20% Equity Offering
        </Badge>
        <h2 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
          The AI-First Trade OS<br />
          <span className="text-primary">€1.5B ARR</span> at 5% Global Market Share
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          11M+ trade SMBs globally. No incumbent has AI. Foreman's blended ARPU of €{Math.round(BLENDED_ARPU)}/mo 
          is 3–5× pure SaaS competitors. Here's the path from 50 customers to 550,000.
        </p>
        <div className="flex flex-wrap justify-center gap-6 pt-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">€{Math.round(BLENDED_ARPU)}</p>
            <p className="text-xs text-muted-foreground">Blended ARPU/mo</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">11M+</p>
            <p className="text-xs text-muted-foreground">Global Trade SMBs</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{formatCurrency(computeRevenue(550_000).totalARR)}</p>
            <p className="text-xs text-muted-foreground">ARR at 5% Share</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">3</p>
            <p className="text-xs text-muted-foreground">Revenue Streams</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* ARPU Breakdown */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Blended ARPU: Why We Win
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Seat Revenue</p>
              <p className="text-3xl font-bold text-foreground">€{(BLENDED_SEAT_PRICE * AVG_SEATS).toFixed(0)}/mo</p>
              <p className="text-xs text-muted-foreground">€{BLENDED_SEAT_PRICE.toFixed(0)} blended × {AVG_SEATS} seats avg</p>
              <p className="text-xs text-muted-foreground">(40% Lite €19 + 45% Connect €39 + 15% Grow €59)</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Platform Fee Revenue</p>
              <p className="text-3xl font-bold text-foreground">€{PLATFORM_FEE_PER_CUSTOMER}/mo</p>
              <p className="text-xs text-muted-foreground">2.5% on €{AVG_INVOICE_VOLUME.toLocaleString()} avg invoice volume</p>
              <p className="text-xs text-muted-foreground">Passive, recurring, success-aligned</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Total Blended ARPU</p>
              <p className="text-3xl font-bold text-primary">€{Math.round(BLENDED_ARPU)}/mo</p>
              <p className="text-xs text-muted-foreground">vs competitors' €30–50 pure SaaS</p>
              <p className="text-xs font-semibold text-primary">3–5× higher per customer</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Revenue Milestone Table */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Revenue at Each Milestone
        </h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customers</TableHead>
                    <TableHead>Milestone</TableHead>
                    <TableHead className="text-right">Seats</TableHead>
                    <TableHead className="text-right">Seat MRR</TableHead>
                    <TableHead className="text-right">Platform MRR</TableHead>
                    <TableHead className="text-right">Total MRR</TableHead>
                    <TableHead className="text-right font-bold">ARR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MILESTONES.map((m) => {
                    const rev = computeRevenue(m.customers);
                    const isHighlight = m.customers === 550_000;
                    return (
                      <TableRow key={m.customers} className={isHighlight ? "bg-primary/10 font-bold" : ""}>
                        <TableCell className="font-medium">{m.customers.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={isHighlight ? "default" : "outline"} className="text-xs">
                            {m.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{(m.customers * AVG_SEATS).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(rev.seatMRR)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(rev.platformMRR)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(rev.totalMRR)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(rev.totalARR)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Market Share Comparison Chart */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Market Share: Foreman vs Incumbents
        </h3>
        <Card>
          <CardContent className="p-6">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FOREMAN_MILESTONES_CHART} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 13 }} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Bar dataKey="customers" radius={[0, 6, 6, 0]}>
                    {FOREMAN_MILESTONES_CHART.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Green = Foreman milestones · Grey = competitor current customer counts
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* 20% Equity Value Table */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          20% Equity Value at Each Milestone
        </h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customers</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">ARR</TableHead>
                    <TableHead className="text-right">Multiple</TableHead>
                    <TableHead className="text-right">Pre-Money Valuation</TableHead>
                    <TableHead className="text-right font-bold">20% Stake Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VALUATION_STAGES.map((v) => {
                    const rev = computeRevenue(v.customers);
                    const valuation = rev.totalARR * v.multiple;
                    const stakeValue = valuation * 0.20;
                    const isHighlight = v.customers === 550_000;
                    return (
                      <TableRow key={v.customers} className={isHighlight ? "bg-primary/10 font-bold" : ""}>
                        <TableCell className="font-medium">{v.customers.toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{v.stage}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency(rev.totalARR)}</TableCell>
                        <TableCell className="text-right">{v.multiple}×</TableCell>
                        <TableCell className="text-right">{formatCurrency(valuation)}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(stakeValue)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-primary/30">
            <CardContent className="p-5 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">At 5% Global Market Share (550K customers)</p>
              <p className="text-4xl font-extrabold text-primary">{formatCurrency(computeRevenue(550_000).totalARR * 15 * 0.20)}</p>
              <p className="text-sm text-muted-foreground">Value of 20% stake at 15× ARR multiple</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-5 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Today's Entry Point</p>
              <p className="text-4xl font-extrabold text-foreground">€500K–€1M</p>
              <p className="text-sm text-muted-foreground">Pre-Seed for 20% equity · €3M–€5M pre-money valuation</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Path to 5% — Geographic Expansion */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Path to 5% Global Market Share
        </h3>
        <div className="grid md:grid-cols-5 gap-4">
          {EXPANSION_TIMELINE.map((step, i) => (
            <Card key={step.year} className={i === 4 ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="p-4 space-y-2 text-center">
                <p className="text-3xl">{step.flag}</p>
                <Badge variant={i === 4 ? "default" : "outline"} className="text-xs">{step.year}</Badge>
                <p className="font-semibold text-sm text-foreground">{step.region}</p>
                <p className="text-lg font-bold text-primary">{step.target}</p>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Competitor Gap Matrix */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          Competitive Gap Matrix
        </h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-center font-bold text-primary">Foreman</TableHead>
                    <TableHead className="text-center">Fergus</TableHead>
                    <TableHead className="text-center">Tradify</TableHead>
                    <TableHead className="text-center">Jobber</TableHead>
                    <TableHead className="text-center">ServiceTitan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {GAP_DIMENSIONS.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium">{row.feature}</TableCell>
                      <TableCell className="text-center">{row.foreman ? <CheckCircle2 className="h-5 w-5 text-primary mx-auto" /> : "—"}</TableCell>
                      <TableCell className="text-center">{row.fergus ? <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto" /> : "—"}</TableCell>
                      <TableCell className="text-center">{row.tradify ? <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto" /> : "—"}</TableCell>
                      <TableCell className="text-center">{row.jobber ? <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto" /> : "—"}</TableCell>
                      <TableCell className="text-center">{row.serviceTitan ? <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto" /> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground text-center">
          Foreman is the only platform with AI voice agent, photo-to-quote, and automated payment chasers — all built in from day one.
        </p>
      </section>

      <Separator />

      {/* Investment Terms */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Investment Summary
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg">The Ask</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Raising</p>
                  <p className="text-2xl font-bold text-foreground">€500K–€1M</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Equity Offered</p>
                  <p className="text-2xl font-bold text-primary">20%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pre-Money Valuation</p>
                  <p className="text-2xl font-bold text-foreground">€3M–€5M</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Runway</p>
                  <p className="text-2xl font-bold text-foreground">18 months</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Use of Funds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { pct: 40, label: "Product & Engineering", detail: "Mobile app, offline mode, deeper AI" },
                { pct: 25, label: "Sales & Marketing", detail: "Video production, paid acquisition, partnerships" },
                { pct: 20, label: "Customer Success", detail: "Onboarding team, support, activation" },
                { pct: 15, label: "Operations & Legal", detail: "Compliance, integrations, infrastructure" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{item.pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Key Milestones */}
      <section className="pb-8">
        <Card className="bg-card border-primary/20">
          <CardContent className="p-6">
            <h4 className="font-bold text-foreground mb-4">Key Milestones with Investment</h4>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { target: "1,000 customers", timeline: "6 months", metric: formatCurrency(computeRevenue(1_000).totalARR) + " ARR" },
                { target: "€100K MRR", timeline: "9 months", metric: "Product-market fit validated" },
                { target: "Series A ready", timeline: "15 months", metric: "3 markets, 5,000+ customers" },
                { target: "5% global share", timeline: "5 years", metric: formatCurrency(computeRevenue(550_000).totalARR) + " ARR" },
              ].map((m) => (
                <div key={m.target} className="space-y-1">
                  <p className="font-semibold text-sm text-foreground">{m.target}</p>
                  <p className="text-xs text-primary font-medium">{m.timeline}</p>
                  <p className="text-xs text-muted-foreground">{m.metric}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </InvestorLayout>
  );
}
