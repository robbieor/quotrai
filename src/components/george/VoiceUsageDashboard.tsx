import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mic, Clock, CreditCard, History, TrendingUp, Zap } from "lucide-react";
import { useGeorgeAccess } from "@/hooks/useGeorgeAccess";
import { useVoiceMinutePurchases } from "@/hooks/useVoiceMinutePurchases";
import { useGeorgeUsageHistory } from "@/hooks/useGeorgeUsageHistory";
import { BuyMoreMinutesButton } from "@/components/george/BuyMoreMinutesButton";
import { format } from "date-fns";

export function VoiceUsageDashboard() {
  const {
    voiceMinutesUsed,
    voiceMinutesLimit,
    remainingMinutes,
    isMinutesExhausted,
    resetDate,
    georgeVoiceSeats,
  } = useGeorgeAccess();

  const { data: purchases = [] } = useVoiceMinutePurchases();
  const { data: usageHistory = [] } = useGeorgeUsageHistory();

  const usagePercentage = voiceMinutesLimit > 0
    ? Math.min(100, (voiceMinutesUsed / voiceMinutesLimit) * 100)
    : 0;

  const formattedResetDate = resetDate
    ? format(new Date(resetDate), "MMM d, yyyy")
    : "next billing cycle";

  const totalSpentOnTopups = purchases.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const totalMinutesBought = purchases.reduce((sum, p) => sum + p.minutes_purchased, 0);

  return (
    <div className="space-y-6">
      {/* Current Balance Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5 text-primary" />
            Voice Minutes Balance
          </CardTitle>
          <CardDescription>
            {georgeVoiceSeats} voice seat{georgeVoiceSeats !== 1 ? "s" : ""} active
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main usage display */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-4xl font-bold tabular-nums">
                {Math.round(remainingMinutes)}
              </span>
              <span className="text-lg text-muted-foreground ml-1">mins remaining</span>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {Math.round(voiceMinutesUsed)} / {voiceMinutesLimit} used
            </div>
          </div>

          <Progress
            value={usagePercentage}
            className={`h-3 ${usagePercentage >= 90 ? "[&>div]:bg-destructive" : usagePercentage >= 70 ? "[&>div]:bg-warning" : ""}`}
          />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Resets {formattedResetDate}
            </span>
            {isMinutesExhausted ? (
              <Badge variant="destructive" className="gap-1">
                <Zap className="h-3 w-3" />
                Exhausted
              </Badge>
            ) : usagePercentage >= 80 ? (
              <Badge variant="outline" className="gap-1 border-warning text-warning">
                <Clock className="h-3 w-3" />
                Running low
              </Badge>
            ) : null}
          </div>

          {/* Buy more CTA */}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium">Need more minutes?</p>
              <p className="text-muted-foreground">30 minutes per top-up</p>
            </div>
            <BuyMoreMinutesButton variant="default" size="default" />
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{Math.round(voiceMinutesUsed)}</p>
                <p className="text-xs text-muted-foreground">Minutes used this period</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{totalMinutesBought}</p>
                <p className="text-xs text-muted-foreground">Minutes purchased (top-ups)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">€{totalSpentOnTopups.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total top-up spend</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            All voice minute purchases
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No purchases yet. Your included minutes reset each billing cycle.
            </p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs font-medium text-muted-foreground px-2 py-1.5">
                <span>Date</span>
                <span>Minutes</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm px-2 py-2 rounded-md hover:bg-muted/50"
                >
                  <span className="tabular-nums">
                    {format(new Date(purchase.purchased_at), "MMM d, yyyy")}
                  </span>
                  <span className="font-medium">+{purchase.minutes_purchased} mins</span>
                  <span className="tabular-nums">
                    €{Number(purchase.amount_paid).toFixed(2)}
                  </span>
                  <Badge
                    variant={purchase.status === "completed" ? "secondary" : "outline"}
                    className="w-fit text-xs"
                  >
                    {purchase.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage History (monthly snapshots) */}
      {usageHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Monthly Usage History
            </CardTitle>
            <CardDescription>
              Voice usage by billing period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs font-medium text-muted-foreground px-2 py-1.5">
                <span>Period</span>
                <span>Used</span>
                <span>Limit</span>
                <span>Usage</span>
              </div>
              {usageHistory.map((snapshot) => {
                const pct = snapshot.minutes_limit > 0
                  ? Math.round((snapshot.minutes_used / snapshot.minutes_limit) * 100)
                  : 0;
                return (
                  <div
                    key={snapshot.id}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm px-2 py-2 rounded-md hover:bg-muted/50 items-center"
                  >
                    <span className="tabular-nums">
                      {format(new Date(snapshot.period_start), "MMM yyyy")}
                    </span>
                    <span className="tabular-nums">{Math.round(snapshot.minutes_used)} mins</span>
                    <span className="tabular-nums text-muted-foreground">{snapshot.minutes_limit} mins</span>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-xs tabular-nums text-muted-foreground w-8">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
