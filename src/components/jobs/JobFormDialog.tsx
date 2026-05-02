import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, MapPin, AlertTriangle, Navigation, CheckCircle2, Eye } from "lucide-react";
import { MapPreview } from "@/components/ui/map-preview";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RewriteButton } from "@/components/ai/RewriteButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useCustomers } from "@/hooks/useCustomers";
import { useTeamMembers } from "@/hooks/useTeam";
import { type Job, JOB_STATUSES, type JobStatus } from "@/hooks/useJobs";
import {
  isPOBoxAddress,
  type GeocodedAddress,
} from "@/hooks/useAddressAutocomplete";

const jobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  customer_id: z.string().min(1, "Customer is required"),
  status: z.enum(["pending", "scheduled", "in_progress", "completed", "cancelled"]),
  scheduled_date: z.date().optional().nullable(),
  scheduled_time: z.string().optional(),
  estimated_value: z.coerce.number().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
});

type JobFormValues = z.infer<typeof jobSchema>;

export interface JobLocationData {
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  location_confidence: string;
  location_valid_for_gps: boolean;
  geocode_source: string;
}

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job | null;
  defaultDate?: Date;
  defaultTime?: string;
  onSubmit: (values: {
    title: string;
    description?: string;
    customer_id: string;
    status: JobStatus;
    scheduled_date?: string | null;
    scheduled_time?: string | null;
    estimated_value?: number | null;
    assigned_to?: string | null;
    location?: JobLocationData;
  }) => void;
  isLoading?: boolean;
}

export function JobFormDialog({
  open,
  onOpenChange,
  job,
  defaultDate,
  defaultTime,
  onSubmit,
  isLoading,
}: JobFormDialogProps) {
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: teamMembers } = useTeamMembers();
  const [siteAddress, setSiteAddress] = useState("");
  const [siteCoords, setSiteCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(100);
  const [locationConfidence, setLocationConfidence] = useState<string>("high");
  const [locationValidForGps, setLocationValidForGps] = useState(true);
  const [geocodeSource, setGeocodeSource] = useState("customer_inherited");
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [poBoxWarning, setPoBoxWarning] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      description: "",
      customer_id: "",
      status: "pending",
      scheduled_date: null,
      scheduled_time: "",
      estimated_value: null,
      assigned_to: null,
    },
  });

  const selectedCustomerId = form.watch("customer_id");
  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);

  // Inherit customer address when customer changes (and not using custom address)
  useEffect(() => {
    if (!useCustomAddress && selectedCustomer) {
      const addr = selectedCustomer.address || "";
      setSiteAddress(addr);
      if (selectedCustomer.latitude && selectedCustomer.longitude) {
        setSiteCoords({ lat: selectedCustomer.latitude, lng: selectedCustomer.longitude });
        setLocationConfidence("high");
        setLocationValidForGps(!isPOBoxAddress(addr));
        setGeocodeSource("customer_inherited");
      } else {
        setSiteCoords(null);
        setLocationConfidence("none");
        setLocationValidForGps(false);
      }
      setPoBoxWarning(isPOBoxAddress(addr));
    }
  }, [selectedCustomerId, selectedCustomer, useCustomAddress]);

  useEffect(() => {
    if (job) {
      form.reset({
        title: job.title,
        description: job.description || "",
        customer_id: job.customer_id,
        status: job.status,
        scheduled_date: job.scheduled_date ? new Date(job.scheduled_date) : null,
        scheduled_time: job.scheduled_time || "",
        estimated_value: job.estimated_value,
        assigned_to: (job as any).assigned_to || null,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        customer_id: "",
        status: defaultDate ? "scheduled" : "pending",
        scheduled_date: defaultDate || null,
        scheduled_time: defaultTime || "",
        estimated_value: null,
        assigned_to: null,
      });
      setSiteAddress("");
      setSiteCoords(null);
      setGeofenceRadius(100);
      setUseCustomAddress(false);
      setPoBoxWarning(false);
    }
  }, [job, form, defaultDate, defaultTime]);

  const handleAddressSelect = (geocoded: GeocodedAddress) => {
    setSiteAddress(geocoded.formattedAddress);
    setSiteCoords({ lat: geocoded.latitude, lng: geocoded.longitude });
    setLocationConfidence("high");
    setGeocodeSource(useCustomAddress ? "address" : "customer_inherited");
    setGeocodeFailed(false);

    const isPoBox = isPOBoxAddress(geocoded.formattedAddress);
    setPoBoxWarning(isPoBox);
    setLocationValidForGps(!isPoBox);
  };

  const handleSubmit = (values: JobFormValues) => {
    const location: JobLocationData | undefined =
      siteCoords && siteAddress
        ? {
            address: siteAddress,
            latitude: siteCoords.lat,
            longitude: siteCoords.lng,
            geofence_radius: geofenceRadius,
            location_confidence: locationConfidence,
            location_valid_for_gps: locationValidForGps,
            geocode_source: geocodeSource,
          }
        : undefined;

    onSubmit({
      title: values.title,
      description: values.description || undefined,
      customer_id: values.customer_id,
      status: values.status,
      scheduled_date: values.scheduled_date
        ? format(values.scheduled_date, "yyyy-MM-dd")
        : null,
      scheduled_time: values.scheduled_time || null,
      estimated_value: values.estimated_value ?? null,
      assigned_to: values.assigned_to || null,
      location,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? "Edit Job" : "Create Job"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Kitchen renovation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={customersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Job Site Location Section */}
            {selectedCustomerId && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Job Site Location</span>
                  </div>
                  {siteCoords && locationValidForGps && (
                    <Badge variant="default" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      GPS Ready
                    </Badge>
                  )}
                  {siteCoords && !locationValidForGps && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      No GPS
                    </Badge>
                  )}
                  {!siteCoords && selectedCustomerId && (
                    <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      No location
                    </Badge>
                  )}
                </div>

                {/* Customer address display */}
                {selectedCustomer?.address && !useCustomAddress && (
                  <div className="text-sm text-muted-foreground flex items-start gap-2">
                    <Navigation className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{selectedCustomer.address}</span>
                  </div>
                )}

                {!selectedCustomer?.latitude && !useCustomAddress && (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Customer has no geocoded address. GPS tracking won't work.
                      Use a different address below.
                    </span>
                  </div>
                )}

                {/* Override toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="custom-address"
                    checked={useCustomAddress}
                    onCheckedChange={(checked) => {
                      setUseCustomAddress(checked);
                      if (!checked && selectedCustomer) {
                        const addr = selectedCustomer.address || "";
                        setSiteAddress(addr);
                        if (selectedCustomer.latitude && selectedCustomer.longitude) {
                          setSiteCoords({
                            lat: selectedCustomer.latitude,
                            lng: selectedCustomer.longitude,
                          });
                          setLocationValidForGps(!isPOBoxAddress(addr));
                        } else {
                          setSiteCoords(null);
                          setLocationValidForGps(false);
                        }
                        setGeocodeSource("customer_inherited");
                      }
                    }}
                  />
                  <Label htmlFor="custom-address" className="text-sm">
                    Use a different job site address
                  </Label>
                </div>

                {/* Custom address input */}
                {useCustomAddress && (
                  <>
                    <AddressAutocomplete
                      value={siteAddress}
                      onChange={(val) => {
                        setSiteAddress(val);
                        setSiteCoords(null);
                        setGeocodeFailed(false);
                        if (isPOBoxAddress(val)) {
                          setPoBoxWarning(true);
                          setLocationValidForGps(false);
                        }
                        if (val.length > 10) {
                          setGeocodeFailed(true);
                        }
                      }}
                      onAddressSelect={(geocoded) => {
                        setGeocodeFailed(false);
                        handleAddressSelect(geocoded);
                      }}
                      placeholder="Enter job site address or Eircode..."
                      showCurrentLocation
                      countryCode="ie,gb,us"
                    />
                    {geocodeFailed && !siteCoords && siteAddress.length > 15 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
                        Select an address from the dropdown to enable GPS tracking
                      </p>
                    )}
                  </>
                )}

                {/* PO Box warning */}
                {poBoxWarning && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      PO Box addresses cannot be used for GPS tracking.
                      Please enter the physical job site address.
                    </span>
                  </div>
                )}

                {/* Map preview */}
                {siteCoords && (
                  <MapPreview
                    latitude={siteCoords.lat}
                    longitude={siteCoords.lng}
                    height="140px"
                    geofenceRadius={locationValidForGps ? geofenceRadius : undefined}
                    className="mt-1"
                  />
                )}

                {/* Geofence radius */}
                {siteCoords && locationValidForGps && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Geofence Radius</Label>
                      <span className="text-xs text-muted-foreground">{geofenceRadius}m</span>
                    </div>
                    <Slider
                      value={[geofenceRadius]}
                      onValueChange={([val]) => setGeofenceRadius(val)}
                      min={25}
                      max={500}
                      step={25}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Clock-in/out will be verified within this distance
                    </p>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Description</FormLabel>
                    <RewriteButton
                      value={field.value ?? ""}
                      onAccept={(v) => field.onChange(v)}
                      context="job_description"
                    />
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Job details and notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JOB_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Assign To Team Member */}
            {teamMembers && teamMembers.length > 1 && (
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.profile?.full_name || member.profile?.email || "Team member"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scheduled Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : job ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
