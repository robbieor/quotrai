import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import foremanLogo from "@/assets/quotr-logo.png";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src={foremanLogo} alt="Foreman" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg" />
            <span className="text-lg sm:text-xl font-bold tracking-tight">Foreman</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose prose-slate max-w-none space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Agreement to Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              By accessing or using Foreman ("the Service"), operated by Foreman, a company registered in Ireland, you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Description of Service</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Foreman is a business management platform designed for trade professionals. The Service includes job management, quoting, invoicing, expense tracking, time tracking, team management, and AI-powered assistance ("Foreman AI"). Features may vary by subscription tier.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Account Registration</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must notify us immediately of any unauthorised use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Subscriptions & Payment</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Paid features require a subscription. Payments are processed via Stripe. Subscriptions automatically renew unless cancelled before the end of the billing period. Prices may change with 30 days' notice. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Free Trial</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              New accounts receive a 14-day free trial with full access to platform features. No credit card is required to start a trial. At the end of the trial, you must select a paid plan to continue using the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Acceptable Use</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorised access to any part of the Service; (c) upload malicious content; (d) resell or redistribute the Service without permission; (e) use automated tools to scrape or extract data from the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Your Data</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You retain ownership of all data you enter into the Service. We do not claim any intellectual property rights over your content. You grant us a limited licence to host, store, and display your data solely to provide the Service. You may export or delete your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. AI Features (Foreman AI)</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Foreman AI is provided as a productivity tool. AI-generated outputs (quotes, summaries, suggestions) should be reviewed before use. We do not guarantee the accuracy of AI outputs. Usage limits apply based on your subscription tier.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Service Availability</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We aim for high availability but do not guarantee uninterrupted access. We may perform maintenance with reasonable notice. We are not liable for downtime caused by factors beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To the maximum extent permitted by Irish and EU law, Foreman shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Termination</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You may cancel your account at any time. We may suspend or terminate your account if you breach these Terms. Upon termination, your data will be retained for 30 days to allow export, after which it may be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. Governing Law</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              These Terms are governed by the laws of Ireland. Any disputes shall be resolved in the courts of Ireland, without prejudice to your rights under EU consumer protection regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">13. Changes to Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may update these Terms from time to time. Material changes will be communicated via email or in-app notification. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">14. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              For questions about these Terms, contact us at <a href="mailto:hello@foreman.ie" className="text-primary hover:underline">hello@foreman.ie</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 sm:px-6 border-t border-border">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Foreman. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
