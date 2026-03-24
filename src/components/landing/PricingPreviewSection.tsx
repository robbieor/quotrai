import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Users, Mic, Building2 } from "lucide-react";

interface PricingPreviewSectionProps {
  formatPrice: (eur: number, decimals?: number) => string;
}

const tiers = [
  {
    name: "Lite",
    tagline: "Run your business",
    icon: Users,
    bullets: ["Quotes, jobs, invoices", "GPS time tracking", "Customer management"],
    popular: false,
  },
  {
    name: "Connect",
    tagline: "Automate your business",
    icon: Mic,
    bullets: ["Everything in Lite", "Foreman AI (voice + text)", "Automated reminders"],
    popular: true,
  },
  {
    name: "Grow",
    tagline: "Scale your business",
    icon: Building2,
    bullets: ["Everything in Connect", "P&L and profitability reports", "Xero & QuickBooks sync"],
    popular: false,
  },
];

export function PricingPreviewSection({ formatPrice }: PricingPreviewSectionProps) {
  const prices = [19, 39, 69];

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-4">
            Plans that grow{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              with your business.
            </span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={`relative p-6 rounded-2xl bg-card flex flex-col ${
                tier.popular
                  ? "border-2 border-primary shadow-[0_0_30px_-5px_hsl(159,100%,45%,0.2)]"
                  : "border border-border"
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-6 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                  Most Popular
                </Badge>
              )}
              <div className="flex items-center gap-3 mb-1">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tier.popular ? "bg-primary/10" : "bg-muted"}`}>
                  <tier.icon className={`h-4 w-4 ${tier.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
              </div>
              <p className="text-sm font-semibold text-primary mb-3">{tier.tagline}</p>
              <div className="mb-4">
                <span className={`text-3xl font-extrabold ${tier.popular ? "text-primary" : "text-foreground"}`}>
                  {formatPrice(prices[i])}
                </span>
                <span className="text-sm text-muted-foreground">/seat/mo</span>
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {tier.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/pricing">
            <Button variant="outline" size="lg" className="gap-2 font-semibold">
              View full pricing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
