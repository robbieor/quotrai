import { FileText, Briefcase, Receipt, DollarSign, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "1",
    icon: FileText,
    title: "Create Quote",
    description: "Voice, text, or template — build a professional quote in seconds.",
  },
  {
    number: "2",
    icon: Briefcase,
    title: "Convert to Job",
    description: "One click converts an approved quote into a scheduled job.",
  },
  {
    number: "3",
    icon: Receipt,
    title: "Send Invoice",
    description: "Auto-generate the invoice from the job. Send with one tap.",
  },
  {
    number: "4",
    icon: DollarSign,
    title: "Get Paid",
    description: "Automated reminders chase payment. You stay on the tools.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10 sm:mb-14 animate-fade-up">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-4">
            Simple from{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              day one.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            No training. No onboarding call. Just start working.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-14">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative group text-center animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Connector line (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border z-0" />
              )}

              <div className="relative z-10 flex flex-col items-center">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-teal-400/20 border-2 border-primary/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-200">
                  <step.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary/60 mb-1">Step {step.number}</span>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center animate-fade-up">
          <Link to="/signup">
            <Button size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 font-semibold btn-hover-lift gap-2">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
