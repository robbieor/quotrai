import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Column mappings for each provider
const PROVIDER_MAPPINGS: Record<string, Record<string, string>> = {
  circle_k: { date: "transaction date", amount: "amount", litres: "litres", station: "station", vehicle: "vehicle reg" },
  dci: { date: "date", amount: "net amount", litres: "quantity", station: "site name", vehicle: "registration" },
  top_oil: { date: "date", amount: "amount", litres: "litres", station: "location", vehicle: "vehicle" },
  applegreen: { date: "transaction date", amount: "total", litres: "volume", station: "site", vehicle: "vehicle reg" },
  emo: { date: "date", amount: "amount", litres: "litres", station: "station", vehicle: "vehicle" },
  allstar: { date: "transaction date", amount: "net value", litres: "quantity", station: "site name", vehicle: "vehicle registration" },
  shell: { date: "date", amount: "net amount", litres: "quantity", station: "station", vehicle: "registration" },
  bp: { date: "transaction date", amount: "net amount", litres: "quantity", station: "site", vehicle: "registration" },
  generic: { date: "date", amount: "amount", litres: "litres", station: "station", vehicle: "vehicle" },
};

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function findColumn(headers: string[], target: string): string | null {
  // Exact match first
  const exact = headers.find((h) => h === target);
  if (exact) return exact;
  // Partial match
  const partial = headers.find((h) => h.includes(target) || target.includes(h));
  return partial || null;
}

function parseDate(value: string): string | null {
  if (!value) return null;

  // Try common formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY
  const cleaned = value.trim();

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.substring(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try Date.parse as fallback
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().substring(0, 10);
  }

  return null;
}

function parseAmount(value: string): number | null {
  if (!value) return null;
  // Remove currency symbols and whitespace
  const cleaned = value.replace(/[€£$\s,]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.abs(num);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, imported: 0, errors: ["Missing authorization"], warnings: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, imported: 0, errors: ["Unauthorized"], warnings: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await adminSupabase.from("profiles").select("team_id").eq("id", user.id).single();
    if (!profile?.team_id) {
      return new Response(JSON.stringify({ success: false, imported: 0, errors: ["No team found"], warnings: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const teamId = profile.team_id;
    const { provider, csv_content } = await req.json();

    const mapping = PROVIDER_MAPPINGS[provider];
    if (!mapping) {
      return new Response(JSON.stringify({ success: false, imported: 0, errors: [`Unknown provider: ${provider}`], warnings: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { headers, rows } = parseCSV(csv_content);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: false, imported: 0, errors: ["No data rows found in CSV"], warnings: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find matching columns
    const dateCol = findColumn(headers, mapping.date);
    const amountCol = findColumn(headers, mapping.amount);
    const litresCol = findColumn(headers, mapping.litres);
    const stationCol = findColumn(headers, mapping.station);
    const vehicleCol = findColumn(headers, mapping.vehicle);

    const result = { success: false, imported: 0, errors: [] as string[], warnings: [] as string[] };

    if (!dateCol) result.warnings.push(`Could not find date column (expected: "${mapping.date}"). Found columns: ${headers.join(", ")}`);
    if (!amountCol) {
      result.errors.push(`Could not find amount column (expected: "${mapping.amount}"). Found columns: ${headers.join(", ")}`);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const amount = parseAmount(amountCol ? row[amountCol] : "");
      if (!amount || amount <= 0) {
        result.warnings.push(`Row ${rowNum}: Invalid or zero amount, skipped`);
        continue;
      }

      const date = dateCol ? parseDate(row[dateCol]) : new Date().toISOString().substring(0, 10);
      if (!date) {
        result.warnings.push(`Row ${rowNum}: Could not parse date "${row[dateCol!]}", using today`);
      }

      const station = stationCol ? row[stationCol]?.trim() : null;
      const vehicle = vehicleCol ? row[vehicleCol]?.trim() : null;
      const litres = litresCol ? parseFloat(row[litresCol]?.replace(/[^\d.]/g, "") || "0") : null;

      // Build description
      const parts: string[] = ["Fuel"];
      if (litres && litres > 0) parts.push(`${litres}L`);
      if (station) parts.push(`at ${station}`);
      const description = parts.join(" ");

      // Build notes with vehicle info
      const noteParts: string[] = [];
      if (vehicle) noteParts.push(`Vehicle: ${vehicle}`);
      if (litres && litres > 0) noteParts.push(`Litres: ${litres}`);
      noteParts.push(`Provider: ${provider}`);
      const notes = noteParts.join(" | ");

      const { error } = await adminSupabase.from("expenses").insert({
        team_id: teamId,
        category: "fuel",
        description,
        amount,
        expense_date: date || new Date().toISOString().substring(0, 10),
        vendor: station || provider,
        notes,
        created_by: user.id,
      });

      if (error) {
        result.errors.push(`Row ${rowNum}: ${error.message}`);
      } else {
        result.imported++;
      }
    }

    result.success = result.imported > 0 && result.errors.length === 0;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Fuel card import error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ success: false, imported: 0, errors: [errorMessage], warnings: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
