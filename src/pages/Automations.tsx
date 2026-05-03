import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Check,
  X,
  Power,
  Eye,
  Trash2,
  History,
  Zap,
  ChevronRight,
} from "lucide-react";
import {
  useSuggestions,
  useActiveAutomations,
  useEnableSuggestion,
  useDismissSuggestion,
  useToggleAutomation,
  useDeleteAutomation,
  useAutomationRuns,
  type TeamAutomation,
} from "@/hooks/useAutomations";
import { format } from "date-fns";

function PatternIcon({ patternKey }: { patternKey: string }) {
  return (
    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <Zap className="h-4 w-4" />
    </div>
  );
}

function SuggestionsTab() {
  const { data: suggestions, isLoading } = useSuggestions();
  const enable = useEnableSuggestion();
  const dismiss = useDismissSuggestion();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="p-6 sm:p-8 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No suggestions yet. Revamo is watching how you work and will propose
          automations as patterns emerge.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <Card key={s.id} className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <PatternIcon patternKey={s.pattern_key} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-sm">{s.title}</h3>
                <Badge variant="outline" className="text-[10px]">
                  {Math.round(s.confidence * 100)}% confidence
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {s.description}
              </p>
              <div className="text-xs text-muted-foreground mb-4">
                Based on:{" "}
                {Object.entries(s.evidence)
                  .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                  .join(" · ") || "recent activity"}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => enable.mutate(s)}
                  disabled={enable.isPending}
                  className="gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Enable in preview mode
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismiss.mutate(s.id)}
                  disabled={dismiss.isPending}
                  className="gap-1.5 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Not for me
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AutomationRunsList({ automationId }: { automationId: string }) {
  const { data: runs } = useAutomationRuns(automationId);
  if (!runs?.length) {
    return (
      <p className="text-xs text-muted-foreground py-3">
        No runs yet. Will appear here once Revamo finds matching activity.
      </p>
    );
  }
  return (
    <div className="border-t border-border mt-3 pt-3 space-y-1.5">
      {runs.slice(0, 8).map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between text-xs gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                !r.success
                  ? "bg-destructive"
                  : r.preview
                    ? "bg-amber-500"
                    : "bg-primary"
              }`}
            />
            <span className="text-muted-foreground truncate">
              {r.preview ? "Preview" : "Sent"} · {r.target_table} ·{" "}
              {r.target_id?.slice(0, 8)}
              {r.error ? ` · ${r.error}` : ""}
            </span>
          </div>
          <span className="text-muted-foreground/70 shrink-0">
            {format(new Date(r.ran_at), "d MMM HH:mm")}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActiveAutomationCard({ a }: { a: TeamAutomation }) {
  const [showRuns, setShowRuns] = useState(false);
  const toggle = useToggleAutomation();
  const remove = useDeleteAutomation();

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <PatternIcon patternKey={a.pattern_key} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-sm">{a.name}</h3>
            {a.preview_mode && (
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview mode
              </Badge>
            )}
            {!a.enabled && (
              <Badge variant="outline" className="text-[10px]">
                Paused
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {a.run_count} run{a.run_count === 1 ? "" : "s"} so far
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                <Power className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Active</span>
              </div>
              <Switch
                checked={a.enabled}
                onCheckedChange={(v) =>
                  toggle.mutate({ id: a.id, field: "enabled", value: v })
                }
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Preview only (don't send)</span>
              </div>
              <Switch
                checked={a.preview_mode}
                onCheckedChange={(v) =>
                  toggle.mutate({ id: a.id, field: "preview_mode", value: v })
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRuns((v) => !v)}
              className="gap-1.5"
            >
              <History className="h-3.5 w-3.5" />
              {showRuns ? "Hide" : "View"} run history
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => remove.mutate(a.id)}
              disabled={remove.isPending}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>

          {showRuns && <AutomationRunsList automationId={a.id} />}
        </div>
      </div>
    </Card>
  );
}

function ActiveTab() {
  const { data: automations, isLoading } = useActiveAutomations();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!automations?.length) {
    return (
      <Card className="p-6 sm:p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No active automations. Enable one from the Suggested tab.
        </p>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {automations.map((a) => (
        <ActiveAutomationCard key={a.id} a={a} />
      ))}
    </div>
  );
}

function AutomationsInner() {
  const { data: suggestions } = useSuggestions();
  const { data: active } = useActiveAutomations();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Revamo watches how you work and proposes ways to take repetitive
            jobs off your hands. Nothing runs without your approval.
          </p>
        </div>

        <Tabs defaultValue="suggested">
          <TabsList>
            <TabsTrigger value="suggested" className="gap-1.5">
              Suggested
              {suggestions?.length ? (
                <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
                  {suggestions.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5">
              Active
              {active?.length ? (
                <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
                  {active.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="suggested" className="mt-4">
            <SuggestionsTab />
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            <ActiveTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default function Automations() {
  return (
    <ProtectedRoute>
      <AutomationsInner />
    </ProtectedRoute>
  );
}
