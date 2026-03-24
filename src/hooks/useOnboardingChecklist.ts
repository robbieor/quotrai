import { useMemo } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { useJobs } from "@/hooks/useJobs";
import { useInvoices } from "@/hooks/useInvoices";
import { useQuotes } from "@/hooks/useQuotes";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useTeamMembers } from "@/hooks/useTeam";
import { useWorkflowMode } from "@/hooks/useWorkflowMode";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  route: string;
}

export function useOnboardingChecklist() {
  const { data: customers } = useCustomers();
  const { data: jobs } = useJobs();
  const { data: invoices } = useInvoices();
  const { data: quotes } = useQuotes();
  const { branding } = useCompanyBranding();
  const { data: teamMembers } = useTeamMembers();
  const { mode } = useWorkflowMode();

  const checklist = useMemo<ChecklistItem[]>(() => {
    const hasCustomers = (customers?.length ?? 0) > 0;
    const hasJobs = (jobs?.length ?? 0) > 0;
    const hasQuotes = (quotes?.length ?? 0) > 0;
    const hasInvoices = (invoices?.length ?? 0) > 0;
    const hasBranding = !!(branding?.company_name && branding?.company_email);
    const hasTeam = (teamMembers?.length ?? 0) > 1;

    const items: ChecklistItem[] = [
      {
        id: "branding",
        label: "Add your logo & details",
        description: "Upload your logo and set company info — makes quotes look professional",
        completed: hasBranding,
        route: "/settings",
      },
      {
        id: "customer",
        label: "Add a real customer",
        description: "Import or create a customer you'll actually quote",
        completed: hasCustomers,
        route: "/customers",
      },
    ];

    // Simple mode: invoice-first — skip quote & job steps
    if (mode === "simple") {
      items.push({
        id: "invoice",
        label: "Send your first invoice",
        description: "Create an invoice and get paid — that's what this is all about",
        completed: hasInvoices,
        route: "/invoices",
      });
    } else {
      // Standard + Advanced: full workflow
      items.push({
        id: "quote",
        label: "Send your first quote",
        description: "The moment it clicks — see your quote land in a customer's inbox",
        completed: hasQuotes,
        route: "/quotes",
      });
      items.push({
        id: "invoice",
        label: "Get paid",
        description: "Create an invoice and track payment",
        completed: hasInvoices,
        route: "/invoices",
      });
      items.push({
        id: "job",
        label: "Schedule a job",
        description: "Track work with a scheduled job on your calendar",
        completed: hasJobs,
        route: "/jobs",
      });
    }

    // Team invite — skip for solo/simple
    if (mode !== "simple") {
      items.push({
        id: "team",
        label: "Invite your crew",
        description: "Add a team member to collaborate",
        completed: hasTeam,
        route: "/settings",
      });
    }

    return items;
  }, [customers, jobs, invoices, quotes, branding, teamMembers, mode]);

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const allComplete = completedCount === totalCount;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return { checklist, completedCount, totalCount, allComplete, progress };
}
