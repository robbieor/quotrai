import { Link } from "react-router-dom";
import {
  Globe, TrendingUp, Users, Target, CheckCircle2, XCircle,
  ArrowRight, DollarSign, Clock, Bot, Smartphone, Shield,
  Building2, Rocket
} from "lucide-react";
import InvestorLayout from "@/components/investor/InvestorLayout";
import InvestorSection from "@/components/investor/InvestorSection";
import AnimatedCounter from "@/components/investor/AnimatedCounter";
import FadeInOnScroll from "@/components/investor/FadeInOnScroll";

const TAM_SAM_SOM = [
  { label: "TAM", value: 18, suffix: "B", desc: "11M+ trade SMBs globally × €135/mo blended ARPU", size: "w-64 h-64 md:w-80 md:h-80" },
  { label: "SAM", value: 5, suffix: ".4B", desc: "4.5M English-speaking markets (UK, US, ANZ)", size: "w-48 h-48 md:w-60 md:h-60" },
  { label: "SOM", value: 900, suffix: "M", desc: "Year 5: 5% penetration → 550K customers", size: "w-32 h-32 md:w-40 md:h-40" },
];

const MARKET_DRIVERS = [
  { title: "AI Cost Collapse", desc: "Voice AI costs dropped 90% in 18 months — making AI-native trade software viable at €29/seat", icon: Bot },
  { title: "Generational Shift", desc: "40%+ of trade owners are millennials expecting mobile-first, voice-driven tools", icon: Smartphone },
  { title: "Late Payment Crisis", desc: "50,000 SMBs close annually from late payments — digital invoicing is now survival", icon: Clock },
  { title: "Post-COVID Permanence", desc: "Trades are only 35% digitised — the largest remaining vertical to convert", icon: TrendingUp },
  { title: "Labour Shortage", desc: "350K unfilled trade roles in the UK — every admin hour is a billing hour lost", icon: Users },
  { title: "Embedded Finance", desc: "Stripe Connect & open banking make 2.9% platform fees trivial to implement", icon: DollarSign },
];

const COMPETITORS = [
  { name: "Jobber", region: "NA", arr: "~€200M", price: "€39+/mo", hasAI: false, hasPayments: false, hasPhotoQuote: false, hasVoice: false },
  { name: "ServiceTitan", region: "NA", arr: "~€500M", price: "€10K+/yr", hasAI: false, hasPayments: true, hasPhotoQuote: false, hasVoice: false },
  { name: "Tradify", region: "ANZ/UK", arr: "~€26M", price: "€30/user", hasAI: false, hasPayments: false, hasPhotoQuote: false, hasVoice: false },
  { name: "Fergus", region: "ANZ/UK", arr: "~€13M", price: "€40/user", hasAI: false, hasPayments: false, hasPhotoQuote: false, hasVoice: false },
  { name: "Foreman", region: "Global", arr: "Pre-rev", price: "€19+/mo", hasAI: true, hasPayments: true, hasPhotoQuote: true, hasVoice: true },
];

const GEOGRAPHIC = [
  { region: "UK & Ireland", flag: "🇬🇧🇮🇪", businesses: "350K", status: "Launch" },
  { region: "Australia & NZ", flag: "🇦🇺🇳🇿", businesses: "200K", status: "Month 3" },
  { region: "North America", flag: "🇺🇸🇨🇦", businesses: "4M+", status: "Month 6" },
  { region: "Western Europe", flag: "🇩🇪🇫🇷🇳🇱", businesses: "500K+", status: "Year 2" },
];

export default function InvestorMarket() {
  return (
    <InvestorLayout title="Foreman — Market">
      {/* HERO */}
      <InvestorSection theme="dark" className="min-h-[80vh]">
        <div className="text-center">
          <FadeInOnScroll>
            <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-6">Total Addressable Market</p>
            <p className="text-7xl sm:text-8xl md:text-[10rem] font-extrabold leading-none tracking-tight">
              €<AnimatedCounter end={18} className="text-white" />B
            </p>
            <p className="text-xl md:text-2xl text-white/50 mt-6 max-w-xl mx-auto">
              The last major vertical to digitise.<br />11M+ trade businesses. 65% still on pen & paper.
            </p>
          </FadeInOnScroll>
        </div>
      </InvestorSection>

      {/* TAM / SAM / SOM concentric */}
      <InvestorSection theme="light">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Market Sizing</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-16">TAM → SAM → SOM</h2>
        </FadeInOnScroll>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
          {TAM_SAM_SOM.map((item, i) => (
            <FadeInOnScroll key={item.label} delay={i * 200}>
              <div className={`${item.size} rounded-full border-2 border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-center p-4 hover:border-primary/40 transition-colors`}>
                <p className="text-xs font-bold text-primary tracking-widest uppercase">{item.label}</p>
                <p className="text-3xl md:text-4xl font-extrabold text-foreground mt-1">
                  €{item.label === "SOM" ? <AnimatedCounter end={item.value} suffix={item.suffix} /> : <AnimatedCounter end={item.value} suffix={item.suffix} />}
                </p>
                <p className="text-xs text-muted-foreground mt-2 max-w-[80%]">{item.desc}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </InvestorSection>

      {/* WHY NOW */}
      <InvestorSection theme="dark">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Timing</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-16">Six converging tailwinds</h2>
        </FadeInOnScroll>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MARKET_DRIVERS.map((item, i) => (
            <FadeInOnScroll key={item.title} delay={i * 100}>
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

      {/* COMPETITORS */}
      <InvestorSection theme="light">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Competitive Landscape</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Nobody has built this<br /><span className="text-primary">with AI at the core</span>
          </h2>
          <p className="text-muted-foreground mb-12 max-w-xl">
            Existing players track work. Foreman runs the business.
          </p>
        </FadeInOnScroll>
        <FadeInOnScroll delay={200}>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left py-4 px-5 font-semibold text-foreground">Platform</th>
                  <th className="text-center py-4 px-3 font-semibold text-foreground">Region</th>
                  <th className="text-center py-4 px-3 font-semibold text-foreground">Price</th>
                  <th className="text-center py-4 px-3 font-semibold text-foreground">AI Agent</th>
                  <th className="text-center py-4 px-3 font-semibold text-foreground">Payments</th>
                  <th className="text-center py-4 px-3 font-semibold text-foreground">Photo Quote</th>
                  <th className="text-center py-4 px-3 font-semibold text-foreground">Voice AI</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr
                    key={c.name}
                    className={`border-t border-border ${c.name === "Foreman" ? "bg-primary/5 font-semibold" : ""}`}
                  >
                    <td className="py-3.5 px-5 font-medium text-foreground">{c.name}</td>
                    <td className="text-center py-3.5 px-3 text-muted-foreground">{c.region}</td>
                    <td className="text-center py-3.5 px-3 text-muted-foreground">{c.price}</td>
                    <td className="text-center py-3.5 px-3">{c.hasAI ? <CheckCircle2 className="h-5 w-5 text-primary mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />}</td>
                    <td className="text-center py-3.5 px-3">{c.hasPayments ? <CheckCircle2 className="h-5 w-5 text-primary mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />}</td>
                    <td className="text-center py-3.5 px-3">{c.hasPhotoQuote ? <CheckCircle2 className="h-5 w-5 text-primary mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />}</td>
                    <td className="text-center py-3.5 px-3">{c.hasVoice ? <CheckCircle2 className="h-5 w-5 text-primary mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeInOnScroll>
      </InvestorSection>

      {/* GEOGRAPHIC EXPANSION */}
      <InvestorSection theme="dark" className="min-h-0 py-20">
        <FadeInOnScroll>
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-3">Expansion</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Geographic Rollout</h2>
        </FadeInOnScroll>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GEOGRAPHIC.map((g, i) => (
            <FadeInOnScroll key={g.region} delay={i * 100}>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-3xl mb-2">{g.flag}</p>
                <p className="font-bold text-white">{g.region}</p>
                <p className="text-2xl font-extrabold text-primary mt-2">{g.businesses}</p>
                <p className="text-xs text-white/40 mt-1">{g.status}</p>
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
            { to: "/investor/product", label: "Product", sub: "Features & technology" },
            { to: "/investor/team", label: "Team", sub: "Founders & hiring plan" },
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
