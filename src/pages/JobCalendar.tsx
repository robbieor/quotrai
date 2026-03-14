import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin } from "@dnd-kit/core";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { CalendarHeader, type CalendarViewType } from "@/components/calendar/CalendarHeader";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { JobFormDialog } from "@/components/jobs/JobFormDialog";
import { JobCard } from "@/components/calendar/JobCard";
import { useJobs, useUpdateJob, type Job, type JobStatus } from "@/hooks/useJobs";
import { toast } from "sonner";

export default function JobCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>("month");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const { data: jobs, isLoading, error } = useJobs();
  const updateJob = useUpdateJob();

  const scheduledJobs = jobs?.filter((job) => job.scheduled_date) || [];

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
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
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const job = event.active.data.current?.job as Job | undefined;
    if (job) {
      setActiveJob(job);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveJob(null);
    
    const { active, over } = event;
    if (!over) return;

    const job = active.data.current?.job as Job | undefined;
    const dropData = over.data.current as { date: Date; hour?: number } | undefined;

    if (!job || !dropData) return;

    const newDate = format(dropData.date, "yyyy-MM-dd");
    const newTime = dropData.hour !== undefined 
      ? `${String(dropData.hour).padStart(2, "0")}:00:00`
      : job.scheduled_time;

    // Only update if something changed
    if (newDate === job.scheduled_date && newTime === job.scheduled_time) {
      return;
    }

    updateJob.mutate(
      { 
        id: job.id, 
        scheduled_date: newDate,
        scheduled_time: newTime,
      },
      {
        onSuccess: () => {
          toast.success(`Job rescheduled to ${format(dropData.date, "MMM d, yyyy")}${dropData.hour !== undefined ? ` at ${dropData.hour}:00` : ""}`);
        },
      }
    );
  };

  const handleDragCancel = () => {
    setActiveJob(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Calendar</h1>
          <p className="text-muted-foreground">View and manage scheduled jobs. Drag jobs to reschedule.</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <CalendarHeader
              currentDate={currentDate}
              view={view}
              onDateChange={setCurrentDate}
              onViewChange={setView}
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-24 text-destructive">
                Failed to load jobs. Please try again.
              </div>
            ) : (
              <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                collisionDetection={pointerWithin}
              >
                {view === "month" && (
                  <MonthView
                    currentDate={currentDate}
                    jobs={scheduledJobs}
                    onJobClick={handleJobClick}
                  />
                )}
                {view === "week" && (
                  <WeekView
                    currentDate={currentDate}
                    jobs={scheduledJobs}
                    onJobClick={handleJobClick}
                  />
                )}
                {view === "day" && (
                  <DayView
                    currentDate={currentDate}
                    jobs={scheduledJobs}
                    onJobClick={handleJobClick}
                  />
                )}
                <DragOverlay>
                  {activeJob ? (
                    <div className="opacity-90 shadow-xl">
                      <JobCard job={activeJob} onClick={() => {}} compact />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      <JobFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        job={selectedJob}
        onSubmit={handleUpdateJob}
        isLoading={updateJob.isPending}
      />
    </DashboardLayout>
  );
}
