import { User, Users, Building2 } from "lucide-react";
import type { TradeConfig } from "./TradeConfig";

const SEGMENT_ICONS = [User, Users, Building2];

interface Props {
  config: TradeConfig;
}

export function TradeSegments({ config }: Props) {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-10">
          Whether you're a one-person operation or a 20-person firm
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {config.segments.map((seg, i) => {
            const Icon = SEGMENT_ICONS[i];
            return (
              <div key={seg.label} className="text-center p-6 rounded-xl bg-card border border-border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{seg.label}</h3>
                <p className="text-sm text-muted-foreground">{seg.hook}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
