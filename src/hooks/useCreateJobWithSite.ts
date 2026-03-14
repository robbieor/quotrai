import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { JobInsert } from "@/hooks/useJobs";

interface CreateJobWithSiteParams {
  job: Omit<JobInsert, "team_id">;
  autoCreateSite?: boolean;
  geofenceRadius?: number;
}

export function useCreateJobWithSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ job, autoCreateSite = true, geofenceRadius = 200 }: CreateJobWithSiteParams) => {
      // Get the user's team_id
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      // Create the job
      const { data: createdJob, error: jobError } = await supabase
        .from("jobs")
        .insert({ ...job, team_id: teamId })
        .select("*, customers(name, address, latitude, longitude)")
        .single();

      if (jobError) throw jobError;

      // Check if we should auto-create a job site
      if (autoCreateSite && createdJob.customers) {
        const customer = createdJob.customers as {
          name: string;
          address?: string;
          latitude?: number;
          longitude?: number;
        };

        // Only create job site if customer has geocoded coordinates
        if (customer.latitude && customer.longitude && customer.address) {
          try {
            const { error: siteError } = await supabase
              .from("job_sites")
              .insert({
                job_id: createdJob.id,
                customer_id: createdJob.customer_id,
                team_id: teamId,
                address: customer.address,
                latitude: customer.latitude,
                longitude: customer.longitude,
                geofence_radius: geofenceRadius,
              });

            if (siteError) {
              console.error("Failed to auto-create job site:", siteError);
              // Don't throw - job was created successfully, just site creation failed
            } else {
              toast.success("Job site created automatically from customer address");
            }
          } catch (err) {
            console.error("Error creating job site:", err);
          }
        }
      }

      return createdJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-sites"] });
      toast.success("Job created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create job: " + error.message);
    },
  });
}
