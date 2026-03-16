import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import type { SeatType } from "./useSubscriptionTier";

const SEAT_HIERARCHY: Record<SeatType, number> = {
  lite: 0,
  connect: 1,
  grow: 2,
};

export function useSeatAccess() {
  const { user } = useAuth();
  const { isOwnerOrManager } = useUserRole();

  const query = useQuery({
    queryKey: ["user-seat-type", user?.id],
    queryFn: async (): Promise<SeatType> => {
      const { data, error } = await supabase.rpc("get_user_seat_type");
      if (error) {
        console.error("Error fetching seat type:", error);
        return "connect"; // safe default
      }
      return (data as SeatType) || "connect";
    },
    enabled: !!user,
  });

  const seatType = query.data ?? "connect";
  const seatLevel = SEAT_HIERARCHY[seatType] ?? 1;

  const hasSeat = (required: SeatType) => seatLevel >= SEAT_HIERARCHY[required];

  // Owners/managers always see everything regardless of their personal seat type
  const canAccess = (required: SeatType) => isOwnerOrManager || hasSeat(required);

  return {
    ...query,
    seatType,
    // Feature flags
    canAccessGeorge: canAccess("connect"),
    canAccessExpenses: canAccess("connect"),
    canAccessDocuments: canAccess("connect"),
    canAccessReports: canAccess("connect"),
    canAccessRecurringInvoices: canAccess("connect"),
    canAccessLeads: canAccess("grow"),
    canAccessIntegrations: canAccess("grow"),
    canAccessAdvancedReporting: canAccess("grow"),
    canAccessApi: canAccess("grow"),
    // Utility
    hasSeat,
    canAccess,
  };
}
