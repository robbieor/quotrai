import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileText,
  Download,
} from "lucide-react";
import { useSubscription, useOrgMembers } from "@/hooks/useSubscription";
import { PRICING, type SeatType, LITE_SEAT_DETAILS, CONNECT_SEAT_DETAILS, GROW_SEAT_DETAILS } from "@/hooks/useSubscriptionTier";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";
import { useIsNative } from "@/hooks/useIsNative";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";

const SEAT_PRICES: Record<SeatType, number> = {
  lite: PRICING.LITE_SEAT,
  connect: PRICING.CONNECT_SEAT,
  grow: PRICING.GROW_SEAT,
};

const SEAT_DISPLAY_NAMES: Record<SeatType, string> = {
  lite: LITE_SEAT_DETAILS.name,
  connect: CONNECT_SEAT_DETAILS.name,
  grow: GROW_SEAT_DETAILS.name,
};

const CANCEL_REASONS = [
  "Too expensive",
  "Missing features I need",
  "Switching to a competitor",
  "Not using it enough",
  "Other",
] as const;

export function SubscriptionOverview() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: members } = useOrgMembers();
  const { formatCurrency } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [isEndingTrial, setIsEndingTrial] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelStep, setCancelStep] = useState<"reason" | "confirm">("reason");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetail, setCancelDetail] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [endTrialDialogOpen, setEndTrialDialogOpen] = useState(false);
  const isNative = useIsNative();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Billing history
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-invoices");
      if (error) throw error;
      return data?.invoices || [];
    },
    enabled: !!user,
  });

  if (isNative) return null;

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-customer-portal-session");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to open billing portal";
      if (msg.includes("No Stripe customer")) {
        toast.error("No active subscription yet. Please choose a plan first.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelWithReason = async () => {
    if (!cancelReason) {
      toast.error("Please select a reason");
      return;
    }
    setIsCancelling(true);
    try {
      // Store reason
      await supabase.from("cancellation_reasons").insert({
        org_id: "00000000-0000-0000-0000-000000000000", // placeholder — edge function has org context
        user_id: user?.id,
        reason: cancelReason,
        detail: cancelDetail || null,
      });

      // Cancel subscription
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { cancel: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["subscription-v2"] });
      toast.success("Subscription will cancel at period end");
      setCancelDialogOpen(false);
      setCancelStep("reason");
      setCancelReason("");
      setCancelDetail("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResume = async () => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { cancel: false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["subscription-v2"] });
      toast.success("Subscription resumed successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resume subscription");
    } finally {
    setIsCancelling(false);
    }
  };

  const handleEndTrialEarly = async () => {
    setIsEndingTrial(true);
    try {
      const { data, error } = await supabase.functions.invoke("end-trial-early");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["subscription-v2"] });
      toast.success("Trial ended — your subscription is now active!", {
        description: "Your first payment has been processed.",
        duration: 5000,
      });
      setEndTrialDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to end trial");
    } finally {
      setIsEndingTrial(false);
    }
  };

  if (subLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const status = subscription?.status;
  const isTrialing = status === "trialing";
  const isActive = status === "active";
  const isCancelled = subscription?.cancel_at_period_end;
  const isPastDue = status === "past_due";
  const isExpired = status === "expired";

  const seatCounts: Record<SeatType, number> = { lite: 0, connect: 0, grow: 0 };
  members?.forEach((m) => {
    if (seatCounts[m.seat_type] !== undefined) seatCounts[m.seat_type]++;
  });
  const totalMonthly = Object.entries(seatCounts).reduce(
    (sum, [type, count]) => sum + SEAT_PRICES[type as SeatType] * count,
    0
  );

  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(0, differenceInDays(new Date(subscription.trial_ends_at), new Date()))
    : 0;
  const trialProgress = isTrialing && subscription?.trial_ends_at
    ? Math.max(0, ((7 - trialDaysRemaining) / 7) * 100)
    : 0;

  const getStatusBadge = () => {
    if (isPastDue) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Past Due</Badge>;
    if (isCancelled) return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Cancelling</Badge>;
    if (isTrialing) return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 gap-1"><Clock className="h-3 w-3" />Trial</Badge>;
    if (isActive) return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/10 gap-1"><CheckCircle2 className="h-3 w-3" />Active</Badge>;
    if (isExpired) return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Expired</Badge>;
    return null;
  };

  if (!subscription || isExpired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>Start your free trial to unlock all features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <div className="p-6 rounded-lg border border-dashed space-y-3">
              <p className="text-lg font-semibold">Subscribe to restore full access</p>
              <p className="text-sm text-muted-foreground">
                Choose a plan to continue using Foreman and unlock all features.
              </p>
              <Button onClick={() => navigate("/select-plan")} size="lg">
                Choose Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                {subscription?.current_period_end
                  ? `${isCancelled ? "Access ends" : "Next billing"}: ${format(new Date(subscription.current_period_end), "MMMM d, yyyy")}`
                  : "Manage your subscription and billing"
                }
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground"
              onClick={() => navigate("/select-plan")}
            >
              View Plans <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTrialing && (
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Trial Period</p>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining
                </span>
              </div>
              <Progress value={trialProgress} className="h-2" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Your trial ends {subscription?.trial_ends_at
                    ? format(new Date(subscription.trial_ends_at), "MMMM d, yyyy")
                    : "soon"
                  }. Subscribe to keep full access.
                </p>
                {subscription?.stripe_subscription_id && (
                  <AlertDialog open={endTrialDialogOpen} onOpenChange={setEndTrialDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs shrink-0 ml-3">
                        Start Paying Now
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>End trial and start paying?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your free trial will end immediately and your first payment will be processed now. 
                          Your subscription will become fully active right away.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Trial</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEndTrialEarly} disabled={isEndingTrial}>
                          {isEndingTrial ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Confirm & Pay
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )}

          {isPastDue && (
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
              <p className="text-sm font-medium text-destructive">Payment Failed</p>
              <p className="text-xs text-muted-foreground">
                Your last payment didn't go through. Please update your payment method to avoid losing access.
              </p>
            </div>
          )}

          {isCancelled && (
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <p className="text-sm font-medium">Subscription Cancelled</p>
              <p className="text-xs text-muted-foreground">
                You'll keep access until {subscription?.current_period_end
                  ? format(new Date(subscription.current_period_end), "MMMM d, yyyy")
                  : "the end of your billing period"
                }. Resubscribe anytime to continue.
              </p>
            </div>
          )}

          {(isActive || isTrialing) && members && members.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {(["lite", "connect", "grow"] as SeatType[]).map((type) => (
                seatCounts[type] > 0 && (
                  <div key={type} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground">{SEAT_DISPLAY_NAMES[type]} Seats</p>
                    <p className="text-lg font-bold">{seatCounts[type]}</p>
                    <p className="text-xs text-muted-foreground">
                      × {formatCurrency(SEAT_PRICES[type])}/mo
                    </p>
                  </div>
                )
              ))}
            </div>
          )}

          {(isActive || isTrialing) && totalMonthly > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
              <span className="text-sm font-medium">Total Monthly</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalMonthly)}</span>
            </div>
          )}

          <Separator />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isPastDue ? "Update payment method" : isTrialing ? "Choose a plan" : "Manage your subscription"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPastDue
                  ? "Update your card to restore full access"
                  : isTrialing
                  ? "Select a plan to continue after your trial"
                  : "Change plan, update payment, or view invoices"
                }
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isTrialing ? (
                <Button variant="default" onClick={() => navigate("/select-plan")}>
                  Choose Plan
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleManageBilling} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {isPastDue ? "Update Payment" : "Manage Billing"}
                      </>
                    )}
                  </Button>

                  {(isActive || isTrialing) && !isCancelled && (
                    <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
                      setCancelDialogOpen(open);
                      if (!open) {
                        setCancelStep("reason");
                        setCancelReason("");
                        setCancelDetail("");
                      }
                    }}>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        {cancelStep === "reason" ? (
                          <>
                            <AlertDialogHeader>
                              <AlertDialogTitle>We're sorry to see you go</AlertDialogTitle>
                              <AlertDialogDescription>
                                Help us improve — why are you cancelling?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-3 py-2">
                              {CANCEL_REASONS.map((reason) => (
                                <label key={reason} className="flex items-center gap-3 cursor-pointer min-h-[44px] py-1">
                                  <input
                                    type="radio"
                                    name="cancel-reason"
                                    value={reason}
                                    checked={cancelReason === reason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="h-5 w-5 text-primary"
                                  />
                                  <span className="text-sm">{reason}</span>
                                </label>
                              ))}
                              {cancelReason && (
                                <Textarea
                                  placeholder="Tell us more (optional)"
                                  value={cancelDetail}
                                  onChange={(e) => setCancelDetail(e.target.value)}
                                  className="mt-2"
                                  rows={2}
                                />
                              )}
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Never mind</AlertDialogCancel>
                              <Button
                                variant="destructive"
                                onClick={() => setCancelStep("confirm")}
                                disabled={!cancelReason}
                              >
                                Continue
                              </Button>
                            </AlertDialogFooter>
                          </>
                        ) : (
                          <>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm cancellation</AlertDialogTitle>
                              <AlertDialogDescription>
                                You'll keep full access until{" "}
                                {subscription?.current_period_end
                                  ? format(new Date(subscription.current_period_end), "MMMM d, yyyy")
                                  : "the end of your billing period"
                                }. You can resume anytime before then.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={handleCancelWithReason}
                                disabled={isCancelling}
                              >
                                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Cancel"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </>
                        )}
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {isCancelled && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleResume}
                      disabled={isCancelling}
                    >
                      {isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Resume Subscription
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !invoicesData || invoicesData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No invoices yet. Your first invoice will appear here after your trial ends.
            </p>
          ) : isMobile ? (
            /* Mobile: stacked cards */
            <div className="space-y-3">
              {invoicesData.map((inv: any) => (
                <div key={inv.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {inv.date ? format(new Date(inv.date), "MMM d, yyyy") : "—"}
                    </span>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-xs">
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">{formatCurrency(inv.amount)}</span>
                    {inv.pdf_url && (
                      <Button variant="outline" size="sm" asChild className="gap-1.5 h-9">
                        <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5" /> PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">
                        {inv.date ? format(new Date(inv.date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(inv.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-xs">
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.pdf_url && (
                          <Button variant="ghost" size="sm" asChild className="gap-1 h-8">
                            <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" /> PDF
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
