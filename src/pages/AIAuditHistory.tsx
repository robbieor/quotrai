import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, Search, Filter, Clock, User, Zap, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  team_id: string;
  user_id: string;
  action_id: string;
  command_text: string;
  intent: string;
  intent_label: string;
  entities: any;
  steps: any;
  status: string;
  output_type: string | null;
  output_record_id: string | null;
  confirmation_required: boolean;
  confirmation_result: string | null;
  conversation_id: string | null;
  created_at: string;
}

export default function AIAuditHistory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ai-audit-history", statusFilter, intentFilter],
    queryFn: async () => {
      let query = supabase
        .from("ai_action_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (intentFilter !== "all") query = query.eq("intent", intentFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditEntry[];
    },
  });

  const filtered = entries.filter((e) =>
    !search || e.command_text.toLowerCase().includes(search.toLowerCase()) || e.intent_label.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
      failed: "bg-destructive/10 text-destructive border-destructive/20",
      needs_confirmation: "bg-amber-500/10 text-amber-700 border-amber-200",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Revamo AI Activity
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Complete audit trail of all AI-initiated actions
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search commands..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="needs_confirmation">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={intentFilter} onValueChange={setIntentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="create_quote">Create Quote</SelectItem>
                  <SelectItem value="create_invoice">Create Invoice</SelectItem>
                  <SelectItem value="create_job">Create Job</SelectItem>
                  <SelectItem value="log_expense">Log Expense</SelectItem>
                  <SelectItem value="send_reminder">Send Reminder</SelectItem>
                  <SelectItem value="view_schedule">View Schedule</SelectItem>
                  <SelectItem value="briefing">Briefing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-muted-foreground">Loading audit log...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No AI actions found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{entry.intent_label}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusBadge(entry.status)}`}>
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{entry.command_text}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedEntry && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {selectedEntry.intent_label}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                {/* Status & Time */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusBadge(selectedEntry.status)}>
                    {selectedEntry.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(selectedEntry.created_at), "PPpp")}
                  </span>
                </div>

                {/* Command */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Command</h4>
                  <p className="text-sm bg-muted rounded-lg p-3">{selectedEntry.command_text}</p>
                </div>

                {/* Entities */}
                {selectedEntry.entities && (() => {
                  const entities = typeof selectedEntry.entities === "string"
                    ? JSON.parse(selectedEntry.entities)
                    : selectedEntry.entities;
                  if (!Array.isArray(entities) || entities.length === 0) return null;
                  return (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Extracted Details</h4>
                      <div className="space-y-1">
                        {entities.map((e: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm px-3 py-1.5 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground">{e.label}</span>
                            <span className="font-medium">{e.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Steps */}
                {selectedEntry.steps && (() => {
                  const steps = typeof selectedEntry.steps === "string"
                    ? JSON.parse(selectedEntry.steps)
                    : selectedEntry.steps;
                  if (!Array.isArray(steps) || steps.length === 0) return null;
                  return (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Execution Steps</h4>
                      <div className="space-y-1">
                        {steps.map((s: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-muted/50 rounded-lg">
                            <span className={s.status === "complete" ? "text-emerald-600" : s.status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                              {s.status === "complete" ? "✓" : s.status === "failed" ? "✗" : "○"}
                            </span>
                            <span>{s.label}</span>
                            {s.error_message && (
                              <span className="text-xs text-destructive ml-auto">{s.error_message}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Confirmation */}
                {selectedEntry.confirmation_required && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Confirmation</h4>
                    <div className="text-sm px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <p>Required: Yes</p>
                      {selectedEntry.confirmation_result && (
                        <p>Result: {selectedEntry.confirmation_result}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Output */}
                {selectedEntry.output_type && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Output</h4>
                    <div className="text-sm px-3 py-2 bg-muted/50 rounded-lg">
                      <p>Type: {selectedEntry.output_type}</p>
                      {selectedEntry.output_record_id && <p>Record: {selectedEntry.output_record_id}</p>}
                    </div>
                  </div>
                )}

                {/* IDs */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Technical Details</h4>
                  <div className="text-xs space-y-1 text-muted-foreground font-mono bg-muted/50 p-3 rounded-lg">
                    <p>Action: {selectedEntry.action_id}</p>
                    <p>User: {selectedEntry.user_id}</p>
                    {selectedEntry.conversation_id && <p>Conv: {selectedEntry.conversation_id}</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
