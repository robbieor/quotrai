import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Verdict =
  | "ok"
  | "missing_api_key"
  | "invalid_api_key"
  | "missing_convai_scope"
  | "agent_not_found"
  | "agent_check_failed"
  | "user_check_failed"
  | "credits_exhausted"
  | "internal_error";

interface PreflightResult {
  ok: boolean;
  verdict: Verdict;
  message: string;
  apiKeyPresent?: boolean;
  agentId?: string;
  userCheck?: { ok: boolean; status?: number };
  agentCheck?: { ok: boolean; status?: number };
  subscriptionCheck?: { ok: boolean; status?: number; data?: any };
}

interface SessionLog {
  id: string;
  created_at: string;
  phase_reached: string | null;
  transport: string | null;
  connected: boolean;
  close_code: number | null;
  reason: string | null;
  message: string | null;
}

const verdictLabel: Record<Verdict, string> = {
  ok: "All systems go",
  missing_api_key: "ElevenLabs API key not set",
  invalid_api_key: "API key invalid or revoked",
  missing_convai_scope: "Key missing 'Conversational AI: Write' scope",
  agent_not_found: "Agent not found in workspace",
  agent_check_failed: "Could not verify agent",
  user_check_failed: "Could not verify ElevenLabs account",
  credits_exhausted: "ElevenLabs credits exhausted",
  internal_error: "Diagnostics failed to run",
};

const verdictFix: Record<Verdict, string> = {
  ok: "",
  missing_api_key: "Add ELEVENLABS_API_KEY in project secrets.",
  invalid_api_key: "Rotate the ElevenLabs key and re-add it.",
  missing_convai_scope: "Create a new key with 'Conversational AI: Write' enabled and update ELEVENLABS_API_KEY.",
  agent_not_found: "Agent may have been deleted or moved. Check ElevenLabs > Agents.",
  agent_check_failed: "Try again in a moment, or check ElevenLabs status.",
  user_check_failed: "Try again in a moment, or check ElevenLabs status.",
  credits_exhausted: "Top up your ElevenLabs plan or wait for next billing cycle.",
  internal_error: "Try again. If it persists, check edge function logs.",
};

export function VoiceDiagnostics() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [logs, setLogs] = useState<SessionLog[]>([]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("voice_session_logs")
      .select("id, created_at, phase_reached, transport, connected, close_code, reason, message")
      .order("created_at", { ascending: false })
      .limit(10);
    setLogs((data as SessionLog[]) || []);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const runCheck = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-preflight");
      if (error) {
        setResult({ ok: false, verdict: "internal_error", message: error.message });
      } else {
        setResult(data as PreflightResult);
      }
    } catch (e) {
      setResult({ ok: false, verdict: "internal_error", message: String(e) });
    } finally {
      setRunning(false);
      void loadLogs();
    }
  };

  const Icon = result?.ok ? CheckCircle2 : result ? XCircle : AlertTriangle;
  const iconColor = result?.ok ? "text-green-500" : result ? "text-destructive" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Voice diagnostics</CardTitle>
        <Button size="sm" variant="outline" onClick={runCheck} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Run check</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Verifies the ElevenLabs API key, the agent, and remaining credits before you spend any minutes on a call.
        </p>

        {result && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${iconColor}`} />
              <span className="font-medium">{verdictLabel[result.verdict]}</span>
            </div>
            <p className="text-sm text-muted-foreground">{result.message}</p>
            {!result.ok && (
              <p className="text-sm">
                <span className="font-medium">Fix: </span>
                <span className="text-muted-foreground">{verdictFix[result.verdict]}</span>
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
              <Status label="API key" ok={!!result.apiKeyPresent} />
              <Status label="Account" ok={!!result.userCheck?.ok} />
              <Status label="Agent" ok={!!result.agentCheck?.ok} />
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2">Recent voice attempts</h4>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No attempts logged yet.</p>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log) => (
                <div key={log.id} className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                    <Badge variant={log.connected ? "default" : "destructive"} className="text-[10px] h-4 px-1.5">
                      {log.connected ? "connected" : (log.phase_reached || "failed")}
                    </Badge>
                  </div>
                  <div className="text-foreground/90 break-words">
                    {log.message || log.reason || "—"}
                    {log.close_code ? ` (code ${log.close_code})` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Status({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border px-2 py-1.5">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
