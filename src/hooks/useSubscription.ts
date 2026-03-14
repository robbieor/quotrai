import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Subscription {
  id: string;
  team_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  seat_count: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeatUsage {
  used_seats: number;
  total_seats: number;
  can_add_member: boolean;
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async (): Promise<Subscription | null> => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useSeatUsage() {
  return useQuery({
    queryKey: ["seat-usage"],
    queryFn: async (): Promise<SeatUsage | null> => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      if (!teamId) return null;

      const { data, error } = await supabase.rpc("get_team_seat_usage", {
        target_team_id: teamId,
      });

      if (error) throw error;
      
      // RPC returns an array, get first row
      const result = Array.isArray(data) ? data[0] : data;
      return result as SeatUsage;
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
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["seat-usage"] });
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
