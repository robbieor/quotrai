import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AUTH CHECK ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub;

    // Get user's team_id
    const { data: teamId, error: teamError } = await userClient.rpc("get_user_team_id");
    if (teamError || !teamId) {
      return new Response(
        JSON.stringify({ error: "No team found for user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client for writes
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { client_name, template_name, additional_notes, tax_rate, due_days } = await req.json();

    if (!client_name) {
      return new Response(
        JSON.stringify({ error: "client_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!template_name) {
      return new Response(
        JSON.stringify({ error: "template_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const COUNTRY_VAT_RATES: Record<string, number> = {
      ie: 23, gb: 20, uk: 20, us: 0, ca: 5, au: 10, nz: 15,
      de: 19, fr: 20, es: 21, it: 22, nl: 21, be: 21, at: 20,
      ch: 8.1, se: 25, no: 25, dk: 25, fi: 24, pl: 23, pt: 23,
    };

    // Scope client lookup to user's team
    const { data: client, error: clientError } = await supabase
      .from("customers")
      .select("id, name, country_code")
      .eq("team_id", teamId)
      .ilike("name", `%${client_name}%`)
      .limit(1)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: `Client not found: ${client_name}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientCountry = client.country_code?.toLowerCase() || "ie";
    const defaultVatRate = COUNTRY_VAT_RATES[clientCountry] ?? 0;

    // Scope template lookup to user's team
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("*, template_items(*)")
      .ilike("name", `%${template_name}%`)
      .eq("team_id", teamId)
      .limit(1)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: `Template not found: ${template_name}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateItems = template.template_items || [];

    // Use atomic number generator
    const { data: invoiceNumber, error: numError } = await supabase.rpc("generate_invoice_number", { p_team_id: teamId });
    if (numError || !invoiceNumber) {
      return new Response(
        JSON.stringify({ error: "Failed to generate invoice number" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subtotal = templateItems.reduce(
      (sum: number, item: any) => sum + (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
      0
    );
    const taxRateValue = tax_rate !== undefined ? tax_rate : (template.tax_rate || defaultVatRate);
    const taxAmount = subtotal * (taxRateValue / 100);
    const total = subtotal + taxAmount;

    const today = new Date().toISOString().split("T")[0];
    const daysUntilDue = due_days || 30;
    const dueDate = new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        team_id: teamId,
        customer_id: client.id,
        display_number: invoiceNumber,
        status: "draft",
        issue_date: today,
        due_date: dueDate,
        subtotal,
        tax_rate: taxRateValue,
        tax_amount: taxAmount,
        total,
        notes: additional_notes || null,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Invoice creation error:", invoiceError);
      return new Response(
        JSON.stringify({ error: `Failed to create invoice: ${invoiceError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (templateItems.length > 0) {
      const invoiceItems = templateItems.map((item: any) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        amount: (item.quantity || 1) * (item.unit_price || 0),
      }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems);
      if (itemsError) console.error("Invoice items error:", itemsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.id,
        display_number: invoiceNumber,
        message: `Invoice ${invoiceNumber} created for ${client.name}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
