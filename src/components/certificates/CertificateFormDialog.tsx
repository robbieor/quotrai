import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomers } from "@/hooks/useCustomers";
import { useJobs } from "@/hooks/useJobs";
import { useProfile } from "@/hooks/useProfile";
import {
  useCertificate,
  useCreateCertificate,
  useUpdateCertificate,
  useIssueCertificate,
  CERTIFICATE_TYPE_LABELS,
  ELECTRICIAN_CERTIFICATES,
  GAS_CERTIFICATES,
  type CertificateType,
} from "@/hooks/useCertificates";
import { EICRFormFields } from "./forms/EICRFormFields";
import { GasSafetyFormFields } from "./forms/GasSafetyFormFields";
import { Loader2, FileCheck, Send } from "lucide-react";

const baseSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  job_id: z.string().optional(),
  certificate_type: z.string().min(1, "Certificate type is required"),
  issue_date: z.string().min(1, "Issue date is required"),
  expiry_date: z.string().optional(),
  next_inspection_date: z.string().optional(),
  inspector_name: z.string().min(1, "Inspector name is required"),
  inspector_registration: z.string().optional(),
  property_address: z.string().min(1, "Property address is required"),
  property_type: z.string().optional(),
});

type FormValues = z.infer<typeof baseSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateId?: string | null;
}

export function CertificateFormDialog({ open, onOpenChange, certificateId }: Props) {
  const [certificateData, setCertificateData] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState("details");

  const { data: certificate, isLoading: loadingCert } = useCertificate(certificateId || undefined);
  const { data: customers } = useCustomers();
  const { data: jobs } = useJobs();
  const { profile } = useProfile();
  
  const createCertificate = useCreateCertificate();
  const updateCertificate = useUpdateCertificate();
  const issueCertificate = useIssueCertificate();

  const isEditing = !!certificateId;

  const form = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      customer_id: "",
      job_id: "",
      certificate_type: "",
      issue_date: new Date().toISOString().split("T")[0],
      expiry_date: "",
      next_inspection_date: "",
      inspector_name: profile?.full_name || "",
      inspector_registration: "",
      property_address: "",
      property_type: "",
    },
  });

  const selectedCustomerId = form.watch("customer_id");
  const selectedType = form.watch("certificate_type") as CertificateType;

  // Get customer's address when selected
  useEffect(() => {
    if (selectedCustomerId && !isEditing) {
      const customer = customers?.find((c) => c.id === selectedCustomerId);
      if (customer?.address) {
        form.setValue("property_address", customer.address);
      }
    }
  }, [selectedCustomerId, customers, form, isEditing]);

  // Load existing certificate data
  useEffect(() => {
    if (certificate && isEditing) {
      form.reset({
        customer_id: certificate.customer_id,
        job_id: certificate.job_id || "",
        certificate_type: certificate.certificate_type,
        issue_date: certificate.issue_date,
        expiry_date: certificate.expiry_date || "",
        next_inspection_date: certificate.next_inspection_date || "",
        inspector_name: certificate.inspector_name,
        inspector_registration: certificate.inspector_registration || "",
        property_address: certificate.property_address,
        property_type: certificate.property_type || "",
      });
      setCertificateData(certificate.certificate_data || {});
    }
  }, [certificate, isEditing, form]);

  // Set inspector name from profile
  useEffect(() => {
    if (profile?.full_name && !isEditing) {
      form.setValue("inspector_name", profile.full_name);
    }
  }, [profile, form, isEditing]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && certificateId) {
        await updateCertificate.mutateAsync({
          id: certificateId,
          customer_id: values.customer_id,
          job_id: values.job_id,
          certificate_type: values.certificate_type as CertificateType,
          issue_date: values.issue_date,
          expiry_date: values.expiry_date,
          next_inspection_date: values.next_inspection_date,
          inspector_name: values.inspector_name,
          inspector_registration: values.inspector_registration,
          property_address: values.property_address,
          property_type: values.property_type,
          certificate_data: certificateData,
        });
      } else {
        await createCertificate.mutateAsync({
          customer_id: values.customer_id,
          job_id: values.job_id,
          certificate_type: values.certificate_type as CertificateType,
          issue_date: values.issue_date,
          expiry_date: values.expiry_date,
          next_inspection_date: values.next_inspection_date,
          inspector_name: values.inspector_name,
          inspector_registration: values.inspector_registration,
          property_address: values.property_address,
          property_type: values.property_type,
          certificate_data: certificateData,
        });
      }
      onOpenChange(false);
      form.reset();
      setCertificateData({});
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleIssue = async () => {
    if (!certificateId) return;
    await issueCertificate.mutateAsync(certificateId);
    onOpenChange(false);
  };

  const isLoading = createCertificate.isPending || updateCertificate.isPending;

  // Filter jobs by selected customer
  const customerJobs = jobs?.filter((j) => j.customer_id === selectedCustomerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            {isEditing ? "Edit Certificate" : "New Certificate"}
          </DialogTitle>
        </DialogHeader>

        {loadingCert && certificateId ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="inspection" disabled={!selectedType}>
                Inspection Data
              </TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <TabsContent value="details" className="space-y-4">
                  {/* Certificate Type */}
                  <FormField
                    control={form.control}
                    name="certificate_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certificate Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={isEditing}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select certificate type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="eicr" className="font-medium">
                              ⚡ {CERTIFICATE_TYPE_LABELS.eicr}
                            </SelectItem>
                            <SelectItem value="gas_safety" className="font-medium">
                              🔥 {CERTIFICATE_TYPE_LABELS.gas_safety}
                            </SelectItem>
                            <SelectItem value="minor_works">
                              ⚡ {CERTIFICATE_TYPE_LABELS.minor_works}
                            </SelectItem>
                            <SelectItem value="eic">
                              ⚡ {CERTIFICATE_TYPE_LABELS.eic}
                            </SelectItem>
                            <SelectItem value="landlord_gas">
                              🔥 {CERTIFICATE_TYPE_LABELS.landlord_gas}
                            </SelectItem>
                            <SelectItem value="rgii">
                              🔥 {CERTIFICATE_TYPE_LABELS.rgii}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Customer */}
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
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

                  {/* Job (optional) */}
                  {selectedCustomerId && customerJobs && customerJobs.length > 0 && (
                    <FormField
                      control={form.control}
                      name="job_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Job (optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select job" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customerJobs.map((job) => (
                                <SelectItem key={job.id} value={job.id}>
                                  {job.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Property Address */}
                  <FormField
                    control={form.control}
                    name="property_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter property address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Property Type */}
                  <FormField
                    control={form.control}
                    name="property_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="domestic">Domestic</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                            <SelectItem value="industrial">Industrial</SelectItem>
                            <SelectItem value="hmo">HMO</SelectItem>
                            <SelectItem value="landlord">Landlord Property</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    {/* Issue Date */}
                    <FormField
                      control={form.control}
                      name="issue_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Expiry Date */}
                    <FormField
                      control={form.control}
                      name="expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Inspector Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="inspector_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inspector Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inspector_registration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {GAS_CERTIFICATES.includes(selectedType) 
                              ? "Gas Safe / RGII Number" 
                              : "Registration Number"}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 123456" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="inspection" className="space-y-4">
                  {ELECTRICIAN_CERTIFICATES.includes(selectedType) && (
                    <EICRFormFields 
                      data={certificateData} 
                      onChange={setCertificateData}
                      certificateType={selectedType}
                    />
                  )}
                  {GAS_CERTIFICATES.includes(selectedType) && (
                    <GasSafetyFormFields 
                      data={certificateData} 
                      onChange={setCertificateData}
                      certificateType={selectedType}
                    />
                  )}
                </TabsContent>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditing ? "Save Changes" : "Create Draft"}
                    </Button>
                    {isEditing && certificate?.status === "draft" && (
                      <Button 
                        type="button" 
                        variant="default"
                        onClick={handleIssue}
                        disabled={issueCertificate.isPending}
                      >
                        {issueCertificate.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Issue Certificate
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
