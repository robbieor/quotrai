import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield, Users, ArrowRight, Briefcase, GraduationCap,
  Code2, Lightbulb, Target, Heart, Rocket
} from "lucide-react";
import { Link } from "react-router-dom";
import foremanLogo from "@/assets/foreman-logo.png";

const FOUNDERS = [
  {
    name: "Tom",
    role: "Founder & CEO",
    background: [
      "Deep understanding of the trades industry from firsthand experience",
      "Full-stack product builder — designed and built the entire Quotr platform",
      "Combines technical capability with business strategy and market insight",
    ],
    strengths: ["Product Vision", "Full-Stack Development", "Market Knowledge", "AI Integration"],
  },
];

const WHY_THIS_TEAM = [
  {
    icon: Code2,
    title: "Builder-Founder Advantage",
    desc: "The entire product — frontend, backend, AI integrations, payment processing — was built by the founder. Zero outsourcing, maximum speed, minimal burn.",
  },
  {
    icon: Lightbulb,
    title: "Market Empathy",
    desc: "Quotr was born from seeing tradespeople struggle with admin. Every feature solves a real pain point observed in the field — not imagined in a boardroom.",
  },
  {
    icon: Target,
    title: "Capital Efficiency",
    desc: "From zero to 20+ production features with minimal spend. The founding team has demonstrated ability to move fast and build right — the ideal pre-seed profile.",
  },
  {
    icon: Rocket,
    title: "AI-Native Thinking",
    desc: "Leveraging cutting-edge AI (GPT-5, Gemini, ElevenLabs) not as a bolted-on feature but as core infrastructure. The AI moat deepens with every user interaction.",
  },
];

const HIRING_PLAN = [
  { role: "Head of Growth / Marketing", when: "Month 1-2", why: "Drive paid acquisition and trade partnerships for the video-led launch" },
  { role: "Senior Full-Stack Engineer", when: "Month 2-3", why: "Accelerate mobile app development and offline capabilities" },
  { role: "Customer Success Lead", when: "Month 3-4", why: "Onboarding, activation, and churn prevention as customer base scales" },
  { role: "Sales Development Rep", when: "Month 4-6", why: "Outbound to trade associations, wholesalers, and trade schools" },
  { role: "AI/ML Engineer", when: "Month 6-9", why: "Enhance photo quoting accuracy, build predictive scheduling, deepen George's capabilities" },
];

const ADVISORS_NEEDED = [
  { role: "Trades Industry Advisor", desc: "Someone with deep connections in UK/Irish trades — ideally a former trade business owner who's built and sold" },
  { role: "SaaS Growth Advisor", desc: "Experience scaling vertical SaaS from 0-€10M ARR, ideally in field service or similar blue-collar verticals" },
  { role: "AI/Product Advisor", desc: "Technical advisor with experience deploying conversational AI at scale in production environments" },
];

const VALUES = [
  { icon: Heart, title: "Built for Real People", desc: "Every feature is tested against one question: would a plumber in a van actually use this?" },
  { icon: Briefcase, title: "Revenue from Day One", desc: "We don't believe in growth-at-all-costs. Every user should generate positive unit economics from month 1." },
  { icon: GraduationCap, title: "Learn Fast, Ship Faster", desc: "Weekly releases, direct user feedback loops, rapid iteration. We move at startup speed because we are one." },
];

export default function InvestorTeam() {
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
              <h1 className="text-lg font-bold text-foreground">Quotr — Team</h1>
              <p className="text-xs text-muted-foreground">Founders, Hiring Plan & Culture</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-4 text-sm mr-4">
              <Link to="/pitch" className="text-muted-foreground hover:text-foreground transition-colors">Pitch</Link>
              <Link to="/market" className="text-muted-foreground hover:text-foreground transition-colors">Market</Link>
              <Link to="/product" className="text-muted-foreground hover:text-foreground transition-colors">Product</Link>
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
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-2 py-4">
          <h2 className="text-gradient-teal">The Team Behind Quotr</h2>
          <p className="text-muted-foreground">A lean, technical founding team with deep market empathy and capital efficiency</p>
        </div>

        {/* Founder */}
        {FOUNDERS.map((founder) => (
          <Card key={founder.name} className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{founder.name}</h3>
                    <p className="text-primary font-medium">{founder.role}</p>
                  </div>
                  <div className="space-y-2">
                    {founder.background.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {founder.strengths.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Why This Team */}
        <div className="grid sm:grid-cols-2 gap-4">
          {WHY_THIS_TEAM.map((item) => (
            <Card key={item.title}>
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

        {/* Hiring Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Post-Funding Hiring Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {HIRING_PLAN.map((hire, i) => (
                <div key={hire.role} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{hire.role}</p>
                      <Badge variant="outline" className="text-xs">{hire.when}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{hire.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Advisors Needed */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Advisory Board — Positions Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {ADVISORS_NEEDED.map((a) => (
                <div key={a.role} className="p-4 rounded-xl bg-card border border-border">
                  <p className="font-semibold text-foreground mb-2">{a.role}</p>
                  <p className="text-sm text-muted-foreground">{a.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Values */}
        <div className="grid sm:grid-cols-3 gap-4">
          {VALUES.map((v) => (
            <Card key={v.title}>
              <CardContent className="p-5 text-center">
                <v.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="font-semibold text-foreground mb-1">{v.title}</p>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

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
      </main>
    </div>
  );
}