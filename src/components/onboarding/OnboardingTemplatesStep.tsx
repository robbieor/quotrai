import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tags, Plus, Loader2, Pencil, Check } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface TemplateRow {
  id: string;
  name: string;
  labour_rate_default: number;
  estimated_duration: number;
  category: string;
}

interface OnboardingTemplatesStepProps {
  teamId: string;
}

export function OnboardingTemplatesStep({ teamId }: OnboardingTemplatesStepProps) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("45");
  const [adding, setAdding] = useState(false);
  const { symbol } = useCurrency();

  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from("templates")
      .select("id, name, labour_rate_default, estimated_duration, category")
      .eq("team_id", teamId)
      .eq("is_active", true)
      .order("is_favorite", { ascending: false })
      .order("name");
    if (!error && data) setTemplates(data);
    setLoading(false);
  }, [teamId]);

  // Seed templates on mount if none exist
  useEffect(() => {
    if (!teamId || seeded) return;
    (async () => {
      const { count } = await supabase
        .from("templates")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId);

      if ((count ?? 0) === 0) {
        await supabase.rpc("seed_team_templates", { p_team_id: teamId });
      }
      setSeeded(true);
      fetchTemplates();
    })();
  }, [teamId, seeded, fetchTemplates]);

  const saveRate = async (id: string) => {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0) return;
    await supabase.from("templates").update({ labour_rate_default: rate }).eq("id", id);
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, labour_rate_default: rate } : t));
    setEditingId(null);
  };

  const addTemplate = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const rate = parseFloat(newRate) || 45;

    // Get user's trade category from their first template
    const category = templates[0]?.category || "general";

    const { data, error } = await supabase
      .from("templates")
      .insert({
        team_id: teamId,
        name: newName.trim(),
        category,
        labour_rate_default: rate,
        estimated_duration: 1,
        is_system_template: false,
        is_active: true,
      })
      .select("id, name, labour_rate_default, estimated_duration, category")
      .single();

    if (error) {
      toast.error("Failed to add template");
    } else if (data) {
      setTemplates(prev => [...prev, data]);
      setNewName("");
      setNewRate("45");
      setShowAdd(false);
    }
    setAdding(false);
  };

  return (
    <Card className="animate-fade-up border-0 shadow-none">
      <CardHeader className="text-center pb-2 px-0">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Tags className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Set Your Prices</CardTitle>
        <CardDescription>
          Review your default templates and set your labour rates. Foreman uses these to create quotes instantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 px-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.estimated_duration}h estimated</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {editingId === t.id ? (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">{symbol}</span>
                          <Input
                            type="number"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="w-20 h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRate(t.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => saveRate(t.id)}
                        >
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                          {symbol}{t.labour_rate_default}/hr
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingId(t.id);
                            setEditRate(String(t.labour_rate_default));
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {showAdd ? (
              <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Template name</Label>
                  <Input
                    placeholder="e.g. Boiler Service"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Labour rate ({symbol}/hr)</Label>
                  <Input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addTemplate} disabled={adding || !newName.trim()}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-2"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="h-4 w-4" />
                Add Custom Template
              </Button>
            )}

            <p className="text-xs text-muted-foreground mt-3 text-center">
              You can always add more templates and adjust prices later in Settings.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
