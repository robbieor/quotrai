import { Link, useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/shared/SEOHead";
import { useState, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLandingCurrency } from "@/hooks/useLandingCurrency";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Calculator, Menu, X } from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";
import { ROICalculator } from "@/components/landing/ROICalculator";
import { HeroSection } from "@/components/landing/HeroSection";
import { DemoVideoSection } from "@/components/landing/DemoVideoSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { ForemanAISection } from "@/components/landing/ForemanAISection";
import { OutcomesSection } from "@/components/landing/OutcomesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { PricingPreviewSection } from "@/components/landing/PricingPreviewSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roiOpen, setRoiOpen] = useState(false);
  const { formatPrice } = useLandingCurrency();

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="landing-page min-h-screen bg-background overflow-hidden">
      <SEOHead
        title="Foreman — AI-Powered Job Management for Field Service Businesses"
        description="Talk to your business. It talks back. Quotes, invoices, expenses, scheduling — all voice-powered, all in one app. Built for field service pros."
        path="/"
      />

      {/* ROI Calculator Dialog */}
      <Dialog open={roiOpen} onOpenChange={setRoiOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              ROI Calculator
            </DialogTitle>
          </DialogHeader>
          <ROICalculator />
        </DialogContent>
      </Dialog>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={foremanLogo} alt="Foreman" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl" />
            <span className="text-lg sm:text-xl font-bold tracking-tight">Foreman</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/pricing">
              <Button variant="ghost" size="sm" className="font-medium hidden sm:inline-flex">
                Pricing
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="font-medium hidden sm:inline-flex gap-1.5"
              onClick={() => setRoiOpen(true)}
            >
              <Calculator className="h-3.5 w-3.5" />
              ROI Calculator
            </Button>
            <Link to="/customer/login">
              <Button variant="ghost" size="sm" className="font-medium hidden sm:inline-flex">
                Customer Portal
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium hidden sm:inline-flex">
                Login
              </Button>
            </Link>
            <Link to="/signup" className="hidden sm:inline-flex">
              <Button size="sm" className="font-medium btn-hover-lift gap-1.5">
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
              <Button
                variant="ghost"
                className="w-full justify-start font-medium gap-2"
                onClick={() => { setRoiOpen(true); setMobileMenuOpen(false); }}
              >
                <Calculator className="h-4 w-4" />
                ROI Calculator
              </Button>
              <Link to="/customer/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start font-medium">Customer Portal</Button>
              </Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start font-medium">Login</Button>
              </Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full font-medium gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Section 1: Hero */}
      <HeroSection formatPrice={formatPrice} />

      {/* Demo Video */}
      <DemoVideoSection />
      {/* Section 2: Problem */}
      <ProblemSection />

      {/* Section 3: Solution */}
      <SolutionSection />

      {/* Section 4: Foreman AI */}
      <ForemanAISection formatPrice={formatPrice} />

      {/* Section 5: Outcomes */}
      <OutcomesSection />

      {/* Section 6: How It Works */}
      <HowItWorksSection />

      {/* Section 7: Social Proof */}
      <SocialProofSection />

      {/* Section 8: Pricing Preview */}
      <PricingPreviewSection formatPrice={formatPrice} />

      {/* Final CTA */}
      <FinalCTASection />

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col items-center gap-4 sm:gap-6 text-center sm:text-left sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={foremanLogo} alt="Foreman" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
              <span className="text-base sm:text-lg font-bold tracking-tight">Foreman</span>
              <span className="text-xs sm:text-sm text-muted-foreground">Powered by Foreman AI</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground order-last sm:order-none">
              © {new Date().getFullYear()} Foreman. All rights reserved.
            </p>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link to="/terms" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link to="/privacy" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/login" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
