import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricTile } from "@/components/dashboard/MetricTile";
import { DashboardRevenueChart } from "@/components/dashboard/DashboardRevenueChart";
import { DashboardJobStatusChart } from "@/components/dashboard/DashboardJobStatusChart";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DrillThroughDrawer, DrillColumn } from "@/components/dashboard/DrillThroughDrawer";
import { QuoteConversionFunnel } from "@/components/dashboard/QuoteConversionFunnel";
import { InvoiceAgingChart } from "@/components/dashboard/InvoiceAgingChart";
import { TopCustomersChart } from "@/components/dashboard/TopCustomersChart";
import { InsightAlerts } from "@/components/dashboard/InsightAlerts";
import { BusinessHealthPanel } from "@/components/dashboard/BusinessHealthPanel";
import { JobsDueTable } from "@/components/dashboard/JobsDueTable";
import { OverdueInvoicesTable } from "@/components/dashboard/OverdueInvoicesTable";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { TeamActivityCard } from "@/components/dashboard/TeamActivityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, DollarSign, FileText, Receipt, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { UpgradePromptBanner } from "@/components/billing/UpgradePromptBanner";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { MorningBriefingCard } from "@/components/dashboard/MorningBriefingCard";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardFilterProvider, useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { useEffect } from "react";

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

function DashboardContent() {
  const { data, isLoading } = useDashboardAnalytics();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboarding();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { formatCurrency, symbol: currencySymbol } = useCurrency();
  const queryClient = useQueryClient();

  // Drill-through state
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillColumns, setDrillColumns] = useState<DrillColumn[]>([]);
  const [drillData, setDrillData] = useState<any[]>([]);
  const [drillLink, setDrillLink] = useState<string | undefined>();

  useEffect(() => {
    if (profile?.team_id) {
      supabase.functions.invoke("check-alerts", {
        body: { team_id: profile.team_id },
      }).catch(() => {});
    }
  }, [profile?.team_id]);

  const showOnboarding = !authLoading && !onboardingLoading && user && !isOnboardingComplete;

  const handleOnboardingComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["onboarding-status", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
  };

  const openDrill = (title: string, columns: DrillColumn[], records: any[], link?: string) => {
    setDrillTitle(title);
    setDrillColumns(columns);
    setDrillData(records);
    setDrillLink(link);
    setDrillOpen(true);
  };

  const metrics = data?.metrics;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
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

        {/* Filter Bar */}
        <DashboardFilterBar />

        {/* Business Health Summary */}
        <BusinessHealthPanel insights={data?.healthInsights} isLoading={isLoading} />

        {/* Proactive Insights */}
        <InsightAlerts insights={data?.insights} />

        {/* Metrics Row */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
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
                onDrillDown={() => openDrill("Active Jobs", [
                  { key: "title", label: "Job" },
                  { key: "client", label: "Client" },
                  { key: "status", label: "Status" },
                  { key: "date", label: "Scheduled" },
                  { key: "value", label: "Value", align: "right", format: (v) => formatCurrency(v) },
                ], data?.drillData?.activeJobs || [], "/jobs")}
              />
              <MetricTile
                title="Revenue"
                value={formatCurrency(metrics?.revenueMTD || 0)}
                icon={DollarSign}
                progress={{
                  current: metrics?.revenueMTD || 0,
                  goal: metrics?.revenueGoal || 1,
                  symbol: currencySymbol,
                }}
              />
              <MetricTile
                title="Outstanding"
                value={formatCurrency(metrics?.outstandingAmount || 0)}
                icon={Receipt}
                subtitle={`${metrics?.outstandingCount || 0} invoices`}
                onDrillDown={() => openDrill("Outstanding Invoices", [
                  { key: "invoiceNumber", label: "Invoice #" },
                  { key: "client", label: "Client" },
                  { key: "amount", label: "Amount", align: "right", format: (v) => formatCurrency(v) },
                  { key: "daysOverdue", label: "Days Overdue", align: "right", format: (v) => `${v}d` },
                ], data?.drillData?.outstanding || [], "/invoices")}
              />
              <MetricTile
                title="Quotes Pending"
                value={formatCurrency(metrics?.pendingQuotesAmount || 0)}
                icon={FileText}
                subtitle={`${metrics?.pendingQuotesCount || 0} quotes`}
                onDrillDown={() => openDrill("Pending Quotes", [
                  { key: "quoteNumber", label: "Quote #" },
                  { key: "client", label: "Client" },
                  { key: "amount", label: "Amount", align: "right", format: (v) => formatCurrency(v) },
                ], data?.drillData?.pendingQuotes || [], "/quotes")}
              />
            </>
          )}
        </div>

        {/* Charts Row 1: Revenue + Quote Funnel */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DashboardRevenueChart data={data?.revenueChartData} isLoading={isLoading} />
          <QuoteConversionFunnel funnel={data?.quoteFunnel} />
        </div>

        {/* Charts Row 2: Job Status + Invoice Aging */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DashboardJobStatusChart data={data?.jobStatusData} isLoading={isLoading} />
          <InvoiceAgingChart
            agingBuckets={data?.agingBuckets}
            onBucketClick={(bucket) => {
              const invoices = data?.agingInvoices?.[bucket] || [];
              openDrill(`Invoices — ${bucket === "current" ? "Current" : bucket + " days overdue"}`, [
                { key: "invoiceNumber", label: "Invoice #" },
                { key: "client", label: "Client" },
                { key: "amount", label: "Amount", align: "right", format: (v) => formatCurrency(v) },
                { key: "daysOverdue", label: "Days Overdue", align: "right", format: (v) => `${v}d` },
              ], invoices, "/invoices");
            }}
          />
        </div>

        {/* Charts Row 3: Top Customers */}
        <div className="grid gap-4 lg:grid-cols-2">
          <TopCustomersChart customers={data?.topCustomers} />
          <div className="grid gap-4">
            {/* Summary stats cards could go here in future */}
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <JobsDueTable />
          <OverdueInvoicesTable />
        </div>

        {/* Activity Feeds */}
        <div className="grid gap-4 lg:grid-cols-2">
          <RecentActivityFeed />
          <TeamActivityCard />
        </div>
      </div>

      {/* Drill-Through Drawer */}
      <DrillThroughDrawer
        open={drillOpen}
        onOpenChange={setDrillOpen}
        title={drillTitle}
        columns={drillColumns}
        data={drillData}
        linkPrefix={drillLink}
      />

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal open={true} onComplete={handleOnboardingComplete} />
      )}
    </DashboardLayout>
  );
}

export default function Dashboard() {
  return (
    <DashboardFilterProvider>
      <DashboardContent />
    </DashboardFilterProvider>
  );
}
