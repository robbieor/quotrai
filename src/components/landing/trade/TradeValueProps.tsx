import { Heart, TrendingUp, ArrowRightLeft } from "lucide-react";
import type { TradeConfig } from "./TradeConfig";

interface Props {
  config: TradeConfig;
}

export function TradeValueProps({ config }: Props) {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-10">
          What {config.plural.toLowerCase()} say after switching
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Emotional */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-foreground">How it feels</h3>
            </div>
            <ul className="space-y-3">
              {config.emotionalValue.map((v) => (
                <li key={v} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">✦</span>
                  <span className="text-foreground">"{v}"</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Financial */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-foreground">The numbers</h3>
            </div>
            <ul className="space-y-3">
              {config.financialValue.map((v) => (
                <li key={v} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">✦</span>
                  <span className="text-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Switch reasons */}
        <div className="mt-10">
          <h3 className="text-lg font-bold text-center mb-6 text-foreground">Why they switched</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {config.switchReasons.map((s) => (
              <div key={s.from} className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From {s.from}</span>
                </div>
                <p className="text-sm text-foreground italic">"{s.reason}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
