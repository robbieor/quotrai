import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SeatType } from "./useSubscriptionTier";

export interface SubscriptionV2 {
  id: string;
  org_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  seat_count: number;
  status: string;
  billing_period: string | null;
  plan_id: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  seat_type: SeatType;
  status: string;
  created_at: string;
  // joined from profiles
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface SeatUsage {
  used_seats: number;
  total_seats: number;
  can_add_member: boolean;
}

/** Get the current user's org_id via RPC */
async function getOrgId(): Promise<string | null> {
  const { data } = await supabase.rpc("get_user_org_id_v2");
  return data || null;
}

/** Fetch subscription from subscriptions_v2 */
export function useSubscription() {
  return useQuery({
    queryKey: ["subscription-v2"],
    queryFn: async (): Promise<SubscriptionV2 | null> => {
      const orgId = await getOrgId();
      if (!orgId) return null;

      const { data, error } = await supabase
        .from("subscriptions_v2")
        .select("*")
        .eq("org_id", orgId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

/** Fetch org members with profile info */
export function useOrgMembers() {
  return useQuery({
    queryKey: ["org-members-v2"],
    queryFn: async (): Promise<OrgMember[]> => {
      const orgId = await getOrgId();
      if (!orgId) return [];

      const { data: members, error } = await supabase
        .from("org_members_v2")
        .select("*")
        .eq("org_id", orgId)
        .eq("status", "active");

      if (error) throw error;
      if (!members?.length) return [];

      // Fetch profiles for all member user_ids
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      return members.map((m) => ({
        ...m,
        seat_type: m.seat_type as SeatType,
        full_name: profileMap.get(m.user_id)?.full_name ?? null,
        email: profileMap.get(m.user_id)?.email ?? null,
        avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
      }));
    },
  });
}

/** Sync seat count to Stripe (used after member changes) */
export function useSyncSeatsToStripe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-seat-to-stripe");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members-v2"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-v2"] });
      queryClient.invalidateQueries({ queryKey: ["seat-usage"] });
      toast.success("Billing synced", {
        description: "Seat count has been updated in your billing.",
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to sync billing", {
        description: error.message || "Please try again or contact support.",
        duration: 5000,
      });
    },
  });
}

export function useSeatUsage() {
  return useQuery({
    queryKey: ["seat-usage"],
    queryFn: async (): Promise<SeatUsage | null> => {
      // Source of truth = subscriptions_v2.seat_count + active org_members_v2 count.
      // Avoids drift from the legacy `teams.*` fields.
      const { data: orgId } = await supabase.rpc("get_user_org_id_v2");
      if (!orgId) return null;

      const [{ data: sub }, { count: usedSeats }] = await Promise.all([
        supabase
          .from("subscriptions_v2")
          .select("seat_count")
          .eq("org_id", orgId)
          .maybeSingle(),
        supabase
          .from("org_members_v2")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("status", "active"),
      ]);

      const total = sub?.seat_count ?? 0;
      const used = usedSeats ?? 0;
      return {
        used_seats: used,
        total_seats: total,
        can_add_member: used < total,
      };
    },
  });
}

export function useAddSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("add-subscription-seat", {
        body: {},
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-v2"] });
      queryClient.invalidateQueries({ queryKey: ["seat-usage"] });
      queryClient.invalidateQueries({ queryKey: ["org-members-v2"] });
      toast.success("Seat added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async ({ priceId, quantity }: { priceId: string; quantity: number }) => {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { priceId, quantity },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateCustomerPortalSession() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-customer-portal-session", {
        body: {},
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
