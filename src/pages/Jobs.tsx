import { useState, useMemo, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrency } from "@/hooks/useCurrency";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MoreVertical, Pencil, Trash2, Briefcase, TrendingUp, TrendingDown, CalendarDays, CheckCircle2, Activity, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { JobFormDialog } from "@/components/jobs/JobFormDialog";
import { DeleteJobDialog } from "@/components/jobs/DeleteJobDialog";
import {
  useJobs,
  useUpdateJob,
  useDeleteJob,
  JOB_STATUSES,
  type Job,
  type JobStatus,
} from "@/hooks/useJobs";
import { useCreateJobWithSite } from "@/hooks/useCreateJobWithSite";
import { EmptyState } from "@/components/shared/EmptyState";
import { JobDetailSheet } from "@/components/jobs/JobDetailSheet";
import { SortableHeader } from "@/components/shared/table/SortableHeader";
import { TableSelectionBar } from "@/components/shared/table/TableSelectionBar";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableSelection } from "@/hooks/useTableSelection";
import { InsightAlerts } from "@/components/dashboard/InsightAlerts";
import { useJobInsights } from "@/hooks/usePageInsights";
import { ReadOnlyGuard } from "@/components/auth/ReadOnlyGuard";
import { safeFormatDate } from "@/lib/pdf/dateUtils";

const statusBadgeVariant: Record<JobStatus, "warning" | "default" | "secondary" | "success" | "destructive" | "outline"> = {
  pending: "warning",
  scheduled: "default",
  in_progress: "secondary",
  completed: "success",
  cancelled: "outline",
};

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: jobs, isLoading, error } = useJobs();
  const createJobWithSite = useCreateJobWithSite();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && jobs && jobs.length > 0) {
      const target = jobs.find((j) => j.id === highlightId);
      if (target) {
        setDetailJob(target);
        setSearchParams((prev) => { prev.delete("highlight"); return prev; }, { replace: true });
      }
    }
  }, [searchParams, jobs, setSearchParams]);

  const filteredJobs = useMemo(() => {
    return (jobs || []).filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  const { sortedData, handleSort, getSortDirection } = useTableSort(filteredJobs);
  const { selectedRows, allSelected, someSelected, handleCheckboxChange, handleSelectAll, clearSelection } = useTableSelection(sortedData.length);
  const jobInsights = useJobInsights(jobs);
  const isMobile = useIsMobile();

  // Stats
  const stats = useMemo(() => {
    if (!jobs || jobs.length === 0) return { active: 0, scheduledWeek: 0, pipelineValue: 0, completedMonth: 0, prevMonthCompleted: 0 };
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    const active = jobs.filter((j) => j.status === "in_progress" || j.status === "scheduled").length;
    const scheduledWeek = jobs.filter((j) => j.scheduled_date && isWithinInterval(new Date(j.scheduled_date), { start: weekStart, end: weekEnd })).length;
    const pipelineValue = jobs.filter((j) => j.status !== "completed" && j.status !== "cancelled").reduce((sum, j) => sum + (j.estimated_value || 0), 0);
    const completedMonth = jobs.filter((j) => j.status === "completed" && j.updated_at && isWithinInterval(new Date(j.updated_at), { start: monthStart, end: monthEnd })).length;
    const prevMonthCompleted = jobs.filter((j) => j.status === "completed" && j.updated_at && isWithinInterval(new Date(j.updated_at), { start: prevMonthStart, end: prevMonthEnd })).length;

    return { active, scheduledWeek, pipelineValue, completedMonth, prevMonthCompleted };
  }, [jobs]);

  const completedChange = stats.prevMonthCompleted > 0
    ? Math.round(((stats.completedMonth - stats.prevMonthCompleted) / stats.prevMonthCompleted) * 100)
    : stats.completedMonth > 0 ? 100 : 0;

  const handleCreateOrUpdate = (values: {
    title: string;
    description?: string;
    customer_id: string;
    status: JobStatus;
    scheduled_date?: string | null;
    scheduled_time?: string | null;
    estimated_value?: number | null;
    location?: import("@/components/jobs/JobFormDialog").JobLocationData;
  }) => {
    const { location, ...jobValues } = values;
    if (selectedJob) {
      updateJob.mutate({ id: selectedJob.id, ...jobValues }, { onSuccess: () => { setFormDialogOpen(false); setSelectedJob(null); } });
    } else {
      createJobWithSite.mutate({ job: jobValues, autoCreateSite: !!location, siteLocation: location }, { onSuccess: () => { setFormDialogOpen(false); } });
    }
  };

  const handleDelete = () => {
    if (selectedJob) {
      deleteJob.mutate(selectedJob.id, { onSuccess: () => { setDeleteDialogOpen(false); setSelectedJob(null); } });
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = () => {
    const selectedJobs = Array.from(selectedRows).map((i) => sortedData[i]).filter(Boolean);
    selectedJobs.forEach((job) => deleteJob.mutate(job.id));
    clearSelection();
    setBulkDeleteOpen(false);
  };

  const handleExport = () => {
    const selected = Array.from(selectedRows).map((i) => sortedData[i]).filter(Boolean);
    const data = selected.length > 0 ? selected : sortedData;
    const csv = [
      ["Title", "Customer", "Status", "Scheduled Date", "Value"].join(","),
      ...data.map((j) => [
        `"${j.title}"`,
        `"${j.customers?.name || ""}"`,
        j.status,
        j.scheduled_date || "",
        j.estimated_value || 0,
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "jobs-export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    { label: "Active Jobs", value: stats.active, icon: Activity },
    { label: "Scheduled This Week", value: stats.scheduledWeek, icon: CalendarDays },
    { label: "Pipeline Value", value: formatCurrency(stats.pipelineValue), icon: Briefcase },
    { label: "Completed This Month", value: stats.completedMonth, icon: CheckCircle2, change: completedChange },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-[28px] font-bold tracking-[-0.02em]">Jobs</h1>
          <ReadOnlyGuard>
            {isMobile ? (
              <Button
                size="sm"
                onClick={() => { setSelectedJob(null); setFormDialogOpen(true); }}
                className="h-9 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            ) : (
              <Button onClick={() => { setSelectedJob(null); setFormDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                New Job
              </Button>
            )}
          </ReadOnlyGuard>
        </div>

        <InsightAlerts insights={jobInsights} />

        {/* KPI Strip */}
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label} className="min-w-[160px] flex-1 snap-start">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{kpi.value}</span>
                  {kpi.change !== undefined && kpi.change !== 0 && (
                    <span className={cn("text-[10px] font-medium flex items-center gap-0.5", kpi.change > 0 ? "text-primary" : "text-red-500")}>
                      {kpi.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(kpi.change)}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search jobs..." className={cn("pl-9", isMobile && "rounded-[22px] bg-[hsl(240,10%,96%)] border-0 h-11")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {JOB_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
          <TableSelectionBar
            selectedCount={selectedRows.size}
            onClear={clearSelection}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
          />
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} shimmer className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">Failed to load jobs. Please try again.</div>
            ) : sortedData.length === 0 ? (
              <div className="p-4 sm:p-6">
                <EmptyState
                  icon={Briefcase}
                  title={searchQuery || statusFilter !== "all" ? "No jobs match your filters" : "Schedule and track every job"}
                  description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter." : "Create jobs, assign them to customers, schedule dates, and track progress from start to finish."}
                  actionLabel={!searchQuery && statusFilter === "all" ? "Create Your First Job" : undefined}
                  onAction={!searchQuery && statusFilter === "all" ? () => { setSelectedJob(null); setFormDialogOpen(true); } : undefined}
                />
              </div>
            ) : (
              <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b border-border/50">
                      <th className="w-8 h-8 px-2 text-center bg-muted/60 border-r border-border/30">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          className="h-3.5 w-3.5"
                          aria-label="Select all"
                          {...(someSelected ? { "data-state": "indeterminate" } : {})}
                        />
                      </th>
                      <SortableHeader sortDirection={getSortDirection("title" as any)} onSort={() => handleSort("title" as any)}>
                        Title
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("customers" as any)} onSort={() => handleSort("customers" as any)}>
                        Customer
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("status" as any)} onSort={() => handleSort("status" as any)} className="w-24">
                        Status
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("scheduled_date" as any)} onSort={() => handleSort("scheduled_date" as any)} className="w-28">
                        Scheduled
                      </SortableHeader>
                      <SortableHeader sortDirection={getSortDirection("estimated_value" as any)} onSort={() => handleSort("estimated_value" as any)} align="right" className="w-24">
                        Value
                      </SortableHeader>
                      <th className="w-10 h-8 px-1.5 bg-muted/60"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((job, idx) => (
                      <tr
                        key={job.id}
                        onClick={() => setDetailJob(job)}
                        className={cn(
                          "border-b border-border/30 transition-colors cursor-pointer",
                          selectedRows.has(idx)
                            ? "bg-primary/10 hover:bg-primary/15"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <td className="px-2 py-1.5 text-center border-r border-border/20" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRows.has(idx)}
                            onCheckedChange={(c) => handleCheckboxChange(idx, c)}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="px-2 py-1.5 border-r border-border/20">
                          <span className="font-medium text-sm truncate block max-w-[200px]">{job.title}</span>
                        </td>
                        <td className="px-2 py-1.5 border-r border-border/20">
                          <span className="text-sm text-muted-foreground truncate block max-w-[150px]">{job.customers?.name || "—"}</span>
                        </td>
                        <td className="px-2 py-1.5 border-r border-border/20">
                          <Badge variant={statusBadgeVariant[job.status]} className="text-[10px] px-1.5 py-0">
                            {JOB_STATUSES.find((s) => s.value === job.status)?.label}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 border-r border-border/20">
                          <span className="text-xs text-muted-foreground">
                            {job.scheduled_date ? safeFormatDate(job.scheduled_date, "MMM d, yyyy") : "—"}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right border-r border-border/20">
                          <span className="text-xs font-semibold tabular-nums">{formatCurrency(job.estimated_value)}</span>
                        </td>
                        <td className="px-1.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedJob(job); setFormDialogOpen(true); }}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedJob(job); setDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-border/30">
                {sortedData.map((job, idx) => (
                  <div
                    key={job.id}
                    className={cn(
                      "px-3 py-2.5 transition-colors cursor-pointer",
                      selectedRows.has(idx) ? "bg-primary/10" : "hover:bg-muted/50"
                    )}
                    onClick={() => setDetailJob(job)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRows.has(idx)}
                          onCheckedChange={(c) => handleCheckboxChange(idx, c)}
                          className="h-3.5 w-3.5"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{job.title}</span>
                          <Badge variant={statusBadgeVariant[job.status]} className="text-[10px] px-1.5 py-0 shrink-0">
                            {JOB_STATUSES.find((s) => s.value === job.status)?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          {job.customers?.name && <span className="truncate">{job.customers.name}</span>}
                          {job.scheduled_date && <span>{safeFormatDate(job.scheduled_date, "MMM d")}</span>}
                          <span className="font-semibold text-foreground">{formatCurrency(job.estimated_value)}</span>
                        </div>
                      </div>
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedJob(job); setFormDialogOpen(true); }}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedJob(job); setDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
        </div>
      </div>

      <JobFormDialog open={formDialogOpen} onOpenChange={setFormDialogOpen} job={selectedJob} onSubmit={handleCreateOrUpdate} isLoading={createJobWithSite.isPending || updateJob.isPending} />
      <DeleteJobDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} job={selectedJob} onConfirm={handleDelete} isLoading={deleteJob.isPending} />
      <JobDetailSheet open={!!detailJob} onOpenChange={(open) => !open && setDetailJob(null)} job={detailJob} />

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedRows.size} job{selectedRows.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All associated quotes and invoices will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
