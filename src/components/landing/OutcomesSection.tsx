import { Zap, FolderOpen, Clock } from "lucide-react";

const outcomes = [
  {
    icon: Zap,
    title: "Get paid faster",
    description: "Invoices, reminders, and payment tracking — all handled automatically.",
  },
  {
    icon: FolderOpen,
    title: "Stay organised",
    description: "Jobs, customers, and payments in one place. Nothing falls through the cracks.",
  },
  {
    icon: Clock,
    title: "Save hours every week",
    description: "Foreman AI handles the repetitive admin so you can focus on earning.",
  },
];

export function OutcomesSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-4">
            Less admin. Faster payments.{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              More control.
            </span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          {outcomes.map((item) => (
            <div
              key={item.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:-translate-y-1 transition-all duration-200 text-center"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
