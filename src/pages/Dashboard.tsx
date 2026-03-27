import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ControlHeader } from "@/components/dashboard/ControlHeader";
import { KPIStrip } from "@/components/dashboard/KPIStrip";
import { ActionPanel } from "@/components/dashboard/ActionPanel";
import { RevenueMultiChart } from "@/components/dashboard/RevenueMultiChart";
import { QuotePipelineCard } from "@/components/dashboard/QuotePipelineCard";
import { InvoiceAgingChart } from "@/components/dashboard/InvoiceAgingChart";
import { JobsAtRiskTable } from "@/components/dashboard/JobsAtRiskTable";
import { InvoiceRiskTable } from "@/components/dashboard/InvoiceRiskTable";
import { TopCustomersTable } from "@/components/dashboard/TopCustomersTable";
import { CustomerProfitabilityScatter } from "@/components/dashboard/CustomerProfitabilityScatter";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DrillThroughDrawer, DrillColumn } from "@/components/dashboard/DrillThroughDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, FileText, Receipt, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { UpgradePromptBanner } from "@/components/billing/UpgradePromptBanner";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardFilterProvider } from "@/contexts/DashboardFilterContext";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { AnimatedSection } from "@/components/dashboard/AnimatedSection";
import { PlanGate } from "@/components/dashboard/PlanGate";
import { RevenueByJobTypeChart } from "@/components/dashboard/RevenueByJobTypeChart";
import { useSeatAccess } from "@/hooks/useSeatAccess";
import { useEffect } from "react";
import { EndOfDaySummary } from "@/components/dashboard/EndOfDaySummary";

const quickActions = [
  { label: "New Quote", icon: FileText, route: "/quotes" },
  { label: "New Invoice", icon: Receipt, route: "/invoices" },
  { label: "New Job", icon: Briefcase, route: "/jobs" },
];

function DashboardContent() {
  const { data, isLoading } = useDashboardAnalytics();
  const { isOnboardingComplete, savedStep, isLoading: onboardingLoading } = useOnboarding();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const { canAccessAdvancedReporting, canAccessGeorge } = useSeatAccess();

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

  const handleKPIDrillDown = (metric: string) => {
    if (metric === "outstanding") {
      openDrill("Outstanding Invoices", [
        { key: "invoiceNumber", label: "Invoice #" },
        { key: "client", label: "Client" },
        { key: "amount", label: "Amount", align: "right", format: (v) => formatCurrency(v) },
        { key: "daysOverdue", label: "Days Overdue", align: "right", format: (v) => `${v}d` },
      ], data?.drillData?.outstanding || [], "/invoices");
    } else if (metric === "overdue30") {
      navigate("/invoices?status=overdue");
    } else if (metric === "jobs") {
      navigate("/jobs?status=in_progress");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-2 sm:space-y-3">
        <EndOfDaySummary />
        <UpgradePromptBanner />
        <OnboardingChecklist />

        {/* Header bar with filters + quick actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 overflow-x-auto scrollbar-none">
            <h1 className="text-lg font-semibold text-foreground shrink-0">Dashboard</h1>
            <DashboardFilterBar />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant="outline"
                onClick={() => navigate(action.route)}
                className="gap-1 text-xs h-7"
              >
                <action.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{action.label.replace("New ", "")}</span>
                <Plus className="h-2.5 w-2.5" />
              </Button>
            ))}
          </div>
        </div>

        {/* 1. Control Header — operational summary */}
        <AnimatedSection delay={0}>
          <ControlHeader data={data?.controlHeader} isLoading={isLoading} showAI={canAccessGeorge} />
        </AnimatedSection>

        {/* 2. KPI Strip — 5 key metrics */}
        <AnimatedSection delay={40}>
          <KPIStrip data={data?.kpi} isLoading={isLoading} onDrillDown={handleKPIDrillDown} />
        </AnimatedSection>

        {/* 3. Action Panel — priority alerts */}
        <AnimatedSection delay={80}>
          <ActionPanel alerts={data?.actionAlerts} />
        </AnimatedSection>

        {/* 4. Analytics Zone — Revenue + Quote Pipeline */}
        <AnimatedSection delay={120}>
          <div className="grid gap-3 lg:grid-cols-2">
            <RevenueMultiChart data={data?.revenueChartData} isLoading={isLoading} />
            <QuotePipelineCard data={data?.quoteFunnel} />
          </div>
        </AnimatedSection>

        {/* 4b. Revenue by Job Type */}
        <AnimatedSection delay={140}>
          <div className="grid gap-3 lg:grid-cols-2">
            <RevenueByJobTypeChart data={data?.revenueByJobType} isLoading={isLoading} />
            <div /> {/* Placeholder for balance */}
          </div>
        </AnimatedSection>

        {/* 5. Operational Tables — Jobs at Risk + Invoice Risk */}
        <AnimatedSection delay={160}>
          <div className="grid gap-3 lg:grid-cols-2">
            <JobsAtRiskTable data={data?.jobsAtRisk} />
            <InvoiceRiskTable data={data?.invoicesAtRisk} />
          </div>
        </AnimatedSection>

        {/* 6. Management Insights — gated to Grow */}
        <AnimatedSection delay={200}>
          <div className="grid gap-3 lg:grid-cols-2">
            <PlanGate requiredSeat="grow" featureLabel="Customer Profitability">
              <CustomerProfitabilityScatter data={data?.customerProfitability} isLoading={isLoading} />
            </PlanGate>
            <PlanGate requiredSeat="grow" featureLabel="Invoice Aging Analysis">
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
            </PlanGate>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={240}>
          <TopCustomersTable data={data?.topCustomers} />
        </AnimatedSection>
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
        <OnboardingModal open={true} onComplete={handleOnboardingComplete} initialStep={savedStep} />
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
