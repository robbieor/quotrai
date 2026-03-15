import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricTile } from "@/components/dashboard/MetricTile";
import { DashboardRevenueChart } from "@/components/dashboard/DashboardRevenueChart";
import { DashboardJobStatusChart } from "@/components/dashboard/DashboardJobStatusChart";
import { JobsDueTable } from "@/components/dashboard/JobsDueTable";
import { OverdueInvoicesTable } from "@/components/dashboard/OverdueInvoicesTable";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { TeamActivityCard } from "@/components/dashboard/TeamActivityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, DollarSign, FileText, Receipt, Plus } from "lucide-react";
import { useDashboardMetrics } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { ExpenseEmailBanner } from "@/components/expenses/ExpenseEmailBanner";
import { UpgradePromptBanner } from "@/components/billing/UpgradePromptBanner";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { MorningBriefingCard } from "@/components/dashboard/MorningBriefingCard";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { useQueryClient } from "@tanstack/react-query";

function MetricSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

const quickActions = [
  { label: "New Quote", icon: FileText, route: "/quotes" },
  { label: "New Invoice", icon: Receipt, route: "/invoices" },
  { label: "New Job", icon: Briefcase, route: "/jobs" },
];

export default function Dashboard() {
  const { data: metrics, isLoading } = useDashboardMetrics();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboarding();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { formatCurrency, symbol: currencySymbol } = useCurrency();
  const queryClient = useQueryClient();

  // Fire alert checks on dashboard load
  useEffect(() => {
    if (profile?.team_id) {
      supabase.functions.invoke("check-alerts", {
        body: { team_id: profile.team_id },
      }).catch(() => {}); // fire and forget
    }
  }, [profile?.team_id]);

  const showOnboarding = !authLoading && !onboardingLoading && user && !isOnboardingComplete;

  const handleOnboardingComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["onboarding-status", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <UpgradePromptBanner />
        <OnboardingChecklist />
        <MorningBriefingCard />
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-lg p-4">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                onClick={() => navigate(action.route)}
                className="gap-1 sm:gap-2 text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <action.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{action.label}</span>
                <span className="sm:hidden">{action.label.replace("New ", "")}</span>
                <Plus className="h-3 w-3" />
              </Button>
            ))}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          ) : (
            <>
              <MetricTile
                title="Active Jobs"
                value={String(metrics?.activeJobs || 0)}
                icon={Briefcase}
                trend={metrics?.activeJobsTrend}
                subtitle="vs last week"
                href="/jobs"
              />
              <MetricTile
                title="Revenue MTD"
                value={formatCurrency(metrics?.revenueMTD || 0)}
                icon={DollarSign}
                progress={{
                  current: metrics?.revenueMTD || 0,
                  goal: metrics?.revenueGoal || 10000,
                  symbol: currencySymbol,
                }}
                href="/reports"
              />
              <MetricTile
                title="Outstanding"
                value={formatCurrency(metrics?.outstandingAmount || 0)}
                icon={Receipt}
                subtitle={`${metrics?.outstandingCount || 0} invoices`}
                href="/invoices"
              />
              <MetricTile
                title="Quotes Pending"
                value={formatCurrency(metrics?.pendingQuotesAmount || 0)}
                icon={FileText}
                subtitle={`${metrics?.pendingQuotesCount || 0} quotes`}
                href="/quotes"
              />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DashboardRevenueChart />
          <DashboardJobStatusChart />
        </div>

        {/* Tables Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <JobsDueTable />
          <OverdueInvoicesTable />
        </div>

        {/* Email-to-Expense Promo */}
        <ExpenseEmailBanner />

        {/* Activity Feeds */}
        <div className="grid gap-4 lg:grid-cols-2">
          <RecentActivityFeed />
          <TeamActivityCard />
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal open={true} onComplete={handleOnboardingComplete} />
      )}
    </DashboardLayout>
  );
}
