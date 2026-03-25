import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { JobInsert } from "@/hooks/useJobs";
import type { JobLocationData } from "@/components/jobs/JobFormDialog";

interface CreateJobWithSiteParams {
  job: Omit<JobInsert, "team_id">;
  autoCreateSite?: boolean;
  siteLocation?: JobLocationData;
  geofenceRadius?: number;
}

export function useCreateJobWithSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ job, autoCreateSite = true, siteLocation, geofenceRadius = 200 }: CreateJobWithSiteParams) => {
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

      if (!autoCreateSite) return createdJob;

      // Use explicit location data from form if provided
      if (siteLocation) {
        try {
          const { error: siteError } = await supabase
            .from("job_sites")
            .insert({
              job_id: createdJob.id,
              customer_id: createdJob.customer_id,
              team_id: teamId,
              address: siteLocation.address,
              latitude: siteLocation.latitude,
              longitude: siteLocation.longitude,
              geofence_radius: siteLocation.geofence_radius,
              location_confidence: siteLocation.location_confidence,
              location_valid_for_gps: siteLocation.location_valid_for_gps,
              geocode_source: siteLocation.geocode_source,
            });

          if (siteError) {
            console.error("Failed to create job site:", siteError);
          } else {
            toast.success("Job site location set for GPS tracking");
          }
        } catch (err) {
          console.error("Error creating job site:", err);
        }
        return createdJob;
      }

      // Fallback: auto-create from customer address
      if (createdJob.customers) {
        const customer = createdJob.customers as {
          name: string;
          address?: string;
          latitude?: number;
          longitude?: number;
        };

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
                geocode_source: "customer_inherited",
              });

            if (siteError) {
              console.error("Failed to auto-create job site:", siteError);
            } else {
              toast.success("Job site created from customer address");
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
