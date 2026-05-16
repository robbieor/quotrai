import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import foremanLogo from "@/assets/foreman-logo.png";

export default function Dpa() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src={foremanLogo} alt="revamo" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg" />
            <span className="text-lg sm:text-xl font-bold tracking-tight font-manrope lowercase">revamo</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">Data Processing Addendum</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {new Date().toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            This Data Processing Addendum ("DPA") forms part of the Terms of Service between
            <strong className="text-foreground"> Revamo Ltd </strong>
            (CRO [TODO], registered in Ireland) ("Revamo", "processor") and the customer
            ("Customer", "controller") using the revamo service ("Service"). It governs the
            processing of personal data by Revamo on behalf of the Customer in accordance with
            the EU General Data Protection Regulation (Regulation (EU) 2016/679) and the UK GDPR.
          </p>

          <Section title="1. Definitions">
            "Personal Data", "Data Subject", "Processing", "Controller" and "Processor" have the
            meanings given in GDPR Article 4. "Sub-processor" means any third party engaged by
            Revamo to process Personal Data on behalf of the Customer.
          </Section>

          <Section title="2. Subject matter & duration">
            Revamo processes Personal Data of the Customer's clients, prospects, employees and
            sub-contractors for the duration of the Customer's subscription and for up to 30 days
            after termination, after which all Personal Data is permanently deleted (subject to
            any legal retention obligations).
          </Section>

          <Section title="3. Nature & purpose of processing">
            Provision of job management, quoting, invoicing, payment collection, scheduling,
            workforce tracking and AI-assisted operations features as described in the Service.
          </Section>

          <Section title="4. Types of Personal Data & categories of Data Subjects">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Customer's clients:</strong> name, postal address, email, phone, job notes, invoice and payment records.</li>
              <li><strong className="text-foreground">Customer's employees / sub-contractors:</strong> name, email, role, clock-in / clock-out times, GPS coordinates while clocked in, mileage trips.</li>
              <li><strong className="text-foreground">Customer's prospects:</strong> contact details captured through enquiry forms.</li>
            </ul>
          </Section>

          <Section title="5. Processor obligations">
            Revamo will: (a) process Personal Data only on documented instructions from the
            Customer; (b) ensure persons authorised to process Personal Data are bound by
            confidentiality; (c) implement appropriate technical and organisational measures
            (see §8); (d) assist the Customer with Data Subject requests and DPIAs to a
            reasonable extent; (e) notify the Customer without undue delay (and within 72 hours
            where feasible) of any Personal Data breach affecting Customer data.
          </Section>

          <Section title="6. Sub-processors">
            The Customer authorises Revamo to engage the sub-processors listed in the Privacy
            Policy (<Link to="/privacy" className="text-primary underline">/privacy</Link>) and
            will be notified of material changes via in-app notification or email. Revamo
            imposes data protection obligations on each sub-processor that are no less protective
            than those in this DPA.
          </Section>

          <Section title="7. International transfers">
            Where Personal Data is transferred outside the EEA / UK (notably to Stripe, OpenAI,
            Google and ElevenLabs in the United States), Revamo relies on the EU Standard
            Contractual Clauses (Commission Decision (EU) 2021/914), the UK International Data
            Transfer Addendum, or the EU-US Data Privacy Framework where the sub-processor is
            certified.
          </Section>

          <Section title="8. Security measures">
            Encryption in transit (TLS 1.2+) and at rest, row-level security on every multi-tenant
            table, AES-256-GCM encryption of integration tokens, scoped service-role access,
            session tracking, suspicious-signup detection, and least-privilege engineering access
            with audit logging.
          </Section>

          <Section title="9. Audit & information rights">
            Revamo will make available, on reasonable written request, information necessary to
            demonstrate compliance with this DPA, including security questionnaires and (where
            available) third-party audit summaries.
          </Section>

          <Section title="10. Return & deletion">
            Upon termination of the subscription, Personal Data is held for 30 days to allow
            export, then permanently deleted. The Customer may trigger immediate deletion via the
            in-app "Delete account" flow.
          </Section>

          <Section title="11. Liability & precedence">
            In the event of conflict between this DPA and the Terms of Service, this DPA prevails
            with respect to the processing of Personal Data. Liability under this DPA is subject
            to the limitations set out in the Terms of Service.
          </Section>

          <Section title="12. Contact">
            For any questions about this DPA, email{" "}
            <a href="mailto:privacy@revamo.ai" className="text-primary underline">privacy@revamo.ai</a>.
          </Section>
        </div>
      </main>

      <footer className="py-8 px-4 sm:px-6 border-t border-border">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} revamo. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
