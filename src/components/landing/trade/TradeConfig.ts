import {
  Droplets,
  Plug,
  Wind,
  Hammer,
} from "lucide-react";

export interface TradeConfig {
  slug: string;
  name: string;
  plural: string;
  icon: React.ElementType;
  heroHeadline: string;
  heroSub: string;
  painPoints: { emoji: string; pain: string; cost: string }[];
  quoteExample: string;
  seoTitle: string;
  seoDescription: string;
  objections: { objection: string; response: string }[];
  segments: { label: string; hook: string }[];
  switchReasons: { from: string; reason: string }[];
  emotionalValue: string[];
  financialValue: string[];
}

export const TRADES: Record<string, TradeConfig> = {
  plumbers: {
    slug: "plumbers",
    name: "Plumber",
    plural: "Plumbers",
    icon: Droplets,
    heroHeadline: "Your AI Office Manager. Built for Plumbers.",
    heroSub:
      "Stop spending evenings doing admin. Quotr handles quotes, invoices, scheduling, GPS tracking & payment chasing — so you can focus on the work that pays.",
    painPoints: [
      { emoji: "💸", pain: "Chasing invoice payments for weeks", cost: "Average 42-day payment cycle" },
      { emoji: "📝", pain: "Quoting jobs on the back of a napkin", cost: "Losing 20–30% of quotes to slow turnaround" },
      { emoji: "🗓️", pain: "No visibility on which jobs are where", cost: "Double-bookings and missed appointments" },
      { emoji: "🌙", pain: "Doing admin every evening instead of resting", cost: "8+ hours/week lost to paperwork" },
    ],
    quoteExample: "Quote Mrs. O'Brien — boiler service & flush",
    seoTitle: "Quotr for Plumbers — AI-Powered Quoting, Invoicing & Job Management",
    seoDescription:
      "Quotr is the AI office manager for plumbing businesses. Voice-powered quoting, automated invoicing, GPS time tracking, and payment chasing. Free 30-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Just talk to Foreman AI — say 'Quote the Murphy boiler service' and it's done. No training needed." },
      { objection: "My lads won't use it", response: "GPS clock-in is one tap. Voice quoting works on-site, even in gloves. Zero typing required." },
      { objection: "It's another monthly cost", response: "We take 2.5% only when you get paid. No payment, no fee. Your cost is aligned with your cash flow." },
      { objection: "I've tried software before", response: "Those were digital forms — you still did the admin. Quotr's AI does it for you." },
    ],
    segments: [
      { label: "Solo plumber", hook: "Quote from the van, get paid the same day." },
      { label: "2–5 person crew", hook: "One app your whole team actually uses." },
      { label: "6–20 staff firm", hook: "GPS tracking and job costing without the enterprise price tag." },
    ],
    switchReasons: [
      { from: "Spreadsheets", reason: "I'm losing money I can't even see." },
      { from: "Tradify", reason: "Too many clicks — my lads won't use it." },
      { from: "Xero alone", reason: "It does invoices but nothing else." },
    ],
    emotionalValue: ["Got my Sundays back", "I look professional now", "My partner isn't doing the books anymore"],
    financialValue: ["8hrs/week admin saved", "Quote conversion up 25%", "Avoid €30K/yr office hire"],
  },
  electricians: {
    slug: "electricians",
    name: "Electrician",
    plural: "Electricians",
    icon: Plug,
    heroHeadline: "Your AI Office Manager. Built for Electricians.",
    heroSub:
      "Professional quotes from trade templates, automated invoicing, GPS crew tracking, and an AI assistant that understands electrical terminology — all without hiring office staff.",
    painPoints: [
      { emoji: "📋", pain: "Writing out EICR and test certificates by hand", cost: "Hours lost per certification" },
      { emoji: "💰", pain: "Estimating jobs without consistent pricing", cost: "Underquoting eats your margin" },
      { emoji: "📍", pain: "No visibility on which apprentice is at which site", cost: "Wasted travel and idle time" },
      { emoji: "🧾", pain: "Forgetting to invoice completed rewiring jobs", cost: "Thousands left on the table" },
    ],
    quoteExample: "Quote the McCarthy house for a full rewire — 3 bed semi",
    seoTitle: "Quotr for Electricians — AI Quoting, Certs & Job Management",
    seoDescription:
      "Quotr is the AI office manager for electrical businesses. Voice-powered quoting, automated invoicing, GPS tracking, and trade templates. Free 30-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Say 'Quote the McCarthy rewire, 3-bed semi' — Foreman AI builds it using your templates. Zero learning curve." },
      { objection: "My apprentices won't use it", response: "One-tap GPS clock-in. They're already on their phones — this is simpler than WhatsApp." },
      { objection: "It's another monthly cost", response: "2.5% only when you collect payment. We earn when you earn." },
      { objection: "I've tried software before", response: "Those tools made you fill in forms. Quotr's AI fills them for you." },
    ],
    segments: [
      { label: "Solo spark", hook: "Professional quotes in 60 seconds, straight from site." },
      { label: "2–5 person crew", hook: "Know where every apprentice is. Invoice every job." },
      { label: "6–20 staff firm", hook: "Job costing, GPS tracking, and Xero sync — without the enterprise price." },
    ],
    switchReasons: [
      { from: "Paper & WhatsApp", reason: "I forgot to invoice a £2K rewire last month." },
      { from: "Jobber", reason: "It doesn't understand electrical work." },
      { from: "ServiceM8", reason: "Too complex for what I need." },
    ],
    emotionalValue: ["I look like a proper business now", "My evenings are mine again", "I know my numbers"],
    financialValue: ["Never miss an invoice again", "Margin visibility on every job", "Save 8hrs/week on admin"],
  },
  hvac: {
    slug: "hvac",
    name: "HVAC Technician",
    plural: "HVAC Technicians",
    icon: Wind,
    heroHeadline: "Your AI Office Manager. Built for HVAC.",
    heroSub:
      "Quote heating & cooling jobs on-site, schedule service calls, track your crew with GPS, and let AI handle the admin — from the van or the office.",
    painPoints: [
      { emoji: "🔢", pain: "Manually calculating estimates for every job", cost: "Slow quotes lose the customer" },
      { emoji: "🚨", pain: "Juggling emergency call-outs with scheduled maintenance", cost: "Double-bookings and angry clients" },
      { emoji: "⏱️", pain: "Crew forgetting to log travel time between sites", cost: "Unbilled hours every week" },
      { emoji: "📊", pain: "No clear view of recurring service contract revenue", cost: "Can't plan or forecast growth" },
    ],
    quoteExample: "Quote the Brennan office — AC unit replacement",
    seoTitle: "Quotr for HVAC — AI Scheduling, Quoting & Job Management",
    seoDescription:
      "HVAC businesses use Quotr to schedule service calls, create AI-powered quotes, invoice customers, and track crew time. Free 30-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Tell Foreman AI what you need — it creates the quote. Voice or text, your choice." },
      { objection: "My techs won't use it", response: "GPS clock-in is automatic when they arrive on-site. Nothing to remember." },
      { objection: "It's another monthly cost", response: "2.5% on payments collected. We literally only cost you money when you're making money." },
      { objection: "I've tried software before", response: "Other tools are digital clipboards. Quotr is an AI employee that costs less than a day's labour per month." },
    ],
    segments: [
      { label: "Solo technician", hook: "Quote and invoice from the van, hands-free." },
      { label: "2–5 person team", hook: "Schedule call-outs and track every technician." },
      { label: "6–20 staff operation", hook: "Recurring contract management and real-time job costing." },
    ],
    switchReasons: [
      { from: "Spreadsheets", reason: "I have no idea what my margins are." },
      { from: "Tradify", reason: "Too many screens to do a simple quote." },
      { from: "ServiceM8", reason: "Overkill for my size." },
    ],
    emotionalValue: ["I can see my whole business in one place", "My weekends are free", "Clients think I'm a bigger operation"],
    financialValue: ["Capture every billable hour", "Recurring revenue visibility", "Quote 4x faster"],
  },
  builders: {
    slug: "builders",
    name: "Builder",
    plural: "Builders & General Contractors",
    icon: Hammer,
    heroHeadline: "Your AI Office Manager. Built for Builders.",
    heroSub:
      "From first-fix to final invoice — manage jobs, subcontractors, quotes, expenses, and client communication in one place. No office staff required.",
    painPoints: [
      { emoji: "📑", pain: "Tracking costs across multiple active sites", cost: "Margin leaks you can't see" },
      { emoji: "👷", pain: "Coordinating subcontractors without a shared schedule", cost: "Delays and finger-pointing" },
      { emoji: "🌙", pain: "Spending Sunday nights doing invoices and VAT returns", cost: "Burnout and family tension" },
      { emoji: "📱", pain: "Clients asking for updates you can't easily give", cost: "Lost trust and repeat business" },
    ],
    quoteExample: "Quote the Dalton extension — groundworks and blockwork phase",
    seoTitle: "Quotr for Builders — AI Job Management, Quotes & Team Tracking",
    seoDescription:
      "Quotr is the AI office manager for builders and general contractors. Voice quoting, GPS crew tracking, job costing, and automated invoicing. Free 30-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Voice-first: say 'Quote the Dalton extension, groundworks phase' and Foreman AI handles it." },
      { objection: "My subbies won't use it", response: "One-tap clock-in with GPS. Simpler than signing a site sheet." },
      { objection: "It's another monthly cost", response: "2.5% on collected payments. No payment, no fee — we're aligned with your cash flow." },
      { objection: "I've tried software before", response: "Those were admin tools. Quotr is an AI that runs your office for less than a labourer's day rate." },
    ],
    segments: [
      { label: "Solo builder", hook: "Professional quotes that win jobs, sent from the van." },
      { label: "2–5 person crew", hook: "One app for scheduling, quoting, and getting paid." },
      { label: "6–20 staff firm", hook: "Multi-site job costing, GPS tracking, and accounting sync." },
    ],
    switchReasons: [
      { from: "Paper notebooks", reason: "I quoted a job wrong last month — cost me £3K." },
      { from: "Jobber", reason: "Built for North American trades, doesn't fit how we work." },
      { from: "Xero + spreadsheets", reason: "I need job management, not just bookkeeping." },
    ],
    emotionalValue: ["I run a proper business now", "My Sundays are mine", "Clients take me seriously"],
    financialValue: ["See true margins per job", "Never miss an invoice", "Save 8hrs/week on admin"],
  },
};
