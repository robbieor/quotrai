import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal, Calendar, CalendarCheck, Clock } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CalendarViewType = "day" | "week" | "month" | "pending";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarViewType;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarViewType) => void;
  pendingCount?: number;
  startHour: number;
  endHour: number;
  onWorkingHoursChange: (start: number, end: number) => void;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const formatHour = (h: number) => {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
};

export function CalendarHeader({ currentDate, view, onDateChange, onViewChange, pendingCount = 0, startHour, endHour, onWorkingHoursChange }: CalendarHeaderProps) {
  const isMobile = useIsMobile();
  const [showHoursMenu, setShowHoursMenu] = useState(false);

  const navigatePrevious = () => {
    switch (view) {
      case "day":
        onDateChange(subDays(currentDate, 1));
        break;
      case "week":
        onDateChange(subWeeks(currentDate, 1));
        break;
      case "month":
        onDateChange(subMonths(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case "day":
        onDateChange(addDays(currentDate, 1));
        break;
      case "week":
        onDateChange(addWeeks(currentDate, 1));
        break;
      case "month":
        onDateChange(addMonths(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const getDateLabel = () => {
    switch (view) {
      case "day":
        return format(currentDate, "EEE d MMM yyyy");
      case "week": {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(ws, "d MMM")} – ${format(we, "d MMM")}`;
      }
      case "month":
        return format(currentDate, "MMMM yyyy");
      default:
        return "";
    }
  };

  // Mobile tabs: Day | Week | Pending
  // Desktop tabs: Day | Week | Month
  const mobileTabs: CalendarViewType[] = ["day", "week", "pending"];
  const desktopTabs: CalendarViewType[] = ["day", "week", "month"];
  const tabs = isMobile ? mobileTabs : desktopTabs;

  const tabLabel = (v: CalendarViewType) => {
    if (v === "pending") return `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}`;
    return v.charAt(0).toUpperCase() + v.slice(1);
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1: Segmented control + overflow menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center bg-muted rounded-full p-1 gap-0.5 flex-1 sm:flex-none overflow-x-auto scrollbar-none">
          {tabs.map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${
                view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabel(v)}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0" aria-label="Calendar options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={goToToday}>
              <CalendarCheck className="h-4 w-4 mr-2" />
              Go to today
            </DropdownMenuItem>
            {isMobile && (
              <DropdownMenuItem onClick={() => onViewChange("month")}>
                <Calendar className="h-4 w-4 mr-2" />
                Month view
              </DropdownMenuItem>
            )}
            {!isMobile && (
              <DropdownMenuItem onClick={() => onViewChange("pending")}>
                <Calendar className="h-4 w-4 mr-2" />
                Pending jobs {pendingCount > 0 && `(${pendingCount})`}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setShowHoursMenu(true)}>
              <Clock className="h-4 w-4 mr-2" />
              Working hours ({formatHour(startHour)} – {formatHour(endHour)})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 2: Date navigation (hidden for pending view) */}
      {view !== "pending" && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[15px] font-semibold min-w-[160px] text-center">
            {getDateLabel()}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      {/* Working hours picker */}
      {showHoursMenu && (
        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          <span className="text-xs text-muted-foreground">From</span>
          <select
            value={startHour}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v < endHour) onWorkingHoursChange(v, endHour);
            }}
            className="text-xs bg-background border rounded px-1.5 py-1"
          >
            {HOUR_OPTIONS.filter((h) => h < endHour).map((h) => (
              <option key={h} value={h}>{formatHour(h)}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">to</span>
          <select
            value={endHour}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v > startHour) onWorkingHoursChange(startHour, v);
            }}
            className="text-xs bg-background border rounded px-1.5 py-1"
          >
            {HOUR_OPTIONS.filter((h) => h > startHour).map((h) => (
              <option key={h} value={h}>{formatHour(h)}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowHoursMenu(false)}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
