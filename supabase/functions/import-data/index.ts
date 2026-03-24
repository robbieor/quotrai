import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  type: "customers" | "invoices" | "invoice_items" | "quotes" | "quote_items" | "jobs";
  rows: Record<string, string>[];
  mode?: "header_only" | "header_with_items";
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, imported: 0, errors: ["Unauthorized"], warnings: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const { type, rows, mode } = await req.json() as ImportRequest;

    const result: ImportResult = { success: false, imported: 0, errors: [], warnings: [] };

    switch (type) {
      case "customers":
        await importCustomers(adminSupabase, teamId, rows, result);
        break;
      case "invoices":
        await importInvoices(adminSupabase, teamId, rows, result, mode);
        break;
      case "invoice_items":
        await importInvoiceItems(adminSupabase, teamId, rows, result);
        break;
      case "quotes":
        await importQuotes(adminSupabase, teamId, rows, result, mode);
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
      JSON.stringify({ success: false, imported: 0, errors: [errorMessage], warnings: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Helpers ──────────────────────────────────────────────────

const STATUS_ALIASES: Record<string, string> = {
  sent: "pending",       // invoices: "sent" maps to "pending"
  unpaid: "pending",
  outstanding: "overdue",
  approved: "accepted",  // quotes
  rejected: "declined",
  won: "accepted",
  lost: "declined",
};

function validateStatus(status: string | undefined, validStatuses: string[]): string | null {
  if (!status) return null;
  let normalized = status.trim().toLowerCase().replace(/\s+/g, "_");
  // Only apply alias if the value isn't already valid
  if (!validStatuses.includes(normalized) && STATUS_ALIASES[normalized]) {
    normalized = STATUS_ALIASES[normalized];
  }
  return validStatuses.includes(normalized) ? normalized : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findCustomerByEmail(supabase: any, teamId: string, email: string) {
  const { data } = await supabase
    .from("customers")
    .select("id")
    .eq("team_id", teamId)
    .eq("email", email.trim())
    .maybeSingle();
  return data;
}

// ── Customers ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importCustomers(supabase: any, teamId: string, rows: Record<string, string>[], result: ImportResult) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.name?.trim()) { result.errors.push(`Row ${rowNum}: Missing required field 'name'`); continue; }
    if (!row.email?.trim()) { result.errors.push(`Row ${rowNum}: Missing required field 'email'`); continue; }

    const { data: existing } = await supabase
      .from("customers").select("id").eq("team_id", teamId).eq("email", row.email.trim()).maybeSingle();

    if (existing) { result.warnings.push(`Row ${rowNum}: Customer with email '${row.email}' already exists, skipped`); continue; }

    const { error } = await supabase.from("customers").insert({
      team_id: teamId, name: row.name.trim(), email: row.email.trim(),
      phone: row.phone?.trim() || null, contact_person: row.contact_person?.trim() || null,
      address: row.address?.trim() || null, notes: row.notes?.trim() || null,
    });

    if (error) { result.errors.push(`Row ${rowNum}: ${error.message}`); } else { result.imported++; }
  }
}

// ── Invoices ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importInvoices(supabase: any, teamId: string, rows: Record<string, string>[], result: ImportResult, mode?: string) {
  if (mode === "header_with_items") {
    await importInvoicesWithItems(supabase, teamId, rows, result);
    return;
  }
  // header_only (default)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.customer_email?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'customer_email'`); continue; }
    if (!row.invoice_number?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'invoice_number'`); continue; }
    if (!row.issue_date?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'issue_date'`); continue; }
    if (!row.total?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'total'`); continue; }

    const customer = await findCustomerByEmail(supabase, teamId, row.customer_email);
    if (!customer) { result.errors.push(`Row ${rowNum}: Customer '${row.customer_email}' not found. Import customers first.`); continue; }

    const { data: existing } = await supabase
      .from("invoices").select("id").eq("team_id", teamId).eq("invoice_number", row.invoice_number.trim()).maybeSingle();
    if (existing) { result.warnings.push(`Row ${rowNum}: Invoice '${row.invoice_number}' already exists, skipped`); continue; }

    const total = parseFloat(row.total) || 0;
    const taxRate = parseFloat(row.tax_rate) || 0;
    const subtotal = row.subtotal ? parseFloat(row.subtotal) : (taxRate > 0 ? total / (1 + taxRate / 100) : total);
    const taxAmount = row.tax_amount ? parseFloat(row.tax_amount) : total - subtotal;
    const status = validateStatus(row.status, ["draft", "pending", "paid", "overdue", "cancelled"]) || "draft";

    const issueDate = row.issue_date.trim();
    const dueDate = row.due_date?.trim() || new Date(new Date(issueDate).getTime() + 30 * 86400000).toISOString().split("T")[0];

    const { error } = await supabase.from("invoices").insert({
      team_id: teamId, customer_id: customer.id, invoice_number: row.invoice_number.trim(),
      issue_date: issueDate, due_date: dueDate, status,
      notes: row.notes?.trim() || null, subtotal, tax_rate: taxRate, tax_amount: taxAmount, total,
      communication_suppressed: true, delivery_status: "not_sent",
    });

    if (error) { result.errors.push(`Row ${rowNum}: ${error.message}`); } else { result.imported++; }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importInvoicesWithItems(supabase: any, teamId: string, rows: Record<string, string>[], result: ImportResult) {
  // Group rows by invoice_number
  const groups = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const key = row.invoice_number?.trim();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  for (const [invoiceNumber, groupRows] of groups) {
    const headerRow = groupRows[0];
    if (!headerRow.customer_email?.trim()) { result.errors.push(`Invoice '${invoiceNumber}': Missing 'customer_email'`); continue; }
    if (!headerRow.issue_date?.trim()) { result.errors.push(`Invoice '${invoiceNumber}': Missing 'issue_date'`); continue; }
    if (!headerRow.total?.trim()) { result.errors.push(`Invoice '${invoiceNumber}': Missing 'total'`); continue; }

    const customer = await findCustomerByEmail(supabase, teamId, headerRow.customer_email);
    if (!customer) { result.errors.push(`Invoice '${invoiceNumber}': Customer '${headerRow.customer_email}' not found.`); continue; }

    const { data: existing } = await supabase
      .from("invoices").select("id").eq("team_id", teamId).eq("invoice_number", invoiceNumber).maybeSingle();
    if (existing) { result.warnings.push(`Invoice '${invoiceNumber}' already exists, skipped`); continue; }

    const total = parseFloat(headerRow.total) || 0;
    const taxRate = parseFloat(headerRow.tax_rate) || 0;
    const subtotal = headerRow.subtotal ? parseFloat(headerRow.subtotal) : (taxRate > 0 ? total / (1 + taxRate / 100) : total);
    const taxAmount = headerRow.tax_amount ? parseFloat(headerRow.tax_amount) : total - subtotal;
    const status = validateStatus(headerRow.status, ["draft", "pending", "paid", "overdue", "cancelled"]) || "draft";

    const issueDate = headerRow.issue_date.trim();
    const dueDate = headerRow.due_date?.trim() || new Date(new Date(issueDate).getTime() + 30 * 86400000).toISOString().split("T")[0];

    const { data: invoice, error: invError } = await supabase.from("invoices").insert({
      team_id: teamId, customer_id: customer.id, invoice_number: invoiceNumber,
      issue_date: issueDate, due_date: dueDate, status,
      notes: headerRow.notes?.trim() || null, subtotal, tax_rate: taxRate, tax_amount: taxAmount, total,
      communication_suppressed: true, delivery_status: "not_sent",
    }).select("id").single();

    if (invError) { result.errors.push(`Invoice '${invoiceNumber}': ${invError.message}`); continue; }

    // Insert line items
    let itemsTotal = 0;
    for (const itemRow of groupRows) {
      if (!itemRow.description?.trim()) continue;
      const qty = parseFloat(itemRow.quantity) || 1;
      const unitPrice = parseFloat(itemRow.unit_price) || 0;
      const lineTotal = qty * unitPrice;
      itemsTotal += lineTotal;

      const { error: itemError } = await supabase.from("invoice_items").insert({
        invoice_id: invoice.id, description: itemRow.description.trim(),
        quantity: qty, unit_price: unitPrice,
      });
      if (itemError) { result.errors.push(`Invoice '${invoiceNumber}' item: ${itemError.message}`); }
    }

    // Soft validation: warn if item totals don't match header total
    if (itemsTotal > 0 && Math.abs(itemsTotal - total) / total > 0.01) {
      result.warnings.push(`Invoice '${invoiceNumber}': Line items total (${itemsTotal.toFixed(2)}) differs from header total (${total.toFixed(2)}) by >1%`);
    }

    result.imported++;
  }
}

// ── Quotes ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importQuotes(supabase: any, teamId: string, rows: Record<string, string>[], result: ImportResult, mode?: string) {
  if (mode === "header_with_items") {
    await importQuotesWithItems(supabase, teamId, rows, result);
    return;
  }
  // header_only (default)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.customer_email?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'customer_email'`); continue; }
    if (!row.quote_number?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'quote_number'`); continue; }
    if (!row.total?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'total'`); continue; }

    const customer = await findCustomerByEmail(supabase, teamId, row.customer_email);
    if (!customer) { result.errors.push(`Row ${rowNum}: Customer '${row.customer_email}' not found. Import customers first.`); continue; }

    const { data: existing } = await supabase
      .from("quotes").select("id").eq("team_id", teamId).eq("quote_number", row.quote_number.trim()).maybeSingle();
    if (existing) { result.warnings.push(`Row ${rowNum}: Quote '${row.quote_number}' already exists, skipped`); continue; }

    const total = parseFloat(row.total) || 0;
    const taxRate = parseFloat(row.tax_rate) || 0;
    const subtotal = row.subtotal ? parseFloat(row.subtotal) : (taxRate > 0 ? total / (1 + taxRate / 100) : total);
    const taxAmount = row.tax_amount ? parseFloat(row.tax_amount) : total - subtotal;
    const status = validateStatus(row.status, ["draft", "sent", "accepted", "declined", "expired"]) || "draft";

    const { error } = await supabase.from("quotes").insert({
      team_id: teamId, customer_id: customer.id, quote_number: row.quote_number.trim(),
      valid_until: row.valid_until?.trim() || null, status,
      notes: row.notes?.trim() || null, subtotal, tax_rate: taxRate, tax_amount: taxAmount, total,
      communication_suppressed: true, delivery_status: "not_sent",
    });

    if (error) { result.errors.push(`Row ${rowNum}: ${error.message}`); } else { result.imported++; }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importQuotesWithItems(supabase: any, teamId: string, rows: Record<string, string>[], result: ImportResult) {
  const groups = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const key = row.quote_number?.trim();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  for (const [quoteNumber, groupRows] of groups) {
    const headerRow = groupRows[0];
    if (!headerRow.customer_email?.trim()) { result.errors.push(`Quote '${quoteNumber}': Missing 'customer_email'`); continue; }
    if (!headerRow.total?.trim()) { result.errors.push(`Quote '${quoteNumber}': Missing 'total'`); continue; }

    const customer = await findCustomerByEmail(supabase, teamId, headerRow.customer_email);
    if (!customer) { result.errors.push(`Quote '${quoteNumber}': Customer '${headerRow.customer_email}' not found.`); continue; }

    const { data: existing } = await supabase
      .from("quotes").select("id").eq("team_id", teamId).eq("quote_number", quoteNumber).maybeSingle();
    if (existing) { result.warnings.push(`Quote '${quoteNumber}' already exists, skipped`); continue; }

    const total = parseFloat(headerRow.total) || 0;
    const taxRate = parseFloat(headerRow.tax_rate) || 0;
    const subtotal = headerRow.subtotal ? parseFloat(headerRow.subtotal) : (taxRate > 0 ? total / (1 + taxRate / 100) : total);
    const taxAmount = headerRow.tax_amount ? parseFloat(headerRow.tax_amount) : total - subtotal;
    const status = validateStatus(headerRow.status, ["draft", "sent", "accepted", "declined", "expired"]) || "draft";

    const { data: quote, error: qError } = await supabase.from("quotes").insert({
      team_id: teamId, customer_id: customer.id, quote_number: quoteNumber,
      valid_until: headerRow.valid_until?.trim() || null, status,
      notes: headerRow.notes?.trim() || null, subtotal, tax_rate: taxRate, tax_amount: taxAmount, total,
      communication_suppressed: true, delivery_status: "not_sent",
    }).select("id").single();

    if (qError) { result.errors.push(`Quote '${quoteNumber}': ${qError.message}`); continue; }

    let itemsTotal = 0;
    for (const itemRow of groupRows) {
      if (!itemRow.description?.trim()) continue;
      const qty = parseFloat(itemRow.quantity) || 1;
      const unitPrice = parseFloat(itemRow.unit_price) || 0;
      const lineTotal = qty * unitPrice;
      itemsTotal += lineTotal;

      const { error: itemError } = await supabase.from("quote_items").insert({
        quote_id: quote.id, description: itemRow.description.trim(),
        quantity: qty, unit_price: unitPrice,
      });
      if (itemError) { result.errors.push(`Quote '${quoteNumber}' item: ${itemError.message}`); }
    }

    if (itemsTotal > 0 && Math.abs(itemsTotal - total) / total > 0.01) {
      result.warnings.push(`Quote '${quoteNumber}': Line items total (${itemsTotal.toFixed(2)}) differs from header total (${total.toFixed(2)}) by >1%`);
    }

    result.imported++;
  }
}

// ── Jobs ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importJobs(supabase: any, teamId: string, rows: Record<string, string>[], result: ImportResult) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.customer_email?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'customer_email'`); continue; }
    if (!row.title?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'title'`); continue; }

    const customer = await findCustomerByEmail(supabase, teamId, row.customer_email);
    if (!customer) { result.errors.push(`Row ${rowNum}: Customer '${row.customer_email}' not found. Import customers first.`); continue; }

    const status = validateStatus(row.status, ["pending", "scheduled", "in_progress", "completed", "cancelled"]) || "pending";

    const { error } = await supabase.from("jobs").insert({
      team_id: teamId, customer_id: customer.id, title: row.title.trim(),
      description: row.description?.trim() || null, status,
      scheduled_date: row.scheduled_date?.trim() || null,
      scheduled_time: row.scheduled_time?.trim() || null,
      estimated_value: row.estimated_value ? parseFloat(row.estimated_value) : null,
    });

    if (error) { result.errors.push(`Row ${rowNum}: ${error.message}`); } else { result.imported++; }
  }
}

// ── Legacy standalone item imports (backward compat) ────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importInvoiceItems(supabase: any, teamId: string, rows: Record<string, string>[], result: ImportResult) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.invoice_number?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'invoice_number'`); continue; }
    if (!row.description?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'description'`); continue; }
    if (!row.quantity?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'quantity'`); continue; }
    if (!row.unit_price?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'unit_price'`); continue; }

    const { data: invoice } = await supabase
      .from("invoices").select("id").eq("team_id", teamId).eq("invoice_number", row.invoice_number.trim()).maybeSingle();
    if (!invoice) { result.errors.push(`Row ${rowNum}: Invoice '${row.invoice_number}' not found.`); continue; }

    const quantity = parseFloat(row.quantity) || 1;
    const unitPrice = parseFloat(row.unit_price) || 0;

    const { error } = await supabase.from("invoice_items").insert({
      invoice_id: invoice.id, description: row.description.trim(),
      quantity, unit_price: unitPrice,
    });

    if (error) { result.errors.push(`Row ${rowNum}: ${error.message}`); } else { result.imported++; }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importQuoteItems(supabase: any, teamId: string, rows: Record<string, string>[], result: ImportResult) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.quote_number?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'quote_number'`); continue; }
    if (!row.description?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'description'`); continue; }
    if (!row.quantity?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'quantity'`); continue; }
    if (!row.unit_price?.trim()) { result.errors.push(`Row ${rowNum}: Missing 'unit_price'`); continue; }

    const { data: quote } = await supabase
      .from("quotes").select("id").eq("team_id", teamId).eq("quote_number", row.quote_number.trim()).maybeSingle();
    if (!quote) { result.errors.push(`Row ${rowNum}: Quote '${row.quote_number}' not found.`); continue; }

    const quantity = parseFloat(row.quantity) || 1;
    const unitPrice = parseFloat(row.unit_price) || 0;

    const { error } = await supabase.from("quote_items").insert({
      quote_id: quote.id, description: row.description.trim(),
      quantity, unit_price: unitPrice,
    });

    if (error) { result.errors.push(`Row ${rowNum}: ${error.message}`); } else { result.imported++; }
  }
}
