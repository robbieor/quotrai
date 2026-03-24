import { X, CheckCircle2 } from "lucide-react";

const beforeItems = [
  "Chasing invoices at 10pm",
  "Switching between 4 different apps",
  "Forgetting follow-ups and losing jobs",
  "Guessing who's on-site and for how long",
];

const afterItems = [
  "One system for quotes, jobs, invoices, payments",
  "Automatic payment reminders — hands-free",
  "Full visibility on every job, every pound",
  "GPS-verified timesheets with zero arguments",
];

export function BeforeAfterSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10 sm:mb-14 animate-fade-up">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4">
            Why this matters.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            You didn't start a trade business to do admin. Quotr takes it off your plate.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
          {/* Before */}
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-destructive mb-5">Without Quotr</h3>
            <ul className="space-y-4">
              {beforeItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-primary mb-5">With Quotr</h3>
            <ul className="space-y-4">
              {afterItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
