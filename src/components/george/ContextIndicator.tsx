import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

export function ContextIndicator() {
  const { data } = useQuery({
    queryKey: ["george-context-indicator"],
    queryFn: async () => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return null;

      const [jobsRes, overdueRes, teamRes, customersRes] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("team_id", teamId).in("status", ["scheduled", "in_progress"]),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("status", "overdue"),
        supabase.from("team_members").select("id", { count: "exact", head: true }).eq("team_id", teamId),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("team_id", teamId),
      ]);

      return {
        activeJobs: jobsRes.count ?? 0,
        overdueInvoices: overdueRes.count ?? 0,
        teamMembers: teamRes.count ?? 0,
        customers: customersRes.count ?? 0,
      };
    },
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  if (!data) return null;

  const parts: string[] = [];
  if (data.activeJobs > 0) parts.push(`${data.activeJobs} active job${data.activeJobs !== 1 ? "s" : ""}`);
  if (data.overdueInvoices > 0) parts.push(`${data.overdueInvoices} overdue invoice${data.overdueInvoices !== 1 ? "s" : ""}`);
  if (data.customers > 0) parts.push(`${data.customers} client${data.customers !== 1 ? "s" : ""}`);
  if (data.teamMembers > 1) parts.push(`${data.teamMembers} team member${data.teamMembers !== 1 ? "s" : ""}`);

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 py-1.5 px-4 bg-muted/30 border-b border-border">
      <Shield className="h-3 w-3 text-primary/60" />
      <p className="text-[11px] text-muted-foreground">
        George knows about {parts.join(", ")}
      </p>
    </div>
  );
}
