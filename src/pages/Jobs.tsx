import { useState, useCallback } from "react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
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
import { Briefcase as BriefcaseIcon } from "lucide-react";
import { JobDetailSheet } from "@/components/jobs/JobDetailSheet";

const statusColors: Record<JobStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  scheduled: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  in_progress: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  completed: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelled: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);

  const { data: jobs, isLoading, error } = useJobs();
  const createJobWithSite = useCreateJobWithSite();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const filteredJobs = jobs?.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOrUpdate = (values: {
    title: string;
    description?: string;
    customer_id: string;
    status: JobStatus;
    scheduled_date?: string | null;
    scheduled_time?: string | null;
    estimated_value?: number | null;
  }) => {
    if (selectedJob) {
      updateJob.mutate(
        { id: selectedJob.id, ...values },
        {
          onSuccess: () => {
            setFormDialogOpen(false);
            setSelectedJob(null);
          },
        }
      );
    } else {
      // Use the new hook that auto-creates job sites
      createJobWithSite.mutate(
        { job: values, autoCreateSite: true },
        {
          onSuccess: () => {
            setFormDialogOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (selectedJob) {
      deleteJob.mutate(selectedJob.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedJob(null);
        },
      });
    }
  };

  const openEditDialog = (job: Job) => {
    setSelectedJob(job);
    setFormDialogOpen(true);
  };

  const openDeleteDialog = (job: Job) => {
    setSelectedJob(job);
    setDeleteDialogOpen(true);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Jobs</h1>
            <p className="text-sm md:text-base text-muted-foreground">Manage and track all your jobs</p>
          </div>
          <Button
            onClick={() => {
              setSelectedJob(null);
              setFormDialogOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {JOB_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                Failed to load jobs. Please try again.
              </div>
            ) : filteredJobs?.length === 0 ? (
              <EmptyState
                icon={BriefcaseIcon}
                title={searchQuery || statusFilter !== "all" ? "No jobs match your filters" : "Schedule and track every job"}
                description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter." : "Create jobs, assign them to customers, schedule dates, and track progress from start to finish."}
                actionLabel={!searchQuery && statusFilter === "all" ? "Create Your First Job" : undefined}
                onAction={!searchQuery && statusFilter === "all" ? () => { setSelectedJob(null); setFormDialogOpen(true); } : undefined}
              />
            ) : (
              <div className="space-y-1">
                {filteredJobs?.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setDetailJob(job)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-3 md:py-4 border-b border-border last:border-0 hover:bg-muted/50 -mx-4 px-4 cursor-pointer transition-colors gap-2 sm:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm md:text-base">{job.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <span className="text-xs md:text-sm text-muted-foreground truncate">
                          {job.customers?.name || "No customer"}
                        </span>
                        <span className="text-xs text-muted-foreground sm:hidden">
                          {job.scheduled_date
                            ? format(new Date(job.scheduled_date), "MMM d")
                            : "Not scheduled"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {job.scheduled_date
                          ? format(new Date(job.scheduled_date), "MMM d, yyyy")
                          : "Not scheduled"}
                      </span>
                      <Badge className={cn(statusColors[job.status], "text-xs")}>
                        {JOB_STATUSES.find((s) => s.value === job.status)?.label}
                      </Badge>
                      <span className="font-semibold text-sm md:text-base hidden md:block w-24 text-right">
                        {formatCurrency(job.estimated_value)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(job)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(job)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <JobFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        job={selectedJob}
        onSubmit={handleCreateOrUpdate}
        isLoading={createJobWithSite.isPending || updateJob.isPending}
      />

      <DeleteJobDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        job={selectedJob}
        onConfirm={handleDelete}
        isLoading={deleteJob.isPending}
      />

      <JobDetailSheet
        open={!!detailJob}
        onOpenChange={(open) => !open && setDetailJob(null)}
        job={detailJob}
      />
    </DashboardLayout>
  );
}
