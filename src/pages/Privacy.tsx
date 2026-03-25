import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import quotrLogo from "@/assets/quotr-logo.png";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src={quotrLogo} alt="Foreman" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg" />
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
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose prose-slate max-w-none space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Who We Are</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Quotr is operated by Foreman, registered in Ireland. We act as the data controller for personal data processed through the Service. Contact: <a href="mailto:hello@foreman.ie" className="text-primary hover:underline">hello@foreman.ie</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Data We Collect</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">We collect the following categories of personal data:</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong className="text-foreground">Account information:</strong> Name, email address, phone number, company name, trade type, and country.</li>
              <li><strong className="text-foreground">Business data:</strong> Customer records, job details, quotes, invoices, expenses, and payment records you enter into the platform.</li>
              <li><strong className="text-foreground">Location data:</strong> GPS coordinates when you use time tracking features (only when actively clocked in).</li>
              <li><strong className="text-foreground">Usage data:</strong> How you interact with the Service, including features used and AI conversation logs.</li>
              <li><strong className="text-foreground">Payment data:</strong> Processed securely via Stripe. We do not store your full card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Legal Basis for Processing</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">Under GDPR, we process your data on the following bases:</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong className="text-foreground">Contract performance:</strong> To provide the Service you've subscribed to.</li>
              <li><strong className="text-foreground">Legitimate interest:</strong> To improve our Service, prevent fraud, and ensure security.</li>
              <li><strong className="text-foreground">Consent:</strong> For optional features like location tracking and marketing communications.</li>
              <li><strong className="text-foreground">Legal obligation:</strong> To comply with applicable laws and regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. How We Use Your Data</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>To provide, maintain, and improve the Service.</li>
              <li>To process payments and manage subscriptions.</li>
              <li>To send transactional emails (invoices, quotes, team invitations).</li>
              <li>To provide AI-powered features (Foreman AI).</li>
              <li>To provide customer support.</li>
              <li>To detect and prevent fraud or abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. AI & Foreman AI</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Foreman AI processes your business data (jobs, quotes, customers) to provide voice and chat assistance. Conversations are logged for functionality and may be used to improve the Service. AI processing is performed by third-party providers (including Google and OpenAI) under data processing agreements. Your data is not used to train third-party AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Data Sharing</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">We share data only with:</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong className="text-foreground">Service providers:</strong> Stripe (payments), Resend (email delivery), ElevenLabs (voice AI), and cloud infrastructure providers — all under GDPR-compliant data processing agreements.</li>
              <li><strong className="text-foreground">Your team members:</strong> Data within your team account is visible to team members based on their role permissions.</li>
              <li><strong className="text-foreground">Your customers:</strong> When you send quotes or invoices via the customer portal.</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground mt-3">We never sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Data Storage & Security</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your data is stored in secure, EU-based data centres. We implement industry-standard security measures including encryption in transit (TLS) and at rest, row-level security policies, and regular security audits. Access to production data is restricted and logged.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Data Retention</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We retain your data for as long as your account is active. Upon account deletion, your data is permanently removed within 30 days. Some data may be retained longer where required by law (e.g., financial records for tax purposes). Location pings are automatically deleted after 90 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Your Rights (GDPR)</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">Under GDPR, you have the right to:</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong className="text-foreground">Access:</strong> Request a copy of your personal data.</li>
              <li><strong className="text-foreground">Rectification:</strong> Correct inaccurate data.</li>
              <li><strong className="text-foreground">Erasure:</strong> Request deletion of your data ("right to be forgotten").</li>
              <li><strong className="text-foreground">Portability:</strong> Receive your data in a portable format.</li>
              <li><strong className="text-foreground">Restriction:</strong> Request limited processing of your data.</li>
              <li><strong className="text-foreground">Objection:</strong> Object to processing based on legitimate interest.</li>
              <li><strong className="text-foreground">Withdraw consent:</strong> Where processing is based on consent.</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
              To exercise these rights, email <a href="mailto:hello@foreman.ie" className="text-primary hover:underline">hello@foreman.ie</a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Cookies</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We use essential cookies for authentication and session management. We do not use advertising or tracking cookies. Analytics data is collected in aggregate without personal identifiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Children's Privacy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The Service is not intended for use by individuals under 18. We do not knowingly collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. International Transfers</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Some service providers may process data outside the EU/EEA. Where this occurs, we ensure appropriate safeguards are in place (e.g., Standard Contractual Clauses or adequacy decisions) in compliance with GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">13. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may update this Privacy Policy from time to time. Material changes will be communicated via email or in-app notification. The "Last updated" date at the top reflects the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">14. Supervisory Authority</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You have the right to lodge a complaint with the Irish Data Protection Commission (DPC) at <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.dataprotection.ie</a> if you believe your data protection rights have been violated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">15. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              For any privacy-related questions or requests, contact us at <a href="mailto:hello@foreman.ie" className="text-primary hover:underline">hello@foreman.ie</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 sm:px-6 border-t border-border">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Foreman. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
