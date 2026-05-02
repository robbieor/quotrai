import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";
import { ArrowUp, Pin, Sparkles, Trash2 } from "lucide-react";
import { useForemanChat } from "@/hooks/useForemanChat";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Which customers haven't paid in 60+ days?",
  "What was my best month this year?",
  "Show me jobs running over budget",
  "Top 5 customers by revenue this year",
  "Quotes I sent last week with no reply",
  "How am I tracking against last month?",
];

interface PinnedInsight {
  id: string;
  question: string;
  answer_markdown: string;
  created_at: string;
}

function AskInner() {
  const { profile } = useProfile();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { sendMessage, isProcessing, streamingText, lastError } = useForemanChat({
    conversationId: null,
    onAssistantMessage: (msg) => setAnswer(msg),
    onStreamingUpdate: (t) => setAnswer(t),
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answer, streamingText]);

  const ask = (q: string) => {
    if (!q.trim() || isProcessing) return;
    setQuestion(q);
    setAnswer("");
    setInput("");
    sendMessage(q);
  };

  // Pinned insights
  const { data: pinned = [] } = useQuery({
    queryKey: ["pinned-insights", profile?.team_id],
    enabled: !!profile?.team_id,
    queryFn: async (): Promise<PinnedInsight[]> => {
      const { data, error } = await supabase
        .from("pinned_insights")
        .select("id, question, answer_markdown, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const pinMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.team_id || !question || !answer) return;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("pinned_insights").insert({
        team_id: profile.team_id,
        pinned_by: u.user!.id,
        question,
        answer_markdown: answer,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pinned");
      qc.invalidateQueries({ queryKey: ["pinned-insights"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to pin"),
  });

  const unpinMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pinned_insights")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pinned-insights"] }),
  });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div>
            {/* Header */}
            <div className="flex items-start gap-3 mb-6">
              <ForemanAvatar size="lg" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Ask Foreman</h1>
                <p className="text-sm text-muted-foreground">
                  Ask anything about your business — Foreman knows your data.
                </p>
              </div>
            </div>

            {/* Search bar */}
            <Card className="p-2 mb-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(input);
                    }
                  }}
                  placeholder="Ask Foreman anything…"
                  className="min-h-[44px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={() => ask(input)}
                  disabled={!input.trim() || isProcessing}
                  className="shrink-0"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Suggestion chips */}
            {!question && (
              <div className="flex flex-wrap gap-2 mb-6">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Result */}
            {question && (
              <Card className="p-5">
                <div className="text-sm text-muted-foreground mb-2">
                  You asked
                </div>
                <p className="font-medium mb-4">{question}</p>

                <div className="border-t border-border pt-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Foreman
                    </span>
                  </div>
                  {!answer && isProcessing ? (
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Thinking…
                    </p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{answer || streamingText}</ReactMarkdown>
                    </div>
                  )}
                  {lastError && (
                    <p className="mt-3 text-xs text-destructive">{lastError}</p>
                  )}
                </div>

                {answer && !isProcessing && (
                  <div className="border-t border-border pt-3 mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => pinMutation.mutate()}
                      disabled={pinMutation.isPending}
                      className="gap-1.5"
                    >
                      <Pin className="h-3.5 w-3.5" />
                      Save as Insight
                    </Button>
                  </div>
                )}
                <div ref={scrollRef} />
              </Card>
            )}
          </div>

          {/* Sidebar — pinned insights */}
          <aside className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pinned insights
            </h2>
            {pinned.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Save useful answers to revisit later.
              </p>
            ) : (
              pinned.map((p) => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold line-clamp-2">
                      {p.question}
                    </p>
                    <button
                      onClick={() => unpinMutation.mutate(p.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Unpin"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-3">
                    {p.answer_markdown.replace(/[*#_`]/g, "").slice(0, 140)}
                  </p>
                  <button
                    onClick={() => {
                      setQuestion(p.question);
                      setAnswer(p.answer_markdown);
                    }}
                    className="mt-2 text-[11px] text-primary hover:underline"
                  >
                    View
                  </button>
                </Card>
              ))
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Ask() {
  return (
    <ProtectedRoute>
      <AskInner />
    </ProtectedRoute>
  );
}
