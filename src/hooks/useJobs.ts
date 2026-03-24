import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Job = Tables<"jobs"> & {
  customers?: { name: string } | null;
};
export type JobInsert = TablesInsert<"jobs">;
export type JobUpdate = TablesUpdate<"jobs">;
export type JobStatus = Tables<"jobs">["status"];

export const JOB_STATUSES: { value: JobStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "scheduled", label: "Scheduled", color: "bg-blue-500" },
  { value: "in_progress", label: "In Progress", color: "bg-purple-500" },
  { value: "completed", label: "Completed", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-gray-500" },
];

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("jobs")
        .select("*, customers(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) throw error;
      if (count && count >= 5000) {
        console.warn(`Jobs query returned ${count} rows — pagination recommended`);
      }
      return data as Job[];
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (job: Omit<JobInsert, "team_id">) => {
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      const { data, error } = await supabase
        .from("jobs")
        .insert({ ...job, team_id: teamId })
        .select("*, customers(name)")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create job: " + error.message);
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: JobUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", id)
        .select("*, customers(name)")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update job: " + error.message);
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete job: " + error.message);
    },
  });
}
