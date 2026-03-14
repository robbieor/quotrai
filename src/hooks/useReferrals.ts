import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export interface Referral {
  id: string;
  referred_email: string;
  status: string;
  reward_applied: boolean;
  created_at: string;
  converted_at: string | null;
}

export function useReferrals() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const referralCode = profile?.referral_code as string | undefined;

  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : null;

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("referrals")
        .select("id, referred_email, status, reward_applied, created_at, converted_at")
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!user,
  });

  const stats = {
    total: referrals.length,
    signedUp: referrals.filter((r) => r.status === "signed_up" || r.status === "subscribed").length,
    subscribed: referrals.filter((r) => r.status === "subscribed").length,
    rewardsEarned: referrals.filter((r) => r.reward_applied).length,
  };

  const copyReferralLink = async () => {
    if (!referralLink) return false;
    try {
      await navigator.clipboard.writeText(referralLink);
      return true;
    } catch {
      return false;
    }
  };

  return {
    referralCode,
    referralLink,
    referrals,
    stats,
    isLoading,
    copyReferralLink,
  };
}
