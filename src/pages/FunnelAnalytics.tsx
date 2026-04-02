import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, FileText, Receipt, CreditCard, ArrowDown } from "lucide-react";

interface FunnelStep {
  label: string;
  count: number;
  icon: typeof Users;
  color: string;
}

export default function FunnelAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["funnel-analytics"],
    queryFn: async () => {
      const [profilesRes, onboardedRes, quotesRes, invoicesRes, subscriptionsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_completed", true),
        supabase.from("quotes").select("team_id", { count: "exact", head: true }),
        supabase.from("invoices").select("team_id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      return {
        signups: profilesRes.count || 0,
        onboarded: onboardedRes.count || 0,
        firstQuote: quotesRes.count || 0,
        firstInvoice: invoicesRes.count || 0,
        paying: subscriptionsRes.count || 0,
      };
    },
    staleTime: 60_000,
  });

  const steps: FunnelStep[] = data
    ? [
        { label: "Signups", count: data.signups, icon: Users, color: "text-blue-500" },
        { label: "Onboarded", count: data.onboarded, icon: BarChart3, color: "text-teal-500" },
        { label: "First Quote", count: data.firstQuote, icon: FileText, color: "text-primary" },
        { label: "First Invoice", count: data.firstInvoice, icon: Receipt, color: "text-amber-500" },
        { label: "Paying", count: data.paying, icon: CreditCard, color: "text-green-500" },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversion Funnel</h1>
          <p className="text-muted-foreground">
            Signup → Onboarding → First Quote → First Invoice → Payment
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Funnel Overview</CardTitle>
            <CardDescription>Track where users drop off in the activation journey</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, i) => {
                  const prevCount = i === 0 ? step.count : steps[i - 1].count;
                  const conversionRate = prevCount > 0 ? ((step.count / prevCount) * 100).toFixed(1) : "0";
                  const widthPercent = steps[0].count > 0 ? Math.max((step.count / steps[0].count) * 100, 5) : 100;

                  return (
                    <div key={step.label}>
                      {i > 0 && (
                        <div className="flex items-center justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground ml-1">{conversionRate}%</span>
                        </div>
                      )}
                      <div
                        className="flex items-center gap-3 rounded-xl border border-border p-4 transition-all"
                        style={{ width: `${widthPercent}%`, minWidth: "200px" }}
                      >
                        <step.icon className={`h-5 w-5 ${step.color} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{step.label}</p>
                        </div>
                        <span className="text-lg font-bold text-foreground">{step.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
