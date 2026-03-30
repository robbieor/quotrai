import { useMemo } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { useJobs } from "@/hooks/useJobs";
import { useQuotes } from "@/hooks/useQuotes";
import { isPast, isToday } from "date-fns";

export function useSidebarBadges() {
  const { data: invoices } = useInvoices();
  const { data: jobs } = useJobs();
  const { data: quotes } = useQuotes();

  return useMemo(() => {
    const badges: Record<string, number> = {};

    // Overdue invoices
    if (invoices) {
      const overdue = invoices.filter(
        (i) => i.status === "pending" && isPast(new Date(i.due_date)) && !isToday(new Date(i.due_date))
      ).length;
      if (overdue > 0) badges.invoices = overdue;
    }

    // Pending/stuck jobs (in_progress for 7+ days could be stuck)
    if (jobs) {
      const pending = jobs.filter((j) => j.status === "pending").length;
      if (pending > 0) badges.jobs = pending;
    }

    // Draft quotes (unsent)
    if (quotes) {
      const drafts = quotes.filter((q) => q.status === "draft").length;
      if (drafts > 0) badges.quotes = drafts;
    }

    return badges;
  }, [invoices, jobs, quotes]);
}
