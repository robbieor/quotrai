import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLocationConsent } from "@/hooks/useLocationConsent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Download, MapPin, Trash2, FileText } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacySettings() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { consented: locationConsented, revoke: revokeLocation } = useLocationConsent();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [wipingLocation, setWipingLocation] = useState(false);

  useEffect(() => {
    if (profile && "marketing_opt_in" in profile) {
      setMarketingOptIn(Boolean((profile as any).marketing_opt_in));
    }
  }, [profile]);

  const toggleMarketing = async (next: boolean) => {
    if (!user) return;
    setSavingMarketing(true);
    setMarketingOptIn(next);
    const { error } = await supabase
      .from("profiles")
      .update({ marketing_opt_in: next })
      .eq("id", user.id);
    setSavingMarketing(false);
    if (error) {
      setMarketingOptIn(!next);
      toast.error("Couldn't save that change");
    } else {
      toast.success(next ? "Marketing emails turned on" : "Marketing emails turned off");
    }
  };

  const wipeLocationHistory = async () => {
    if (!user) return;
    if (!confirm("Delete all GPS pings and mileage trips for your account? This can't be undone.")) return;
    setWipingLocation(true);
    try {
      const { error } = await supabase.functions.invoke("delete-location-history");
      if (error) throw error;
      toast.success("Location history wiped");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't wipe history");
    } finally {
      setWipingLocation(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" /> Privacy & data
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Control how revamo uses your data. Everything here is yours to manage.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Download your data</CardTitle>
            <CardDescription>
              Export everything we hold on you and your business (Article 20 — data portability).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/settings?tab=import">Go to data export</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Location data</CardTitle>
            <CardDescription>
              GPS is used for clock-in verification and auto-mileage. Raw pings are deleted after 90 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-sm">Location use</p>
                <p className="text-xs text-muted-foreground">
                  {locationConsented ? "Allowed" : "Not allowed — time tracking & mileage will be disabled"}
                </p>
              </div>
              {locationConsented && (
                <Button variant="outline" size="sm" onClick={revokeLocation}>Turn off</Button>
              )}
            </div>
            <Button variant="outline" onClick={wipeLocationHistory} disabled={wipingLocation}>
              <Trash2 className="h-4 w-4 mr-2" />
              {wipingLocation ? "Wiping…" : "Delete my location history"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marketing emails</CardTitle>
            <CardDescription>
              Product news, tips and offers. Off by default — transactional emails (invoices, quotes,
              security) always send regardless.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch id="marketing" checked={marketingOptIn} onCheckedChange={toggleMarketing} disabled={savingMarketing} />
              <Label htmlFor="marketing" className="cursor-pointer">
                Send me product updates from revamo
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Your consent log</CardTitle>
            <CardDescription>When you agreed to our policies.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1.5">
            <ConsentRow label="Terms of Service" at={(profile as any)?.consented_terms_at} />
            <ConsentRow label="Privacy Policy" at={(profile as any)?.consented_privacy_at} />
            <ConsentRow label="Location use" at={(profile as any)?.location_consent_at} />
          </CardContent>
        </Card>

        <Separator />

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Schedule your account for permanent deletion. You have 30 days to change your mind.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete my account
            </Button>
          </CardContent>
        </Card>
      </div>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        userEmail={user?.email || ""}
      />
    </DashboardLayout>
  );
}

function ConsentRow({ label, at }: { label: string; at?: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 last:border-0 py-1">
      <span className="text-foreground">{label}</span>
      <span className="font-mono text-xs">
        {at ? new Date(at).toLocaleString("en-IE") : "—"}
      </span>
    </div>
  );
}
