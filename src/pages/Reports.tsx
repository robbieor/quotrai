import { useState } from "react";
import { subMonths, startOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { DollarSign, TrendingUp, Users, Briefcase } from "lucide-react";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { JobStatusChart } from "@/components/reports/JobStatusChart";
import { QuoteConversionChart } from "@/components/reports/QuoteConversionChart";
import { TopCustomersCard } from "@/components/reports/TopCustomersCard";
import { OutstandingInvoicesCard } from "@/components/reports/OutstandingInvoicesCard";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { RevenueExpenseChart } from "@/components/reports/RevenueExpenseChart";
import { QuoteFunnelChart } from "@/components/reports/QuoteFunnelChart";
import { JobPerformanceRadar } from "@/components/reports/JobPerformanceRadar";
import { JobTrendsChart } from "@/components/reports/JobTrendsChart";
import {
  useReportStats,
  useMonthlyRevenue,
  useJobStatusMetrics,
  useQuoteConversionMetrics,
  useTopCustomers,
} from "@/hooks/useReports";
import {
  useRevenueVsExpenses,
  useQuoteFunnel,
  useJobPerformance,
  useMonthlyJobTrends,
} from "@/hooks/useAdvancedReports";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <Skeleton className="h-8 w-20 mt-2" />
      <Skeleton className="h-3 w-16 mt-1" />
    </div>
  );
}

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(startOfMonth(new Date()), 5),
    to: new Date(),
  });

  const { data: stats, isLoading: statsLoading } = useReportStats(dateRange);
  const { data: monthlyRevenue, isLoading: revenueLoading } = useMonthlyRevenue(dateRange);
  const { data: jobMetrics, isLoading: jobsLoading } = useJobStatusMetrics(dateRange);
  const { data: quoteMetrics, isLoading: quotesLoading } = useQuoteConversionMetrics(dateRange);
  const { data: topCustomers, isLoading: customersLoading } = useTopCustomers(dateRange);

  const { data: revenueExpenses, isLoading: revenueExpensesLoading } = useRevenueVsExpenses(dateRange);
  const { data: quoteFunnel, isLoading: funnelLoading } = useQuoteFunnel(dateRange);
  const { data: jobPerformance, isLoading: performanceLoading } = useJobPerformance(dateRange);
  const { data: jobTrends, isLoading: trendsLoading } = useMonthlyJobTrends(dateRange);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">Reports</h1>
          </div>
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Total Revenue"
                value={`$${(stats?.totalRevenue || 0).toLocaleString()}`}
                icon={DollarSign}
                description="In selected period"
                href="/invoices"
              />
              <StatCard
                title="Average Job Value"
                value={`$${Math.round(stats?.averageJobValue || 0).toLocaleString()}`}
                icon={TrendingUp}
                href="/jobs"
              />
              <StatCard
                title="New Customers"
                value={(stats?.totalCustomers || 0).toString()}
                icon={Users}
                description="In selected period"
                href="/customers"
              />
              <StatCard
                title="Jobs Completed"
                value={(stats?.jobsCompleted || 0).toString()}
                icon={Briefcase}
                description="In selected period"
                href="/jobs"
              />
            </>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 text-xs sm:text-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <RevenueChart data={monthlyRevenue || []} isLoading={revenueLoading} />
              <QuoteConversionChart data={quoteMetrics || []} isLoading={quotesLoading} />
              <JobStatusChart data={jobMetrics || []} isLoading={jobsLoading} />
              <TopCustomersCard data={topCustomers || []} isLoading={customersLoading} />
              <OutstandingInvoicesCard stats={stats} isLoading={statsLoading} />
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <RevenueExpenseChart data={revenueExpenses || []} isLoading={revenueExpensesLoading} />
              <QuoteFunnelChart data={quoteFunnel || []} isLoading={funnelLoading} />
              <RevenueChart data={monthlyRevenue || []} isLoading={revenueLoading} />
              <OutstandingInvoicesCard stats={stats} isLoading={statsLoading} />
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <JobTrendsChart data={jobTrends || []} isLoading={trendsLoading} />
              <JobPerformanceRadar data={jobPerformance || []} isLoading={performanceLoading} />
              <JobStatusChart data={jobMetrics || []} isLoading={jobsLoading} />
              <TopCustomersCard data={topCustomers || []} isLoading={customersLoading} />
            </div>
          </TabsContent>
        </Tabs>
        <div className="pb-24" />
      </div>
    </DashboardLayout>
  );
}
