import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { ForemanAICard } from "@/components/dashboard/ForemanAICard";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
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

function DashboardContent() {
  const { data, isLoading } = useDashboardAnalytics();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboarding();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const { canAccessAdvancedReporting, canAccessGeorge } = useSeatAccess();
  const isMobile = useIsMobile();

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

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <UpgradePromptBanner />
        <OnboardingChecklist />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 min-w-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening across your operations.</p>
          </div>
          <DashboardFilterBar />
        </div>

        {/* Foreman AI — visually central */}
        {canAccessGeorge && (
          <AnimatedSection delay={0}>
            <ForemanAICard />
          </AnimatedSection>
        )}

        {/* Action Panel — what needs attention */}
        <AnimatedSection delay={20}>
          <ActionPanel alerts={data?.actionAlerts} />
        </AnimatedSection>

        {/* KPI Strip */}
        <AnimatedSection delay={40}>
          <KPIStrip data={data?.kpi} isLoading={isLoading} onDrillDown={handleKPIDrillDown} />
        </AnimatedSection>

        {/* Analytics */}
        <AnimatedSection delay={80}>
          <div className="grid gap-5 lg:grid-cols-2">
            <RevenueMultiChart data={data?.revenueChartData} isLoading={isLoading} />
            <QuotePipelineCard data={data?.quoteFunnel} />
          </div>
        </AnimatedSection>

        {/* Revenue by Job Type */}
        <AnimatedSection delay={100}>
          <div className="grid gap-5 lg:grid-cols-2">
            <RevenueByJobTypeChart data={data?.revenueByJobType} isLoading={isLoading} />
            <div />
          </div>
        </AnimatedSection>

        {/* Operational Tables */}
        <AnimatedSection delay={120}>
          <div className="grid gap-5 lg:grid-cols-2">
            <JobsAtRiskTable data={data?.jobsAtRisk} />
            <InvoiceRiskTable data={data?.invoicesAtRisk} />
          </div>
        </AnimatedSection>

        {/* Management Insights — gated */}
        <AnimatedSection delay={160}>
          <div className="grid gap-5 lg:grid-cols-2">
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

        <AnimatedSection delay={200}>
          <TopCustomersTable data={data?.topCustomers} />
        </AnimatedSection>
      </div>

      <DrillThroughDrawer
        open={drillOpen}
        onOpenChange={setDrillOpen}
        title={drillTitle}
        columns={drillColumns}
        data={drillData}
        linkPrefix={drillLink}
      />

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
