import { useDashboardFilters, TimePreset, Segment, StaffFilter } from "@/contexts/DashboardFilterContext";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, X, Calendar, Shield, Users, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAvailableJobTypes } from "@/hooks/useDashboardAnalytics";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";

const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom" },
];

const SEGMENTS: { value: Segment; label: string; description: string }[] = [
  { value: "all", label: "All Data", description: "No filter applied" },
  { value: "high_risk", label: "High Risk", description: "Overdue invoices & stuck jobs" },
  { value: "top_customers", label: "Top Customers", description: "By collected cash" },
  { value: "jobs_at_risk", label: "Jobs at Risk", description: "Stuck 7+ days" },
  { value: "recent", label: "Recent Activity", description: "Last 48 hours" },
];

const STAFF_PRESETS: { value: StaffFilter; label: string }[] = [
  { value: "all", label: "All Staff" },
  { value: "overloaded", label: "Overloaded" },
  { value: "underperforming", label: "Underperforming" },
];

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

function CompactButton({ 
  icon: Icon, label, active, onClick, className 
}: { 
  icon: React.ElementType; label: string; active?: boolean; onClick?: () => void; className?: string 
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors
        ${active 
          ? "bg-primary/10 text-primary border border-primary/20" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
        } ${className || ""}`}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      <ChevronDown className="h-2.5 w-2.5 opacity-50" />
    </button>
  );
}

export function DashboardFilterBar() {
  const {
    timePreset, setTimePreset, setDateRange, dateRange,
    segment, setSegment,
    staffId, setStaffId,
    customerId, setCustomerId,
    jobType, setJobType,
    crossFilter, setCrossFilter,
    clearAll, activeFilterCount,
  } = useDashboardFilters();
  const { data: customers } = useCustomerOptions();
  const { data: staff } = useStaffOptions();
  const jobTypes = useAvailableJobTypes();
  const totalFilters = activeFilterCount + (crossFilter ? 1 : 0);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const timeLabel = TIME_PRESETS.find((p) => p.value === timePreset)?.label || "30 days";
  const segmentLabel = SEGMENTS.find((s) => s.value === segment)?.label || "All Data";
  const staffLabel = STAFF_PRESETS.find((s) => s.value === staffId)?.label 
    || staff?.find((s) => s.id === staffId)?.name 
    || "All Staff";

  return (
    <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto scrollbar-none">
      {/* Time Preset */}
      <Popover>
        <PopoverTrigger asChild>
          <div><CompactButton icon={Calendar} label={timeLabel} active={timePreset !== "30d"} /></div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-44 p-1">
          {TIME_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setTimePreset(p.value)}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors
                ${timePreset === p.value ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"}`}
            >
              {p.label}
            </button>
          ))}
          {timePreset === "custom" && (
            <div className="p-2 border-t border-border mt-1">
              <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Focus (was Segment) */}
      <Popover>
        <PopoverTrigger asChild>
          <div><CompactButton icon={Shield} label={segment === "all" ? "Focus" : segmentLabel} active={segment !== "all"} /></div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1">
          {SEGMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSegment(s.value)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors
                ${segment === s.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
            >
              <div className="text-xs font-medium">{s.label}</div>
              <div className="text-[10px] text-muted-foreground">{s.description}</div>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Staff — hidden on small screens, available in advanced panel */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="hidden sm:block"><CompactButton icon={Users} label={staffLabel} active={staffId !== "all"} /></div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-1">
          {STAFF_PRESETS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStaffId(s.value)}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors
                ${staffId === s.value ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"}`}
            >
              {s.label}
            </button>
          ))}
          {staff && staff.length > 0 && (
            <>
              <div className="h-px bg-border my-1" />
              <div className="max-h-32 overflow-y-auto">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStaffId(s.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors
                      ${staffId === s.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Advanced Filters */}
      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetTrigger asChild>
          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <SlidersHorizontal className="h-3 w-3" />
            {totalFilters > 0 && (
              <Badge variant="default" className="h-4 px-1 text-[9px] min-w-4 justify-center">{totalFilters}</Badge>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle className="text-sm">Advanced Filters</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Customer</label>
              <Select value={customerId || "__all__"} onValueChange={(v) => setCustomerId(v === "__all__" ? null : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Customers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Customers</SelectItem>
                  {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Job Type</label>
              <Select value={jobType || "__all__"} onValueChange={(v) => setJobType(v === "__all__" ? null : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Job Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Job Types</SelectItem>
                  {jobTypes.map((jt) => <SelectItem key={jt} value={jt}>{jt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Custom Date Range</label>
              <DateRangePicker dateRange={dateRange} onDateRangeChange={(r) => { setDateRange(r); setTimePreset("custom"); }} />
            </div>
            {totalFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-xs w-full mt-2">
                <X className="h-3 w-3" /> Clear All Filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Active filter chips */}
      {(segment !== "all" || staffId !== "all" || customerId || jobType || crossFilter) && (
        <div className="flex items-center gap-1 ml-1 border-l border-border pl-2">
          {segment !== "all" && (
            <Badge variant="secondary" className="gap-1 cursor-pointer text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors" onClick={() => setSegment("all")}>
              {segmentLabel}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {staffId !== "all" && (
            <Badge variant="secondary" className="gap-1 cursor-pointer text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors" onClick={() => setStaffId("all")}>
              {staffLabel}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {customerId && (
            <Badge variant="secondary" className="gap-1 cursor-pointer text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors" onClick={() => setCustomerId(null)}>
              {customers?.find((c) => c.id === customerId)?.name || "Customer"}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {jobType && (
            <Badge variant="secondary" className="gap-1 cursor-pointer text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors" onClick={() => setJobType(null)}>
              {jobType}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {crossFilter && (
            <Badge variant="secondary" className="gap-1 cursor-pointer text-[10px] h-5 bg-accent/50 text-accent-foreground hover:bg-accent transition-colors" onClick={() => setCrossFilter(null)}>
              {crossFilter.dimension}: {crossFilter.value}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-destructive ml-0.5 transition-colors">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
