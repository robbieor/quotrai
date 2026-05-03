import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Users, Mail, X, UserMinus, Crown, Shield, ShieldCheck, Loader2 } from "lucide-react";
import {
  useTeam,
  useTeamMembers,
  useTeamInvitations,
  useIsTeamOwner,
  useSendInvitation,
  useCancelInvitation,
  useRemoveTeamMember,
} from "@/hooks/useTeam";
import { useTeamGeorgeUsers } from "@/hooks/useGeorgeAccess";
import { useAuth } from "@/hooks/useAuth";
import { GeorgeVoiceToggle } from "./GeorgeVoiceToggle";
import { PRICING } from "@/hooks/useSubscriptionTier";
import { RolePreviewControl } from "@/components/admin/RolePreviewControl";

type InviteRole = "member" | "manager" | "owner";

export function TeamManagement() {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  
  const { user } = useAuth();
  const { data: team, isLoading: teamLoading } = useTeam();
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: invitations } = useTeamInvitations();
  const { data: isOwner } = useIsTeamOwner();
  const { data: georgeUsers = [] } = useTeamGeorgeUsers();
  
  const sendInvitation = useSendInvitation();
  const cancelInvitation = useCancelInvitation();
  const removeMember = useRemoveTeamMember();

  const georgeVoiceMap = new Map(
    georgeUsers.map(u => [u.user_id, u])
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    await sendInvitation.mutateAsync({
      email: email.trim(),
      baseUrl: window.location.origin,
      role: inviteRole,
      seatType: inviteRole === "member" ? "lite" : "connect",
    });
    setEmail("");
    setInviteRole("member");
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || "??";
  };

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
      <RolePreviewControl />
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
              </div>

              {/* Role selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Select value={inviteRole} onValueChange={(v: InviteRole) => setInviteRole(v)}>
                  <SelectTrigger className="h-10 sm:h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Team Member</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {inviteRole === "member" ? "Jobs, calendar & time tracking only" : inviteRole === "manager" ? "Full access, no billing" : "Full access including billing"}
                </p>
              </div>
              {inviteRole === "member" && (
                <p className="text-xs text-muted-foreground">
                  💡 Team Members only access Jobs, Calendar & Time Tracking. Revamo AI is available to Owners & Managers.
                </p>
              )}
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
                            {(member.role === "owner" || member.role === "ceo") && (
                              <Badge variant="default" className="text-xs gap-1">
                                <Crown className="h-3 w-3" />
                                Owner
                              </Badge>
                            )}
                            {member.role === "manager" && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Manager
                              </Badge>
                            )}
                            {member.role === "member" && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Shield className="h-3 w-3" />
                                Team Member
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {(member.role === "owner" || member.role === "ceo")
                              ? "Full access including billing"
                              : member.role === "manager"
                              ? "Full access, no billing"
                              : "Jobs, calendar & time tracking"}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {georgeUser && (
                          <GeorgeVoiceToggle
                            user={georgeUser}
                            currentUserId={user?.id}
                            isOwner={isOwner || false}
                          />
                        )}
                        
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
    </div>
  );
}
