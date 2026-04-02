import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Check, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export function ReferralCard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !profile?.team_id) return;

    const loadReferrals = async () => {
      // Check for existing referral code
      const { data: existing } = await supabase
        .from("referrals")
        .select("referral_code, status")
        .eq("referrer_user_id", user.id);

      if (existing && existing.length > 0) {
        setReferralCode(existing[0].referral_code);
        setReferralCount(existing.filter((r: any) => r.status !== "pending").length);
      } else {
        // Generate a new referral code
        const code = `FOREMAN-${user.id.slice(0, 6).toUpperCase()}`;
        const { error } = await supabase.from("referrals").insert({
          referrer_team_id: profile.team_id,
          referrer_user_id: user.id,
          referral_code: code,
          status: "pending",
        });
        if (!error) setReferralCode(code);
      }
      setLoading(false);
    };

    loadReferrals();
  }, [user?.id, profile?.team_id]);

  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-primary" />
          Refer a Mate
        </CardTitle>
        <CardDescription>
          Give a mate 30 days free. Get a month free yourself when they subscribe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={referralLink} readOnly className="text-xs bg-muted" />
          <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {referralCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {referralCount} referral{referralCount !== 1 ? "s" : ""} converted
            </span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "Try Foreman — AI-powered job management",
                text: "I've been using Foreman to run my trade business. Sign up with my link and get 30 days free!",
                url: referralLink,
              });
            } else {
              handleCopy();
            }
          }}
        >
          <Gift className="h-4 w-4" />
          Share with a mate
        </Button>
      </CardContent>
    </Card>
  );
}
