import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="py-24 sm:py-40 px-4 sm:px-6 relative">
      {/* Soft radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] glow-orb" />
      </div>

      <div className="container mx-auto text-center relative max-w-2xl">
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 leading-[1.1] tracking-tight">
          Run your business{" "}
          <span className="text-gradient-teal">properly.</span>
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground mb-10 max-w-md mx-auto">
          30-day free trial · No credit card · Cancel anytime
        </p>
        <Link to="/signup">
          <Button size="lg" className="text-lg sm:text-xl px-10 sm:px-14 py-7 sm:py-8 font-bold rounded-2xl btn-hover-lift gap-2.5 shadow-lg shadow-primary/20">
            Start Free Trial
            <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
