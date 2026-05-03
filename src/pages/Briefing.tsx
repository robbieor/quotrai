import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Moon,
  Target,
} from "lucide-react";
import { useDailyBriefing, useRefreshBriefing, useTeamBenchmarks } from "@/hooks/useDailyBriefing";
import { useProfile } from "@/hooks/useProfile";
import { useCurrency } from "@/hooks/useCurrency";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function pct(n: number | undefined) {
  if (n == null) return "—";
  return `${Math.round((n || 0) * 100)}%`;
}

function ComparePill({
  team,
  median,
  better,
}: {
  team: number;
  median: number;
  better: "higher" | "lower";
}) {
  if (median == null || isNaN(median)) {
    return <span className="text-xs text-muted-foreground">No peer data yet</span>;
  }
  const isAbove = team > median;
  const isGood = better === "higher" ? isAbove : !isAbove;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
        isGood
          ? "bg-primary/10 text-primary"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      }`}
    >
      {isGood ? "Above" : "Below"} median
    </span>
  );
}

function BriefingPageInner() {
  const { data: briefing, isLoading, error } = useDailyBriefing();
  const refresh = useRefreshBriefing();
  const { profile } = useProfile();
  const { formatCurrency } = useCurrency();
  const { data: benchmarks } = useTeamBenchmarks(profile?.team_id);
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(" ")[0] || "boss";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ForemanAvatar size="lg" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {getGreeting()}, {firstName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Your daily briefing — what matters today.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              refresh.mutate(undefined, {
                onError: (e: any) =>
                  toast.error(e?.message || "Couldn't refresh briefing"),
              })
            }
            disabled={refresh.isPending}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refresh.isPending ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="card-pad border-destructive/30 bg-destructive/5">
            <p className="text-sm text-destructive">
              Couldn't load briefing: {(error as Error).message}
            </p>
          </Card>
        )}

        {isLoading || !briefing ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Headline */}
            <Card className="card-pad border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-card">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-base sm:text-lg leading-relaxed">
                  {briefing.headline}
                </p>
              </div>
            </Card>

            {/* Priorities */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Today's priorities
                </h2>
              </div>
              <div className="space-y-3">
                {briefing.priorities?.length ? (
                  briefing.priorities.map((p, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1">{p.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium text-foreground/80">
                              Impact:
                            </span>{" "}
                            {p.impact}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium text-primary">Action:</span>{" "}
                            {p.action}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nothing urgent today. Operations are running smooth.
                  </p>
                )}
              </div>
            </section>

            {/* Revenue / Workforce / Overnight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Revenue at risk
                  </span>
                </div>
                <p className="text-sm">{briefing.revenue_at_risk}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2 text-foreground/70">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Workforce
                  </span>
                </div>
                <p className="text-sm">{briefing.workforce}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2 text-foreground/70">
                  <Moon className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    What Revamo did overnight
                  </span>
                </div>
                <p className="text-sm">{briefing.overnight}</p>
              </Card>
            </div>

            {/* Benchmarks */}
            {benchmarks && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    How you compare
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    ({benchmarks.trade_type} · {benchmarks.country})
                  </span>
                </div>
                <Card className="p-4">
                  {benchmarks.peer?.team_count ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <BenchmarkRow
                        label="Quote close rate"
                        you={pct(benchmarks.team.close_rate)}
                        median={pct(benchmarks.peer.close_rate_median)}
                        team={benchmarks.team.close_rate}
                        peer={benchmarks.peer.close_rate_median ?? 0}
                        better="higher"
                      />
                      <BenchmarkRow
                        label="Avg quote value"
                        you={formatCurrency(benchmarks.team.avg_quote_value)}
                        median={formatCurrency(
                          benchmarks.peer.avg_quote_value_median ?? 0,
                        )}
                        team={benchmarks.team.avg_quote_value}
                        peer={benchmarks.peer.avg_quote_value_median ?? 0}
                        better="higher"
                      />
                      <BenchmarkRow
                        label="Paid on time"
                        you={pct(benchmarks.team.paid_on_time_rate)}
                        median={pct(benchmarks.peer.paid_on_time_median)}
                        team={benchmarks.team.paid_on_time_rate}
                        peer={benchmarks.peer.paid_on_time_median ?? 0}
                        better="higher"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not enough peer data in your trade and country yet — we need
                      at least 3 active teams. Check back soon.
                    </p>
                  )}
                </Card>
              </section>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => navigate("/ask")} className="gap-1.5">
                Ask Revamo a follow-up
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Back to operations
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function BenchmarkRow({
  label,
  you,
  median,
  team,
  peer,
  better,
}: {
  label: string;
  you: string;
  median: string;
  team: number;
  peer: number;
  better: "higher" | "lower";
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold">{you}</span>
        <span className="text-xs text-muted-foreground">vs {median}</span>
      </div>
      <div className="mt-1">
        <ComparePill team={team} median={peer} better={better} />
      </div>
    </div>
  );
}

export default function Briefing() {
  return (
    <ProtectedRoute>
      <BriefingPageInner />
    </ProtectedRoute>
  );
}
