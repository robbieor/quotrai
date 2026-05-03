import { Plug, Droplets, Hammer, Wrench, Star, FileText, Receipt, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const trades = [
  { icon: Plug, name: "Electricians" },
  { icon: Droplets, name: "Plumbers" },
  { icon: Hammer, name: "Contractors" },
  { icon: Wrench, name: "Installers" },
];

export function SocialProofSection() {
  const { data: stats } = useQuery({
    queryKey: ["landing-live-stats"],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [quotesRes, invoicesRes] = await Promise.all([
        supabase.from("quotes").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
        supabase.from("invoices").select("total", { count: "exact", head: false }).gte("created_at", weekAgo),
      ]);

      const totalInvoiced = (invoicesRes.data || []).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      return {
        quotesThisWeek: quotesRes.count || 0,
        invoicedThisWeek: totalInvoiced,
      };
    },
    staleTime: 5 * 60_000,
  });

  const hasStats = stats && (stats.quotesThisWeek > 5 || stats.invoicedThisWeek > 500);

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Star className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-primary">Built for the Trade</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-10">
          Built for{" "}
          <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
            real trades businesses.
          </span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {trades.map((trade) => (
            <div
              key={trade.name}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:-translate-y-1 transition-all duration-200"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <trade.icon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{trade.name}</span>
            </div>
          ))}
        </div>

        {/* Live stats or placeholder */}
        {hasStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-lg font-bold text-foreground">{stats.quotesThisWeek}</p>
                <p className="text-xs text-muted-foreground">quotes created this week</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-lg font-bold text-foreground">
                  €{Math.round(stats.invoicedThisWeek).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">invoiced through revamo</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl border-2 border-dashed border-border bg-muted/20">
            <p className="text-sm text-muted-foreground italic">
              "Join the growing community of tradespeople running their business with revamo."
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
