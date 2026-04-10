import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Users, Loader2, Plus } from "lucide-react";
import { useOrgMembers, useAddSeat } from "@/hooks/useSubscription";
import { useCurrency } from "@/hooks/useCurrency";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";

const BASE_PRICE = 39;
const EXTRA_SEAT = 15;
const BASE_USERS = 1;

const ROLE_COLORS: Record<string, string> = {
  ceo: 'bg-primary/10 text-primary',
  owner: 'bg-primary/10 text-primary',
  manager: 'bg-accent/50 text-accent-foreground',
  member: 'bg-muted text-muted-foreground',
};

export function SeatManagementTable() {
  const [showAddSeatDialog, setShowAddSeatDialog] = useState(false);
  const { data: members, isLoading } = useOrgMembers();
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

  const totalMembers = members.length;
  const extraSeats = Math.max(0, totalMembers - BASE_USERS);
  const totalMonthly = BASE_PRICE + extraSeats * EXTRA_SEAT;

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
              Team Seats
            </CardTitle>
            <CardDescription>
              {formatCurrency(BASE_PRICE)}/mo includes {BASE_USERS} users · +{formatCurrency(EXTRA_SEAT)}/mo per extra seat
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
        {/* Member list */}
        {!isMobile && (
          <>
            <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-5">Member</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-4 text-right">Seat</div>
            </div>
            <Separator />
            {members.map((member, idx) => (
              <div
                key={member.id}
                className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="col-span-5 flex items-center gap-3">
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
                <div className="col-span-3">
                  <Badge variant="secondary" className={ROLE_COLORS[member.role] || ''}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
                <div className="col-span-4 text-right">
                  <span className="text-xs text-muted-foreground">
                    {idx < BASE_USERS ? "Included" : `+${formatCurrency(EXTRA_SEAT)}/mo`}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Mobile */}
        {isMobile && (
          <div className="space-y-3">
            {members.map((member, idx) => (
              <div
                key={member.id}
                className="rounded-lg border border-border p-4 space-y-3"
              >
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
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {idx < BASE_USERS ? "Included in base plan" : `Extra seat · +${formatCurrency(EXTRA_SEAT)}/mo`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <span className="text-sm font-medium">{totalMembers} user{totalMembers !== 1 ? "s" : ""}</span>
            {extraSeats > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                ({BASE_USERS} included + {extraSeats} extra)
              </span>
            )}
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
            {totalMembers < BASE_USERS
              ? "This seat is included in your base plan at no extra cost."
              : `Adding a seat will add ${formatCurrency(EXTRA_SEAT)}/mo to your subscription.`}
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
