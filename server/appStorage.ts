import { createClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";

// Supabase Storage implementation

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// We'll use a single bucket for simplicity, or we could map to multiple
const BUCKET_NAME = "uploads";

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export async function uploadFile(
  key: string,
  data: Buffer | string,
  contentType?: string
): Promise<UploadResult> {
  try {
    // Sanitize key to remove leading slashes which Supabase doesn't like as root
    const cleanKey = key.replace(/^\/+/, "");

    let fileBody;
    if (typeof data === "string") {
      // If it's a base64 string, decode it
      // But typically this function receives raw content or a path in the generic version
      // Assuming 'string' input here meant raw content in the old version.
      // For safety with binary data, Buffer is preferred.
      fileBody = Buffer.from(data);
    } else {
      fileBody = data;
    }

    const { data: uploadData, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(cleanKey, fileBody, {
        contentType: contentType || "application/octet-stream",
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(cleanKey);

    return {
      success: true,
      key: cleanKey,
      url: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error("Supabase upload error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

export async function downloadFile(key: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  try {
    const cleanKey = key.replace(/^\/+/, "");

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(cleanKey);

    if (error) throw error;

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return { success: true, data: buffer };
  } catch (error) {
    console.error("Supabase download error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Download failed" };
  }
}

export async function deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanKey = key.replace(/^\/+/, "");

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([cleanKey]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Supabase delete error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Delete failed" };
  }
}

export async function listFiles(prefix?: string): Promise<{ success: boolean; files?: string[]; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix || "");

    if (error) throw error;

    // Map to just names/paths
    const files = data.map(f => prefix ? `${prefix}/${f.name}` : f.name);

    return { success: true, files };
  } catch (error) {
    console.error("Supabase list error:", error);
    return { success: false, error: error instanceof Error ? error.message : "List failed" };
  }
}

export function generateReceiptKey(userId: string, organizationId: number | null, filename: string): string {
  const timestamp = Date.now();
  const orgPrefix = organizationId ? `org-${organizationId}` : `user-${userId}`;
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `receipts/${orgPrefix}/${timestamp}-${sanitizedFilename}`;
}

export function generateLogoKey(userId: string, organizationId: number | null, filename: string): string {
  const timestamp = Date.now();
  const orgPrefix = organizationId ? `org-${organizationId}` : `user-${userId}`;
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `logos/${orgPrefix}/${timestamp}-${sanitizedFilename}`;
}

export function generateInvoicePdfKey(organizationId: number, invoiceNumber: string): string {
  return `invoices/org-${organizationId}/${invoiceNumber}.pdf`;
}

export function generateTeamMessageKey(organizationId: number, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `team-messages/org-${organizationId}/${timestamp}-${sanitizedFilename}`;
}
