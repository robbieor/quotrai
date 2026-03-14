import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Gift, Users, CheckCircle2, Share2 } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";
import { toast } from "sonner";

export function ReferralCard() {
  const { referralLink, referralCode, referrals, stats, isLoading } = useReferrals();

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Try Quotr — manage your trade business smarter",
          text: "I use Quotr to run my trade business. Sign up with my link and we both get 1 month free!",
          url: referralLink,
        });
      } catch {
        // user cancelled share
      }
    } else {
      handleCopy();
    }
  };

  if (isLoading || !referralCode) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Refer & Earn</CardTitle>
        </div>
        <CardDescription>
          Share your link — you both get 1 month free when they subscribe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral link */}
        <div className="flex gap-2">
          <Input
            readOnly
            value={referralLink || ""}
            className="font-mono text-sm bg-muted"
          />
          <Button variant="outline" size="icon" onClick={handleCopy} title="Copy link">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare} title="Share">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Invited</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.subscribed}</p>
            <p className="text-xs text-muted-foreground">Subscribed</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <Gift className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.rewardsEarned}</p>
            <p className="text-xs text-muted-foreground">Months earned</p>
          </div>
        </div>

        {/* Recent referrals */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recent referrals</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {referrals.slice(0, 5).map((ref) => (
                <div key={ref.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground truncate max-w-[200px]">{ref.referred_email}</span>
                  <Badge variant={ref.status === "subscribed" ? "default" : "secondary"} className="text-xs">
                    {ref.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
