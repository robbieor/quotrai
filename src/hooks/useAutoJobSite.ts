import { useCreateJobSite } from "@/hooks/useTimeTracking";
import { toast } from "sonner";
import type { GeocodedAddress } from "@/hooks/useAddressAutocomplete";

interface CreateJobSiteFromAddressParams {
  jobId: string;
  customerId: string;
  address: GeocodedAddress;
  geofenceRadius?: number;
}

export function useAutoJobSite() {
  const createJobSite = useCreateJobSite();

  const createJobSiteFromAddress = async ({
    jobId,
    customerId,
    address,
    geofenceRadius = 200,
  }: CreateJobSiteFromAddressParams) => {
    try {
      await createJobSite.mutateAsync({
        job_id: jobId,
        customer_id: customerId,
        address: address.formattedAddress,
        latitude: address.latitude,
        longitude: address.longitude,
        geofence_radius: geofenceRadius,
      });

      toast.success("Job site created automatically from address");
      return true;
    } catch (error) {
      console.error("Failed to create job site:", error);
      return false;
    }
  };

  return {
    createJobSiteFromAddress,
    isCreating: createJobSite.isPending,
  };
}
