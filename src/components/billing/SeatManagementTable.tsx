import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Users, Loader2 } from "lucide-react";
import { useOrgMembers, useUpdateSeatType } from "@/hooks/useSubscription";
import { PRICING, type SeatType } from "@/hooks/useSubscriptionTier";
import { useCurrency } from "@/hooks/useCurrency";
import { useUserRole } from "@/hooks/useUserRole";

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

export function SeatManagementTable() {
  const { data: members, isLoading } = useOrgMembers();
  const updateSeatType = useUpdateSeatType();
  const { formatCurrency } = useCurrency();
  const { role: currentUserRole } = useUserRole();

  const isCeo = currentUserRole === 'ceo' || currentUserRole === 'owner';

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

  return (
    <Card>
      <CardHeader>
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
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Header row - desktop */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-4">Member</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-3">Seat Type</div>
          <div className="col-span-3 text-right">Monthly Cost</div>
        </div>

        <Separator className="hidden md:block" />

        {/* Member rows */}
        {members.map((member) => (
          <div
            key={member.id}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            {/* Member info */}
            <div className="md:col-span-4 flex items-center gap-3">
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

            {/* Role */}
            <div className="md:col-span-2">
              <Badge variant="secondary" className={ROLE_COLORS[member.role] || ''}>
                {member.role === 'ceo' ? 'CEO' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Badge>
            </div>

            {/* Seat type */}
            <div className="md:col-span-3">
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

            {/* Cost */}
            <div className="md:col-span-3 text-right">
              <span className="text-sm font-medium">
                {formatCurrency(SEAT_PRICES[member.seat_type] || PRICING.CONNECT_SEAT)}
              </span>
              <span className="text-xs text-muted-foreground">/mo</span>
            </div>
          </div>
        ))}

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
  );
}
