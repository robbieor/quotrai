import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="py-20 sm:py-32 px-4 sm:px-6 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[700px] h-[400px] sm:h-[700px] bg-gradient-radial from-primary/10 via-transparent to-transparent rounded-full" />
      </div>

      <div className="container mx-auto text-center relative max-w-3xl">
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight">
          Start running your business{" "}
          <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
            properly.
          </span>
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          7-day free trial · Cancel anytime
        </p>
        <Link to="/signup">
          <Button size="lg" className="text-base sm:text-xl px-8 sm:px-12 py-6 sm:py-8 font-bold btn-hover-lift gap-2">
            Start Free Trial
            <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
