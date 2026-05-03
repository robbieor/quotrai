import { useState, useMemo } from "react";
import { format, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, differenceInSeconds } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Clock,
  Search,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Download,
  BarChart3,
} from "lucide-react";
import { useTimeEntries, useDeleteTimeEntry, type TimeEntry } from "@/hooks/useTimeTracking";
import { toast } from "sonner";
import { safeFormatDate } from "@/lib/pdf/dateUtils";

export function TimeEntriesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);
  const [showWeekly, setShowWeekly] = useState(false);

  const { data: entries, isLoading } = useTimeEntries();
  const deleteTimeEntry = useDeleteTimeEntry();

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    const query = searchQuery.toLowerCase();
    return entries.filter((entry) => {
      const matchesSearch =
        entry.jobs?.title?.toLowerCase().includes(query) ||
        entry.jobs?.customers?.name?.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || entry.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [entries, searchQuery, statusFilter]);

  // Weekly summary data
  const weeklySummary = useMemo(() => {
    if (!entries) return [];
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map((day) => {
      const dayEntries = entries.filter((e) =>
        isSameDay(new Date(e.clock_in_at), day)
      );
      const totalSeconds = dayEntries.reduce((sum, e) => {
        const end = e.clock_out_at ? new Date(e.clock_out_at) : new Date();
        return sum + differenceInSeconds(end, new Date(e.clock_in_at));
      }, 0);
      return {
        day,
        label: format(day, "EEE"),
        date: format(day, "MMM d"),
        hours: Math.round((totalSeconds / 3600) * 10) / 10,
        entries: dayEntries.length,
      };
    });
  }, [entries]);

  const weeklyTotal = useMemo(
    () => weeklySummary.reduce((sum, d) => sum + d.hours, 0),
    [weeklySummary]
  );

  const maxDailyHours = useMemo(
    () => Math.max(...weeklySummary.map((d) => d.hours), 1),
    [weeklySummary]
  );

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return "In progress";
    const minutes = differenceInMinutes(new Date(clockOut), new Date(clockIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleDelete = () => {
    if (deleteEntry) {
      deleteTimeEntry.mutate(deleteEntry.id, {
        onSuccess: () => setDeleteEntry(null),
      });
    }
  };

  const handleExport = () => {
    if (!entries || entries.length === 0) {
      toast.error("No time entries to export");
      return;
    }
    const rows = [
      ["Date", "Job", "Customer", "Clock In", "Clock Out", "Duration", "Status", "GPS Verified", "Notes"].join(","),
      ...entries.map((e) => {
        const duration = e.clock_out_at
          ? formatDuration(e.clock_in_at, e.clock_out_at)
          : "In progress";
        return [
          safeFormatDate(e.clock_in_at, "yyyy-MM-dd"),
          `"${e.jobs?.title || ""}"`,
          `"${e.jobs?.customers?.name || ""}"`,
          safeFormatDate(e.clock_in_at, "HH:mm"),
          e.clock_out_at ? safeFormatDate(e.clock_out_at, "HH:mm") : "",
          duration,
          e.status,
          e.clock_in_verified ? "Yes" : "No",
          `"${e.notes || ""}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Timesheet exported");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Weekly Summary */}
      {showWeekly && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              This Week — {Math.round(weeklyTotal * 10) / 10}h total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {weeklySummary.map((day) => (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-xs text-muted-foreground mb-1">
                      {day.hours > 0 ? `${day.hours}h` : ""}
                    </span>
                    <div
                      className="w-full rounded-t bg-primary/80 transition-all min-h-[2px]"
                      style={{
                        height: `${Math.max((day.hours / maxDailyHours) * 64, day.hours > 0 ? 4 : 2)}px`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium">{day.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Entries
            </span>
            <div className="flex gap-2">
              <Button
                variant={showWeekly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowWeekly(!showWeekly)}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Weekly
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by job or customer..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entries List */}
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No time entries</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try a different search or filter"
                  : "Clock in to start tracking time"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-4 border-b border-border last:border-0 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{entry.jobs?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.jobs?.customers?.name} •{" "}
                        {safeFormatDate(entry.clock_in_at, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Location verification badges */}
                    <div className="hidden sm:flex items-center gap-1">
                      {entry.clock_in_verified ? (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/30 text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          In
                        </Badge>
                      ) : entry.clock_in_latitude ? (
                        <Badge
                          variant="outline"
                          className="bg-yellow-500/10 text-yellow-600 border-yellow-200 text-xs"
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          In
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          No GPS
                        </Badge>
                      )}

                      {entry.clock_out_at && (
                        entry.clock_out_verified ? (
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/30 text-xs"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Out
                          </Badge>
                        ) : entry.clock_out_latitude ? (
                          <Badge
                            variant="outline"
                            className="bg-yellow-500/10 text-yellow-600 border-yellow-200 text-xs"
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Out
                          </Badge>
                        ) : null
                      )}
                    </div>

                    {/* Time info */}
                    <div className="text-right min-w-[100px]">
                      <p className="text-sm font-medium">
                        {safeFormatDate(entry.clock_in_at, "h:mm a")}
                        {entry.clock_out_at && (
                          <>
                            {" - "}
                            {safeFormatDate(entry.clock_out_at, "h:mm a")}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(entry.clock_in_at, entry.clock_out_at)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <Badge
                      variant="outline"
                      className={
                        entry.status === "active"
                          ? "bg-primary/10 text-primary"
                          : entry.status === "completed"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {entry.status}
                    </Badge>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setDeleteEntry(entry)}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time entry for{" "}
              <strong>{deleteEntry?.jobs?.title}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
