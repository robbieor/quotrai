import { Mic, Camera, Sunrise, Sparkles } from "lucide-react";

const items = [
  {
    icon: Mic,
    tag: "Hands-free voice",
    title: "Run the van by voice.",
    body: "Drive between jobs, talk to Foreman. Quotes, invoices, expenses — logged before you reach the next door.",
  },
  {
    icon: Camera,
    tag: "Photo-to-quote",
    title: "Snap it. Quote it.",
    body: "Five photos in. A priced quote out. Foreman reads the job, picks the materials, and drafts it ready to send.",
  },
  {
    icon: Sunrise,
    tag: "Daily briefing",
    title: "Wake up already informed.",
    body: "Every morning: revenue at risk, jobs to chase, top three actions. No dashboards to dig through.",
  },
  {
    icon: Sparkles,
    tag: "Suggested automations",
    title: "It learns how you work.",
    body: "Foreman spots patterns — follow-ups, reminders, recurring jobs — and offers to take them off your plate. You approve, it runs.",
  },
];

export function DifferentiatorsSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">Why Foreman is different</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-4 leading-tight max-w-3xl mx-auto">
            Other tools track your work.{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              Foreman runs it.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Four things no other field service app does — built into one system.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
          {items.map((item) => (
            <div
              key={item.tag}
              className="group p-6 sm:p-8 rounded-2xl bg-card border border-border hover:border-primary/40 hover:-translate-y-1 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">
                    {item.tag}
                  </p>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
