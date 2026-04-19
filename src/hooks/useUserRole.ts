import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useRolePreview } from "@/contexts/RolePreviewContext";

export type TeamRole = "ceo" | "owner" | "manager" | "member";

export function useUserRole() {
  const { user } = useAuth();
  const { previewRole } = useRolePreview();

  const query = useQuery({
    queryKey: ["user-team-role", user?.id],
    queryFn: async (): Promise<TeamRole | null> => {
      const { data, error } = await supabase.rpc("get_user_team_role");
      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      return data as TeamRole;
    },
    enabled: !!user,
  });

  const realRole = query.data;
  // Only owners/CEOs may preview as another role. If the real role isn't owner,
  // the preview is ignored — preventing privilege escalation via sessionStorage tampering.
  const canPreview = realRole === "owner" || realRole === "ceo";
  const role = canPreview && previewRole ? previewRole : realRole;

  return {
    ...query,
    role,
    realRole,
    isPreviewing: canPreview && previewRole !== null && previewRole !== realRole,
    isOwner: role === "owner" || role === "ceo",
    isManager: role === "manager",
    isMember: role === "member",
    isOwnerOrManager: role === "owner" || role === "ceo" || role === "manager",
    /** Team Seat users (members) can only access Jobs, Calendar, Time Tracking */
    isTeamSeat: role === "member",
  };
}

/** Pages accessible to Team Seat (member) users */
export const TEAM_SEAT_ALLOWED_ROUTES = [
  "/jobs",
  "/calendar",
  "/time-tracking",
  "/settings",
];

/** Nav item IDs visible to Team Seat users */
export const TEAM_SEAT_NAV_IDS = [
  "jobs",
  "calendar",
  "time-tracking",
];
