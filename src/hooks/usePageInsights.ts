import { useMemo } from "react";
import { differenceInDays, isPast, isToday } from "date-fns";
import type { Job } from "@/hooks/useJobs";
import type { Quote } from "@/hooks/useQuotes";
import type { Invoice } from "@/hooks/useInvoices";
import { useCurrency } from "@/hooks/useCurrency";

interface Insight {
  id: string;
  type: "warning" | "success" | "info";
  message: string;
  cta: string;
  href: string;
}

export function useJobInsights(jobs: Job[] | undefined): Insight[] {
  return useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    const insights: Insight[] = [];

    // Jobs overdue (scheduled in the past but not completed/cancelled)
    const overdue = jobs.filter(
      (j) =>
        j.scheduled_date &&
        isPast(new Date(j.scheduled_date)) &&
        !isToday(new Date(j.scheduled_date)) &&
        j.status !== "completed" &&
        j.status !== "cancelled"
    );
    if (overdue.length > 0) {
      insights.push({
        id: "jobs-overdue",
        type: "warning",
        message: `${overdue.length} job${overdue.length > 1 ? "s" : ""} overdue — scheduled date has passed without completion`,
        cta: "Review now",
        href: "/jobs?status=in_progress",
      });
    }

    // Jobs with no scheduled date
    const unscheduled = jobs.filter(
      (j) => !j.scheduled_date && j.status !== "completed" && j.status !== "cancelled"
    );
    if (unscheduled.length > 0) {
      insights.push({
        id: "jobs-unscheduled",
        type: "info",
        message: `${unscheduled.length} job${unscheduled.length > 1 ? "s" : ""} have no scheduled date — at risk of being forgotten`,
        cta: "Schedule",
        href: "/jobs?status=pending",
      });
    }

    // Jobs in progress for over 14 days (potential overrun)
    const longRunning = jobs.filter(
      (j) =>
        j.status === "in_progress" &&
        j.updated_at &&
        differenceInDays(new Date(), new Date(j.created_at)) > 14
    );
    if (longRunning.length > 0) {
      insights.push({
        id: "jobs-long-running",
        type: "warning",
        message: `${longRunning.length} job${longRunning.length > 1 ? "s" : ""} running 14+ days — potential overrun risk`,
        cta: "Investigate",
        href: "/jobs?status=in_progress",
      });
    }

    // Positive: completed jobs this week
    const completedRecently = jobs.filter(
      (j) =>
        j.status === "completed" &&
        j.updated_at &&
        differenceInDays(new Date(), new Date(j.updated_at)) <= 7
    );
    if (completedRecently.length >= 3) {
      insights.push({
        id: "jobs-completed-streak",
        type: "success",
        message: `${completedRecently.length} jobs completed this week — strong throughput`,
        cta: "View",
        href: "/jobs?status=completed",
      });
    }

    return insights;
  }, [jobs]);
}

export function useQuoteInsights(quotes: Quote[] | undefined): Insight[] {
  const { formatCurrency } = useCurrency();

  return useMemo(() => {
    if (!quotes || quotes.length === 0) return [];
    const insights: Insight[] = [];

    // Quotes going cold (sent > 7 days ago, still sent status)
    const cold = quotes.filter(
      (q) =>
        q.status === "sent" &&
        differenceInDays(new Date(), new Date(q.created_at)) > 7
    );
    if (cold.length > 0) {
      const coldValue = cold.reduce((sum, q) => sum + Number(q.total), 0);
      insights.push({
        id: "quotes-cold",
        type: "warning",
        message: `${cold.length} quote${cold.length > 1 ? "s" : ""} going cold (no response in 7+ days) — ${formatCurrency(coldValue)} at risk`,
        cta: "Follow up",
        href: "/quotes?status=sent",
      });
    }

    // Draft quotes not yet sent
    const drafts = quotes.filter((q) => q.status === "draft");
    if (drafts.length > 0) {
      const draftValue = drafts.reduce((sum, q) => sum + Number(q.total), 0);
      insights.push({
        id: "quotes-unsent",
        type: "info",
        message: `${drafts.length} draft quote${drafts.length > 1 ? "s" : ""} worth ${formatCurrency(draftValue)} — send to start winning work`,
        cta: "Review drafts",
        href: "/quotes?status=draft",
      });
    }

    // High acceptance rate
    const decided = quotes.filter((q) => q.status === "accepted" || q.status === "declined");
    if (decided.length >= 5) {
      const accepted = quotes.filter((q) => q.status === "accepted").length;
      const rate = Math.round((accepted / decided.length) * 100);
      if (rate >= 70) {
        insights.push({
          id: "quotes-high-conversion",
          type: "success",
          message: `${rate}% quote acceptance rate — your pricing is competitive`,
          cta: "View pipeline",
          href: "/quotes",
        });
      } else if (rate < 40) {
        insights.push({
          id: "quotes-low-conversion",
          type: "warning",
          message: `${rate}% acceptance rate — consider reviewing your pricing strategy`,
          cta: "Analyse",
          href: "/quotes?status=declined",
        });
      }
    }

    return insights;
  }, [quotes, formatCurrency]);
}

export function useInvoiceInsights(invoices: Invoice[] | undefined): Insight[] {
  const { formatCurrency } = useCurrency();

  return useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    const insights: Insight[] = [];

    // Overdue invoices
    const overdue = invoices.filter(
      (i) =>
        i.status === "pending" &&
        isPast(new Date(i.due_date)) &&
        !isToday(new Date(i.due_date))
    );
    if (overdue.length > 0) {
      const overdueValue = overdue.reduce((sum, i) => sum + Number(i.total), 0);
      insights.push({
        id: "invoices-overdue",
        type: "warning",
        message: `${formatCurrency(overdueValue)} at risk from ${overdue.length} overdue invoice${overdue.length > 1 ? "s" : ""} — take action now`,
        cta: "Send reminders",
        href: "/invoices?status=overdue",
      });
    }

    // Invoices due within 3 days
    const dueSoon = invoices.filter(
      (i) =>
        i.status === "pending" &&
        !isPast(new Date(i.due_date)) &&
        differenceInDays(new Date(i.due_date), new Date()) <= 3
    );
    if (dueSoon.length > 0) {
      const dueSoonValue = dueSoon.reduce((sum, i) => sum + Number(i.total), 0);
      insights.push({
        id: "invoices-due-soon",
        type: "info",
        message: `${dueSoon.length} invoice${dueSoon.length > 1 ? "s" : ""} worth ${formatCurrency(dueSoonValue)} due within 3 days`,
        cta: "Review",
        href: "/invoices?status=pending",
      });
    }

    // Draft invoices sitting unsent
    const drafts = invoices.filter((i) => i.status === "draft");
    if (drafts.length > 0) {
      const draftValue = drafts.reduce((sum, i) => sum + Number(i.total), 0);
      insights.push({
        id: "invoices-unsent",
        type: "info",
        message: `${drafts.length} draft invoice${drafts.length > 1 ? "s" : ""} worth ${formatCurrency(draftValue)} — send to collect revenue`,
        cta: "Send now",
        href: "/invoices?status=draft",
      });
    }

    return insights;
  }, [invoices, formatCurrency]);
}
