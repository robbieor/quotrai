import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CompanyBranding {
  id: string;
  team_id: string;
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_website: string | null;
  logo_url: string | null;
  accent_color: string;
  footer_message: string;
  payment_terms: string | null;
  bank_details: string | null;
  show_logo: boolean;
  created_at: string;
  updated_at: string;
}

export type CompanyBrandingInput = Partial<Omit<CompanyBranding, "id" | "team_id" | "created_at" | "updated_at">>;

async function getTeamId(): Promise<string | null> {
  const { data } = await supabase.rpc("get_user_team_id");
  return data;
}

export function useCompanyBranding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: branding, isLoading } = useQuery({
    queryKey: ["company-branding", user?.id],
    queryFn: async () => {
      const teamId = await getTeamId();
      if (!teamId) return null;

      const { data, error } = await supabase
        .from("company_branding")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyBranding | null;
    },
    enabled: !!user?.id,
  });

  const upsertBranding = useMutation({
    mutationFn: async (input: CompanyBrandingInput) => {
      const teamId = await getTeamId();
      if (!teamId) throw new Error("No team found");

      // Check if branding exists
      const { data: existing } = await supabase
        .from("company_branding")
        .select("id")
        .eq("team_id", teamId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("company_branding")
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          })
          .eq("team_id", teamId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("company_branding")
          .insert({
            team_id: teamId,
            ...input,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-branding"] });
      toast.success("Branding settings saved");
    },
    onError: (error) => {
      toast.error("Failed to save branding: " + error.message);
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const teamId = await getTeamId();
      if (!teamId) throw new Error("No team found");

      const fileExt = file.name.split(".").pop();
      const fileName = `${teamId}/logo.${fileExt}`;

      // Delete existing logo if present
      await supabase.storage.from("company-logos").remove([fileName]);

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      // Update branding with logo URL
      await upsertBranding.mutateAsync({ logo_url: urlData.publicUrl });

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-branding"] });
      toast.success("Logo uploaded successfully");
    },
    onError: (error) => {
      toast.error("Failed to upload logo: " + error.message);
    },
  });

  const removeLogo = useMutation({
    mutationFn: async () => {
      const teamId = await getTeamId();
      if (!teamId) throw new Error("No team found");

      // List and remove all files in team folder
      const { data: files } = await supabase.storage
        .from("company-logos")
        .list(teamId);

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${teamId}/${f.name}`);
        await supabase.storage.from("company-logos").remove(filePaths);
      }

      // Update branding to remove logo URL
      await upsertBranding.mutateAsync({ logo_url: null, show_logo: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-branding"] });
      toast.success("Logo removed");
    },
  });

  return {
    branding,
    isLoading,
    upsertBranding,
    uploadLogo,
    removeLogo,
  };
}
