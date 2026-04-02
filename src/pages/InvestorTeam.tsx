import { Link } from "react-router-dom";
import {
  Users, Code2, Lightbulb, Target, Rocket, Heart,
  Briefcase, GraduationCap, ArrowRight
} from "lucide-react";
import InvestorLayout from "@/components/investor/InvestorLayout";
import InvestorSection from "@/components/investor/InvestorSection";
import FadeInOnScroll from "@/components/investor/FadeInOnScroll";
import AnimatedCounter from "@/components/investor/AnimatedCounter";

const FOUNDER_STATS = [
  { value: 20, suffix: "+", label: "Features shipped" },
  { value: 0, suffix: "", label: "Lines outsourced", displayValue: "Zero" },
  { value: 1, suffix: "", label: "Founder", displayValue: "Solo" },
  { value: 6, suffix: "mo", label: "Build time" },
];

const WHY_THIS_TEAM = [
  { icon: Code2, title: "Builder-Founder", desc: "Full product — frontend, backend, AI, payments — built by the founder. Zero outsourcing, maximum speed, minimal burn." },
  { icon: Lightbulb, title: "Market Empathy", desc: "Born from watching tradespeople struggle with admin. Every feature solves a real pain point observed in the field." },
  { icon: Target, title: "Capital Efficiency", desc: "20+ production features with minimal spend. Proven ability to move fast and build right — ideal pre-seed profile." },
  { icon: Rocket, title: "AI-Native Thinking", desc: "GPT-5, Gemini, ElevenLabs — not bolted on but core infrastructure. The AI moat deepens with every interaction." },
];

const HIRING_PLAN = [
  { role: "Head of Growth", when: "Month 1–2", why: "Paid acquisition and trade partnerships for video-led launch" },
  { role: "Senior Full-Stack Engineer", when: "Month 2–3", why: "Mobile app, offline capabilities, platform scaling" },
  { role: "Customer Success Lead", when: "Month 3–4", why: "Onboarding, activation, and churn prevention" },
  { role: "Sales Development Rep", when: "Month 4–6", why: "Outbound to trade associations and wholesalers" },
  { role: "AI/ML Engineer", when: "Month 6–9", why: "Photo quoting accuracy, predictive scheduling" },
];

const VALUES = [
  { icon: Heart, title: "Built for Real People", desc: "Every feature tested: would a plumber in a van actually use this?" },
  { icon: Briefcase, title: "Revenue from Day One", desc: "Every user generates positive unit economics from month 1." },
  { icon: GraduationCap, title: "Learn Fast, Ship Faster", desc: "Weekly releases, direct feedback loops, startup speed." },
];

export default function InvestorTeam() {
  return (
    <InvestorLayout title="Foreman — Team">
      {/* HERO */}
      <InvestorSection theme="dark" className="min-h-[70vh]">
        <div className="text-center">
          <FadeInOnScroll>
            <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-6">Team</p>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1]">
              One founder.<br /><span className="text-primary">Twenty features.</span>
            </h1>
            <p className="text-xl text-white/50 mt-6 max-w-xl mx-auto">
              A lean, technical founder with deep market empathy and extreme capital efficiency.
            </p>
          </FadeInOnScroll>
        </div>
      </InvestorSection>

      {/* FOUNDER SPOTLIGHT */}
      <InvestorSection theme="light">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <FadeInOnScroll>
            <div>
              <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Founder</p>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-2">Tom</h2>
              <p className="text-primary font-semibold text-lg mb-6">Founder & CEO</p>
              <div className="space-y-4">
                {[
                  "Deep understanding of the trades industry from firsthand experience",
                  "Full-stack product builder — designed and built the entire Foreman platform",
                  "Combines technical capability with business strategy and market insight",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeInOnScroll>
          <FadeInOnScroll delay={200}>
            <div className="grid grid-cols-2 gap-4">
              {FOUNDER_STATS.map((s, i) => (
                <div key={s.label} className="p-6 rounded-2xl border border-border bg-card text-center">
                  <p className="text-3xl md:text-4xl font-extrabold text-foreground">
                    {s.displayValue || <AnimatedCounter end={s.value} suffix={s.suffix} />}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">{s.label}</p>
                </div>
              ))}
            </div>
          </FadeInOnScroll>
        </div>
      </InvestorSection>

      {/* WHY THIS TEAM */}
      <InvestorSection theme="dark">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Why This Team</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-16">Unfair advantages</h2>
        </FadeInOnScroll>
        <div className="grid sm:grid-cols-2 gap-6">
          {WHY_THIS_TEAM.map((item, i) => (
            <FadeInOnScroll key={item.title} delay={i * 120}>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </InvestorSection>

      {/* HIRING PLAN */}
      <InvestorSection theme="light">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Growth</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-12">Post-Funding Hiring Plan</h2>
        </FadeInOnScroll>
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-6">
            {HIRING_PLAN.map((hire, i) => (
              <FadeInOnScroll key={hire.role} delay={i * 100}>
                <div className="flex items-start gap-6 pl-3">
                  <div className="relative z-10 flex-shrink-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  <div className="flex-1 p-5 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="font-bold text-foreground">{hire.role}</h3>
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{hire.when}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{hire.why}</p>
                  </div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </InvestorSection>

      {/* VALUES */}
      <InvestorSection theme="dark" className="min-h-0 py-20">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3 text-center">Culture</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">What we believe</h2>
        </FadeInOnScroll>
        <div className="grid sm:grid-cols-3 gap-6">
          {VALUES.map((v, i) => (
            <FadeInOnScroll key={v.title} delay={i * 150}>
              <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
                <v.icon className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-white mb-2">{v.title}</h3>
                <p className="text-sm text-white/50">{v.desc}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </InvestorSection>

      {/* NAV */}
      <InvestorSection theme="light" className="min-h-0 py-16">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { to: "/investor/pitch", label: "Executive Summary", sub: "Problem, solution & ask" },
            { to: "/investor/market", label: "Market Analysis", sub: "TAM, competitors, timing" },
            { to: "/investor/projections", label: "Financial Model", sub: "Interactive projections" },
          ].map((item) => (
            <Link key={item.to} to={item.to}>
              <div className="p-5 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all group flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.sub}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </InvestorSection>
    </InvestorLayout>
  );
}
