import { Card, CardContent } from "@/components/ui/card";
import { Bot, Mic, FileText, Receipt, MapPin, BarChart3 } from "lucide-react";

const highlights = [
  {
    icon: Mic,
    title: "Voice-First",
    description: "Create quotes, log expenses, and manage jobs — all by talking to Foreman AI while you're on the tools.",
  },
  {
    icon: FileText,
    title: "Quotes in Seconds",
    description: "Describe the job, Foreman AI builds the quote. Templates, materials pricing, and VAT handled automatically.",
  },
  {
    icon: Receipt,
    title: "Get Paid Faster",
    description: "Automated payment reminders, customer portal with one-click approvals, and full invoice tracking.",
  },
  {
    icon: MapPin,
    title: "GPS Time Tracking",
    description: "Geofenced clock-in/out proves your team was on-site. Accurate timesheets without arguments.",
  },
  {
    icon: BarChart3,
    title: "Know Your Numbers",
    description: "Revenue, job profitability, quote conversion — real-time dashboards that help you make better decisions.",
  },
  {
    icon: Bot,
    title: "Built for Trades",
    description: "Foreman AI understands trade terminology. First fix, second fix, day rates, VAT on materials — it just gets it.",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />

      <div className="container relative mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-4">
            <Bot className="h-4 w-4 fill-primary" />
            Why Tradespeople Choose Foreman
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built Different. Built for You.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're not another generic business app. Foreman is purpose-built for trade businesses 
            who want to spend less time on admin and more time earning.
          </p>
        </div>

        {/* Highlights grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {highlights.map((highlight, index) => (
            <Card key={index} className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <highlight.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{highlight.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {highlight.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
