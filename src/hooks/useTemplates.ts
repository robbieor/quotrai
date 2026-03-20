import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// Use the enum from the database types
export type TradeCategory = Database["public"]["Enums"]["trade_category"];

export type TemplateUnit = "each" | "hour" | "sqm" | "metre" | "job" | "roll" | "per_visit";

export interface TemplateItem {
  id: string;
  template_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit: TemplateUnit;
  is_material: boolean;
  item_type: "labor" | "material";
  sort_order: number;
  created_at: string;
}

export interface Template {
  id: string;
  team_id: string;
  name: string;
  category: TradeCategory;
  description: string | null;
  is_favorite: boolean;
  is_system_template: boolean;
  is_active: boolean;
  labour_rate_default: number;
  estimated_duration: number;
  created_at: string;
  updated_at: string;
  items?: TemplateItem[];
}

export interface CreateTemplateInput {
  name: string;
  category: TradeCategory;
  description?: string;
  is_favorite?: boolean;
  labour_rate_default?: number;
  estimated_duration?: number;
  items: Omit<TemplateItem, "id" | "template_id" | "created_at">[];
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string;
}

const EXTENDED_CATEGORY_LABELS: Record<string, string> = {
  electrician: "Electrician",
  electrical: "Electrician",
  plumber: "Plumber",
  plumbing: "Plumber",
  hvac: "HVAC",
  carpenter: "Carpenter",
  carpentry: "Carpenter",
  painter: "Painter",
  painting: "Painter",
  roofer: "Roofer",
  roofing: "Roofer",
  landscaper: "Landscaper",
  landscaping: "Landscaper",
  general: "General",
  handyman: "Handyman",
  locksmith: "Locksmith",
  pest_control: "Pest Control",
  pool_spa: "Pool & Spa",
  pressure_washing: "Pressure Washing",
  fencing: "Fencing",
  appliance_repair: "Appliance Repair",
  auto_detailing: "Auto Detailing",
  garage_door: "Garage Door Services",
  tree_service: "Tree Services",
  restoration: "Restoration",
  solar: "Solar",
  flooring: "Flooring",
  tiler: "Tiler",
  concrete_masonry: "Concrete & Masonry",
  window_door: "Window & Door",
  chimney: "Chimney",
  septic_well: "Septic & Well",
  cabinet_countertop: "Cabinet & Countertop",
  smart_home: "Smart Home",
  cleaning: "Cleaning Services",
  junk_removal: "Junk Removal",
  property_maintenance: "Property Maintenance",
};

export const TRADE_CATEGORIES: TradeCategory[] = [
  "electrician",
  "plumber",
  "hvac",
  "carpenter",
  "painter",
  "roofer",
  "landscaper",
  "general",
  "handyman",
  "locksmith",
  "pest_control",
  "pool_spa",
  "pressure_washing",
  "fencing",
  "appliance_repair",
  "auto_detailing",
  "garage_door",
  "tree_service",
  "restoration",
  "solar",
  "flooring",
  "tiler",
  "concrete_masonry",
  "window_door",
  "chimney",
  "septic_well",
  "cabinet_countertop",
  "smart_home",
  "cleaning",
  "junk_removal",
  "property_maintenance",
];

async function getTeamId() {
  const { data } = await supabase.rpc("get_user_team_id");
  return data;
}

export function useTemplates(category?: TradeCategory) {
  return useQuery({
    queryKey: ["templates", category],
    queryFn: async () => {
      let query = supabase
        .from("templates")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("category")
        .order("name");

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Template[];
    },
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: async () => {
      if (!id) return null;

      const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .single();

      if (templateError) throw templateError;

      const { data: items, error: itemsError } = await supabase
        .from("template_items")
        .select("*")
        .eq("template_id", id)
        .order("sort_order");

      if (itemsError) throw itemsError;

      return { ...template, items } as Template;
    },
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const teamId = await getTeamId();
      if (!teamId) throw new Error("No team found");

      // Create template
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .insert({
          team_id: teamId,
          name: input.name,
          category: input.category,
          description: input.description,
          is_favorite: input.is_favorite || false,
          labour_rate_default: input.labour_rate_default || 45,
          estimated_duration: input.estimated_duration || 1,
          is_system_template: false,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template items
      if (input.items.length > 0) {
        const { error: itemsError } = await supabase
          .from("template_items")
          .insert(
            input.items.map((item, index) => ({
              template_id: template.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              unit: item.unit || "each",
              is_material: item.is_material || false,
              item_type: item.item_type,
              sort_order: item.sort_order ?? index,
            }))
          );

        if (itemsError) throw itemsError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create template: " + error.message);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTemplateInput) => {
      const { id, items, ...updates } = input;

      // Update template
      if (Object.keys(updates).length > 0) {
        const updateData: Record<string, unknown> = {
          ...updates,
          updated_at: new Date().toISOString(),
        };
        
        const { error: templateError } = await supabase
          .from("templates")
          .update(updateData)
          .eq("id", id);

        if (templateError) throw templateError;
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        await supabase.from("template_items").delete().eq("template_id", id);

        // Insert new items
        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from("template_items")
            .insert(
              items.map((item, index) => ({
                template_id: id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                unit: item.unit || "each",
                is_material: item.is_material || false,
                item_type: item.item_type,
                sort_order: item.sort_order ?? index,
              }))
            );

          if (itemsError) throw itemsError;
        }
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update template: " + error.message);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from("templates")
        .update({ is_favorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useToggleActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template visibility updated");
    },
  });
}

export function useSeedTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const teamId = await getTeamId();
      if (!teamId) throw new Error("No team found");

      // Call the database function to seed templates
      const { error } = await supabase.rpc("seed_team_templates", { p_team_id: teamId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Default templates added successfully!");
    },
    onError: (error) => {
      toast.error("Failed to add templates: " + error.message);
    },
  });
}

export function useResetToDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      // For now, just delete user edits on system templates
      // In a full implementation, we'd restore from a master copy
      toast.info("Reset functionality coming soon");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
