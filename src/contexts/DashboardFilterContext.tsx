import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

export type TimePreset = "7d" | "30d" | "this_month" | "last_month" | "ytd" | "custom";
export type Segment = "all" | "high_risk" | "top_customers" | "jobs_at_risk" | "recent";
export type StaffFilter = "all" | "overloaded" | "underperforming" | string; // string = specific user_id

export interface CrossFilter {
  dimension: "month" | "jobStatus" | "customer" | "quoteStage" | "agingBucket";
  value: string;
}

function getDateRangeFromPreset(preset: TimePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case "7d": return { from: subDays(now, 7), to: now };
    case "30d": return { from: subDays(now, 30), to: now };
    case "this_month": return { from: startOfMonth(now), to: now };
    case "last_month": return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
    case "ytd": return { from: startOfYear(now), to: now };
    case "custom": return { from: subDays(now, 30), to: now };
  }
}

interface DashboardFilterContextType {
  dateRange: DateRange | undefined;
  timePreset: TimePreset;
  segment: Segment;
  staffId: StaffFilter;
  customerId: string | null;
  jobType: string | null;
  crossFilter: CrossFilter | null;
  setTimePreset: (p: TimePreset) => void;
  setDateRange: (r: DateRange | undefined) => void;
  setSegment: (s: Segment) => void;
  setStaffId: (id: StaffFilter) => void;
  setCustomerId: (id: string | null) => void;
  setJobType: (type: string | null) => void;
  setCrossFilter: (cf: CrossFilter | null) => void;
  clearAll: () => void;
  activeFilterCount: number;
  filterQueryKey: unknown[];
}

const DashboardFilterContext = createContext<DashboardFilterContextType | null>(null);

export function DashboardFilterProvider({ children }: { children: React.ReactNode }) {
  const [timePreset, setTimePresetState] = useState<TimePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDateRangeFromPreset("30d"));
  const [segment, setSegment] = useState<Segment>("all");
  const [staffId, setStaffId] = useState<StaffFilter>("all");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [jobType, setJobType] = useState<string | null>(null);
  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null);

  const setTimePreset = useCallback((p: TimePreset) => {
    setTimePresetState(p);
    if (p !== "custom") setDateRange(getDateRangeFromPreset(p));
  }, []);

  const clearAll = useCallback(() => {
    setTimePresetState("30d");
    setDateRange(getDateRangeFromPreset("30d"));
    setSegment("all");
    setStaffId("all");
    setCustomerId(null);
    setJobType(null);
    setCrossFilter(null);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (segment !== "all") count++;
    if (staffId !== "all") count++;
    if (customerId) count++;
    if (jobType) count++;
    if (crossFilter) count++;
    return count;
  }, [segment, staffId, customerId, jobType, crossFilter]);

  const filterQueryKey = useMemo(
    () => [dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), segment, staffId, customerId, jobType],
    [dateRange, segment, staffId, customerId, jobType]
  );

  const value = useMemo(
    () => ({
      dateRange, timePreset, segment, staffId, customerId, jobType, crossFilter,
      setTimePreset, setDateRange, setSegment, setStaffId, setCustomerId, setJobType, setCrossFilter,
      clearAll, activeFilterCount, filterQueryKey,
    }),
    [dateRange, timePreset, segment, staffId, customerId, jobType, crossFilter, setTimePreset, clearAll, activeFilterCount, filterQueryKey]
  );

  return (
    <DashboardFilterContext.Provider value={value}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters() {
  const ctx = useContext(DashboardFilterContext);
  if (!ctx) throw new Error("useDashboardFilters must be used within DashboardFilterProvider");
  return ctx;
}
