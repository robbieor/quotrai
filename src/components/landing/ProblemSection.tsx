import { AlertCircle } from "lucide-react";

const painPoints = [
  "Chasing payments manually — texts, calls, awkward conversations",
  "Switching between 4+ apps just to run a simple job",
  "Losing track of work, cash, and follow-ups",
  "Using 'AI tools' that answer questions but don't do the work",
];

export function ProblemSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 mb-6">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs sm:text-sm font-medium text-destructive">The Problem</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-6 leading-tight">
          Running your business shouldn't mean{" "}
          <span className="bg-gradient-to-r from-destructive to-orange-400 bg-clip-text text-transparent">
            working all night.
          </span>
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Most tradespeople are stuck doing unpaid admin instead of earning:
        </p>

        <ul className="space-y-4 max-w-xl mx-auto text-left mb-8">
          {painPoints.map((item) => (
            <li key={item} className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
              <span className="text-destructive font-bold text-lg leading-none mt-0.5">×</span>
              <span className="text-sm sm:text-base text-foreground">{item}</span>
            </li>
          ))}
        </ul>

        <p className="text-base sm:text-lg font-semibold text-foreground">
          It's not the work that's hard — it's the admin.
        </p>
      </div>
    </section>
  );
}
