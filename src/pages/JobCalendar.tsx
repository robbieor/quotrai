import { useState, useMemo } from "react";
import { useWorkingHours } from "@/hooks/useWorkingHours";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";
import { CalendarHeader, type CalendarViewType } from "@/components/calendar/CalendarHeader";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { PendingView } from "@/components/calendar/PendingView";
import { JobFormDialog } from "@/components/jobs/JobFormDialog";
import { ScheduleJobPicker } from "@/components/calendar/ScheduleJobPicker";
import { useJobs, useUpdateJob, type Job, type JobStatus } from "@/hooks/useJobs";
import { useCreateJobWithSite } from "@/hooks/useCreateJobWithSite";
import { toast } from "sonner";

interface DroppedJobData {
  jobId: string;
  date: Date;
  hour?: number;
}

export default function JobCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>("month");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  // Slot scheduling state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [slotDate, setSlotDate] = useState<Date | null>(null);
  const [slotHour, setSlotHour] = useState<number | undefined>(undefined);
  const [createFromSlot, setCreateFromSlot] = useState(false);

  const { data: jobs, isLoading, error } = useJobs();
  const updateJob = useUpdateJob();
  const createJob = useCreateJobWithSite();

  const scheduledJobs = jobs?.filter((job) => job.scheduled_date) || [];
  const unscheduledJobs = useMemo(
    () => jobs?.filter((job) => !job.scheduled_date && job.status !== "completed" && job.status !== "cancelled") || [],
    [jobs]
  );

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setCreateFromSlot(false);
    setFormDialogOpen(true);
  };

  const handleUpdateJob = (values: {
    title: string;
    description?: string;
    customer_id: string;
    status: JobStatus;
    scheduled_date?: string | null;
    scheduled_time?: string | null;
    estimated_value?: number | null;
  }) => {
    if (!selectedJob) return;

    updateJob.mutate(
      { id: selectedJob.id, ...values },
      {
        onSuccess: () => {
          setFormDialogOpen(false);
          setSelectedJob(null);
        },
      }
    );
  };

  const handleCreateJob = (values: {
    title: string;
    description?: string;
    customer_id: string;
    status: JobStatus;
    scheduled_date?: string | null;
    scheduled_time?: string | null;
    estimated_value?: number | null;
    location?: any;
  }) => {
    const { location, ...jobData } = values;
    createJob.mutate(
      {
        job: {
          ...jobData,
          scheduled_date: jobData.scheduled_date || null,
          scheduled_time: jobData.scheduled_time || null,
          estimated_value: jobData.estimated_value ?? null,
        },
        siteLocation: location,
      },
      {
        onSuccess: () => {
          setFormDialogOpen(false);
          setCreateFromSlot(false);
          setSlotDate(null);
          setSlotHour(undefined);
        },
      }
    );
  };

  const handleJobDrop = ({ jobId, date, hour }: DroppedJobData) => {
    setActiveJob(null);

    const job = scheduledJobs.find((item) => item.id === jobId);
    if (!job) return;

    const newDate = format(date, "yyyy-MM-dd");
    const newTime = hour !== undefined ? `${String(hour).padStart(2, "0")}:00:00` : job.scheduled_time;

    if (newDate === job.scheduled_date && newTime === job.scheduled_time) return;

    updateJob.mutate(
      {
        id: job.id,
        scheduled_date: newDate,
        scheduled_time: newTime,
      },
      {
        onSuccess: () => {
          toast.success(`Job rescheduled to ${format(date, "MMM d, yyyy")}${hour !== undefined ? ` at ${hour}:00` : ""}`);
        },
      }
    );
  };

  const handleSlotClick = (date: Date, hour?: number) => {
    setSlotDate(date);
    setSlotHour(hour);
    setPickerOpen(true);
  };

  const handlePickerCreateNew = () => {
    setPickerOpen(false);
    setSelectedJob(null);
    setCreateFromSlot(true);
    setFormDialogOpen(true);
  };

  const handlePickerSelectJob = (job: Job) => {
    setPickerOpen(false);
    if (!slotDate) return;

    const newDate = format(slotDate, "yyyy-MM-dd");
    const newTime = slotHour !== undefined ? `${String(slotHour).padStart(2, "0")}:00:00` : null;

    updateJob.mutate(
      {
        id: job.id,
        scheduled_date: newDate,
        scheduled_time: newTime,
        status: "scheduled" as JobStatus,
      },
      {
        onSuccess: () => {
          toast.success(`"${job.title}" scheduled for ${format(slotDate, "MMM d")}${slotHour !== undefined ? ` at ${slotHour}:00` : ""}`);
          setSlotDate(null);
          setSlotHour(undefined);
        },
      }
    );
  };

  const isCreating = createFromSlot && !selectedJob;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Job Calendar</h1>
        </div>

        <div className="md:bg-card md:border md:rounded-[14px] md:shadow-sm md:p-4">
            <CalendarHeader
              currentDate={currentDate}
              view={view}
              onDateChange={setCurrentDate}
              onViewChange={setView}
              pendingCount={unscheduledJobs.length}
            />

            {activeJob && (
              <div className="mb-3 text-xs text-muted-foreground">Dragging: {activeJob.title}</div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-24 text-destructive">Failed to load jobs. Please try again.</div>
            ) : (
              <>
                {view === "month" && (
                  <MonthView
                    currentDate={currentDate}
                    jobs={scheduledJobs}
                    onJobClick={handleJobClick}
                    onJobDrop={handleJobDrop}
                    onJobDragStart={setActiveJob}
                    onJobDragEnd={() => setActiveJob(null)}
                    onSlotClick={handleSlotClick}
                  />
                )}
                {view === "week" && (
                  <WeekView
                    currentDate={currentDate}
                    jobs={scheduledJobs}
                    onJobClick={handleJobClick}
                    onJobDrop={handleJobDrop}
                    onJobDragStart={setActiveJob}
                    onJobDragEnd={() => setActiveJob(null)}
                    onSlotClick={handleSlotClick}
                  />
                )}
                {view === "day" && (
                  <DayView
                    currentDate={currentDate}
                    jobs={scheduledJobs}
                    onJobClick={handleJobClick}
                    onJobDrop={handleJobDrop}
                    onJobDragStart={setActiveJob}
                    onJobDragEnd={() => setActiveJob(null)}
                    onSlotClick={handleSlotClick}
                  />
                )}
                {view === "pending" && (
                  <PendingView
                    jobs={unscheduledJobs}
                    onSchedule={(job) => {
                      setSlotDate(new Date());
                      setSlotHour(undefined);
                      handlePickerSelectJob(job);
                    }}
                    onJobClick={handleJobClick}
                  />
                )}
              </>
            )}
        </div>
      </div>

      {/* Edit existing job */}
      {!isCreating && (
        <JobFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          job={selectedJob}
          onSubmit={handleUpdateJob}
          isLoading={updateJob.isPending}
        />
      )}

      {/* Create new job from slot */}
      {isCreating && slotDate && (
        <JobFormDialog
          open={formDialogOpen}
          onOpenChange={(open) => {
            setFormDialogOpen(open);
            if (!open) {
              setCreateFromSlot(false);
              setSlotDate(null);
              setSlotHour(undefined);
            }
          }}
          defaultDate={slotDate}
          defaultTime={slotHour !== undefined ? `${String(slotHour).padStart(2, "0")}:00` : undefined}
          onSubmit={handleCreateJob}
          isLoading={createJob.isPending}
        />
      )}

      {/* Schedule picker */}
      {slotDate && (
        <ScheduleJobPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          date={slotDate}
          hour={slotHour}
          unscheduledJobs={unscheduledJobs}
          onSelectJob={handlePickerSelectJob}
          onCreateNew={handlePickerCreateNew}
        />
      )}
    </DashboardLayout>
  );
}
