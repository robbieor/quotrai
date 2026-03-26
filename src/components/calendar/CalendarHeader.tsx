import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";

export type CalendarViewType = "day" | "week" | "month";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarViewType;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarViewType) => void;
}

export function CalendarHeader({ currentDate, view, onDateChange, onViewChange }: CalendarHeaderProps) {
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

  const getHeaderTitle = () => {
    switch (view) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week":
        return format(currentDate, "MMMM yyyy");
      case "month":
        return format(currentDate, "MMMM yyyy");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-7 text-xs md:h-9 md:text-sm" onClick={goToToday}>
          Today
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-sm md:text-lg font-semibold truncate">{getHeaderTitle()}</h2>
      </div>
      <div className="flex items-center border rounded-lg overflow-hidden">
        {(["day", "week", "month"] as CalendarViewType[]).map((v) => (
          <Button
            key={v}
            variant={view === v ? "default" : "ghost"}
            size="sm"
            className="rounded-none capitalize h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm"
            onClick={() => onViewChange(v)}
          >
            {v}
          </Button>
        ))}
      </div>
    </div>
  );
}
