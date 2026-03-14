import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type CertificateType = 
  | "eicr"
  | "gas_safety"
  | "minor_works"
  | "eic"
  | "part_p"
  | "unvented_cylinder"
  | "oil_tank"
  | "f_gas"
  | "landlord_gas"
  | "rgii";

export type CertificateStatus = "draft" | "issued" | "expired" | "superseded";

export interface Certificate {
  id: string;
  team_id: string;
  job_id: string | null;
  customer_id: string;
  certificate_type: CertificateType;
  certificate_number: string;
  issue_date: string;
  expiry_date: string | null;
  next_inspection_date: string | null;
  status: CertificateStatus;
  inspector_name: string;
  inspector_registration: string | null;
  inspector_signature_url: string | null;
  property_address: string;
  property_type: string | null;
  certificate_data: Record<string, unknown>;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  customer?: {
    id: string;
    name: string;
    email: string | null;
  };
  job?: {
    id: string;
    title: string;
  };
}

export interface CreateCertificateInput {
  customer_id: string;
  job_id?: string;
  certificate_type: CertificateType;
  issue_date?: string;
  expiry_date?: string;
  next_inspection_date?: string;
  inspector_name: string;
  inspector_registration?: string;
  property_address: string;
  property_type?: string;
  certificate_data?: Record<string, unknown>;
}

export interface UpdateCertificateInput extends Partial<CreateCertificateInput> {
  id: string;
  status?: CertificateStatus;
}

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  eicr: "EICR (Electrical Installation Condition Report)",
  gas_safety: "Gas Safety Certificate (CP12)",
  minor_works: "Minor Electrical Works Certificate",
  eic: "Electrical Installation Certificate",
  part_p: "Part P Compliance Certificate",
  unvented_cylinder: "Unvented Cylinder Certificate",
  oil_tank: "Oil Tank Installation Certificate",
  f_gas: "F-Gas Certificate",
  landlord_gas: "Landlord Gas Safety Record",
  rgii: "RGII Certificate (Ireland)",
};

export const CERTIFICATE_TYPE_SHORT_LABELS: Record<CertificateType, string> = {
  eicr: "EICR",
  gas_safety: "Gas Safety",
  minor_works: "Minor Works",
  eic: "EIC",
  part_p: "Part P",
  unvented_cylinder: "Unvented Cylinder",
  oil_tank: "Oil Tank",
  f_gas: "F-Gas",
  landlord_gas: "Landlord Gas",
  rgii: "RGII",
};

// Trade-specific certificate types
export const ELECTRICIAN_CERTIFICATES: CertificateType[] = ["eicr", "eic", "minor_works", "part_p"];
export const GAS_CERTIFICATES: CertificateType[] = ["gas_safety", "landlord_gas", "rgii"];
export const PLUMBER_CERTIFICATES: CertificateType[] = ["unvented_cylinder", "oil_tank"];
export const HVAC_CERTIFICATES: CertificateType[] = ["f_gas"];

// Default expiry periods (in years)
export const CERTIFICATE_EXPIRY_YEARS: Partial<Record<CertificateType, number>> = {
  eicr: 5, // 5 years for domestic, can be less for commercial
  gas_safety: 1,
  landlord_gas: 1,
  rgii: 1,
  f_gas: 1,
};

async function getTeamId() {
  const { data } = await supabase.rpc("get_user_team_id");
  return data;
}

export function useCertificates(filters?: { 
  type?: CertificateType; 
  status?: CertificateStatus;
  customerId?: string;
}) {
  return useQuery({
    queryKey: ["certificates", filters],
    queryFn: async () => {
      let query = supabase
        .from("certificates")
        .select(`
          *,
          customer:customers(id, name, email),
          job:jobs(id, title)
        `)
        .order("created_at", { ascending: false });

      if (filters?.type) {
        query = query.eq("certificate_type", filters.type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Certificate[];
    },
  });
}

export function useCertificate(id: string | undefined) {
  return useQuery({
    queryKey: ["certificates", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("certificates")
        .select(`
          *,
          customer:customers(id, name, email, address, phone),
          job:jobs(id, title, description)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Certificate;
    },
    enabled: !!id,
  });
}

export function useCreateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCertificateInput) => {
      const teamId = await getTeamId();
      if (!teamId) throw new Error("No team found");

      // Generate certificate number
      const { data: certNumber, error: numError } = await supabase
        .rpc("generate_certificate_number", { 
          p_team_id: teamId, 
          p_type: input.certificate_type 
        });
      
      if (numError) throw numError;

      // Calculate expiry date if not provided
      let expiryDate = input.expiry_date;
      if (!expiryDate && CERTIFICATE_EXPIRY_YEARS[input.certificate_type]) {
        const issueDate = new Date(input.issue_date || new Date());
        issueDate.setFullYear(issueDate.getFullYear() + CERTIFICATE_EXPIRY_YEARS[input.certificate_type]!);
        expiryDate = issueDate.toISOString().split("T")[0];
      }

      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("certificates")
        .insert({
          team_id: teamId,
          customer_id: input.customer_id,
          job_id: input.job_id || null,
          certificate_type: input.certificate_type,
          certificate_number: certNumber,
          issue_date: input.issue_date || new Date().toISOString().split("T")[0],
          expiry_date: expiryDate || null,
          next_inspection_date: input.next_inspection_date || null,
          inspector_name: input.inspector_name,
          inspector_registration: input.inspector_registration || null,
          property_address: input.property_address,
          property_type: input.property_type || null,
          certificate_data: (input.certificate_data || {}) as Json,
          status: "draft",
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificate created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create certificate: " + error.message);
    },
  });
}

export function useUpdateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCertificateInput) => {
      const { id, certificate_data, ...updates } = input;

      const updatePayload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      if (certificate_data !== undefined) {
        updatePayload.certificate_data = certificate_data as Json;
      }

      const { data, error } = await supabase
        .from("certificates")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificate updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update certificate: " + error.message);
    },
  });
}

export function useDeleteCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("certificates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificate deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete certificate: " + error.message);
    },
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("certificates")
        .update({ 
          status: "issued",
          issue_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificate issued successfully");
    },
    onError: (error) => {
      toast.error("Failed to issue certificate: " + error.message);
    },
  });
}

// Hook to get expiring certificates
export function useExpiringCertificates(daysAhead = 30) {
  return useQuery({
    queryKey: ["certificates", "expiring", daysAhead],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from("certificates")
        .select(`
          *,
          customer:customers(id, name, email)
        `)
        .eq("status", "issued")
        .lte("expiry_date", futureDate.toISOString().split("T")[0])
        .gte("expiry_date", new Date().toISOString().split("T")[0])
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      return data as Certificate[];
    },
  });
}
