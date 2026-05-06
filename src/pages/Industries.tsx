import { Link } from "react-router-dom";
import { SEOHead } from "@/components/shared/SEOHead";
import { TRADES } from "@/components/landing/trade/TradeConfig";
import { ArrowRight } from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";

const Industries = () => {
  const tradeList = Object.values(TRADES);

  return (
    <>
      <SEOHead
        title="Industries We Serve — revamo AI Office Manager"
        description="revamo serves 20+ field service industries including plumbing, electrical, HVAC, cleaning, pest control, landscaping, roofing, and more. AI-powered quoting, invoicing & job management."
      />
      <div className="aura-marketing min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between h-14 px-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={foremanLogo} alt="revamo" className="h-7 w-auto" />
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium text-primary hover:underline"
            >
              Start Free Trial
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 sm:py-24 px-4 sm:px-6">
          <div className="container mx-auto text-center max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight">
              One platform for every field service business
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you're a plumber, cleaner, solar installer, or pest control operator — if you quote jobs and invoice clients, revamo runs your office.
            </p>
          </div>
        </section>

        {/* Industry Grid */}
        <section className="pb-16 sm:pb-24 px-4 sm:px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {tradeList.map((trade) => (
                <Link
                  key={trade.slug}
                  to={`/trade/${trade.slug}`}
                  className="group flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-medium hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <trade.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {trade.plural}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {trade.heroSub.slice(0, 120)}…
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30 border-t border-border">
          <div className="container mx-auto text-center max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Don't see your industry?
            </h2>
            <p className="text-muted-foreground mb-6">
              If you quote jobs and invoice clients, revamo works for you. Get in touch — we'll set up templates for your specific trade.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default Industries;
