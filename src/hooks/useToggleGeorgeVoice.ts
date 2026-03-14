import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export function useToggleGeorgeVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, enable }: { targetUserId: string; enable: boolean }) => {
      const { data, error } = await supabase.functions.invoke("toggle-george-voice", {
        body: { targetUserId, enable },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teamGeorgeUsers"] });
      queryClient.invalidateQueries({ queryKey: ["teamGeorgeData"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["seat-usage"] });
      
      const action = variables.enable ? "enabled" : "disabled";
      toast.success(`Foreman AI Voice ${action}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update Foreman AI Voice access");
    },
  });
}
