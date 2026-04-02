import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function ContextIndicator() {
  const { data } = useQuery({
    queryKey: ["george-context-indicator"],
    queryFn: async () => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return null;

      const [jobsRes, overdueRes, customersRes] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("team_id", teamId).in("status", ["scheduled", "in_progress"]),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("status", "overdue"),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("team_id", teamId),
      ]);

      return {
        activeJobs: jobsRes.count ?? 0,
        overdueInvoices: overdueRes.count ?? 0,
        customers: customersRes.count ?? 0,
      };
    },
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  if (!data) return null;

  const parts: string[] = [];
  if (data.activeJobs > 0) parts.push(`${data.activeJobs} jobs`);
  if (data.overdueInvoices > 0) parts.push(`${data.overdueInvoices} overdue`);
  if (data.customers > 0) parts.push(`${data.customers} clients`);

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center justify-center py-1 px-4 bg-muted/20">
      <p className="text-[10px] text-muted-foreground/60 tracking-wide">
        Monitoring {parts.join(" · ")}
      </p>
    </div>
  );
}
