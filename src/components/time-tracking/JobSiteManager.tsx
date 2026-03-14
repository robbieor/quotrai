import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  useJobSites,
  useCreateJobSite,
  useUpdateJobSite,
  useDeleteJobSite,
  type JobSite,
} from "@/hooks/useTimeTracking";
import { useJobs } from "@/hooks/useJobs";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { MapPreview } from "@/components/ui/map-preview";
import type { GeocodedAddress } from "@/hooks/useAddressAutocomplete";

const jobSiteSchema = z.object({
  job_id: z.string().min(1, "Job is required"),
  address: z.string().min(1, "Address is required"),
  latitude: z.number(),
  longitude: z.number(),
  geofence_radius: z.number().min(50).max(1000),
});

type JobSiteFormValues = z.infer<typeof jobSiteSchema>;

export function JobSiteManager() {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<JobSite | null>(null);
  const [hasValidCoords, setHasValidCoords] = useState(false);

  const { data: jobSites, isLoading } = useJobSites();
  const { data: jobs } = useJobs();
  const createJobSite = useCreateJobSite();
  const updateJobSite = useUpdateJobSite();
  const deleteJobSite = useDeleteJobSite();

  const form = useForm<JobSiteFormValues>({
    resolver: zodResolver(jobSiteSchema),
    defaultValues: {
      job_id: "",
      address: "",
      latitude: 0,
      longitude: 0,
      geofence_radius: 200,
    },
  });

  const handleAddressSelect = (geocoded: GeocodedAddress) => {
    form.setValue("address", geocoded.formattedAddress);
    form.setValue("latitude", geocoded.latitude);
    form.setValue("longitude", geocoded.longitude);
    setHasValidCoords(true);
  };

  const handleOpenCreate = () => {
    setSelectedSite(null);
    setHasValidCoords(false);
    form.reset({
      job_id: "",
      address: "",
      latitude: 0,
      longitude: 0,
      geofence_radius: 200,
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (site: JobSite) => {
    setSelectedSite(site);
    setHasValidCoords(true);
    form.reset({
      job_id: site.job_id,
      address: site.address,
      latitude: site.latitude,
      longitude: site.longitude,
      geofence_radius: site.geofence_radius,
    });
    setFormOpen(true);
  };

  const handleSubmit = (values: JobSiteFormValues) => {
    const job = jobs?.find((j) => j.id === values.job_id);
    const customer_id = job?.customer_id;

    if (!customer_id) {
      return;
    }

    if (selectedSite) {
      updateJobSite.mutate(
        {
          id: selectedSite.id,
          address: values.address,
          latitude: values.latitude,
          longitude: values.longitude,
          geofence_radius: values.geofence_radius,
        },
        {
          onSuccess: () => {
            setFormOpen(false);
            form.reset();
          },
        }
      );
    } else {
      createJobSite.mutate(
        {
          job_id: values.job_id,
          customer_id,
          address: values.address,
          latitude: values.latitude,
          longitude: values.longitude,
          geofence_radius: values.geofence_radius,
        },
        {
          onSuccess: () => {
            setFormOpen(false);
            form.reset();
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (selectedSite) {
      deleteJobSite.mutate(selectedSite.id, {
        onSuccess: () => {
          setDeleteOpen(false);
          setSelectedSite(null);
        },
      });
    }
  };

  // Filter jobs that don't already have a site
  const availableJobs = jobs?.filter(
    (job) =>
      !jobSites?.some((site) => site.job_id === job.id) ||
      selectedSite?.job_id === job.id
  );

  const watchedLat = form.watch("latitude");
  const watchedLng = form.watch("longitude");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Sites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Job Sites & Geofences
          </CardTitle>
          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Site
          </Button>
        </CardHeader>
        <CardContent>
          {jobSites?.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No job sites</h3>
              <p className="text-muted-foreground">
                Add job sites to enable geofencing for clock-in verification
              </p>
              <Button onClick={handleOpenCreate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Job Site
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {jobSites?.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{site.jobs?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {site.address}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {site.geofence_radius}m radius
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(site)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedSite(site);
                            setDeleteOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSite ? "Edit Job Site" : "Add Job Site"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Job *</Label>
              <Select
                value={form.watch("job_id")}
                onValueChange={(value) => form.setValue("job_id", value)}
                disabled={!!selectedSite}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {availableJobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} - {job.customers?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Address *</Label>
              <AddressAutocomplete
                value={form.watch("address")}
                onChange={(val) => {
                  form.setValue("address", val);
                  // Reset coords if user types manually
                  if (!val) {
                    setHasValidCoords(false);
                    form.setValue("latitude", 0);
                    form.setValue("longitude", 0);
                  }
                }}
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing address or Eircode..."
                showCurrentLocation
              />
            {hasValidCoords && watchedLat !== 0 && watchedLng !== 0 && (
                <p className="text-xs text-muted-foreground">
                  📍 {watchedLat.toFixed(5)}, {watchedLng.toFixed(5)}
                </p>
              )}
            </div>

            {/* Map Preview with Geofence */}
            {hasValidCoords && watchedLat !== 0 && watchedLng !== 0 && (
              <MapPreview
                latitude={watchedLat}
                longitude={watchedLng}
                height="180px"
                geofenceRadius={form.watch("geofence_radius")}
              />
            )}

            <div className="space-y-2">
              <Label>Geofence Radius (meters)</Label>
              <Input
                type="number"
                min={50}
                max={1000}
                {...form.register("geofence_radius", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Clock-ins within this radius will be marked as verified
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createJobSite.isPending || updateJobSite.isPending || (!hasValidCoords && !selectedSite)}
              >
                {(createJobSite.isPending || updateJobSite.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {selectedSite ? "Update" : "Create"} Site
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the job site for{" "}
              <strong>{selectedSite?.jobs?.title}</strong>? This will remove
              geofencing for this location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
