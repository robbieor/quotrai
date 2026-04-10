import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import type { ForemanPreferences } from "@/types/foreman-actions";
import { DEFAULT_FOREMAN_PREFERENCES } from "@/types/foreman-actions";

export function ForemanAISettings() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [prefs, setPrefs] = useState<ForemanPreferences>(DEFAULT_FOREMAN_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user || !profile?.team_id) return;
    async function load() {
      const { data } = await supabase
        .from("foreman_ai_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .eq("team_id", profile!.team_id!)
        .maybeSingle();

      if (data) {
        setPrefs({
          always_create_drafts: data.always_create_drafts,
          default_payment_terms_days: data.default_payment_terms_days,
          itemised_format: data.itemised_format,
          require_confirmation_before_send: data.require_confirmation_before_send,
          default_tax_rate: data.default_tax_rate ?? undefined,
          labour_materials_split: data.labour_materials_split,
        });
      }
      setLoading(false);
    }
    load();
  }, [user, profile?.team_id]);

  const handleSave = async () => {
    if (!user || !profile?.team_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("foreman_ai_preferences")
        .upsert({
          user_id: user.id,
          team_id: profile.team_id,
          always_create_drafts: prefs.always_create_drafts,
          default_payment_terms_days: prefs.default_payment_terms_days,
          itemised_format: prefs.itemised_format,
          require_confirmation_before_send: prefs.require_confirmation_before_send,
          default_tax_rate: prefs.default_tax_rate ?? null,
          labour_materials_split: prefs.labour_materials_split,
          updated_at: new Date().toISOString(),
        }, { onConflict: "team_id,user_id" });

      if (error) throw error;
      toast.success("Foreman AI preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Foreman AI Preferences</CardTitle>
        </div>
        <CardDescription>
          Control how Foreman AI creates and handles your quotes, invoices, and communications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Always draft before send */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Always create as draft</Label>
            <p className="text-xs text-muted-foreground">
              Never auto-send quotes or invoices — always save as draft first
            </p>
          </div>
          <Switch
            checked={prefs.always_create_drafts}
            onCheckedChange={(v) => setPrefs(p => ({ ...p, always_create_drafts: v }))}
          />
        </div>

        {/* Require confirmation before send */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Confirm before client messages</Label>
            <p className="text-xs text-muted-foreground">
              Show confirmation gate before any communication goes to a client
            </p>
          </div>
          <Switch
            checked={prefs.require_confirmation_before_send}
            onCheckedChange={(v) => setPrefs(p => ({ ...p, require_confirmation_before_send: v }))}
          />
        </div>

        {/* Itemised format */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Itemised quote/invoice format</Label>
            <p className="text-xs text-muted-foreground">
              Break down quotes and invoices into line items by default
            </p>
          </div>
          <Switch
            checked={prefs.itemised_format}
            onCheckedChange={(v) => setPrefs(p => ({ ...p, itemised_format: v }))}
          />
        </div>

        {/* Labour/materials split */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Labour & materials split</Label>
            <p className="text-xs text-muted-foreground">
              Separate labour and materials costs on quotes and invoices
            </p>
          </div>
          <Switch
            checked={prefs.labour_materials_split}
            onCheckedChange={(v) => setPrefs(p => ({ ...p, labour_materials_split: v }))}
          />
        </div>

        {/* Default payment terms */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Default payment terms (days)</Label>
          <p className="text-xs text-muted-foreground">
            Default number of days for invoice payment terms
          </p>
          <Input
            type="number"
            min={1}
            max={90}
            value={prefs.default_payment_terms_days}
            onChange={(e) => setPrefs(p => ({ ...p, default_payment_terms_days: parseInt(e.target.value) || 14 }))}
            className="w-24"
          />
        </div>

        {/* Default tax rate */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Default tax rate (%)</Label>
          <p className="text-xs text-muted-foreground">
            Leave empty to use your account default VAT rate
          </p>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={prefs.default_tax_rate ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setPrefs(p => ({ ...p, default_tax_rate: val ? parseFloat(val) : undefined }));
            }}
            placeholder="e.g. 23"
            className="w-24"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Preferences
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              setSyncing(true);
              try {
                const { data, error } = await supabase.functions.invoke("sync-agent-tools");
                if (error) throw error;
                toast.success(`Synced ${data?.tools_pushed ?? 0} tools to voice agent`);
              } catch {
                toast.error("Failed to sync tools to voice agent");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="w-full sm:w-auto"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync Voice Tools
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
