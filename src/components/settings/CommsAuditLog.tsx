import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 25;

export function CommsAuditLog() {
  const { profile } = useProfile();
  const teamId = profile?.team_id;
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["comms-audit-log", teamId, page, statusFilter],
    queryFn: async () => {
      if (!teamId) return { rows: [], count: 0 };
      let query = supabase
        .from("comms_audit_log")
        .select("*", { count: "exact" })
        .eq("team_id", teamId)
        .order("attempted_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter === "allowed") query = query.eq("allowed", true);
      if (statusFilter === "blocked") query = query.eq("allowed", false);

      const { data: rows, error, count } = await query;
      if (error) throw error;
      return { rows: rows || [], count: count || 0 };
    },
    enabled: !!teamId,
  });

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Communication Audit Log
        </CardTitle>
        <CardDescription>
          Every outbound communication attempt is logged here — including blocked sends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="allowed">Allowed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {data?.count || 0} total entries
          </span>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading…</div>
          ) : !data?.rows.length ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No audit entries found.</div>
          ) : (
            <div className="space-y-2">
              {data.rows.map((row: any) => (
                <div
                  key={row.id}
                  className={`p-3 rounded-lg border text-sm ${
                    row.allowed
                      ? "border-primary/30 bg-primary/10/50 dark:border-primary/30 dark:bg-primary/20"
                      : "border-destructive/20 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {row.allowed ? (
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <ShieldX className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div>
                        <span className="font-medium">{row.template || row.channel}</span>
                        {row.recipient && (
                          <span className="text-muted-foreground ml-2">→ {row.recipient}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={row.allowed ? "default" : "destructive"} className="text-xs">
                        {row.allowed ? "Sent" : "Blocked"}
                      </Badge>
                      {row.manual_send && (
                        <Badge variant="outline" className="text-xs">Manual</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3">
                    <span>{format(new Date(row.attempted_at), "MMM d, HH:mm")}</span>
                    {row.source_screen && <span>via {row.source_screen}</span>}
                    {row.record_type && <span>{row.record_type}</span>}
                  </div>
                  {row.blocked_reason && (
                    <div className="mt-1.5 text-xs text-destructive/80 flex items-start gap-1">
                      <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                      {row.blocked_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}