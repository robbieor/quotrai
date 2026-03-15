import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  type: "customers" | "invoices" | "invoice_items" | "quotes" | "quote_items" | "jobs";
  rows: Record<string, string>[];
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, imported: 0, errors: ["Missing authorization"], warnings: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Get authenticated user
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, imported: 0, errors: ["Unauthorized"], warnings: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's team
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (!profile?.team_id) {
      return new Response(
        JSON.stringify({ success: false, imported: 0, errors: ["No team found"], warnings: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamId = profile.team_id;
    const { type, rows } = await req.json() as ImportRequest;

    const result: ImportResult = {
      success: false,
      imported: 0,
      errors: [],
      warnings: [],
    };

    // Process based on type
    switch (type) {
      case "customers":
        await importCustomers(adminSupabase, teamId, rows, result);
        break;
      case "invoices":
        await importInvoices(adminSupabase, teamId, rows, result);
        break;
      case "invoice_items":
        await importInvoiceItems(adminSupabase, teamId, rows, result);
        break;
      case "quotes":
        await importQuotes(adminSupabase, teamId, rows, result);
        break;
      case "quote_items":
        await importQuoteItems(adminSupabase, teamId, rows, result);
        break;
      case "jobs":
        await importJobs(adminSupabase, teamId, rows, result);
        break;
      default:
        result.errors.push(`Unknown import type: ${type}`);
    }

    result.success = result.imported > 0 && result.errors.length === 0;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Import error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({
        success: false,
        imported: 0,
        errors: [errorMessage],
        warnings: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importCustomers(
  supabase: any,
  teamId: string,
  rows: Record<string, string>[],
  result: ImportResult
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Account for header row

    if (!row.name?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'name'`);
      continue;
    }

    if (!row.email?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'email'`);
      continue;
    }

    // Check if customer already exists
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("team_id", teamId)
      .eq("email", row.email.trim())
      .maybeSingle();

    if (existing) {
      result.warnings.push(`Row ${rowNum}: Customer with email '${row.email}' already exists, skipped`);
      continue;
    }

    const { error } = await supabase.from("customers").insert({
      team_id: teamId,
      name: row.name.trim(),
      email: row.email.trim(),
      phone: row.phone?.trim() || null,
      contact_person: row.contact_person?.trim() || null,
      address: row.address?.trim() || null,
      notes: row.notes?.trim() || null,
    });

    if (error) {
      result.errors.push(`Row ${rowNum}: ${error.message}`);
    } else {
      result.imported++;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importInvoices(
  supabase: any,
  teamId: string,
  rows: Record<string, string>[],
  result: ImportResult
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.customer_email?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'customer_email'`);
      continue;
    }
    if (!row.invoice_number?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'invoice_number'`);
      continue;
    }
    if (!row.issue_date?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'issue_date'`);
      continue;
    }
    if (!row.total?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'total'`);
      continue;
    }

    // Find customer by email
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("team_id", teamId)
      .eq("email", row.customer_email.trim())
      .maybeSingle();

    if (!customer) {
      result.errors.push(`Row ${rowNum}: Customer with email '${row.customer_email}' not found. Import customers first.`);
      continue;
    }

    // Check for duplicate invoice number
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("team_id", teamId)
      .eq("invoice_number", row.invoice_number.trim())
      .maybeSingle();

    if (existing) {
      result.warnings.push(`Row ${rowNum}: Invoice '${row.invoice_number}' already exists, skipped`);
      continue;
    }

    const total = parseFloat(row.total) || 0;
    const taxRate = parseFloat(row.tax_rate) || 0;
    const subtotal = row.subtotal ? parseFloat(row.subtotal) : (taxRate > 0 ? total / (1 + taxRate / 100) : total);
    const taxAmount = row.tax_amount ? parseFloat(row.tax_amount) : total - subtotal;

    const status = validateStatus(row.status, ["draft", "sent", "paid", "overdue", "cancelled"]) || "draft";

    // COMMUNICATION SAFETY: All imported invoices are suppressed from outbound comms
    const { error } = await supabase.from("invoices").insert({
      team_id: teamId,
      customer_id: customer.id,
      invoice_number: row.invoice_number.trim(),
      issue_date: row.issue_date.trim(),
      due_date: row.due_date?.trim() || null,
      status,
      notes: row.notes?.trim() || null,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      communication_suppressed: true,
      delivery_status: "not_sent",
    });

    if (error) {
      result.errors.push(`Row ${rowNum}: ${error.message}`);
    } else {
      result.imported++;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importQuotes(
  supabase: any,
  teamId: string,
  rows: Record<string, string>[],
  result: ImportResult
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.customer_email?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'customer_email'`);
      continue;
    }
    if (!row.quote_number?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'quote_number'`);
      continue;
    }
    if (!row.total?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'total'`);
      continue;
    }

    // Find customer by email
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("team_id", teamId)
      .eq("email", row.customer_email.trim())
      .maybeSingle();

    if (!customer) {
      result.errors.push(`Row ${rowNum}: Customer with email '${row.customer_email}' not found. Import customers first.`);
      continue;
    }

    // Check for duplicate quote number
    const { data: existing } = await supabase
      .from("quotes")
      .select("id")
      .eq("team_id", teamId)
      .eq("quote_number", row.quote_number.trim())
      .maybeSingle();

    if (existing) {
      result.warnings.push(`Row ${rowNum}: Quote '${row.quote_number}' already exists, skipped`);
      continue;
    }

    const total = parseFloat(row.total) || 0;
    const taxRate = parseFloat(row.tax_rate) || 0;
    const subtotal = row.subtotal ? parseFloat(row.subtotal) : (taxRate > 0 ? total / (1 + taxRate / 100) : total);
    const taxAmount = row.tax_amount ? parseFloat(row.tax_amount) : total - subtotal;

    const status = validateStatus(row.status, ["draft", "sent", "accepted", "declined"]) || "draft";

    const { error } = await supabase.from("quotes").insert({
      team_id: teamId,
      customer_id: customer.id,
      quote_number: row.quote_number.trim(),
      valid_until: row.valid_until?.trim() || null,
      status,
      notes: row.notes?.trim() || null,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
    });

    if (error) {
      result.errors.push(`Row ${rowNum}: ${error.message}`);
    } else {
      result.imported++;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importJobs(
  supabase: any,
  teamId: string,
  rows: Record<string, string>[],
  result: ImportResult
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.customer_email?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'customer_email'`);
      continue;
    }
    if (!row.title?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'title'`);
      continue;
    }

    // Find customer by email
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("team_id", teamId)
      .eq("email", row.customer_email.trim())
      .maybeSingle();

    if (!customer) {
      result.errors.push(`Row ${rowNum}: Customer with email '${row.customer_email}' not found. Import customers first.`);
      continue;
    }

    const status = validateStatus(row.status, ["pending", "scheduled", "in_progress", "completed", "cancelled"]) || "pending";

    const { error } = await supabase.from("jobs").insert({
      team_id: teamId,
      customer_id: customer.id,
      title: row.title.trim(),
      description: row.description?.trim() || null,
      status,
      scheduled_date: row.scheduled_date?.trim() || null,
      scheduled_time: row.scheduled_time?.trim() || null,
      estimated_value: row.estimated_value ? parseFloat(row.estimated_value) : null,
    });

    if (error) {
      result.errors.push(`Row ${rowNum}: ${error.message}`);
    } else {
      result.imported++;
    }
  }
}

function validateStatus(status: string | undefined, validStatuses: string[]): string | null {
  if (!status) return null;
  const normalized = status.trim().toLowerCase().replace(/\s+/g, "_");
  return validStatuses.includes(normalized) ? normalized : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importInvoiceItems(
  supabase: any,
  teamId: string,
  rows: Record<string, string>[],
  result: ImportResult
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.invoice_number?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'invoice_number'`);
      continue;
    }
    if (!row.description?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'description'`);
      continue;
    }
    if (!row.quantity?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'quantity'`);
      continue;
    }
    if (!row.unit_price?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'unit_price'`);
      continue;
    }

    // Find invoice by invoice_number
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("team_id", teamId)
      .eq("invoice_number", row.invoice_number.trim())
      .maybeSingle();

    if (!invoice) {
      result.errors.push(`Row ${rowNum}: Invoice '${row.invoice_number}' not found. Import invoices first.`);
      continue;
    }

    const quantity = parseFloat(row.quantity) || 1;
    const unitPrice = parseFloat(row.unit_price) || 0;
    const totalPrice = quantity * unitPrice;

    const { error } = await supabase.from("invoice_items").insert({
      invoice_id: invoice.id,
      description: row.description.trim(),
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
    });

    if (error) {
      result.errors.push(`Row ${rowNum}: ${error.message}`);
    } else {
      result.imported++;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importQuoteItems(
  supabase: any,
  teamId: string,
  rows: Record<string, string>[],
  result: ImportResult
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.quote_number?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'quote_number'`);
      continue;
    }
    if (!row.description?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'description'`);
      continue;
    }
    if (!row.quantity?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'quantity'`);
      continue;
    }
    if (!row.unit_price?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field 'unit_price'`);
      continue;
    }

    // Find quote by quote_number
    const { data: quote } = await supabase
      .from("quotes")
      .select("id")
      .eq("team_id", teamId)
      .eq("quote_number", row.quote_number.trim())
      .maybeSingle();

    if (!quote) {
      result.errors.push(`Row ${rowNum}: Quote '${row.quote_number}' not found. Import quotes first.`);
      continue;
    }

    const quantity = parseFloat(row.quantity) || 1;
    const unitPrice = parseFloat(row.unit_price) || 0;
    const totalPrice = quantity * unitPrice;

    const { error } = await supabase.from("quote_items").insert({
      quote_id: quote.id,
      description: row.description.trim(),
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
    });

    if (error) {
      result.errors.push(`Row ${rowNum}: ${error.message}`);
    } else {
      result.imported++;
    }
  }
}
