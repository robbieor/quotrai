import {
  Droplets,
  Plug,
  Wind,
  Hammer,
  Leaf,
  SprayCan,
  Bug,
  Waves,
  Droplet,
  Home,
  Paintbrush,
  Fence,
  Wrench,
  Key,
  Hand,
  Flame,
  TreePine,
  Sun,
  Car,
  DoorOpen,
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
      "Stop spending evenings doing admin. revamo handles quotes, invoices, scheduling, GPS tracking & payment chasing — so you can focus on the work that pays.",
    painPoints: [
      { emoji: "💸", pain: "Chasing invoice payments for weeks", cost: "Average 42-day payment cycle" },
      { emoji: "📝", pain: "Quoting jobs on the back of a napkin", cost: "Losing 20–30% of quotes to slow turnaround" },
      { emoji: "🗓️", pain: "No visibility on which jobs are where", cost: "Double-bookings and missed appointments" },
      { emoji: "🌙", pain: "Doing admin every evening instead of resting", cost: "8+ hours/week lost to paperwork" },
    ],
    quoteExample: "Quote Mrs. O'Brien — boiler service & flush",
    seoTitle: "revamo for Plumbers — AI-Powered Quoting, Invoicing & Job Management",
    seoDescription:
      "revamo is the AI office manager for plumbing businesses. Voice-powered quoting, automated invoicing, GPS time tracking, and payment chasing. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Just talk to revamo AI — say 'Quote the Murphy boiler service' and it's done. No training needed." },
      { objection: "My lads won't use it", response: "GPS clock-in is one tap. Voice quoting works on-site, even in gloves. Zero typing required." },
      { objection: "It's another monthly cost", response: "We take 1.5% only when you get paid. No payment, no fee. Your cost is aligned with your cash flow." },
      { objection: "I've tried software before", response: "Those were digital forms — you still did the admin. revamo's AI does it for you." },
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
    seoTitle: "revamo for Electricians — AI Quoting, Certs & Job Management",
    seoDescription:
      "revamo is the AI office manager for electrical businesses. Voice-powered quoting, automated invoicing, GPS tracking, and trade templates. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Say 'Quote the McCarthy rewire, 3-bed semi' — revamo AI builds it using your templates. Zero learning curve." },
      { objection: "My apprentices won't use it", response: "One-tap GPS clock-in. They're already on their phones — this is simpler than WhatsApp." },
      { objection: "It's another monthly cost", response: "1.5% only when you collect payment. We earn when you earn." },
      { objection: "I've tried software before", response: "Those tools made you fill in forms. revamo's AI fills them for you." },
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
    seoTitle: "revamo for HVAC — AI Scheduling, Quoting & Job Management",
    seoDescription:
      "HVAC businesses use revamo to schedule service calls, create AI-powered quotes, invoice customers, and track crew time. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Tell revamo AI what you need — it creates the quote. Voice or text, your choice." },
      { objection: "My techs won't use it", response: "GPS clock-in is automatic when they arrive on-site. Nothing to remember." },
      { objection: "It's another monthly cost", response: "1.5% on payments collected. We literally only cost you money when you're making money." },
      { objection: "I've tried software before", response: "Other tools are digital clipboards. revamo is an AI employee that costs less than a day's labour per month." },
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
      "From first-fix to final invoice — manage jobs, subcontractors, quotes, and client communication in one place. No office staff required.",
    painPoints: [
      { emoji: "📑", pain: "Tracking costs across multiple active sites", cost: "Margin leaks you can't see" },
      { emoji: "👷", pain: "Coordinating subcontractors without a shared schedule", cost: "Delays and finger-pointing" },
      { emoji: "🌙", pain: "Spending Sunday nights doing invoices and VAT returns", cost: "Burnout and family tension" },
      { emoji: "📱", pain: "Clients asking for updates you can't easily give", cost: "Lost trust and repeat business" },
    ],
    quoteExample: "Quote the Dalton extension — groundworks and blockwork phase",
    seoTitle: "revamo for Builders — AI Job Management, Quotes & Team Tracking",
    seoDescription:
      "revamo is the AI office manager for builders and general contractors. Voice quoting, GPS crew tracking, job costing, and automated invoicing. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Voice-first: say 'Quote the Dalton extension, groundworks phase' and revamo AI handles it." },
      { objection: "My subbies won't use it", response: "One-tap clock-in with GPS. Simpler than signing a site sheet." },
      { objection: "It's another monthly cost", response: "1.5% on collected payments. No payment, no fee — we're aligned with your cash flow." },
      { objection: "I've tried software before", response: "Those were admin tools. revamo is an AI that runs your office for less than a labourer's day rate." },
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
  cleaning: {
    slug: "cleaning",
    name: "Cleaning Professional",
    plural: "Cleaning Services",
    icon: SprayCan,
    heroHeadline: "Your AI Office Manager. Built for Cleaning Businesses.",
    heroSub:
      "Schedule recurring cleans, quote new clients on the spot, track your team across multiple sites, and get paid faster — without the admin headache.",
    painPoints: [
      { emoji: "🔄", pain: "Managing dozens of recurring appointments manually", cost: "Missed cleans = lost clients" },
      { emoji: "💬", pain: "Back-and-forth texts to confirm bookings", cost: "Hours wasted on scheduling admin" },
      { emoji: "💸", pain: "Clients paying late or 'forgetting'", cost: "Cash flow gaps every month" },
      { emoji: "📋", pain: "No system to track which team is at which property", cost: "No accountability, no proof of service" },
    ],
    quoteExample: "Quote Mrs. Sullivan — weekly 3-bed house clean",
    seoTitle: "revamo for Cleaning Businesses — AI Scheduling, Quoting & Invoicing",
    seoDescription:
      "Cleaning businesses use revamo to schedule jobs, create instant quotes, invoice clients, and track team locations. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Say 'Quote a weekly clean for the Sullivan house' — done. Voice-first, zero training." },
      { objection: "My cleaners won't use it", response: "One-tap GPS clock-in when they arrive. Simpler than a timesheet." },
      { objection: "It's another monthly cost", response: "1.5% only when you get paid. No upfront fees, no risk." },
      { objection: "I've tried software before", response: "Those were booking tools. revamo quotes, invoices, chases payments, and tracks your team — all in one." },
    ],
    segments: [
      { label: "Solo cleaner", hook: "Look professional. Get paid on time. Every time." },
      { label: "2–5 person team", hook: "Schedule, track, and invoice across multiple properties." },
      { label: "6–20 staff operation", hook: "Route optimisation, GPS tracking, and recurring revenue visibility." },
    ],
    switchReasons: [
      { from: "WhatsApp & notebooks", reason: "I double-booked two clients last week." },
      { from: "Launch27", reason: "Too expensive for what it does." },
      { from: "Google Calendar", reason: "It doesn't invoice or chase payments." },
    ],
    emotionalValue: ["Clients see me as a proper business", "I stopped chasing payments", "My schedule runs itself"],
    financialValue: ["Zero missed appointments", "Get paid 60% faster", "Save 6hrs/week on admin"],
  },
  landscaping: {
    slug: "landscaping",
    name: "Landscaper",
    plural: "Landscapers",
    icon: Leaf,
    heroHeadline: "Your AI Office Manager. Built for Landscapers.",
    heroSub:
      "Quote garden jobs on-site, schedule your crew, track materials costs, and invoice clients before you leave the property — all by voice.",
    painPoints: [
      { emoji: "🌧️", pain: "Weather delays wrecking your schedule", cost: "Rescheduling costs time and trust" },
      { emoji: "🧮", pain: "Estimating materials for every garden differently", cost: "Underquoting kills your margins" },
      { emoji: "🚜", pain: "Crew on multiple sites with no visibility", cost: "Wasted fuel and idle time" },
      { emoji: "📱", pain: "Clients texting for updates constantly", cost: "Distracted from the actual work" },
    ],
    quoteExample: "Quote the Henderson garden — patio laying and new turf",
    seoTitle: "revamo for Landscapers — AI Quoting, Scheduling & Job Management",
    seoDescription:
      "Landscaping businesses use revamo to create instant quotes, schedule crews, track materials, and invoice clients. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Voice quoting from the garden — say what you need, revamo AI builds the quote." },
      { objection: "My lads won't use it", response: "GPS clock-in on arrival. One tap, done. Works in work gloves." },
      { objection: "It's another monthly cost", response: "1.5% on collected payments. You only pay when your client pays." },
      { objection: "I've tried software before", response: "This isn't another form to fill in. It's an AI that does your office work." },
    ],
    segments: [
      { label: "Solo landscaper", hook: "Professional quotes that win bigger contracts." },
      { label: "2–5 person crew", hook: "Track every job, every crew member, every cost." },
      { label: "6–20 staff operation", hook: "Multi-site scheduling, job costing, and accounting sync." },
    ],
    switchReasons: [
      { from: "Paper quotes", reason: "Takes me an hour to write up what I could say in 30 seconds." },
      { from: "Jobber", reason: "Too North American — pricing doesn't work for UK/IE." },
      { from: "Spreadsheets", reason: "I can't see my margins on any job." },
    ],
    emotionalValue: ["I win more contracts now", "Admin is done before I leave site", "My wife isn't doing invoices anymore"],
    financialValue: ["Quote 5x faster on-site", "True cost visibility per job", "Save 8hrs/week on paperwork"],
  },
  "pest-control": {
    slug: "pest-control",
    name: "Pest Control Technician",
    plural: "Pest Control Operators",
    icon: Bug,
    heroHeadline: "Your AI Office Manager. Built for Pest Control.",
    heroSub:
      "Schedule call-outs, quote treatments on-site, track recurring service contracts, and get paid faster — without the office overhead.",
    painPoints: [
      { emoji: "📞", pain: "Emergency calls disrupting your planned route", cost: "Lost efficiency and frustrated clients" },
      { emoji: "🔁", pain: "Tracking recurring treatment schedules manually", cost: "Missed visits = lost contracts" },
      { emoji: "🧾", pain: "Invoicing after the fact instead of on-site", cost: "30+ day payment delays" },
      { emoji: "📍", pain: "No proof of attendance for commercial contracts", cost: "Disputes and lost renewals" },
    ],
    quoteExample: "Quote the O'Reilly restaurant — rodent treatment programme",
    seoTitle: "revamo for Pest Control — AI Scheduling, Quoting & Route Management",
    seoDescription:
      "Pest control businesses use revamo to schedule treatments, create instant quotes, manage recurring contracts, and track technician routes. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Say 'Quote a rodent treatment for O'Reilly's' — revamo AI handles the rest." },
      { objection: "My techs won't use it", response: "GPS clock-in on arrival. Automatic proof of service for every visit." },
      { objection: "It's another monthly cost", response: "1.5% on payments collected. Zero risk — we only cost you money when you're earning." },
      { objection: "I've tried software before", response: "Generic field service tools don't handle recurring contracts well. revamo does." },
    ],
    segments: [
      { label: "Solo operator", hook: "Professional quotes and invoices from the van." },
      { label: "2–5 person team", hook: "Route planning, GPS tracking, and automated reminders." },
      { label: "6–20 staff operation", hook: "Recurring contract management and commercial compliance." },
    ],
    switchReasons: [
      { from: "Paper & phone", reason: "I missed a quarterly treatment and lost the contract." },
      { from: "Generic CRM", reason: "It doesn't understand recurring service schedules." },
      { from: "Spreadsheets", reason: "I can't see which contracts are profitable." },
    ],
    emotionalValue: ["Clients trust me more with GPS proof", "My schedule runs itself", "I look like a bigger operation"],
    financialValue: ["Never miss a recurring visit", "Invoice on-site, get paid faster", "Save 6hrs/week on admin"],
  },
  "pool-spa": {
    slug: "pool-spa",
    name: "Pool & Spa Technician",
    plural: "Pool & Spa Services",
    icon: Waves,
    heroHeadline: "Your AI Office Manager. Built for Pool & Spa.",
    heroSub:
      "Manage recurring maintenance routes, quote repairs on-site, track chemical usage, and invoice clients automatically — all from your phone.",
    painPoints: [
      { emoji: "🔄", pain: "Managing weekly maintenance routes across dozens of pools", cost: "Missed visits and unhappy clients" },
      { emoji: "🧪", pain: "No system to log chemical readings and treatments", cost: "Compliance risk and liability" },
      { emoji: "💧", pain: "Quoting repairs while standing poolside", cost: "Slow quotes lose the job to a competitor" },
      { emoji: "💰", pain: "Seasonal cash flow swings", cost: "Hard to plan hiring and growth" },
    ],
    quoteExample: "Quote the Walsh pool — pump replacement and acid wash",
    seoTitle: "revamo for Pool & Spa — AI Route Management, Quoting & Invoicing",
    seoDescription:
      "Pool and spa businesses use revamo to manage maintenance routes, create instant quotes, track chemical logs, and invoice clients. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Voice-first: say 'Quote the Walsh pool pump replacement' and it's built in seconds." },
      { objection: "My techs won't use it", response: "GPS clock-in at each pool. One tap per visit — faster than a clipboard." },
      { objection: "It's another monthly cost", response: "1.5% on collected payments only. In the off-season, you pay nothing." },
      { objection: "I've tried software before", response: "Pool software focuses on logs. revamo handles the whole business — quotes, jobs, invoices, payments." },
    ],
    segments: [
      { label: "Solo tech", hook: "Professional service, zero office overhead." },
      { label: "2–5 person team", hook: "Optimised routes and GPS tracking for every tech." },
      { label: "6–20 staff operation", hook: "Recurring revenue management and seasonal forecasting." },
    ],
    switchReasons: [
      { from: "Pool Brain", reason: "Great for logs, useless for invoicing." },
      { from: "Spreadsheets", reason: "I can't tell which routes are profitable." },
      { from: "Skimmer", reason: "It doesn't handle quotes or job management." },
    ],
    emotionalValue: ["My routes are optimised", "Clients get automatic visit confirmations", "I know my numbers"],
    financialValue: ["Capture every billable visit", "Quote repairs 4x faster", "Save 6hrs/week on admin"],
  },
  "pressure-washing": {
    slug: "pressure-washing",
    name: "Pressure Washing Pro",
    plural: "Pressure Washing Services",
    icon: Droplet,
    heroHeadline: "Your AI Office Manager. Built for Pressure Washing.",
    heroSub:
      "Quote driveways and commercial cleans on-site, schedule your week, track jobs with GPS, and invoice before you pack up the hose.",
    painPoints: [
      { emoji: "📐", pain: "Estimating square footage and pricing on the spot", cost: "Underquoting loses you money" },
      { emoji: "📅", pain: "Juggling one-off jobs with recurring commercial contracts", cost: "Double-bookings and missed slots" },
      { emoji: "📸", pain: "No before/after proof for clients", cost: "Disputes and slow payments" },
      { emoji: "🧾", pain: "Invoicing days after the job is done", cost: "Clients forget and payment drags" },
    ],
    quoteExample: "Quote the Brennan driveway — block paving clean and seal",
    seoTitle: "revamo for Pressure Washing — AI Quoting, Scheduling & Invoicing",
    seoDescription:
      "Pressure washing businesses use revamo to create instant on-site quotes, schedule jobs, track crew locations, and invoice clients. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Voice quoting on-site — say the job, get the quote. Done in 30 seconds." },
      { objection: "It's another monthly cost", response: "1.5% on payments. No work, no cost. Simple." },
      { objection: "I work alone", response: "Perfect — revamo is your office manager without the salary." },
      { objection: "I've tried software before", response: "Those were scheduling tools. revamo handles the full job lifecycle — quote to payment." },
    ],
    segments: [
      { label: "Solo operator", hook: "Quote on-site, invoice before you leave." },
      { label: "2–5 person team", hook: "Schedule crews and track every job." },
      { label: "Growing operation", hook: "Recurring contracts, GPS tracking, and real margins." },
    ],
    switchReasons: [
      { from: "Texts and cash", reason: "I'm losing track of who owes what." },
      { from: "Jobber", reason: "Too expensive for a small operation." },
      { from: "Facebook messages", reason: "Not professional enough for commercial clients." },
    ],
    emotionalValue: ["Clients take me seriously now", "I get paid on the day", "Admin is done before I get home"],
    financialValue: ["Invoice on-site = 60% faster payment", "Never underquote again", "Save 5hrs/week"],
  },
  roofing: {
    slug: "roofing",
    name: "Roofer",
    plural: "Roofing Contractors",
    icon: Home,
    heroHeadline: "Your AI Office Manager. Built for Roofers.",
    heroSub:
      "Quote roof repairs from the ladder, schedule crews across sites, track materials costs, and chase payments — all without hiring office staff.",
    painPoints: [
      { emoji: "🪜", pain: "Writing quotes hours after the site visit", cost: "Customer's already got another quote" },
      { emoji: "🌧️", pain: "Weather delays wrecking your schedule", cost: "Rescheduling chaos every week" },
      { emoji: "📦", pain: "No visibility on materials costs per job", cost: "Margin surprises at the end" },
      { emoji: "💸", pain: "Insurance jobs with slow payment cycles", cost: "Cash flow gaps for months" },
    ],
    quoteExample: "Quote the Kelly bungalow — full re-felt and new ridge tiles",
    seoTitle: "revamo for Roofers — AI Quoting, Job Costing & Crew Management",
    seoDescription:
      "Roofing contractors use revamo to create instant quotes, manage crew schedules, track job costs, and automate invoicing. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Voice quote from the roof — 'Quote Kelly bungalow, re-felt and ridge tiles.' Done." },
      { objection: "My lads won't use it", response: "GPS clock-in, one tap. Works with gloves on." },
      { objection: "It's another monthly cost", response: "1.5% on collected payments. No work, no cost." },
      { objection: "I've tried software before", response: "Those were digital clipboards. revamo's AI does the admin for you." },
    ],
    segments: [
      { label: "Solo roofer", hook: "Professional quotes from the ladder, paid before you leave." },
      { label: "2–5 person crew", hook: "Multi-site scheduling and materials tracking." },
      { label: "6–20 staff firm", hook: "Job costing, GPS tracking, and accounting integration." },
    ],
    switchReasons: [
      { from: "Paper quotes", reason: "By the time I type it up, they've gone with someone else." },
      { from: "Fergus", reason: "Too clunky for roofing work." },
      { from: "Spreadsheets", reason: "I can't see my true cost per job." },
    ],
    emotionalValue: ["I win more jobs now", "No more Sunday night admin", "Clients respect the professionalism"],
    financialValue: ["Quote 5x faster", "True margins on every job", "Save 8hrs/week on admin"],
  },
  painting: {
    slug: "painting",
    name: "Painter & Decorator",
    plural: "Painters & Decorators",
    icon: Paintbrush,
    heroHeadline: "Your AI Office Manager. Built for Painters.",
    heroSub:
      "Quote painting jobs room by room, schedule your diary, and invoice clients — without spending your evenings on paperwork.",
    painPoints: [
      { emoji: "📐", pain: "Measuring rooms and calculating paint quantities", cost: "Over-ordering or running short" },
      { emoji: "🎨", pain: "Clients changing colour choices mid-job", cost: "Scope creep eats your margin" },
      { emoji: "📅", pain: "Back-to-back jobs with no buffer for overruns", cost: "Rushing or letting clients down" },
      { emoji: "🧾", pain: "Chasing final payments after snagging", cost: "Weeks of unpaid work" },
    ],
    quoteExample: "Quote the Davis house — 3 bedrooms, hallway and landing",
    seoTitle: "revamo for Painters — AI Quoting, Scheduling & Job Management",
    seoDescription:
      "Painters and decorators use revamo to create professional quotes, schedule jobs, track materials, and automate invoicing. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Say 'Quote the Davis house, 3 beds and hallway' — revamo AI does the rest." },
      { objection: "I work alone", response: "Even better — revamo is your office manager without the overhead." },
      { objection: "It's another monthly cost", response: "1.5% on payments collected. No jobs, no cost." },
      { objection: "I've tried software before", response: "Those tools made painting admin digital. revamo eliminates it." },
    ],
    segments: [
      { label: "Solo painter", hook: "Professional quotes that win you the job." },
      { label: "2–5 person crew", hook: "Schedule multiple sites and track your team." },
      { label: "Growing business", hook: "Job costing and accounting sync." },
    ],
    switchReasons: [
      { from: "Handwritten quotes", reason: "They don't look professional enough for high-end clients." },
      { from: "Word documents", reason: "Takes an hour to format each quote." },
      { from: "Xero alone", reason: "I need scheduling and job management too." },
    ],
    emotionalValue: ["I look like a premium decorator", "Evenings are free", "Clients pay on time now"],
    financialValue: ["Quote in 60 seconds", "Never miss an invoice", "Save 6hrs/week on admin"],
  },
  fencing: {
    slug: "fencing",
    name: "Fencing Contractor",
    plural: "Fencing Contractors",
    icon: Fence,
    heroHeadline: "Your AI Office Manager. Built for Fencing Contractors.",
    heroSub:
      "Quote fencing jobs by the metre, schedule installations, track materials, and invoice on completion — all from your phone.",
    painPoints: [
      { emoji: "📏", pain: "Measuring and pricing linear metres on every job", cost: "Manual calculations waste time and cause errors" },
      { emoji: "📦", pain: "Ordering materials without knowing true costs", cost: "Margin surprises on every job" },
      { emoji: "🌧️", pain: "Weather delays with no easy reschedule tool", cost: "Client frustration and lost trust" },
      { emoji: "💸", pain: "Deposit taken but final invoice delayed", cost: "Cash flow gaps between jobs" },
    ],
    quoteExample: "Quote the Murphy garden — 30m close-board fence with gate",
    seoTitle: "revamo for Fencing Contractors — AI Quoting & Job Management",
    seoDescription:
      "Fencing contractors use revamo to quote by the metre, manage schedules, track materials costs, and automate invoicing. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Voice quote on-site: 'Quote 30 metres close-board with gate.' Sorted." },
      { objection: "It's another monthly cost", response: "1.5% on what you collect. No jobs, zero cost." },
      { objection: "I work alone", response: "That's who revamo is built for — solo operators who need an office in their pocket." },
      { objection: "I've tried software before", response: "revamo isn't forms. It's an AI that handles your admin." },
    ],
    segments: [
      { label: "Solo fencer", hook: "Quote on-site, invoice on completion." },
      { label: "2–5 person team", hook: "Schedule crews and track costs per job." },
      { label: "Growing operation", hook: "Multi-site management and accounting sync." },
    ],
    switchReasons: [
      { from: "Paper quotes", reason: "I'm losing jobs to faster competitors." },
      { from: "Spreadsheets", reason: "I don't know my real margins." },
      { from: "Generic tools", reason: "They don't handle per-metre pricing." },
    ],
    emotionalValue: ["I win more quotes now", "Admin is done on-site", "I look professional"],
    financialValue: ["Quote 4x faster", "Track materials cost per job", "Save 5hrs/week"],
  },
  "appliance-repair": {
    slug: "appliance-repair",
    name: "Appliance Repair Tech",
    plural: "Appliance Repair Services",
    icon: Wrench,
    heroHeadline: "Your AI Office Manager. Built for Appliance Repair.",
    heroSub:
      "Diagnose, quote, and invoice from the customer's kitchen. Track parts, schedule call-outs, and get paid before you leave.",
    painPoints: [
      { emoji: "📞", pain: "Constant phone calls for booking and follow-ups", cost: "Can't focus on the repair" },
      { emoji: "🔧", pain: "No system to track parts used per repair", cost: "Margin blind spots" },
      { emoji: "🏠", pain: "Driving across town for a job that takes 10 minutes", cost: "Wasted fuel and time" },
      { emoji: "💳", pain: "Clients wanting to pay 'later'", cost: "Chasing payments for weeks" },
    ],
    quoteExample: "Quote the Ryan house — washing machine drum bearing replacement",
    seoTitle: "revamo for Appliance Repair — AI Quoting, Scheduling & Invoicing",
    seoDescription:
      "Appliance repair businesses use revamo to create instant diagnostic quotes, schedule call-outs, track parts, and invoice on-site. Free 14-day trial.",
    objections: [
      { objection: "I don't have time to learn new software", response: "Say 'Quote bearing replacement for Ryan washing machine.' revamo AI handles it." },
      { objection: "It's another monthly cost", response: "1.5% on payments. No call-outs, no cost." },
      { objection: "I work alone", response: "revamo replaces the office you can't afford." },
      { objection: "I've tried software before", response: "This one talks back. Literally." },
    ],
    segments: [
      { label: "Solo tech", hook: "Quote and invoice on the doorstep." },
      { label: "2–5 person team", hook: "Dispatch and track multiple call-outs." },
      { label: "Growing business", hook: "Parts tracking, job costing, and recurring service plans." },
    ],
    switchReasons: [
      { from: "Phone and notebook", reason: "I forget to invoice half my call-outs." },
      { from: "Generic CRM", reason: "Not built for mobile service work." },
      { from: "Spreadsheets", reason: "I can't track parts costs per job." },
    ],
    emotionalValue: ["I get paid on the spot now", "No more chasing invoices", "I run a proper business"],
    financialValue: ["Invoice on-site = same-day payment", "Track parts cost per repair", "Save 5hrs/week"],
  },
  locksmith: {
    slug: "locksmith",
    name: "Locksmith",
    plural: "Locksmiths",
    icon: Key,
    heroHeadline: "Your AI Office Manager. Built for Locksmiths.",
    heroSub:
      "Quote emergency call-outs on arrival, invoice before you leave, and manage your diary — all from your phone, even at 2am.",
    painPoints: [
      { emoji: "🚨", pain: "Emergency calls at all hours with no scheduling system", cost: "Burnout and missed opportunities" },
      { emoji: "💷", pain: "Cash jobs with no paper trail", cost: "Tax headaches and no business visibility" },
      { emoji: "📍", pain: "Driving to jobs without route optimisation", cost: "Wasted fuel and time between call-outs" },
      { emoji: "🧾", pain: "No professional quotes for commercial contracts", cost: "Losing bigger jobs to competitors" },
    ],
    quoteExample: "Quote the Byrne house — emergency lock change, front and back doors",
    seoTitle: "revamo for Locksmiths — AI Quoting, Emergency Scheduling & Invoicing",
    seoDescription:
      "Locksmiths use revamo to quote on arrival, schedule emergency call-outs, track jobs, and invoice on-site. Free 14-day trial.",
    objections: [
      { objection: "Most of my work is cash", response: "That's fine — log every job for tax records and business visibility. Know your real numbers." },
      { objection: "I don't have time to learn new software", response: "Say 'Quote lock change, front and back doors.' Done before the kettle boils." },
      { objection: "It's another monthly cost", response: "1.5% on card payments only. Cash jobs cost you nothing." },
      { objection: "I've tried software before", response: "At 2am on a call-out, you need voice commands, not forms." },
    ],
    segments: [
      { label: "Solo locksmith", hook: "Professional quotes and invoices, even on emergency calls." },
      { label: "2–5 person team", hook: "Dispatch the nearest available tech automatically." },
      { label: "Commercial locksmith", hook: "Win maintenance contracts with professional documentation." },
    ],
    switchReasons: [
      { from: "Notebook and cash", reason: "I have no idea what I actually earned last month." },
      { from: "Phone calendar", reason: "It doesn't track revenue or costs." },
      { from: "Generic invoicing app", reason: "I need scheduling and job management too." },
    ],
    emotionalValue: ["I know my real revenue now", "Professional image for commercial clients", "Less stress on emergency calls"],
    financialValue: ["Track every job for tax purposes", "Win more commercial contracts", "Save 4hrs/week on admin"],
  },
  handyman: {
    slug: "handyman",
    name: "Handyman",
    plural: "Handymen & Property Services",
    icon: Hand,
    heroHeadline: "Your AI Office Manager. Built for Handymen.",
    heroSub:
      "You do a bit of everything — your software should too. Quote, schedule, invoice, and track jobs across every type of work you do.",
    painPoints: [
      { emoji: "🔨", pain: "Quoting wildly different jobs every day", cost: "No consistent pricing = inconsistent margins" },
      { emoji: "📅", pain: "Juggling multiple small jobs across town", cost: "Wasted travel time between jobs" },
      { emoji: "💸", pain: "Clients saying 'I'll pay you next week'", cost: "Unpaid invoices stacking up" },
      { emoji: "📱", pain: "Managing everything through texts and calls", cost: "No record of what was agreed" },
    ],
    quoteExample: "Quote the Murray house — shelf installation, tap repair, and door hanging",
    seoTitle: "revamo for Handymen — AI Quoting, Scheduling & Invoicing",
    seoDescription:
      "Handymen use revamo to create multi-task quotes, schedule jobs, and invoice clients automatically. Free 14-day trial.",
    objections: [
      { objection: "My jobs are all different", response: "That's revamo's strength — voice-quote any type of work. No templates needed." },
      { objection: "I don't have time to learn new software", response: "Say 'Quote shelves, tap, and door for Murray.' revamo AI builds a multi-line quote." },
      { objection: "It's another monthly cost", response: "1.5% on payments collected. Small jobs, small fees." },
      { objection: "I'm not a tech person", response: "If you can talk, you can use revamo. That's the whole point." },
    ],
    segments: [
      { label: "Solo handyman", hook: "Quote anything, invoice everything." },
      { label: "2–5 person team", hook: "Dispatch the right person to the right job." },
      { label: "Property maintenance", hook: "Recurring contracts, multiple properties, one system." },
    ],
    switchReasons: [
      { from: "Texts and WhatsApp", reason: "No record of what I quoted or when I'm booked." },
      { from: "Jobber", reason: "Too heavy for a handyman operation." },
      { from: "Paper invoices", reason: "They're unprofessional and easy to ignore." },
    ],
    emotionalValue: ["I look like a real business", "Clients pay faster", "No more forgotten quotes"],
    financialValue: ["Invoice on-site, get paid same day", "Track revenue across all job types", "Save 5hrs/week"],
  },
  restoration: {
    slug: "restoration",
    name: "Restoration Specialist",
    plural: "Restoration & Remediation",
    icon: Flame,
    heroHeadline: "Your AI Office Manager. Built for Restoration.",
    heroSub:
      "Document damage, quote remediation work, track crew deployment, and invoice insurance companies — all from the field.",
    painPoints: [
      { emoji: "🚨", pain: "Emergency response with no dispatch system", cost: "Delayed response loses the contract" },
      { emoji: "📋", pain: "Extensive documentation requirements for insurance", cost: "Hours of paperwork per claim" },
      { emoji: "👷", pain: "Coordinating multiple trades on one restoration", cost: "Scheduling conflicts and delays" },
      { emoji: "💰", pain: "Insurance companies paying 60-90 days late", cost: "Severe cash flow pressure" },
    ],
    quoteExample: "Quote the Collins property — water damage restoration, ground floor",
    seoTitle: "revamo for Restoration — AI Documentation, Quoting & Project Management",
    seoDescription:
      "Restoration and remediation businesses use revamo to document damage, create detailed quotes, manage crews, and invoice insurers. Free 14-day trial.",
    objections: [
      { objection: "I need detailed scope documents", response: "revamo AI builds itemised quotes with labour/materials split — ready for the loss adjuster." },
      { objection: "My crews are on multiple sites", response: "GPS tracking shows who's where, in real time." },
      { objection: "It's another monthly cost", response: "1.5% on collected payments. During quiet months, you pay nothing." },
      { objection: "Insurance billing is complex", response: "Detailed line items, PDF invoices, and payment tracking — built for the process." },
    ],
    segments: [
      { label: "Solo operator", hook: "Document and quote from the affected property." },
      { label: "2–5 person team", hook: "Multi-trade coordination on every restoration." },
      { label: "6–20 staff firm", hook: "Insurance billing, project costing, and compliance docs." },
    ],
    switchReasons: [
      { from: "Xactimate only", reason: "I need job management, not just estimating." },
      { from: "Spreadsheets", reason: "Can't track multiple open restorations." },
      { from: "Generic PM tools", reason: "They don't handle field service workflows." },
    ],
    emotionalValue: ["Insurance companies take me seriously", "I respond faster than competitors", "Less paperwork, more restoration"],
    financialValue: ["Detailed quotes for loss adjusters", "Track costs across multi-trade restorations", "Save 10hrs/week on documentation"],
  },
  solar: {
    slug: "solar",
    name: "Solar Installer",
    plural: "Solar Installation Companies",
    icon: Sun,
    heroHeadline: "Your AI Office Manager. Built for Solar.",
    heroSub:
      "Quote solar installations with detailed panel layouts, schedule installation crews, track project milestones, and invoice on completion.",
    painPoints: [
      { emoji: "📐", pain: "Complex multi-line quotes for every installation", cost: "Hours per proposal" },
      { emoji: "📅", pain: "Coordinating scaffolding, electrical, and panel crews", cost: "Scheduling gaps delay projects" },
      { emoji: "🏗️", pain: "Tracking project stages from survey to sign-off", cost: "Jobs fall through the cracks" },
      { emoji: "💰", pain: "Staged payments not tracked properly", cost: "Missing deposit or milestone payments" },
    ],
    quoteExample: "Quote the O'Brien house — 16 panel system with battery storage",
    seoTitle: "revamo for Solar Installers — AI Quoting, Project Tracking & Invoicing",
    seoDescription:
      "Solar installation companies use revamo to create detailed proposals, manage project stages, track crews, and handle staged invoicing. Free 14-day trial.",
    objections: [
      { objection: "Our quotes are very detailed", response: "revamo AI builds multi-line itemised quotes — panels, inverter, battery, labour, scaffolding — all broken out." },
      { objection: "We need project stage tracking", response: "Create milestones: survey, install, commission, sign-off. Track and invoice each stage." },
      { objection: "It's another monthly cost", response: "1.5% on collected payments. On a £10K install, that's less than your scaffolding hire." },
      { objection: "I've tried software before", response: "Generic tools don't handle staged payments or multi-trade scheduling. revamo does." },
    ],
    segments: [
      { label: "Solo installer", hook: "Professional proposals that win residential jobs." },
      { label: "2–5 person crew", hook: "Multi-trade scheduling and milestone tracking." },
      { label: "6–20 staff operation", hook: "Portfolio management, staged billing, and business intelligence." },
    ],
    switchReasons: [
      { from: "Custom spreadsheets", reason: "We can't scale our quoting process." },
      { from: "Generic CRM", reason: "Doesn't handle project milestones or staged payments." },
      { from: "OpenSolar", reason: "Design tool only — no job management or invoicing." },
    ],
    emotionalValue: ["Our proposals look premium", "Every project stage is tracked", "We win more residential bids"],
    financialValue: ["Quote 3x faster", "Never miss a milestone payment", "Full margin visibility per project"],
  },
  "auto-detailing": {
    slug: "auto-detailing",
    name: "Auto Detailer",
    plural: "Auto Detailing Services",
    icon: Car,
    heroHeadline: "Your AI Office Manager. Built for Auto Detailing.",
    heroSub:
      "Quote mobile detailing jobs on arrival, manage your booking calendar, track supplies, and get paid before you pack up — all by voice.",
    painPoints: [
      { emoji: "📱", pain: "Managing bookings through Instagram DMs and texts", cost: "Double-bookings and forgotten appointments" },
      { emoji: "💰", pain: "No consistent pricing across service packages", cost: "Undercharging or losing clients to confusion" },
      { emoji: "📸", pain: "Before/after photos with no system to share them", cost: "Missing out on social proof and referrals" },
      { emoji: "🧴", pain: "No tracking of product usage per detail", cost: "Can't price jobs accurately" },
    ],
    quoteExample: "Quote the Collins BMW — full exterior detail and ceramic coating",
    seoTitle: "revamo for Auto Detailing — AI Booking, Quoting & Client Management",
    seoDescription:
      "Auto detailing businesses use revamo to manage bookings, create instant quotes, track product usage, and invoice clients on-site. Free 14-day trial.",
    objections: [
      { objection: "I use Instagram for bookings", response: "Keep your socials for marketing — use revamo for the business side: quotes, invoices, scheduling." },
      { objection: "I don't have time to learn new software", response: "Say 'Quote full detail and ceramic for Collins BMW.' Done in seconds." },
      { objection: "It's another monthly cost", response: "1.5% on card payments. Cash and transfer jobs cost you nothing extra." },
      { objection: "I'm mobile — I don't have an office", response: "That's exactly the point. revamo IS your office." },
    ],
    segments: [
      { label: "Solo detailer", hook: "Professional quotes and invoices from anywhere." },
      { label: "2–5 person team", hook: "Manage bookings, dispatching, and revenue in one place." },
      { label: "Fixed location", hook: "Walk-in scheduling, package pricing, and loyalty tracking." },
    ],
    switchReasons: [
      { from: "Instagram DMs", reason: "I missed 3 bookings last week." },
      { from: "Square Appointments", reason: "No quoting or invoicing features." },
      { from: "Pen and paper", reason: "I don't look professional to premium clients." },
    ],
    emotionalValue: ["Premium clients take me seriously", "My bookings are organised", "I know my real profit per detail"],
    financialValue: ["Never miss a booking", "Consistent pricing across services", "Save 5hrs/week on admin"],
  },
  "garage-doors": {
    slug: "garage-doors",
    name: "Garage Door Specialist",
    plural: "Garage Door Services",
    icon: DoorOpen,
    heroHeadline: "Your AI Office Manager. Built for Garage Door Services.",
    heroSub:
      "Quote installations and repairs on-site, schedule service calls, track parts inventory, and invoice on completion.",
    painPoints: [
      { emoji: "🚪", pain: "Every door spec is different — quoting takes ages", cost: "Slow quotes lose the customer" },
      { emoji: "📦", pain: "Tracking parts and door panel inventory", cost: "Wrong parts on the van = return trips" },
      { emoji: "📞", pain: "Emergency repair calls mixed with planned installs", cost: "Scheduling chaos" },
      { emoji: "💸", pain: "Deposits taken but final invoices delayed", cost: "Cash tied up between jobs" },
    ],
    quoteExample: "Quote the Walsh house — double electric roller door with remote",
    seoTitle: "revamo for Garage Door Services — AI Quoting, Scheduling & Invoicing",
    seoDescription:
      "Garage door service companies use revamo to create instant quotes, schedule installations, track parts, and automate invoicing. Free 14-day trial.",
    objections: [
      { objection: "Every door is different", response: "revamo AI builds bespoke quotes — just describe the door and the job." },
      { objection: "I don't have time to learn new software", response: "Voice quoting from the driveway. Say it, send it." },
      { objection: "It's another monthly cost", response: "1.5% on payments. No installs, no cost." },
      { objection: "I've tried software before", response: "Generic tools don't understand bespoke product quoting. revamo adapts to any job." },
    ],
    segments: [
      { label: "Solo installer", hook: "Quote on-site, invoice before you leave." },
      { label: "2–5 person team", hook: "Schedule installs and repairs across multiple sites." },
      { label: "Growing operation", hook: "Parts tracking, job costing, and accounting sync." },
    ],
    switchReasons: [
      { from: "Email quotes", reason: "Takes an hour to format each one." },
      { from: "Spreadsheets", reason: "I can't see profit per installation." },
      { from: "Generic scheduling", reason: "It doesn't handle quoting or invoicing." },
    ],
    emotionalValue: ["Professional quotes win bigger contracts", "Admin done on the driveway", "Clients pay faster"],
    financialValue: ["Quote 5x faster", "Track parts cost per job", "Save 5hrs/week"],
  },
};
