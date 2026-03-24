import { Plug, Droplets, Hammer, Wrench, Star } from "lucide-react";

const trades = [
  { icon: Plug, name: "Electricians" },
  { icon: Droplets, name: "Plumbers" },
  { icon: Hammer, name: "Contractors" },
  { icon: Wrench, name: "Installers" },
];

export function SocialProofSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Star className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-primary">Built for the Trade</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-10">
          Built for{" "}
          <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
            real trades businesses.
          </span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {trades.map((trade) => (
            <div
              key={trade.name}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:-translate-y-1 transition-all duration-200"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <trade.icon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{trade.name}</span>
            </div>
          ))}
        </div>

        {/* Testimonial placeholder */}
        <div className="p-8 rounded-2xl border-2 border-dashed border-border bg-muted/20">
          <p className="text-sm text-muted-foreground italic">
            "Testimonials coming soon — we're onboarding our first 100 businesses."
          </p>
        </div>
      </div>
    </section>
  );
}
