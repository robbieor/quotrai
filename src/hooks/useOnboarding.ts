import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useOnboarding() {
  const { user } = useAuth();

  const { data: onboardingStatus, isLoading, refetch } = useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed, onboarding_step")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching onboarding status:", error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  return {
    isOnboardingComplete: onboardingStatus?.onboarding_completed ?? false,
    savedStep: (onboardingStatus as any)?.onboarding_step ?? 1,
    isLoading,
    refetch,
  };
}
