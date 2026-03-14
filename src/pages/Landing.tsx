import { Link, useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/shared/SEOHead";
import { useState, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, 
  Receipt, 
  Users, 
  BarChart3, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Mic,
  Bot,
  Calendar,
  Shield,
  CreditCard,
  ExternalLink,
  Globe,
  Building2,
  Wrench,
  DollarSign,
  PieChart,
  UserPlus,
  ClipboardList,
  MapPin,
  Hammer,
  Paintbrush,
  Plug,
  Droplets,
  Wind,
  Leaf,
  Home,
  Timer,
  RefreshCw,
  Menu,
  X
} from "lucide-react";
import quotrLogo from "@/assets/quotr-logo.png";
import tomAvatar from "@/assets/tom-avatar.png";
import { DashboardShowcase } from "@/components/landing/DashboardShowcase";
import { DayTimeline } from "@/components/landing/DayTimeline";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { AnimatedCounter } from "@/components/landing/AnimatedCounter";
import { Testimonials } from "@/components/landing/Testimonials";
import { ROICalculator } from "@/components/landing/ROICalculator";

// Platform features
const platformFeatures = [
  { name: "Job Management", icon: Briefcase },
  { name: "Quoting & Estimates", icon: FileText },
  { name: "Invoicing", icon: Receipt },
  { name: "GPS Time Tracking", icon: MapPin },
  { name: "Customer CRM", icon: Users },
  { name: "Expense Tracking", icon: DollarSign },
  { name: "Business Reports", icon: BarChart3 },
  { name: "Team Management", icon: UserPlus },
  { name: "Job Templates", icon: ClipboardList },
  { name: "Payment Tracking", icon: CreditCard },
  { name: "Calendar & Scheduling", icon: Calendar },
  { name: "Xero Integration", icon: RefreshCw },
  { name: "Foreman AI Assistant", icon: Bot },
];

const platformCapabilities = [
  {
    icon: BarChart3,
    title: "Real-Time Dashboards",
    description: "See revenue, job status, outstanding invoices, and business health at a glance. Data-driven decisions, not guesswork."
  },
  {
    icon: FileText,
    title: "Professional Quotes",
    description: "Create branded quotes in seconds using trade-specific templates. Send to clients with one click."
  },
  {
    icon: Receipt,
    title: "Invoicing & Payments",
    description: "Convert quotes to invoices instantly. Track payments, send reminders, and see what's outstanding."
  },
  {
    icon: MapPin,
    title: "GPS Time Tracking",
    description: "Geofenced clock-in/out verifies your team is on-site. Accurate timesheets without the paperwork."
  },
  {
    icon: PieChart,
    title: "Business Intelligence",
    description: "Revenue trends, quote conversion rates, job performance — analytics that help you grow."
  },
  {
    icon: RefreshCw,
    title: "Xero Accounting Sync",
    description: "Connect Xero in one click. Invoices, payments, and contacts sync automatically — no double entry."
  },
  {
    icon: Bot,
    title: "Foreman AI Assistant",
    description: "Talk to Foreman AI to create quotes, schedule jobs, or check your calendar — completely hands-free."
  }
];

const trades = [
  { icon: Plug, name: "Electricians" },
  { icon: Droplets, name: "Plumbers" },
  { icon: Wind, name: "HVAC Technicians" },
  { icon: Hammer, name: "Carpenters" },
  { icon: Paintbrush, name: "Painters & Decorators" },
  { icon: Wrench, name: "Gas Engineers" },
  { icon: Home, name: "Roofers" },
  { icon: Building2, name: "General Contractors" },
  { icon: Leaf, name: "Landscapers" },
  { icon: Timer, name: "Fitters & Installers" },
];

const exampleCommands = [
  { command: "Create a quote for Mrs. Patterson using the EV charger template", category: "Quotes" },
  { command: "What's my total revenue this month?", category: "Reports" },
  { command: "Move tomorrow's plumbing job to Friday at 3pm", category: "Scheduling" },
  { command: "Send a payment reminder for invoice 1042", category: "Invoices" },
  { command: "Log a £45 expense for copper fittings", category: "Expenses" },
  { command: "Mark the Smith bathroom job as completed", category: "Jobs" },
];

// Tom's complete skill categories
const tomSkillCategories = [
  {
    title: "Jobs & Scheduling",
    skills: ["Create jobs", "Reschedule appointments", "Update status", "List upcoming work", "Delete jobs", "Today's summary"],
    icon: Briefcase,
  },
  {
    title: "Quotes & Templates",
    skills: ["Create quotes", "Use templates", "Get pending quotes", "Update status", "Suggest templates", "Delete quotes"],
    icon: FileText,
  },
  {
    title: "Invoicing & Payments",
    skills: ["Create invoices", "Send reminders", "Track overdue", "Record payments", "Update status", "List outstanding"],
    icon: Receipt,
  },
  {
    title: "Customers & CRM",
    skills: ["Add customers", "Search clients", "Get client info", "Update details", "View history", "Delete customers"],
    icon: Users,
  },
  {
    title: "Expenses & Finance",
    skills: ["Log expenses", "Categorize costs", "Link to jobs", "Financial summaries", "Week ahead forecast", "List expenses"],
    icon: DollarSign,
  },
  {
    title: "Reports & Insights",
    skills: ["Revenue reports", "Job performance", "Quote conversion", "Overdue tracking", "Team summaries", "Business health"],
    icon: BarChart3,
  },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Force light mode on landing page
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const wasHtmlDark = html.classList.contains("dark");
    const wasBodyDark = body.classList.contains("dark");
    const prevColorScheme = html.style.colorScheme;

    html.classList.remove("dark");
    body.classList.remove("dark");
    html.style.colorScheme = "light";

    return () => {
      html.style.colorScheme = prevColorScheme;
      if (wasHtmlDark) html.classList.add("dark");
      if (wasBodyDark) body.classList.add("dark");
    };
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEOHead
        title="Quotr — AI-Powered Job Management for Trade Businesses"
        description="Quotr runs the office so you don't have to. Quotes, invoices, scheduling, GPS tracking, and an AI assistant — for solo operators to 20-person crews. 30-day free trial."
        path="/"
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={quotrLogo} alt="Quotr" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg" />
            <span className="text-lg sm:text-xl font-bold tracking-tight">Quotr</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/pricing">
              <Button variant="ghost" size="sm" className="font-medium hidden sm:inline-flex">
                Pricing
              </Button>
            </Link>
            <Link to="/customer/login">
              <Button variant="ghost" size="sm" className="font-medium hidden sm:inline-flex">
                Customer Portal
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium text-sm px-2 sm:px-3 hidden sm:inline-flex">
                Login
              </Button>
            </Link>
            <Link to="/signup" className="hidden sm:inline-flex">
              <Button size="sm" className="font-medium btn-hover-lift text-sm px-3 sm:px-4">
                Start Free Trial
              </Button>
            </Link>
            <button
              className="sm:hidden p-2 rounded-md hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border bg-background/95 backdrop-blur-lg animate-fade-in">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              <Link to="/pricing" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start font-medium">Pricing</Button>
              </Link>
              <Link to="/customer/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start font-medium">Customer Portal</Button>
              </Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start font-medium">Login</Button>
              </Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full font-medium">Start Free Trial</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-teal-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-10 sm:mb-16 animate-fade-up">
            {/* Social proof badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 sm:mb-8">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-xs sm:text-sm font-medium text-primary">
                Built for solo operators to 20-person crews
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 sm:mb-8 leading-[1.1]">
              Your AI Office Manager.<br />
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                For Trade Businesses.
              </span>
            </h1>
            
            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-2">
              Quotr runs the office so you don't have to. Quotes by voice, invoices that chase themselves, 
              GPS time tracking, and scheduling — 
              <span className="font-semibold text-foreground">all in one platform your whole team actually uses</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 font-semibold btn-hover-lift gap-2 w-full sm:w-auto">
                  Try Free for 30 Days
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 font-semibold gap-2 w-full sm:w-auto">
                  View Pricing
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground px-4">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Set up in 5 minutes
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Cancel anytime
              </span>
            </div>
          </div>

          {/* Dashboard Showcase - replaces static mockup */}
          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <DashboardShowcase />
          </div>
          
          {/* Platform Features Pills */}
          <div className="mt-8 sm:mt-12 animate-fade-up" style={{ animationDelay: "400ms" }}>
            <p className="text-xs text-muted-foreground mb-4 text-center">Replace 4–5 disconnected tools with one platform</p>
            <div className="flex flex-wrap justify-center gap-2">
              {platformFeatures.map((feature) => (
                <div 
                  key={feature.name}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-default"
                >
                  <feature.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{feature.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Animated Counters */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-y border-border bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            <div className="text-center animate-fade-up">
              <p className="text-2xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent mb-1 sm:mb-2">
                <AnimatedCounter end={11} suffix=" days" />
              </p>
              <p className="text-sm sm:text-base font-semibold text-foreground mb-0.5 sm:mb-1">Faster Payments</p>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">With automated payment chasing</p>
            </div>
            <div className="text-center animate-fade-up" style={{ animationDelay: "100ms" }}>
              <p className="text-2xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent mb-1 sm:mb-2">
                <AnimatedCounter end={8} suffix="hrs" />
              </p>
              <p className="text-sm sm:text-base font-semibold text-foreground mb-0.5 sm:mb-1">Saved Weekly</p>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">On quoting, invoicing & admin</p>
            </div>
            <div className="text-center animate-fade-up" style={{ animationDelay: "200ms" }}>
              <p className="text-2xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent mb-1 sm:mb-2">
                <AnimatedCounter end={4} suffix="x" />
              </p>
              <p className="text-sm sm:text-base font-semibold text-foreground mb-0.5 sm:mb-1">Faster Quotes</p>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Voice-to-quote in minutes, not hours</p>
            </div>
            <div className="text-center animate-fade-up" style={{ animationDelay: "300ms" }}>
              <p className="text-2xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent mb-1 sm:mb-2">
                1–20
              </p>
              <p className="text-sm sm:text-base font-semibold text-foreground mb-0.5 sm:mb-1">Person Teams</p>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Solo operators to established firms</p>
            </div>
          </div>
        </div>
      </section>

      {/* Your Day with Quotr - Timeline Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">Your Day with Quotr</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 sm:mb-6">
              From morning briefing to<br />
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                evening summary.
              </span>
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              See how Quotr transforms a typical day for trade professionals.
            </p>
          </div>
          
          <DayTimeline />
        </div>
      </section>

      {/* Before/After Transformation Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10 sm:mb-12 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">Transform Your Business</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 sm:mb-6">
              WhatsApp & spreadsheets<br />
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                vs. one platform.
              </span>
            </h2>
          </div>
          
          <BeforeAfter />
        </div>
      </section>

      {/* Trades We Serve */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">From Sparks to Pipes — One Platform</h2>
            <p className="text-sm sm:text-base text-muted-foreground">If you quote it, invoice it, or schedule it — Quotr manages it</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {trades.map((trade) => (
              <div 
                key={trade.name}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <trade.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{trade.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Capabilities Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-16 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">All-in-One Platform</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 sm:mb-6">
              One platform.<br />
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                Zero office staff needed.
              </span>
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              From first quote to final payment — replace spreadsheets, WhatsApp groups, and disconnected apps with one system.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {platformCapabilities.map((capability, index) => (
              <div 
                key={capability.title} 
                className="group p-5 sm:p-8 rounded-xl sm:rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-teal-400/20 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <capability.icon className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-foreground">{capability.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{capability.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Foreman AI - AI Assistant Showcase */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto">
          {/* Header with Foreman AI Avatar */}
          <div className="text-center mb-12 sm:mb-16 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
              <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">AI-Powered Assistant</span>
            </div>
            
            {/* Foreman AI Avatar */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 rounded-2xl overflow-hidden shadow-xl border-4 border-primary/20 bg-primary/10">
              <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
            </div>
            
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 sm:mb-6 leading-tight">
              Meet Foreman AI.<br />
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                Your AI Office Manager.
              </span>
            </h2>
            
            <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-4 leading-relaxed px-2">
              Other tools digitise your admin. Foreman AI <span className="font-semibold text-foreground">eliminates it</span>. 
              Talk by voice or text — it creates quotes, chases payments, and handles the paperwork while you're on-site.
            </p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20">
              <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-medium text-teal-600">Continuously learning & improving</span>
            </div>
          </div>

          {/* Skills Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
            {tomSkillCategories.map((category, index) => (
              <div 
                key={category.title}
                className="p-5 sm:p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-teal-400/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground">{category.title}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {category.skills.map((skill) => (
                    <span 
                      key={skill}
                      className="px-2.5 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Voice Examples */}
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
                <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-primary">Voice-First</span>
              </div>
              
              <h3 className="text-xl sm:text-3xl font-extrabold text-foreground mb-4 sm:mb-6 leading-tight">
                Your hands stay on the tools.<br />
                <span className="text-muted-foreground font-normal text-lg sm:text-2xl">
                  Foreman AI handles the rest.
                </span>
              </h3>
              
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
                On-site and can't type? No problem. Foreman AI understands natural speech and trade terminology.
              </p>
              
              <ul className="space-y-3 sm:space-y-4">
                {[
                  "Works in noisy job site environments",
                  "Understands trade terminology",
                  "Confirms before executing actions",
                  "Supports voice or text input"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <span className="text-sm sm:text-base text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="space-y-2 sm:space-y-3">
                {exampleCommands.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
                  >
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden flex-shrink-0 border border-border">
                      <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base text-foreground font-medium truncate">"{item.command}"</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Portal Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-primary">Client Portal</span>
              </div>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 sm:mb-6 leading-tight">
                Give your clients a<br />
                <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                  professional experience.
                </span>
              </h2>
              
              <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
                Clients approve quotes with one click, pay invoices online, and see their full history — 
                all branded to your business. Look like a company, even if it's just you.
              </p>
              
              <ul className="space-y-3 sm:space-y-4">
                {[
                  "One-click quote approvals via email",
                  "Full invoice history & payment tracking",
                  "Secure magic link login — no passwords",
                  "Online payments coming soon"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <span className="text-sm sm:text-base text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-primary/5">
                {/* Portal Header */}
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Customer Portal</p>
                    <p className="text-xs text-muted-foreground">Secure client access</p>
                  </div>
                </div>
                
                {/* Portal Content */}
                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Quote #Q-0047</span>
                      <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">Pending</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">EV Charger Installation</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">£1,240.00</span>
                      <div className="flex gap-2">
                        <div className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">Decline</div>
                        <div className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">Accept Quote</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Invoice #INV-0031</span>
                      <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">Paid</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Boiler Service & Repair</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">£450.00</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CreditCard className="h-4 w-4" />
                        Paid 15 Jan 2025
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10 sm:mb-12 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
              <PieChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">Calculate Your Savings</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 sm:mb-6">
              See your potential<br />
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                cost savings.
              </span>
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              Enter your team size and current admin hours to see how much you could save.
            </p>
          </div>
          
          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <ROICalculator />
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <Testimonials />

      {/* Security & Trust */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-y border-border bg-muted/30">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center sm:text-left">
            <div className="flex items-center gap-3 sm:gap-4">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div>
                <p className="text-sm sm:text-base font-semibold text-foreground">Bank-Level Security</p>
                <p className="text-xs sm:text-sm text-muted-foreground">256-bit encryption</p>
              </div>
            </div>
            <div className="hidden sm:block h-12 w-px bg-border" />
            <div className="flex items-center gap-3 sm:gap-4">
              <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div>
                <p className="text-sm sm:text-base font-semibold text-foreground">Global Ready</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Multi-currency & VAT</p>
              </div>
            </div>
            <div className="hidden sm:block h-12 w-px bg-border" />
            <div className="flex items-center gap-3 sm:gap-4">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div>
                <p className="text-sm sm:text-base font-semibold text-foreground">GDPR Compliant</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Your data stays yours</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
              <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">Simple Pricing</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 sm:mb-6 leading-tight">
              One price per seat.<br />
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                Scale as you grow.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Give your office team full AI power and your field crew the tools they need — without enterprise pricing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Team Seat */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col animate-fade-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Team Seat</h3>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground">€15</span>
                <span className="text-muted-foreground">/seat/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Jobs, quotes, invoices, calendar, reports. No AI.
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "View & update assigned jobs",
                  "Job scheduling & calendar",
                  "Time tracking with GPS",
                  "Log expenses & attach receipts",
                  "Team collaboration",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Voice Seat */}
            <div className="rounded-2xl border-2 border-primary bg-card p-6 sm:p-8 flex flex-col relative animate-fade-up" style={{ animationDelay: "100ms" }}>
              <Badge className="absolute -top-3 left-6 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                Most Popular
              </Badge>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Voice Seat</h3>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-primary">€29</span>
                <span className="text-muted-foreground">/seat/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Everything + Foreman AI voice agent & chat.
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Everything in Team Seat",
                  "Foreman AI voice & text assistant",
                  "60 voice minutes/month",
                  "Create quotes & invoices by voice",
                  "Xero & QuickBooks sync",
                  "Customer management",
                  "PDF generation & email",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="w-full">
                <Button className="w-full" size="lg">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Enterprise Seat */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Enterprise</h3>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground">€49</span>
                <span className="text-muted-foreground">/seat/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Priority support, higher AI limits, SSO.
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Everything in Voice Seat",
                  "200 voice minutes/month",
                  "Priority support & onboarding",
                  "Dedicated account manager",
                  "Custom accounting mapping",
                  "API access & webhooks",
                  "SLA guarantee",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>

          {/* Platform Fee */}
          <div className="max-w-5xl mx-auto mt-8">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-up">
              <div>
                <h3 className="text-lg font-bold text-foreground">Automated Payment Chasing</h3>
                <p className="text-sm text-muted-foreground">Invoices chase themselves — Quotr earns 2.5% only when you get paid</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-foreground">2.5%</span>
                <span className="text-muted-foreground ml-1">per transaction</span>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            30-day free trial on all seats • No credit card required • Save 15% with annual billing
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-gradient-radial from-primary/10 via-transparent to-transparent rounded-full" />
        </div>
        
        <div className="container mx-auto text-center relative">
          <div className="max-w-3xl mx-auto animate-fade-up px-2">
            <h2 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-foreground mb-4 sm:mb-6">
              Stop chasing paper.<br />
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                Start chasing growth.
              </span>
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-xl mx-auto">
              Join trade professionals who run their entire business from Quotr — from solo sparks to 20-person crews.
            </p>
            <Link to="/signup">
              <Button size="lg" className="text-base sm:text-xl px-8 sm:px-12 py-6 sm:py-8 font-bold btn-hover-lift gap-2 sm:gap-3">
                <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
                Start Free Trial
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </Link>
            <p className="mt-6 sm:mt-8 text-xs sm:text-base text-muted-foreground">
              30-day free trial • No credit card • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col items-center gap-4 sm:gap-6 text-center sm:text-left sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
              <img src={quotrLogo} alt="Quotr" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
              <span className="text-base sm:text-lg font-bold tracking-tight">Quotr</span>
              <span className="text-xs sm:text-sm text-muted-foreground">Powered by Foreman AI</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground order-last sm:order-none">
              © {new Date().getFullYear()} Quotr. All rights reserved.
            </p>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link to="/terms" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/login" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link to="/signup" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
