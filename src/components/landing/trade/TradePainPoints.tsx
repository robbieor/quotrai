import type { TradeConfig } from "./TradeConfig";

interface Props {
  config: TradeConfig;
}

export function TradePainPoints({ config }: Props) {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
          Sound familiar?
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          These are the top reasons {config.plural.toLowerCase()} switch to Revamo.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {config.painPoints.map((p) => (
            <div key={p.pain} className="flex items-start gap-3 p-5 rounded-xl bg-card border border-border">
              <span className="text-xl shrink-0">{p.emoji}</span>
              <div>
                <p className="text-foreground font-semibold">{p.pain}</p>
                <p className="text-sm text-muted-foreground mt-1">{p.cost}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-muted-foreground mt-8 text-lg">
          Revamo fixes all of this — and more.
        </p>
      </div>
    </section>
  );
}
