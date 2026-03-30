import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  invited_by: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    has_george_voice: boolean | null;
  };
}

export interface Team {
  id: string;
  name: string;
  created_at: string;
}

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async (): Promise<Team | null> => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return null;

      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return [];

      const { data, error } = await supabase
        .from("team_memberships")
        .select(`
          *,
          profile:profiles!team_memberships_user_id_fkey(full_name, email, avatar_url, has_george_voice)
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      return (data || []).map(member => ({
        ...member,
        profile: Array.isArray(member.profile) ? member.profile[0] : member.profile
      }));
    },
  });
}

export function useTeamInvitations() {
  return useQuery({
    queryKey: ["team-invitations"],
    queryFn: async (): Promise<TeamInvitation[]> => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return [];

      const { data, error } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("team_id", teamId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useIsTeamOwner() {
  return useQuery({
    queryKey: ["is-team-owner"],
    queryFn: async (): Promise<boolean> => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return false;

      const { data } = await supabase.rpc("is_owner_of_team", { target_team_id: teamId });
      return data || false;
    },
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, baseUrl, role, seatType }: { email: string; baseUrl: string; role?: string; seatType?: string }) => {
      // Get team info
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) throw new Error("No team found");

      const { data: team } = await supabase
        .from("teams")
        .select("name")
        .eq("id", teamId)
        .single();

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      // Create invitation record
      const { data: invitation, error: insertError } = await supabase
        .from("team_invitations")
        .insert({
          team_id: teamId,
          email: email.toLowerCase().trim(),
          invited_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error("An invitation has already been sent to this email");
        }
        throw insertError;
      }

      // Send invitation email
      const inviteUrl = `${baseUrl}/accept-invite?token=${invitation.token}`;
      
      const { error: emailError } = await supabase.functions.invoke("send-team-invitation", {
        body: {
          email: invitation.email,
          teamName: team?.name || "Your Team",
          inviterName: profile?.full_name || "A team member",
          inviteUrl,
        },
      });

      if (emailError) {
        console.error("Failed to send email:", emailError);
        // Don't throw - invitation was created successfully
      }

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      toast.success("Invitation sent successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("team_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      toast.success("Invitation cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("team_memberships")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Team member removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("accept_team_invitation", {
        invitation_token: token,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to accept invitation");
      }

      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Successfully joined the team!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
