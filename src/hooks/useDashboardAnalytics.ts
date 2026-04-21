import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";

// Job type keyword list (kept for useAvailableJobTypes)
const JOB_TYPE_KEYWORDS: Record<string, string[]> = {
  "Plumbing & Heating": ["plumb","boiler","heating","radiator","pipe","water","leak","tap","shower","bathroom"],
  "Electrical": ["electri","wiring","socket","fuse","light","switch","rewire","circuit"],
  "Carpentry": ["carpent","wood","door","window","cabinet","shelf","deck","fence"],
  "Painting & Decorating": ["paint","decorat","wallpaper","plaster","render"],
  "Roofing": ["roof","gutter","slate","tile","chimney","flashing"],
  "General Maintenance": ["repair","fix","maintain","service","inspect","general"],
  "Landscaping": ["garden","landscape","lawn","tree","paving","driveway"],
  "HVAC": ["hvac","air con","ventilat","duct","heat pump"],
};

export function useAvailableJobTypes() {
  return Object.keys(JOB_TYPE_KEYWORDS).concat("Other");
}

// ── Interfaces (unchanged — consumed by dashboard components) ────

export interface ControlHeaderData {
  totalOverdue: number;
  overdueCount: number;
  quotesNeedFollowUp: number;
  quotesFollowUpValue: number;
  stuckJobs: number;
  aiRecommendation: string;
}

export interface KPIData {
  cashCollectedMTD: number;
  cashCollectedCount: number;
  outstandingAR: number;
  outstandingARCount: number;
  overdue30Plus: number;
  overdue30PlusCount: number;
  revenueMTD: number;
  revenueLastMonth: number;
  revenueChangePercent: number;
  comparisonLabel: string;
  activeJobs: number;
  stuckJobs: number;
  moneyOut: number;
  moneyOutCount: number;
  unreviewedReceipts: number;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  count: number;
}

export interface RevenueByJobTypeData {
  type: string;
  revenue: number;
  count: number;
}

export interface ActionAlert {
  id: string;
  severity: "critical" | "warning" | "opportunity";
  message: string;
  value: string;
  rawValue?: number;
  isCurrency?: boolean;
  href: string;
}

export interface JobAtRisk {
  id: string;
  title: string;
  customer: string;
  status: string;
  daysInStage: number;
  value: number;
}

export interface InvoiceAtRisk {
  id: string;
  customer: string;
  totalDue: number;
  oldestInvoice: string;
  daysOverdue: number;
  riskScore: "high" | "medium" | "low";
  riskPoints: number;
  avgDaysToPay: number;
  latePaymentRate: number;
}

export interface QuoteFunnelData {
  created: number;
  sent: number;
  approved: number;
  won: number;
  lost: number;
  createdValue: number;
  sentValue: number;
  approvedValue: number;
  wonValue: number;
  lostValue: number;
  avgDaysToWin: number;
  staleQuotes: number;
}

export interface CustomerProfitData {
  id: string;
  name: string;
  revenue: number;
  jobCount: number;
  invoiceCount: number;
}

export interface SubscriptionCoveredData {
  feeEarned: number;
  subscriptionCost: number;
  percentCovered: number;
}

export interface ScatterCustomerData {
  id: string;
  name: string;
  revenue: number;
  profit: number;
  profitMargin: number;
  jobCount: number;
  avgDaysToPay: number;
  latePaymentRate: number;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useDashboardAnalytics() {
  const { user } = useAuth();
  const { dateRange, customerId, staffId, jobType, segment, crossFilter, filterQueryKey } = useDashboardFilters();

  return useQuery({
    queryKey: ["dashboard-analytics", ...filterQueryKey],
    enabled: !!user,
    queryFn: async () => {
      const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
      const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

      const { data, error } = await supabase.functions.invoke("dashboard-analytics", {
        body: { fromDate, toDate, customerId, staffId, jobType, segment, crossFilter },
      });

      if (error) throw error;
      return data as {
        metrics: any;
        controlHeader: ControlHeaderData;
        kpi: KPIData;
        actionAlerts: ActionAlert[];
        revenueChartData: any[];
        jobStatusData: any[];
        quoteFunnel: QuoteFunnelData;
        agingBuckets: { current: number; "1-30": number; "31-60": number; "60+": number };
        agingInvoices: Record<string, any[]>;
        topCustomers: CustomerProfitData[];
        customerProfitability: ScatterCustomerData[];
        jobsAtRisk: JobAtRisk[];
        invoicesAtRisk: InvoiceAtRisk[];
        revenueByJobType: RevenueByJobTypeData[];
        subscriptionCovered: SubscriptionCoveredData;
        expensesByCategory: ExpenseCategoryBreakdown[];
        drillData: { activeJobs: any[]; outstanding: any[]; pendingQuotes: any[]; cashCollected: any[]; revenueInvoices: any[]; expenses: any[] };
        jobsDueThisWeek: any[];
        overdueInvoices: any[];
        insights: any[];
        healthInsights: any[];
      };
    },
  });
}
