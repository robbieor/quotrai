import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { MapPreview } from "@/components/ui/map-preview";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  ChevronDown,
  ChevronUp,
  Pencil,
  MailWarning,
} from "lucide-react";
import type { Customer } from "@/hooks/useCustomers";
import type { GeocodedAddress } from "@/hooks/useAddressAutocomplete";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_person: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export interface CustomerFormSubmitValues {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  geocodedAddress?: GeocodedAddress;
}

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSubmit: (values: CustomerFormSubmitValues) => void;
  isLoading?: boolean;
}

const CONFIDENCE_CONFIG = {
  high: {
    label: "Verified",
    icon: CheckCircle2,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  medium: {
    label: "Approximate",
    icon: MapPin,
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  },
  low: {
    label: "Needs Review",
    icon: AlertTriangle,
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  },
  none: {
    label: "Invalid for GPS",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
} as const;

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isLoading,
}: CustomerFormDialogProps) {
  const [geocodedAddress, setGeocodedAddress] = useState<GeocodedAddress | null>(null);
  const [showStructuredFields, setShowStructuredFields] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [structuredFields, setStructuredFields] = useState({
    line1: "",
    line2: "",
    city: "",
    region: "",
    postcode: "",
    country: "",
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name,
        contact_person: customer.contact_person || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        notes: customer.notes || "",
      });
      if (customer.latitude && customer.longitude) {
        setGeocodedAddress({
          formattedAddress: customer.address || "",
          latitude: customer.latitude,
          longitude: customer.longitude,
          countryCode: customer.country_code || undefined,
          line1: customer.line1 || undefined,
          city: customer.city || undefined,
          region: customer.region || undefined,
          postcode: customer.postal_code || undefined,
          country: customer.country || undefined,
          confidence: "high",
        });
        setStructuredFields({
          line1: customer.line1 || "",
          line2: customer.line2 || "",
          city: customer.city || "",
          region: customer.region || "",
          postcode: customer.postal_code || "",
          country: customer.country || "",
        });
      } else {
        setGeocodedAddress(null);
        setStructuredFields({ line1: "", line2: "", city: "", region: "", postcode: "", country: "" });
      }
    } else {
      form.reset({ name: "", contact_person: "", email: "", phone: "", address: "", notes: "" });
      setGeocodedAddress(null);
      setStructuredFields({ line1: "", line2: "", city: "", region: "", postcode: "", country: "" });
    }
    setShowStructuredFields(false);
    setIsManualEdit(false);
  }, [customer, form]);

  const handleSubmit = (values: CustomerFormValues) => {
    // If manual edit, merge structured fields back into geocoded address
    const finalGeocodedAddress = geocodedAddress
      ? {
          ...geocodedAddress,
          line1: structuredFields.line1 || geocodedAddress.line1,
          city: structuredFields.city || geocodedAddress.city,
          region: structuredFields.region || geocodedAddress.region,
          postcode: structuredFields.postcode || geocodedAddress.postcode,
          country: structuredFields.country || geocodedAddress.country,
          // If manually edited without re-geocoding, mark as unverified
          confidence: isManualEdit ? "low" as const : geocodedAddress.confidence,
        }
      : undefined;

    onSubmit({
      name: values.name,
      contact_person: values.contact_person,
      email: values.email || undefined,
      phone: values.phone,
      address: values.address,
      notes: values.notes,
      geocodedAddress: finalGeocodedAddress,
    });
  };

  const handleAddressSelect = (address: GeocodedAddress) => {
    setGeocodedAddress(address);
    setIsManualEdit(false);
    setStructuredFields({
      line1: address.line1 || "",
      line2: address.line2 || "",
      city: address.city || "",
      region: address.region || "",
      postcode: address.postcode || "",
      country: address.country || "",
    });
  };

  const handleStructuredFieldChange = (field: keyof typeof structuredFields, value: string) => {
    setStructuredFields((prev) => ({ ...prev, [field]: value }));
    setIsManualEdit(true);
  };

  const confidence = geocodedAddress?.confidence || (geocodedAddress ? "medium" : null);
  const isPOBox = geocodedAddress?.isPOBox || false;
  const confidenceConfig = confidence ? CONFIDENCE_CONFIG[confidence] : null;
  const ConfidenceIcon = confidenceConfig?.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company / Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Smart Address Input */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      value={field.value || ""}
                      onChange={field.onChange}
                      onAddressSelect={handleAddressSelect}
                      placeholder="Search address, Eircode or postcode…"
                      showCurrentLocation
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Validation Status + Structured Fields */}
            {geocodedAddress && (
              <div className="space-y-3">
                {/* Status Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {confidenceConfig && ConfidenceIcon && (
                      <Badge variant="outline" className={`gap-1 text-xs ${confidenceConfig.className}`}>
                        <ConfidenceIcon className="h-3 w-3" />
                        {confidenceConfig.label}
                        {isManualEdit && " (edited)"}
                      </Badge>
                    )}
                    {isPOBox && (
                      <Badge variant="outline" className="gap-1 text-xs bg-destructive/10 text-destructive border-destructive/20">
                        <MailWarning className="h-3 w-3" />
                        PO Box
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground"
                      onClick={() => setShowStructuredFields(!showStructuredFields)}
                    >
                      {showStructuredFields ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Show details
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* PO Box Warning */}
                {isPOBox && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">PO Box detected</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          This address cannot be used for GPS tracking or geofencing. 
                          When creating a job for this customer, you'll need to set the job location separately.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expandable Structured Fields */}
                {showStructuredFields && (
                  <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Address Details
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => setIsManualEdit(!isManualEdit)}
                      >
                        <Pencil className="h-3 w-3" />
                        {isManualEdit ? "Lock" : "Edit manually"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Address Line 1</label>
                        <Input
                          value={structuredFields.line1}
                          onChange={(e) => handleStructuredFieldChange("line1", e.target.value)}
                          disabled={!isManualEdit}
                          className="h-8 text-sm"
                          placeholder="123 Main Street"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Address Line 2</label>
                        <Input
                          value={structuredFields.line2}
                          onChange={(e) => handleStructuredFieldChange("line2", e.target.value)}
                          disabled={!isManualEdit}
                          className="h-8 text-sm"
                          placeholder="Apt, Suite, etc."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">City / Town</label>
                          <Input
                            value={structuredFields.city}
                            onChange={(e) => handleStructuredFieldChange("city", e.target.value)}
                            disabled={!isManualEdit}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">County / Region</label>
                          <Input
                            value={structuredFields.region}
                            onChange={(e) => handleStructuredFieldChange("region", e.target.value)}
                            disabled={!isManualEdit}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Postcode / Eircode</label>
                          <Input
                            value={structuredFields.postcode}
                            onChange={(e) => handleStructuredFieldChange("postcode", e.target.value)}
                            disabled={!isManualEdit}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Country</label>
                          <Input
                            value={structuredFields.country}
                            onChange={(e) => handleStructuredFieldChange("country", e.target.value)}
                            disabled={!isManualEdit}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      📍 {geocodedAddress.latitude.toFixed(5)}, {geocodedAddress.longitude.toFixed(5)}
                    </p>
                  </div>
                )}

                {/* Map Preview */}
                <MapPreview
                  latitude={geocodedAddress.latitude}
                  longitude={geocodedAddress.longitude}
                  height="160px"
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this customer..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : customer ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
