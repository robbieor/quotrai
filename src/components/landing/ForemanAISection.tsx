import { Bot, Mic, ArrowRight, CheckCircle2 } from "lucide-react";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";

interface ForemanAISectionProps {
  formatPrice: (eur: number, decimals?: number) => string;
}

export function ForemanAISection({ formatPrice }: ForemanAISectionProps) {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">revamo AI</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-4 leading-tight">
              It already knows{" "}
              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                what you need.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground mb-6 leading-relaxed">
              revamo AI doesn't wait for instructions. It monitors your operations,
              identifies risks, and takes action — while you stay on the tools.
            </p>

            <ul className="space-y-3">
              {[
                "Detects risks before you notice them",
                "Chases payments without being told",
                "Briefs you every morning on what matters",
                "Voice or text — your choice",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — Chat interaction mock */}
          <div>
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-primary/5">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-3">
                <ForemanAvatar size="md" className="border-2 border-[#059669]/30" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">revamo AI</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-5 space-y-4">
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground">"Create a quote for EV charger install"</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <ForemanAvatar size="sm" className="mt-0.5" />
                  <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground mb-1">✅ Quote <span className="font-semibold text-primary">Q-0048</span> created — {formatPrice(1300, 2)}</p>
                    <p className="text-xs text-muted-foreground">Sent to client. Ready for approval.</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground">"Send invoice and follow up if unpaid"</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <ForemanAvatar size="sm" className="mt-0.5" />
                  <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-2.5">
                    <p className="text-sm text-foreground">✅ Invoice sent. Reminder set for 7 days.</p>
                  </div>
                </div>
              </div>

              {/* Input mock */}
              <div className="px-5 py-3 border-t border-border bg-muted/20">
                <div className="flex items-center gap-2 bg-background rounded-xl border border-border px-4 py-2.5">
                  <Mic className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground flex-1">Talk or type to revamo AI...</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
