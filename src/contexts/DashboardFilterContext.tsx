import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { startOfYear } from "date-fns";

export interface CrossFilter {
  dimension: "month" | "jobStatus" | "customer" | "quoteStage" | "agingBucket";
  value: string;
}

interface DashboardFilters {
  dateRange: DateRange | undefined;
  customerId: string | null;
  jobType: string | null;
  staffId: string | null;
  crossFilter: CrossFilter | null;
}

interface DashboardFilterContextType extends DashboardFilters {
  setDateRange: (range: DateRange | undefined) => void;
  setCustomerId: (id: string | null) => void;
  setJobType: (type: string | null) => void;
  setStaffId: (id: string | null) => void;
  setCrossFilter: (cf: CrossFilter | null) => void;
  clearAll: () => void;
  activeFilterCount: number;
  filterQueryKey: unknown[];
}

const DashboardFilterContext = createContext<DashboardFilterContextType | null>(null);

export function DashboardFilterProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfYear(new Date()),
    to: new Date(),
  });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [jobType, setJobType] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null);

  const clearAll = useCallback(() => {
    setDateRange({ from: startOfYear(new Date()), to: new Date() });
    setCustomerId(null);
    setJobType(null);
    setStaffId(null);
    setCrossFilter(null);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (customerId) count++;
    if (jobType) count++;
    if (staffId) count++;
    if (crossFilter) count++;
    return count;
  }, [customerId, jobType, staffId, crossFilter]);

  const filterQueryKey = useMemo(
    () => [dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), customerId, jobType, staffId],
    [dateRange, customerId, jobType, staffId]
  );

  const value = useMemo(
    () => ({
      dateRange, customerId, jobType, staffId, crossFilter,
      setDateRange, setCustomerId, setJobType, setStaffId, setCrossFilter,
      clearAll, activeFilterCount, filterQueryKey,
    }),
    [dateRange, customerId, jobType, staffId, crossFilter, clearAll, activeFilterCount, filterQueryKey]
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
