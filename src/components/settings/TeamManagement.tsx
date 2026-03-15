import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import { Users, Mail, X, UserMinus, Crown, Loader2, AlertTriangle, Mic } from "lucide-react";
import {
  useTeam,
  useTeamMembers,
  useTeamInvitations,
  useIsTeamOwner,
  useSendInvitation,
  useCancelInvitation,
  useRemoveTeamMember,
} from "@/hooks/useTeam";
import { useSeatUsage, useSubscription } from "@/hooks/useSubscription";
import { useTeamGeorgeUsers } from "@/hooks/useGeorgeAccess";
import { useAuth } from "@/hooks/useAuth";
import { useAddSeat } from "@/hooks/useSubscription";
import { GeorgeVoiceToggle } from "./GeorgeVoiceToggle";
import { toast } from "sonner";

export function TeamManagement() {
  const [email, setEmail] = useState("");
  const [showAddSeatDialog, setShowAddSeatDialog] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const addSeatMutation = useAddSeat();
  
  const { user } = useAuth();
  const { data: team, isLoading: teamLoading } = useTeam();
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: invitations, isLoading: invitationsLoading } = useTeamInvitations();
  const { data: isOwner } = useIsTeamOwner();
  const { data: seatUsage, isLoading: seatUsageLoading } = useSeatUsage();
  const { data: subscription } = useSubscription();
  const { data: georgeUsers = [] } = useTeamGeorgeUsers();
  
  const sendInvitation = useSendInvitation();
  const cancelInvitation = useCancelInvitation();
  const removeMember = useRemoveTeamMember();

  // Create a map of user_id to Foreman AI voice status
  const georgeVoiceMap = new Map(
    georgeUsers.map(u => [u.user_id, u])
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Check seat availability
    if (seatUsage && !seatUsage.can_add_member) {
      // Need to add a seat first
      setPendingEmail(email.trim());
      setShowAddSeatDialog(true);
      return;
    }

    await sendInvitation.mutateAsync({
      email: email.trim(),
      baseUrl: window.location.origin,
    });
    setEmail("");
  };

  const handleSeatAdded = async () => {
    // After seat is added, send the pending invitation
    if (pendingEmail) {
      try {
        await sendInvitation.mutateAsync({
          email: pendingEmail,
          baseUrl: window.location.origin,
        });
        setEmail("");
        setPendingEmail("");
      } catch (error) {
        toast.error("Failed to send invitation after adding seat");
      }
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || "??";
  };

  const seatPercentage = seatUsage 
    ? Math.min((seatUsage.used_seats / seatUsage.total_seats) * 100, 100)
    : 0;

  if (teamLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seat Usage Card */}
      {isOwner && seatUsage && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Seats</CardTitle>
                <CardDescription>
                  {seatUsage.used_seats} of {seatUsage.total_seats} used
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={() => setShowAddSeatDialog(true)}
                className="gap-1.5"
              >
                <Users className="h-4 w-4" />
                Add Seat
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={seatPercentage} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {seatUsage.total_seats - seatUsage.used_seats} available
              </span>
              {!seatUsage.can_add_member ? (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  Full
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {subscription?.status || "Active"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team: {team?.name}
          </CardTitle>
          <CardDescription>
            Manage your team members and send invitations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Form - Only for owners */}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Invite by Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sendInvitation.isPending || !email.trim()}>
                    {sendInvitation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Invite
                      </>
                    )}
                  </Button>
                </div>
                {seatUsage && !seatUsage.can_add_member && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>At capacity — </span>
                    <button 
                      type="button"
                      onClick={() => setShowAddSeatDialog(true)} 
                      className="underline hover:no-underline font-medium"
                    >
                      add a seat
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}

          {/* Pending Invitations */}
          {isOwner && invitations && invitations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Pending Invitations</h4>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invitation.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Expires {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cancelInvitation.mutate(invitation.id)}
                      disabled={cancelInvitation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Members */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Team Members</h4>
            {membersLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {members?.map((member) => {
                  const georgeUser = georgeVoiceMap.get(member.user_id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(member.profile?.full_name || null, member.profile?.email || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {member.profile?.full_name || member.profile?.email || "Unknown"}
                            </p>
                            {member.role === "owner" && (
                              <Badge variant="secondary" className="text-xs">
                                <Crown className="mr-1 h-3 w-3" />
                                Owner
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Foreman AI Voice Toggle */}
                        {georgeUser && (
                          <GeorgeVoiceToggle
                            user={georgeUser}
                            currentUserId={user?.id}
                            isOwner={isOwner || false}
                          />
                        )}
                        
                        {/* Remove Member Button */}
                        {isOwner && member.role !== "owner" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <UserMinus className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove {member.profile?.full_name || member.profile?.email} from your team.
                                  They will lose access to all team data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMember.mutate(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Seat Dialog */}
      <AlertDialog open={showAddSeatDialog} onOpenChange={setShowAddSeatDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Another Seat</AlertDialogTitle>
            <AlertDialogDescription>
              You've reached your current seat limit. Adding a seat will update your subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                await addSeatMutation.mutateAsync();
                setShowAddSeatDialog(false);
                handleSeatAdded();
              } catch { /* handled by mutation */ }
            }} disabled={addSeatMutation.isPending}>
              {addSeatMutation.isPending ? "Adding..." : "Add Seat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
