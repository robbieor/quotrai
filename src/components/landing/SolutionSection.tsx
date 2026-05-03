import { FileText, Briefcase, Receipt, DollarSign, ChevronRight, Zap } from "lucide-react";

const flow = [
  { icon: FileText, label: "Quotes" },
  { icon: Briefcase, label: "Jobs" },
  { icon: Receipt, label: "Invoices" },
  { icon: DollarSign, label: "Payments" },
];

export function SolutionSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-primary">The Solution</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-4 leading-tight">
          One system.{" "}
          <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
            Total control.
          </span>
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
          Revamo brings everything together — all tracked, connected, and updated automatically.
          No spreadsheets. No manual tracking.
        </p>

        {/* Flow visualisation */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-0">
          {flow.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-2 group">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-card border-2 border-primary/30 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-200 shadow-subtle">
                  <step.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{step.label}</span>
              </div>
              {i < flow.length - 1 && (
                <ChevronRight className="h-5 w-5 text-primary/40 mx-2 sm:mx-4 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
