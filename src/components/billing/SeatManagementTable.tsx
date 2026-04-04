import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Users, Loader2, Plus, Info, ChevronDown } from "lucide-react";
import { useOrgMembers, useAddSeat } from "@/hooks/useSubscription";
import { PRICING, type SeatType } from "@/hooks/useSubscriptionTier";
import { useCurrency } from "@/hooks/useCurrency";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";

const SEAT_PRICES: Record<SeatType, number> = {
  lite: PRICING.LITE_SEAT,
  connect: PRICING.CONNECT_SEAT,
  grow: PRICING.GROW_SEAT,
};

const SEAT_LABELS: Record<SeatType, string> = {
  lite: 'Lite',
  connect: 'Connect',
  grow: 'Grow',
};

const ROLE_COLORS: Record<string, string> = {
  ceo: 'bg-primary/10 text-primary',
  owner: 'bg-primary/10 text-primary',
  manager: 'bg-accent/50 text-accent-foreground',
  member: 'bg-muted text-muted-foreground',
};

/** What each seat unlocks (only matters if role allows it) */
const SEAT_ACCESS: Record<SeatType, string[]> = {
  lite: ["Jobs", "Quotes", "Invoices", "Scheduling"],
  connect: ["+ AI assistant", "+ Expenses", "+ Reports", "+ Documents"],
  grow: ["+ Leads pipeline", "+ Integrations", "+ Advanced reporting"],
};

function getEffectiveAccess(role: string, seatType: SeatType): string[] {
  if (role === "member") {
    return ["Jobs", "Calendar", "Time tracking"];
  }
  const base = SEAT_ACCESS.lite;
  const extras = seatType === "connect" || seatType === "grow" ? SEAT_ACCESS.connect : [];
  const growExtras = seatType === "grow" ? SEAT_ACCESS.grow : [];
  return [...base, ...extras, ...growExtras];
}

function ExplainerCard() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 px-3 rounded-lg hover:bg-muted/50">
          <Info className="h-4 w-4 shrink-0" />
          <span className="font-medium">Understanding Seats & Roles</span>
          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid sm:grid-cols-2 gap-4 p-3 mt-1 rounded-lg bg-muted/30 border border-border/50">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Seat Type — features available</p>
            <ul className="space-y-1.5 text-sm">
              <li><span className="font-medium">Lite</span> — Jobs, quotes, invoices, scheduling</li>
              <li><span className="font-medium">Connect</span> — + AI assistant, expenses, reports</li>
              <li><span className="font-medium">Grow</span> — + Leads pipeline, integrations, API</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Role — data visibility</p>
            <ul className="space-y-1.5 text-sm">
              <li><span className="font-medium">Owner</span> — Full access, billing, team management</li>
              <li><span className="font-medium">Manager</span> — Full access, no billing</li>
              <li><span className="font-medium">Team Member</span> — Jobs, calendar, time tracking only</li>
            </ul>
          </div>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            A member's access is the <strong>intersection</strong> of their role and seat type. Team Members only see Jobs/Calendar/Time Tracking regardless of seat.
          </p>
          <p className="sm:col-span-2 text-xs font-medium text-green-600">
            💰 Teams with 5+ seats get 10% off every seat, every month — applied automatically at checkout.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SeatManagementTable() {
  const [showAddSeatDialog, setShowAddSeatDialog] = useState(false);
  const { data: members, isLoading } = useOrgMembers();
  const updateSeatType = useUpdateSeatType();
  const addSeatMutation = useAddSeat();
  const { formatCurrency } = useCurrency();
  const { isOwner } = useUserRole();
  const isMobile = useIsMobile();

  const isCeo = isOwner;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!members?.length) return null;

  const totalMonthly = members.reduce((sum, m) => sum + (SEAT_PRICES[m.seat_type] || PRICING.CONNECT_SEAT), 0);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    if (role === 'ceo') return 'CEO';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seat Management
            </CardTitle>
            <CardDescription>
              {isCeo
                ? "Assign seat types to control each member's access and cost"
                : "View your team's seat assignments"
              }
            </CardDescription>
          </div>
          {isCeo && (
            <Button 
              size="sm" 
              onClick={() => setShowAddSeatDialog(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Seat
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Explainer */}
        <ExplainerCard />

        {/* Desktop: grid layout */}
        {!isMobile && (
          <>
            <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-3">Member</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-3">Seat Type</div>
              <div className="col-span-2">Access</div>
              <div className="col-span-2 text-right">Monthly Cost</div>
            </div>
            <Separator />
            {members.map((member) => {
              const access = getEffectiveAccess(member.role, member.seat_type);
              return (
                <div
                  key={member.id}
                  className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-3 flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="secondary" className={ROLE_COLORS[member.role] || ''}>
                      {getRoleLabel(member.role)}
                    </Badge>
                  </div>
                  <div className="col-span-3">
                    {isCeo ? (
                      <Select
                        value={member.seat_type}
                        onValueChange={(value: SeatType) =>
                          updateSeatType.mutate({ memberId: member.id, seatType: value })
                        }
                        disabled={updateSeatType.isPending}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lite">Lite — {formatCurrency(PRICING.LITE_SEAT)}/mo</SelectItem>
                          <SelectItem value="connect">Connect — {formatCurrency(PRICING.CONNECT_SEAT)}/mo</SelectItem>
                          <SelectItem value="grow">Grow — {formatCurrency(PRICING.GROW_SEAT)}/mo</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{SEAT_LABELS[member.seat_type] || 'Connect'}</Badge>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {member.role === "member"
                        ? "Jobs, Calendar, Time"
                        : access.slice(0, 3).join(", ")}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-medium">
                      {formatCurrency(SEAT_PRICES[member.seat_type] || PRICING.CONNECT_SEAT)}
                    </span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Mobile: card layout */}
        {isMobile && (
          <div className="space-y-3">
            {members.map((member) => {
              const access = getEffectiveAccess(member.role, member.seat_type);
              return (
                <div
                  key={member.id}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  {/* Name row */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{member.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <Badge variant="secondary" className={`shrink-0 ${ROLE_COLORS[member.role] || ''}`}>
                      {getRoleLabel(member.role)}
                    </Badge>
                  </div>

                  {/* Seat + Cost row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Seat</p>
                      {isCeo ? (
                        <Select
                          value={member.seat_type}
                          onValueChange={(value: SeatType) =>
                            updateSeatType.mutate({ memberId: member.id, seatType: value })
                          }
                          disabled={updateSeatType.isPending}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lite">Lite — {formatCurrency(PRICING.LITE_SEAT)}/mo</SelectItem>
                            <SelectItem value="connect">Connect — {formatCurrency(PRICING.CONNECT_SEAT)}/mo</SelectItem>
                            <SelectItem value="grow">Grow — {formatCurrency(PRICING.GROW_SEAT)}/mo</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{SEAT_LABELS[member.seat_type] || 'Connect'}</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Cost</p>
                      <p className="text-base font-semibold">
                        {formatCurrency(SEAT_PRICES[member.seat_type] || PRICING.CONNECT_SEAT)}
                        <span className="text-xs text-muted-foreground font-normal">/mo</span>
                      </p>
                    </div>
                  </div>

                  {/* Access row */}
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Access</p>
                    <p className="text-xs text-muted-foreground">
                      {member.role === "member"
                        ? "Jobs, Calendar, Time Tracking"
                        : access.join(", ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <span className="text-sm font-medium">{members.length} seat{members.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-muted-foreground ml-2">total</span>
          </div>
          <div>
            <span className="text-lg font-bold text-primary">{formatCurrency(totalMonthly)}</span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Add Seat Dialog */}
    <AlertDialog open={showAddSeatDialog} onOpenChange={setShowAddSeatDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Another Seat</AlertDialogTitle>
          <AlertDialogDescription>
            Adding a seat will update your subscription billing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={async () => {
              try {
                await addSeatMutation.mutateAsync();
                setShowAddSeatDialog(false);
              } catch { /* handled by mutation */ }
            }} 
            disabled={addSeatMutation.isPending}
          >
            {addSeatMutation.isPending ? "Adding..." : "Add Seat"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
