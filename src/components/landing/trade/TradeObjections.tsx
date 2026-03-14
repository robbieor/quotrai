import { MessageCircleQuestion } from "lucide-react";
import type { TradeConfig } from "./TradeConfig";

interface Props {
  config: TradeConfig;
}

export function TradeObjections({ config }: Props) {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            "But will it work for me?"
          </h2>
          <p className="text-muted-foreground">
            We hear these all the time. Here's the honest answer.
          </p>
        </div>
        <div className="space-y-4">
          {config.objections.map((o) => (
            <div key={o.objection} className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-start gap-3">
                <MessageCircleQuestion className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">"{o.objection}"</p>
                  <p className="text-sm text-muted-foreground mt-2">{o.response}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
