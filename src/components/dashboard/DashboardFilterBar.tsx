import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAvailableJobTypes } from "@/hooks/useDashboardAnalytics";
import { useProfile } from "@/hooks/useProfile";

function useCustomerOptions() {
  return useQuery({
    queryKey: ["dashboard-customer-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, name").order("name").limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

function useStaffOptions() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ["dashboard-staff-options", profile?.team_id],
    enabled: !!profile?.team_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("user_id, profiles:user_id(full_name)")
        .eq("team_id", profile!.team_id!);
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.full_name || "Team Member",
      }));
    },
  });
}

function FilterControls({ className }: { className?: string }) {
  const { dateRange, setDateRange, customerId, setCustomerId, jobType, setJobType, staffId, setStaffId, clearAll, activeFilterCount, crossFilter, setCrossFilter } = useDashboardFilters();
  const { data: customers } = useCustomerOptions();
  const { data: staff } = useStaffOptions();
  const jobTypes = useAvailableJobTypes();

  return (
    <div className={className}>
      <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />

      <Select value={customerId || "__all__"} onValueChange={(v) => setCustomerId(v === "__all__" ? null : v)}>
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <SelectValue placeholder="All Customers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Customers</SelectItem>
          {customers?.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={jobType || "__all__"} onValueChange={(v) => setJobType(v === "__all__" ? null : v)}>
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <SelectValue placeholder="All Job Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Job Types</SelectItem>
          {jobTypes.map((jt) => (
            <SelectItem key={jt} value={jt}>{jt}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={staffId || "__all__"} onValueChange={(v) => setStaffId(v === "__all__" ? null : v)}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="All Staff" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Staff</SelectItem>
          {staff?.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(activeFilterCount > 0 || crossFilter) && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-xs text-muted-foreground">
          <X className="h-3 w-3" /> Clear
        </Button>
      )}

      {crossFilter && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setCrossFilter(null)}>
          {crossFilter.dimension}: {crossFilter.value}
          <X className="h-3 w-3" />
        </Badge>
      )}
    </div>
  );
}

export function DashboardFilterBar() {
  const { activeFilterCount, crossFilter } = useDashboardFilters();
  const totalFilters = activeFilterCount + (crossFilter ? 1 : 0);

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block bg-card border border-border rounded-lg p-3">
        <FilterControls className="flex items-center gap-3 flex-wrap" />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 w-full">
              <Filter className="h-4 w-4" />
              Filters
              {totalFilters > 0 && (
                <Badge variant="default" className="h-5 px-1.5 text-[10px]">{totalFilters}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Dashboard Filters</SheetTitle>
            </SheetHeader>
            <FilterControls className="flex flex-col gap-3 mt-4 [&>*]:w-full [&>div]:w-full [&_.w-\\[280px\\]]:w-full [&_.w-\\[180px\\]]:w-full [&_.w-\\[160px\\]]:w-full" />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
