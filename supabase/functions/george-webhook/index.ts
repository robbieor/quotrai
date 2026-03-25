import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WebhookRequest {
  function_name: string;
  parameters: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth token for verification
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user_id = user.id;

    // Get the user's team and currency from their profile using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("team_id, currency, country")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.team_id) {
      return new Response(
        JSON.stringify({ error: "User not in a team" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is actually a member of this team
    const { data: membership, error: membershipError } = await supabase
      .from("team_memberships")
      .select("id")
      .eq("user_id", user_id)
      .eq("team_id", profile.team_id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "Not a team member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const company_id = profile.team_id;
    const userCurrency = profile.currency || "EUR";
    const userCountry = profile.country || "IE";
    
    // Country to VAT rate mapping
    const COUNTRY_VAT_RATES: Record<string, number> = {
      ie: 23, gb: 20, uk: 20, us: 0, ca: 5, au: 10, nz: 15,
      de: 19, fr: 20, es: 21, it: 22, nl: 21, be: 21, at: 20,
      ch: 8.1, se: 25, no: 25, dk: 25, fi: 24, pl: 23, pt: 23
    };
    
    // Currency symbol mapping
    const CURRENCY_SYMBOLS: Record<string, string> = {
      EUR: "€", GBP: "£", USD: "$", CAD: "C$", AUD: "A$", 
      NZD: "NZ$", CHF: "CHF", SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł"
    };
    
    const getVatRate = (countryCode: string | null): number => {
      if (!countryCode) return 0;
      return COUNTRY_VAT_RATES[countryCode.toLowerCase()] ?? 0;
    };
    
    const getCurrencySymbol = (currency: string): string => {
      return CURRENCY_SYMBOLS[currency] || currency;
    };
    
    const defaultVatRate = getVatRate(userCountry);
    const currencySymbol = getCurrencySymbol(userCurrency);

    const { function_name, parameters }: WebhookRequest = await req.json();

    if (!function_name) {
      return new Response(
        JSON.stringify({ error: "Missing required field: function_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`george-webhook: ${function_name}`, { parameters, company_id, user_id });

    let response: { success: boolean; message: string; data?: unknown };

    switch (function_name) {
      case "get_todays_jobs": {
        const today = new Date().toISOString().split("T")[0];
        
        const { data: jobs, error } = await supabase
          .from("jobs")
          .select("id, title, description, scheduled_date, scheduled_time, status, customers(name, address, phone)")
          .eq("team_id", company_id)
          .eq("scheduled_date", today)
          .order("scheduled_time", { ascending: true });

        if (error) throw error;

        if (!jobs || jobs.length === 0) {
          response = {
            success: true,
            message: "You have no jobs scheduled for today.",
            data: []
          };
        } else {
          const jobList = jobs.map((job: any) => {
            const time = job.scheduled_time ? job.scheduled_time.slice(0, 5) : "no time set";
            const clientName = job.customers?.name || "Unknown client";
            const address = job.customers?.address || "no address on file";
            return `${job.title} for ${clientName} at ${time}, located at ${address}`;
          }).join(". ");
          
          response = {
            success: true,
            message: `You have ${jobs.length} job${jobs.length > 1 ? "s" : ""} scheduled for today. ${jobList}.`,
            data: jobs
          };
        }
        break;
      }

      case "create_job": {
        const { client_name, client_phone, job_title, description, scheduled_date, scheduled_time, estimated_value } = parameters as {
          client_name: string;
          client_phone?: string;
          job_title: string;
          description?: string;
          scheduled_date: string;
          scheduled_time?: string;
          estimated_value?: number;
        };

        if (!client_name || !job_title || !scheduled_date) {
          response = {
            success: false,
            message: "I need the client name, job title, and scheduled date to create a job."
          };
          break;
        }

        // Validate the scheduled date
        const scheduledDateObj = new Date(scheduled_date + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const twoYearsFromNow = new Date(today);
        twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
        
        if (isNaN(scheduledDateObj.getTime())) {
          response = {
            success: false,
            message: `The date "${scheduled_date}" doesn't look right. Please use a valid date format like YYYY-MM-DD.`
          };
          break;
        }
        
        if (scheduledDateObj < today) {
          const todayStr = today.toISOString().split("T")[0];
          response = {
            success: false,
            message: `I can't schedule a job in the past. The date ${scheduled_date} has already passed. Today is ${todayStr}. Did you mean a date in ${today.getFullYear()} or ${today.getFullYear() + 1}?`
          };
          break;
        }
        
        if (scheduledDateObj > twoYearsFromNow) {
          response = {
            success: false,
            message: `That date is more than 2 years away. I can only schedule jobs up to 2 years in advance. Please choose a closer date.`
          };
          break;
        }

        // Check for scheduling conflicts if a time is specified
        let conflictWarning = "";
        if (scheduled_time) {
          const { data: existingJobs } = await supabase
            .from("jobs")
            .select("id, title, scheduled_time, customers(name)")
            .eq("team_id", company_id)
            .eq("scheduled_date", scheduled_date)
            .in("status", ["pending", "scheduled", "in_progress"]);

          if (existingJobs && existingJobs.length > 0) {
            // Parse the requested time to check for overlaps
            const requestedHour = parseInt(scheduled_time.split(":")[0]);
            
            // Find jobs within 1 hour of the requested time
            const conflictingJobs = existingJobs.filter((job: any) => {
              if (!job.scheduled_time) return false;
              const jobHour = parseInt(job.scheduled_time.split(":")[0]);
              return Math.abs(jobHour - requestedHour) < 2; // Within 2 hours
            });

            if (conflictingJobs.length > 0) {
              const conflictList = conflictingJobs.map((job: any) => {
                const customerName = (job.customers as any)?.name || "a client";
                const time = job.scheduled_time?.slice(0, 5) || "";
                return `"${job.title}" for ${customerName} at ${time}`;
              }).join(", ");
              
              conflictWarning = ` ⚠️ Heads up: You already have ${conflictingJobs.length === 1 ? "a job" : "jobs"} scheduled around that time: ${conflictList}. You might want to adjust the timing.`;
            }
          }
        }

        // Find or create client
        let { data: existingClient } = await supabase
          .from("customers")
          .select("id, name")
          .eq("team_id", company_id)
          .ilike("name", client_name)
          .limit(1)
          .single();

        let customerId: string;
        let clientCreated = false;

        if (existingClient) {
          customerId = existingClient.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from("customers")
            .insert({
              team_id: company_id,
              name: client_name,
              phone: client_phone || null
            })
            .select("id")
            .single();

          if (clientError) throw clientError;
          customerId = newClient.id;
          clientCreated = true;
        }

        // Create the job
        const { data: newJob, error: jobError } = await supabase
          .from("jobs")
          .insert({
            team_id: company_id,
            customer_id: customerId,
            title: job_title,
            description: description || null,
            scheduled_date: scheduled_date,
            scheduled_time: scheduled_time || null,
            estimated_value: estimated_value || null,
            status: "pending"
          })
          .select("id, title, scheduled_date, scheduled_time")
          .single();

        if (jobError) throw jobError;

        const timeStr = scheduled_time ? ` at ${scheduled_time.slice(0, 5)}` : "";
        const clientNote = clientCreated ? ` I also created a new client record for ${client_name}.` : "";
        
        response = {
          success: true,
          message: `Done! I've created the job "${job_title}" for ${client_name} on ${scheduled_date}${timeStr}.${clientNote}${conflictWarning}`,
          data: newJob
        };
        break;
      }

      case "create_quote": {
        const { client_name, client_phone, items, notes, valid_until, tax_rate, job_id, job_title } = parameters as {
          client_name: string;
          client_phone?: string;
          items: Array<{ description: string; quantity: number; unit_price: number }>;
          notes?: string;
          valid_until?: string;
          tax_rate?: number;
          job_id?: string;
          job_title?: string;
        };

        if (!client_name || !items || items.length === 0) {
          response = {
            success: false,
            message: "I need the client name and at least one line item to create a quote."
          };
          break;
        }

        // Find or create client
        let { data: existingClient } = await supabase
          .from("customers")
          .select("id, name")
          .eq("team_id", company_id)
          .ilike("name", client_name)
          .limit(1)
          .single();

        let customerId: string;
        let clientCreated = false;

        if (existingClient) {
          customerId = existingClient.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from("customers")
            .insert({
              team_id: company_id,
              name: client_name,
              phone: client_phone || null
            })
            .select("id")
            .single();

          if (clientError) throw clientError;
          customerId = newClient.id;
          clientCreated = true;
        }

        // Generate quote number
        const { data: lastQuote } = await supabase
          .from("quotes")
          .select("display_number")
          .eq("team_id", company_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let quoteNumber = "Q-0001";
        if (lastQuote?.display_number) {
          const num = parseInt(lastQuote.display_number.replace("Q-", "")) + 1;
          quoteNumber = `Q-${num.toString().padStart(4, "0")}`;
        }

        // Calculate totals - use provided tax_rate or default based on user's country
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const taxRateValue = tax_rate !== undefined ? tax_rate : defaultVatRate;
        const taxAmount = subtotal * (taxRateValue / 100);
        const total = subtotal + taxAmount;

        // Default valid_until to 30 days from now
        const validUntilDate = valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // Find job if job_id or job_title provided
        let linkedJobId: string | null = null;
        let linkedJobTitle: string | null = null;
        
        if (job_id) {
          const { data: job } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("id", job_id)
            .eq("team_id", company_id)
            .single();
          if (job) {
            linkedJobId = job.id;
            linkedJobTitle = job.title;
          }
        } else if (job_title) {
          const { data: jobs } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("team_id", company_id)
            .ilike("title", `%${job_title}%`)
            .limit(1);
          if (jobs && jobs.length > 0) {
            linkedJobId = jobs[0].id;
            linkedJobTitle = jobs[0].title;
          }
        }

        // Create quote
        const { data: newQuote, error: quoteError } = await supabase
          .from("quotes")
          .insert({
            team_id: company_id,
            customer_id: customerId,
            display_number: quoteNumber,
            subtotal,
            tax_rate: taxRateValue,
            tax_amount: taxAmount,
            total,
            notes: notes || null,
            valid_until: validUntilDate,
            status: "draft",
            job_id: linkedJobId
          })
          .select("id, display_number, total")
          .single();

        if (quoteError) throw quoteError;

        // Create quote items
        const quoteItems = items.map((item) => ({
          quote_id: newQuote.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));

        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(quoteItems);

        if (itemsError) throw itemsError;

        const clientNote = clientCreated ? ` I also created a new client record for ${client_name}.` : "";
        const jobNote = linkedJobTitle ? ` It's linked to job "${linkedJobTitle}".` : "";
        
        response = {
          success: true,
          message: `Done! I've created quote ${quoteNumber} for ${client_name} totaling ${currencySymbol}${total.toFixed(2)}. It's currently a draft - you can review and send it when ready.${clientNote}${jobNote}`,
          data: { quote: newQuote, items: quoteItems, job_id: linkedJobId }
        };
        break;
      }

      case "get_overdue_invoices": {
        const today = new Date().toISOString().split("T")[0];
        
        const { data: invoices, error } = await supabase
          .from("invoices")
          .select("id, display_number, total, due_date, status, customer:customers(name, email)")
          .eq("team_id", company_id)
          .or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${today})`)
          .order("due_date", { ascending: true });

        if (error) throw error;

        if (!invoices || invoices.length === 0) {
          response = {
            success: true,
            message: "Great news! You have no overdue invoices.",
            data: []
          };
        } else {
          const totalOwed = invoices.reduce((sum: number, inv: any) => sum + (parseFloat(inv.total) || 0), 0);
          const invoiceList = invoices.slice(0, 5).map((inv: any) => {
            const clientName = inv.customer?.name || "Unknown";
            const daysOverdue = Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
            return `Invoice ${inv.display_number} for ${clientName}, ${currencySymbol}${parseFloat(inv.total).toFixed(2)}, ${daysOverdue} days overdue`;
          }).join(". ");
          
          const moreNote = invoices.length > 5 ? ` and ${invoices.length - 5} more` : "";
          
          response = {
            success: true,
            message: `You have ${invoices.length} overdue invoice${invoices.length > 1 ? "s" : ""} totaling ${currencySymbol}${totalOwed.toFixed(2)}. ${invoiceList}${moreNote}.`,
            data: invoices
          };
        }
        break;
      }

      case "send_invoice_reminder": {
        const { invoice_id, invoice_number } = parameters as {
          invoice_id?: string;
          invoice_number?: string;
        };

        // Find the invoice
        let invoiceQuery = supabase
          .from("invoices")
          .select("id, display_number, total, due_date, status, communication_suppressed, customer:customers(name, email)")
          .eq("team_id", company_id);

        if (invoice_id) {
          invoiceQuery = invoiceQuery.eq("id", invoice_id);
        } else if (invoice_number) {
          invoiceQuery = invoiceQuery.eq("display_number", invoice_number);
        } else {
          response = {
            success: false,
            message: "I need either an invoice ID or invoice number to send a reminder."
          };
          break;
        }

        const { data: invoices, error: findError } = await invoiceQuery.limit(1);

        if (findError) throw findError;

        if (!invoices || invoices.length === 0) {
          response = {
            success: false,
            message: "I couldn't find that invoice in your records."
          };
          break;
        }

        const invoice = invoices[0] as any;
        const customerEmail = invoice.customer?.email;
        const customerName = invoice.customer?.name || "Customer";

        if (!customerEmail) {
          response = {
            success: false,
            message: `I can't send a reminder for invoice ${invoice.display_number} because ${customerName} doesn't have an email address on file.`
          };
          break;
        }

        // COMMUNICATION SAFETY: George AI reminder gated by kill switch
        const outboundEnabled = Deno.env.get("OUTBOUND_COMMUNICATION_ENABLED") === "true";
        if (!outboundEnabled) {
          console.log("[SAFETY] george-webhook send_invoice_reminder blocked: OUTBOUND_COMMUNICATION_ENABLED is false");
          response = {
            success: false,
            message: `Outbound emails are currently disabled. The reminder for invoice ${invoice.display_number} was not sent. You can re-enable email sending in your settings.`
          };
          break;
        }

        // Check if invoice has communication_suppressed (imported records)
        if ((invoice as any).communication_suppressed) {
          response = {
            success: false,
            message: `Invoice ${invoice.display_number} was imported and has communication suppressed. Please remove the suppression flag before sending reminders.`
          };
          break;
        }

        // SAFETY FIX: Voice agent must NOT send emails directly.
        // Instead, inform the user to send via the app UI where confirmation gates exist.
        await supabase.from("comms_audit_log").insert({
          channel: "email",
          record_type: "invoice",
          record_id: invoice.id,
          recipient: customerEmail,
          template: "george-webhook:send_invoice_reminder",
          manual_send: false,
          confirmed_by_user: false,
          allowed: false,
          blocked_reason: "Voice agent cannot send emails directly — requires UI confirmation",
          source_screen: "george_voice",
          user_id: user_id,
          team_id: company_id,
        });

        // Update invoice status to overdue if not already
        if (invoice.status !== "overdue") {
          await supabase
            .from("invoices")
            .update({ status: "overdue" })
            .eq("id", invoice.id);
        }

        response = {
          success: true,
          message: `I've marked invoice ${invoice.display_number} (${currencySymbol}${parseFloat(invoice.total).toFixed(2)}) as overdue. To send a payment reminder to ${customerName} at ${customerEmail}, please use the invoice screen in the app — this ensures you can preview the email before it's sent.`,
          data: { invoice_id: invoice.id, requires_manual_send: true }
        };
        break;
      }

      case "log_expense": {
        const { vendor_name, amount, category, description, job_id } = parameters as {
          vendor_name: string;
          amount: number;
          category?: string;
          description?: string;
          job_id?: string;
        };

        if (!vendor_name || amount === undefined) {
          response = {
            success: false,
            message: "I need the vendor name and amount to log an expense."
          };
          break;
        }

        const expenseCategory = category || "other";
        const validCategories = ["materials", "fuel", "tools", "labor", "permits", "other"];
        const finalCategory = validCategories.includes(expenseCategory.toLowerCase()) 
          ? expenseCategory.toLowerCase() 
          : "other";

        const { data: expense, error } = await supabase
          .from("expenses")
          .insert({
            team_id: company_id,
            vendor: vendor_name,
            amount: amount,
            category: finalCategory,
            description: description || `Expense from ${vendor_name}`,
            job_id: job_id || null,
            expense_date: new Date().toISOString().split("T")[0]
          })
          .select("id, amount, vendor, category")
          .single();

        if (error) throw error;

        response = {
          success: true,
          message: `Got it! I've logged a $${parseFloat(String(amount)).toFixed(2)} expense from ${vendor_name} under ${finalCategory}.`,
          data: expense
        };
        break;
      }

      case "get_client_info": {
        const { client_name } = parameters as { client_name: string };

        if (!client_name) {
          response = {
            success: false,
            message: "I need a client name to look up."
          };
          break;
        }

        const { data: clients, error: clientError } = await supabase
          .from("customers")
          .select("id, name, email, phone, address, notes")
          .eq("team_id", company_id)
          .ilike("name", `%${client_name}%`)
          .limit(1);

        if (clientError) throw clientError;

        if (!clients || clients.length === 0) {
          response = {
            success: false,
            message: `I couldn't find a client matching "${client_name}" in your records.`
          };
          break;
        }

        const client = clients[0];

        // Get recent jobs for this client
        const { data: recentJobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id, title, status, scheduled_date")
          .eq("customer_id", client.id)
          .order("scheduled_date", { ascending: false })
          .limit(3);

        if (jobsError) throw jobsError;

        // Get outstanding invoices
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, display_number, total, status")
          .eq("customer_id", client.id)
          .in("status", ["pending", "overdue"])
          .limit(5);

        let clientInfo = `${client.name}`;
        if (client.phone) clientInfo += `, phone ${client.phone}`;
        if (client.address) clientInfo += `, located at ${client.address}`;
        if (client.email) clientInfo += `, email ${client.email}`;

        let jobsInfo = "";
        if (recentJobs && recentJobs.length > 0) {
          const jobsList = recentJobs.map((job: any) => 
            `${job.title} on ${job.scheduled_date} (${job.status})`
          ).join(", ");
          jobsInfo = ` Their recent jobs include: ${jobsList}.`;
        } else {
          jobsInfo = " They have no jobs on record.";
        }

        let invoiceInfo = "";
        if (invoices && invoices.length > 0) {
          const totalOwed = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.total), 0);
          invoiceInfo = ` They have ${invoices.length} outstanding invoice${invoices.length > 1 ? "s" : ""} totaling $${totalOwed.toFixed(2)}.`;
        }

        response = {
          success: true,
          message: `Here's what I found. ${clientInfo}.${jobsInfo}${invoiceInfo}`,
          data: { client, recentJobs, invoices }
        };
        break;
      }

      case "reschedule_job": {
        const { job_id, job_title, client_name, new_date, new_time } = parameters as {
          job_id?: string;
          job_title?: string;
          client_name?: string;
          new_date: string;
          new_time?: string;
        };

        if (!new_date) {
          response = {
            success: false,
            message: "I need the new date to reschedule the job."
          };
          break;
        }

        // Validate the new date
        const newDateObj = new Date(new_date + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const twoYearsFromNow = new Date(today);
        twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
        
        if (isNaN(newDateObj.getTime())) {
          response = {
            success: false,
            message: `The date "${new_date}" doesn't look right. Please use a valid date format like YYYY-MM-DD.`
          };
          break;
        }
        
        if (newDateObj < today) {
          const todayStr = today.toISOString().split("T")[0];
          response = {
            success: false,
            message: `I can't reschedule a job to a date in the past. The date ${new_date} has already passed. Today is ${todayStr}. Did you mean a date in ${today.getFullYear()} or ${today.getFullYear() + 1}?`
          };
          break;
        }
        
        if (newDateObj > twoYearsFromNow) {
          response = {
            success: false,
            message: `That date is more than 2 years away. I can only reschedule jobs up to 2 years in advance. Please choose a closer date.`
          };
          break;
        }

        let jobQuery = supabase
          .from("jobs")
          .select("id, title, scheduled_date, scheduled_time, customers(name)")
          .eq("team_id", company_id);

        // Find the job by ID, title, or client name
        if (job_id) {
          jobQuery = jobQuery.eq("id", job_id);
        } else if (job_title) {
          jobQuery = jobQuery.ilike("title", `%${job_title}%`);
        } else if (client_name) {
          // Need to find by client name - get customer first
          const { data: customers } = await supabase
            .from("customers")
            .select("id")
            .eq("team_id", company_id)
            .ilike("name", `%${client_name}%`)
            .limit(1);

          if (!customers || customers.length === 0) {
            response = {
              success: false,
              message: `I couldn't find a client matching "${client_name}".`
            };
            break;
          }
          jobQuery = jobQuery.eq("customer_id", customers[0].id);
        } else {
          response = {
            success: false,
            message: "I need either a job ID, job title, or client name to find the job to reschedule."
          };
          break;
        }

        const { data: jobs, error: findError } = await jobQuery.limit(1);

        if (findError) throw findError;

        if (!jobs || jobs.length === 0) {
          response = {
            success: false,
            message: "I couldn't find that job in your records."
          };
          break;
        }

        const job = jobs[0] as any;
        const oldDate = job.scheduled_date;
        const oldTime = job.scheduled_time;
        const effectiveTime = new_time !== undefined ? new_time : oldTime;

        // Check for scheduling conflicts
        let conflictWarning = "";
        if (effectiveTime) {
          const { data: existingJobs } = await supabase
            .from("jobs")
            .select("id, title, scheduled_time, customers(name)")
            .eq("team_id", company_id)
            .eq("scheduled_date", new_date)
            .neq("id", job.id) // Exclude the job being rescheduled
            .in("status", ["pending", "scheduled", "in_progress"]);

          if (existingJobs && existingJobs.length > 0) {
            const requestedHour = parseInt(effectiveTime.split(":")[0]);
            
            const conflictingJobs = existingJobs.filter((j: any) => {
              if (!j.scheduled_time) return false;
              const jobHour = parseInt(j.scheduled_time.split(":")[0]);
              return Math.abs(jobHour - requestedHour) < 2;
            });

            if (conflictingJobs.length > 0) {
              const conflictList = conflictingJobs.map((j: any) => {
                const customerName = (j.customers as any)?.name || "a client";
                const time = j.scheduled_time?.slice(0, 5) || "";
                return `"${j.title}" for ${customerName} at ${time}`;
              }).join(", ");
              
              conflictWarning = ` ⚠️ Heads up: You already have ${conflictingJobs.length === 1 ? "a job" : "jobs"} scheduled around that time: ${conflictList}. You might want to adjust the timing.`;
            }
          }
        }

        const { error: updateError } = await supabase
          .from("jobs")
          .update({
            scheduled_date: new_date,
            scheduled_time: effectiveTime
          })
          .eq("id", job.id);

        if (updateError) throw updateError;

        const clientName = job.customers?.name || "the client";
        const timeInfo = effectiveTime ? ` at ${effectiveTime.slice(0, 5)}` : "";
        const oldInfo = oldDate ? ` It was previously scheduled for ${oldDate}${oldTime ? ` at ${oldTime.slice(0, 5)}` : ""}.` : "";

        response = {
          success: true,
          message: `Done! I've rescheduled "${job.title}" for ${clientName} to ${new_date}${timeInfo}.${oldInfo}${conflictWarning}`,
          data: { job_id: job.id, new_date, new_time: effectiveTime }
        };
        break;
      }

      case "get_templates": {
        const { category, search } = parameters as {
          category?: string;
          search?: string;
        };

        let query = supabase
          .from("templates")
          .select("id, name, description, category, labour_rate_default, estimated_duration, is_system_template, is_active")
          .eq("team_id", company_id)
          .eq("is_active", true)
          .order("category")
          .order("name");

        if (category) {
          query = query.eq("category", category.toLowerCase());
        }

        if (search) {
          query = query.ilike("name", `%${search}%`);
        }

        const { data: templates, error } = await query;

        if (error) throw error;

        if (!templates || templates.length === 0) {
          const categoryNote = category ? ` for ${category}` : "";
          response = {
            success: true,
            message: `You don't have any templates${categoryNote} yet. Would you like me to help you create one?`,
            data: []
          };
        } else {
          // Group by category
          const grouped: Record<string, any[]> = {};
          templates.forEach((t: any) => {
            const cat = t.category || "general";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(t);
          });

          let summary = "";
          if (category) {
            summary = `You have ${templates.length} template${templates.length > 1 ? "s" : ""} for ${category}: ${templates.map((t: any) => t.name).join(", ")}.`;
          } else {
            const parts = Object.entries(grouped).map(([cat, items]) => 
              `${items.length} ${cat} template${items.length > 1 ? "s" : ""}`
            );
            summary = `You have ${templates.length} templates total: ${parts.join(", ")}. Some examples: ${templates.slice(0, 5).map((t: any) => t.name).join(", ")}.`;
          }

          response = {
            success: true,
            message: summary,
            data: templates
          };
        }
        break;
      }

      case "use_template_for_quote": {
        const { template_name, template_id, client_name, client_phone, quantity_overrides, notes, job_id, job_title, create_job, scheduled_date, scheduled_time } = parameters as {
          template_name?: string;
          template_id?: string;
          client_name: string;
          client_phone?: string;
          quantity_overrides?: Record<string, number>;
          notes?: string;
          job_id?: string;
          job_title?: string;
          create_job?: boolean;
          scheduled_date?: string;
          scheduled_time?: string;
        };

        if (!client_name) {
          response = {
            success: false,
            message: "I need the client name to create a quote."
          };
          break;
        }

        // Find the template - try direct match first, then fuzzy word match
        let template: any = null;

        if (template_id) {
          const { data, error: tErr } = await supabase
            .from("templates")
            .select("id, name, description, category, labour_rate_default, estimated_duration")
            .eq("team_id", company_id)
            .eq("is_active", true)
            .eq("id", template_id)
            .maybeSingle();
          if (tErr) throw tErr;
          template = data;
        } else if (template_name) {
          // Try direct substring match first
          const { data: directMatch } = await supabase
            .from("templates")
            .select("id, name, description, category, labour_rate_default, estimated_duration")
            .eq("team_id", company_id)
            .eq("is_active", true)
            .ilike("name", `%${template_name}%`)
            .limit(1)
            .maybeSingle();

          if (directMatch) {
            template = directMatch;
          } else {
            // Fuzzy word-based matching
            const searchWords = template_name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);
            const { data: allTemplates } = await supabase
              .from("templates")
              .select("id, name, description, category, labour_rate_default, estimated_duration")
              .eq("team_id", company_id)
              .eq("is_active", true);

            if (allTemplates) {
              const scored = allTemplates
                .map((t: any) => {
                  const nameLower = t.name.toLowerCase();
                  const matchCount = searchWords.filter((w: string) => nameLower.includes(w)).length;
                  return { ...t, matchCount };
                })
                .filter((t: any) => t.matchCount > 0)
                .sort((a: any, b: any) => b.matchCount - a.matchCount);
              if (scored.length > 0) template = scored[0];
            }
          }
        } else {
          response = {
            success: false,
            message: "I need either a template name or ID to create the quote."
          };
          break;
        }

        if (!template) {
          response = {
            success: false,
            message: `I couldn't find a template matching "${template_name || template_id}". Try asking "what templates do I have?" to see your options.`
          };
          break;
        }

        // Get template items
        const { data: templateItems, error: itemsError } = await supabase
          .from("template_items")
          .select("description, quantity, unit_price, unit, is_material, item_type")
          .eq("template_id", template.id)
          .order("sort_order");

        if (itemsError) throw itemsError;

        if (!templateItems || templateItems.length === 0) {
          response = {
            success: false,
            message: `The template "${template.name}" doesn't have any line items. Please add items to the template first.`
          };
          break;
        }

        // Find or create client
        let { data: existingClient } = await supabase
          .from("customers")
          .select("id, name")
          .eq("team_id", company_id)
          .ilike("name", client_name)
          .limit(1)
          .single();

        let customerId: string;
        let clientCreated = false;

        if (existingClient) {
          customerId = existingClient.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from("customers")
            .insert({
              team_id: company_id,
              name: client_name,
              phone: client_phone || null
            })
            .select("id")
            .single();

          if (clientError) throw clientError;
          customerId = newClient.id;
          clientCreated = true;
        }

        // Generate quote number
        const { data: lastQuote } = await supabase
          .from("quotes")
          .select("display_number")
          .eq("team_id", company_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let quoteNumber = "Q-0001";
        if (lastQuote?.display_number) {
          const num = parseInt(lastQuote.display_number.replace("Q-", "")) + 1;
          quoteNumber = `Q-${num.toString().padStart(4, "0")}`;
        }

        // Build quote items with optional quantity overrides
        const quoteItems = templateItems.map((item: any, index: number) => {
          const qty = quantity_overrides?.[item.description] || item.quantity;
          return {
            description: item.description,
            quantity: qty,
            unit_price: item.unit_price,
          };
        });

        // Calculate totals - use default VAT rate from user's country
        const subtotal = quoteItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
        const taxRate = defaultVatRate;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        // Default valid_until to 30 days from now
        const validUntilDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // Handle job linking or creation
        let linkedJobId: string | null = null;
        let linkedJobTitle: string | null = null;
        let jobCreated = false;

        if (job_id) {
          // Link to existing job by ID
          const { data: job } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("id", job_id)
            .eq("team_id", company_id)
            .single();
          if (job) {
            linkedJobId = job.id;
            linkedJobTitle = job.title;
          }
        } else if (job_title) {
          // Find existing job by title
          const { data: jobs } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("team_id", company_id)
            .ilike("title", `%${job_title}%`)
            .limit(1);
          if (jobs && jobs.length > 0) {
            linkedJobId = jobs[0].id;
            linkedJobTitle = jobs[0].title;
          }
        }
        
        // Optionally create a new job if requested and no existing job found
        if (create_job && !linkedJobId) {
          const jobTitleToUse = job_title || `${template.name} - ${client_name}`;
          const { data: newJob, error: jobError } = await supabase
            .from("jobs")
            .insert({
              team_id: company_id,
              customer_id: customerId,
              title: jobTitleToUse,
              description: `Job created from template: ${template.name}`,
              scheduled_date: scheduled_date || null,
              scheduled_time: scheduled_time || null,
              estimated_value: total,
              status: "pending"
            })
            .select("id, title")
            .single();
          
          if (!jobError && newJob) {
            linkedJobId = newJob.id;
            linkedJobTitle = newJob.title;
            jobCreated = true;
          }
        }

        // Create quote
        const { data: newQuote, error: quoteError } = await supabase
          .from("quotes")
          .insert({
            team_id: company_id,
            customer_id: customerId,
            display_number: quoteNumber,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            notes: notes || `Created from template: ${template.name}`,
            valid_until: validUntilDate,
            status: "draft",
            job_id: linkedJobId
          })
          .select("id, display_number, total")
          .single();
        if (quoteError) throw quoteError;

        // Create quote items
        const quoteItemsToInsert = quoteItems.map((item: any) => ({
          quote_id: newQuote.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));

        const { error: insertItemsError } = await supabase
          .from("quote_items")
          .insert(quoteItemsToInsert);

        if (insertItemsError) throw insertItemsError;

        const clientNote = clientCreated ? ` I also created a new client record for ${client_name}.` : "";
        const jobNote = linkedJobTitle ? (jobCreated ? ` I also created job "${linkedJobTitle}" and linked it.` : ` It's linked to job "${linkedJobTitle}".`) : "";
        
        response = {
          success: true,
          message: `Done! I've created quote ${quoteNumber} for ${client_name} using the "${template.name}" template. The total is ${currencySymbol}${total.toFixed(2)}. It's saved as a draft for you to review.${clientNote}${jobNote}`,
          data: { quote: newQuote, template: template.name, items: quoteItems, job_id: linkedJobId }
        };
        break;
      }

      case "create_invoice_from_template": {
        const { template_name, template_id, client_name, client_phone, quantity_overrides, notes, due_days, job_id, job_title, create_job, scheduled_date, scheduled_time } = parameters as {
          template_name?: string;
          template_id?: string;
          client_name: string;
          client_phone?: string;
          quantity_overrides?: Record<string, number>;
          notes?: string;
          due_days?: number;
          job_id?: string;
          job_title?: string;
          create_job?: boolean;
          scheduled_date?: string;
          scheduled_time?: string;
        };

        if (!client_name) {
          response = {
            success: false,
            message: "I need the client name to create an invoice."
          };
          break;
        }

        // Find the template - try direct match first, then fuzzy word match
        let template: any = null;

        if (template_id) {
          const { data, error: tErr } = await supabase
            .from("templates")
            .select("id, name, description, category, labour_rate_default, estimated_duration")
            .eq("team_id", company_id)
            .eq("is_active", true)
            .eq("id", template_id)
            .maybeSingle();
          if (tErr) throw tErr;
          template = data;
        } else if (template_name) {
          // Try direct substring match first
          const { data: directMatch } = await supabase
            .from("templates")
            .select("id, name, description, category, labour_rate_default, estimated_duration")
            .eq("team_id", company_id)
            .eq("is_active", true)
            .ilike("name", `%${template_name}%`)
            .limit(1)
            .maybeSingle();

          if (directMatch) {
            template = directMatch;
          } else {
            // Fuzzy word-based matching
            const searchWords = template_name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);
            const { data: allTemplates } = await supabase
              .from("templates")
              .select("id, name, description, category, labour_rate_default, estimated_duration")
              .eq("team_id", company_id)
              .eq("is_active", true);

            if (allTemplates) {
              const scored = allTemplates
                .map((t: any) => {
                  const nameLower = t.name.toLowerCase();
                  const matchCount = searchWords.filter((w: string) => nameLower.includes(w)).length;
                  return { ...t, matchCount };
                })
                .filter((t: any) => t.matchCount > 0)
                .sort((a: any, b: any) => b.matchCount - a.matchCount);
              if (scored.length > 0) template = scored[0];
            }
          }
        } else {
          response = {
            success: false,
            message: "I need either a template name or ID to create the invoice."
          };
          break;
        }

        if (!template) {
          response = {
            success: false,
            message: `I couldn't find a template matching "${template_name || template_id}". Try asking "what templates do I have?" to see your options.`
          };
          break;
        }

        // Get template items
        const { data: templateItems, error: itemsError } = await supabase
          .from("template_items")
          .select("description, quantity, unit_price, unit, is_material, item_type")
          .eq("template_id", template.id)
          .order("sort_order");

        if (itemsError) throw itemsError;

        if (!templateItems || templateItems.length === 0) {
          response = {
            success: false,
            message: `The template "${template.name}" doesn't have any line items. Please add items to the template first.`
          };
          break;
        }

        // Find or create client
        let { data: existingClient } = await supabase
          .from("customers")
          .select("id, name")
          .eq("team_id", company_id)
          .ilike("name", client_name)
          .limit(1)
          .single();

        let customerId: string;
        let clientCreated = false;

        if (existingClient) {
          customerId = existingClient.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from("customers")
            .insert({
              team_id: company_id,
              name: client_name,
              phone: client_phone || null
            })
            .select("id")
            .single();

          if (clientError) throw clientError;
          customerId = newClient.id;
          clientCreated = true;
        }

        // Generate invoice number
        const { data: lastInvoice } = await supabase
          .from("invoices")
          .select("display_number")
          .eq("team_id", company_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let invoiceNumber = "INV-0001";
        if (lastInvoice?.display_number) {
          const num = parseInt(lastInvoice.display_number.replace("INV-", "")) + 1;
          invoiceNumber = `INV-${num.toString().padStart(4, "0")}`;
        }

        // Build invoice items with optional quantity overrides
        const invoiceItems = templateItems.map((item: any) => {
          const qty = quantity_overrides?.[item.description] || item.quantity;
          return {
            description: item.description,
            quantity: qty,
            unit_price: item.unit_price,
          };
        });

        // Calculate totals - use default VAT rate from user's country
        const subtotal = invoiceItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
        const taxRate = defaultVatRate;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        // Due date (default 14 days)
        const daysUntilDue = due_days || 14;
        const dueDate = new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const issueDate = new Date().toISOString().split("T")[0];

        // Handle job linking or creation
        let linkedJobId: string | null = null;
        let linkedJobTitle: string | null = null;
        let jobCreated = false;

        if (job_id) {
          // Link to existing job by ID
          const { data: job } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("id", job_id)
            .eq("team_id", company_id)
            .single();
          if (job) {
            linkedJobId = job.id;
            linkedJobTitle = job.title;
          }
        } else if (job_title) {
          // Find existing job by title
          const { data: jobs } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("team_id", company_id)
            .ilike("title", `%${job_title}%`)
            .limit(1);
          if (jobs && jobs.length > 0) {
            linkedJobId = jobs[0].id;
            linkedJobTitle = jobs[0].title;
          }
        }
        
        // Optionally create a new job if requested and no existing job found
        if (create_job && !linkedJobId) {
          const jobTitleToUse = job_title || `${template.name} - ${client_name}`;
          const { data: newJob, error: jobError } = await supabase
            .from("jobs")
            .insert({
              team_id: company_id,
              customer_id: customerId,
              title: jobTitleToUse,
              description: `Job created from template: ${template.name}`,
              scheduled_date: scheduled_date || null,
              scheduled_time: scheduled_time || null,
              estimated_value: total,
              status: "pending"
            })
            .select("id, title")
            .single();
          
          if (!jobError && newJob) {
            linkedJobId = newJob.id;
            linkedJobTitle = newJob.title;
            jobCreated = true;
          }
        }

        // Create invoice (note: invoices link via quote_id, but we can track job separately)
        const { data: newInvoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            team_id: company_id,
            customer_id: customerId,
            display_number: invoiceNumber,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            notes: notes || `Created from template: ${template.name}`,
            issue_date: issueDate,
            due_date: dueDate,
            status: "draft"
          })
          .select("id, display_number, total")
          .single();

        if (invoiceError) throw invoiceError;

        // Create invoice items
        const invoiceItemsToInsert = invoiceItems.map((item: any) => ({
          invoice_id: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));

        const { error: insertItemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItemsToInsert);

        if (insertItemsError) throw insertItemsError;

        const clientNote = clientCreated ? ` I also created a new client record for ${client_name}.` : "";
        const jobNote = linkedJobTitle ? (jobCreated ? ` I also created job "${linkedJobTitle}" and linked it.` : ` It's linked to job "${linkedJobTitle}".`) : "";
        
        response = {
          success: true,
          message: `Done! I've created invoice ${invoiceNumber} for ${client_name} using the "${template.name}" template. The total is ${currencySymbol}${total.toFixed(2)}, due on ${dueDate}. It's saved as a draft for you to review.${clientNote}${jobNote}`,
          data: { invoice: newInvoice, template: template.name, items: invoiceItems, job_id: linkedJobId }
        };
        break;
      }

      case "create_invoice_from_quote": {
        const { quote_id, quote_number, due_days } = parameters as {
          quote_id?: string;
          quote_number?: string;
          due_days?: number;
        };

        if (!quote_id && !quote_number) {
          response = {
            success: false,
            message: "I need either a quote ID or quote number to create an invoice from it."
          };
          break;
        }

        // Find the quote
        let quoteQuery = supabase
          .from("quotes")
          .select("id, display_number, customer_id, subtotal, tax_rate, tax_amount, total, notes, job_id, status, customers(name)")
          .eq("team_id", company_id);

        if (quote_id) {
          quoteQuery = quoteQuery.eq("id", quote_id);
        } else if (quote_number) {
          quoteQuery = quoteQuery.ilike("display_number", `%${quote_number}%`);
        }

        const { data: quotes, error: quoteError } = await quoteQuery.limit(1);

        if (quoteError) throw quoteError;

        if (!quotes || quotes.length === 0) {
          response = {
            success: false,
            message: `I couldn't find a quote matching "${quote_number || quote_id}".`
          };
          break;
        }

        const quote = quotes[0] as any;

        // Check if quote is in a valid status for conversion
        if (quote.status === "declined" || quote.status === "expired") {
          response = {
            success: false,
            message: `Quote ${quote.display_number} is ${quote.status} and can't be converted to an invoice. Only draft, sent, or accepted quotes can be converted.`
          };
          break;
        }

        // Get quote items
        const { data: quoteItems, error: itemsError } = await supabase
          .from("quote_items")
          .select("description, quantity, unit_price, total_price")
          .eq("quote_id", quote.id);

        if (itemsError) throw itemsError;

        if (!quoteItems || quoteItems.length === 0) {
          response = {
            success: false,
            message: `Quote ${quote.display_number} has no line items. Please add items to the quote first.`
          };
          break;
        }

        // Generate invoice number
        const { data: lastInvoice } = await supabase
          .from("invoices")
          .select("display_number")
          .eq("team_id", company_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let invoiceNumber = "INV-0001";
        if (lastInvoice?.display_number) {
          const num = parseInt(lastInvoice.display_number.replace("INV-", "")) + 1;
          invoiceNumber = `INV-${num.toString().padStart(4, "0")}`;
        }

        // Due date (default 14 days)
        const daysUntilDue = due_days || 14;
        const dueDate = new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const issueDate = new Date().toISOString().split("T")[0];

        // Create invoice from quote data
        const { data: newInvoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            team_id: company_id,
            customer_id: quote.customer_id,
            quote_id: quote.id,
            display_number: invoiceNumber,
            subtotal: quote.subtotal,
            tax_rate: quote.tax_rate,
            tax_amount: quote.tax_amount,
            total: quote.total,
            notes: quote.notes || `Created from quote ${quote.display_number}`,
            issue_date: issueDate,
            due_date: dueDate,
            status: "draft"
          })
          .select("id, display_number, total")
          .single();

        if (invoiceError) throw invoiceError;

        // Create invoice items from quote items
        const invoiceItemsToInsert = quoteItems.map((item: any) => ({
          invoice_id: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));

        const { error: insertItemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItemsToInsert);

        if (insertItemsError) throw insertItemsError;

        // Update quote status to accepted if it was draft or sent
        if (quote.status === "draft" || quote.status === "sent") {
          await supabase
            .from("quotes")
            .update({ status: "accepted" })
            .eq("id", quote.id);
        }

        const customerName = quote.customers?.name || "the customer";
        
        response = {
          success: true,
          message: `Done! I've created invoice ${invoiceNumber} from quote ${quote.display_number} for ${customerName}. The total is ${currencySymbol}${parseFloat(quote.total).toFixed(2)}, due on ${dueDate}. It's saved as a draft for you to review.`,
          data: { invoice: newInvoice, from_quote: quote.display_number, items_count: quoteItems.length }
        };
        break;
      }

      case "update_job_status": {
        const { job_id, job_title, client_name, new_status } = parameters as {
          job_id?: string;
          job_title?: string;
          client_name?: string;
          new_status: string;
        };

        const validStatuses = ["pending", "scheduled", "in_progress", "completed", "cancelled"];
        const normalizedStatus = new_status.toLowerCase().replace(/\s+/g, "_");

        if (!validStatuses.includes(normalizedStatus)) {
          response = {
            success: false,
            message: `Invalid status "${new_status}". Valid options are: pending, scheduled, in progress, completed, or cancelled.`
          };
          break;
        }

        let jobQuery = supabase
          .from("jobs")
          .select("id, title, status, customers(name)")
          .eq("team_id", company_id);

        if (job_id) {
          jobQuery = jobQuery.eq("id", job_id);
        } else if (job_title) {
          jobQuery = jobQuery.ilike("title", `%${job_title}%`);
        } else if (client_name) {
          const { data: customers } = await supabase
            .from("customers")
            .select("id")
            .eq("team_id", company_id)
            .ilike("name", `%${client_name}%`)
            .limit(1);

          if (!customers || customers.length === 0) {
            response = {
              success: false,
              message: `I couldn't find a client matching "${client_name}".`
            };
            break;
          }
          jobQuery = jobQuery.eq("customer_id", customers[0].id);
        } else {
          response = {
            success: false,
            message: "I need either a job ID, job title, or client name to find the job."
          };
          break;
        }

        const { data: jobs, error: findError } = await jobQuery.limit(1);

        if (findError) throw findError;

        if (!jobs || jobs.length === 0) {
          response = {
            success: false,
            message: "I couldn't find that job in your records."
          };
          break;
        }

        const job = jobs[0] as any;
        const oldStatus = job.status;

        const { error: updateError } = await supabase
          .from("jobs")
          .update({ status: normalizedStatus })
          .eq("id", job.id);

        if (updateError) throw updateError;

        const clientName = job.customers?.name || "the client";
        const statusDisplay = normalizedStatus.replace(/_/g, " ");

        response = {
          success: true,
          message: `Done! I've updated "${job.title}" for ${clientName} from ${oldStatus.replace(/_/g, " ")} to ${statusDisplay}.`,
          data: { job_id: job.id, old_status: oldStatus, new_status: normalizedStatus }
        };
        break;
      }

      case "get_jobs_for_date": {
        const { date } = parameters as { date: string };

        if (!date) {
          response = {
            success: false,
            message: "I need a date to look up jobs."
          };
          break;
        }

        const { data: jobs, error } = await supabase
          .from("jobs")
          .select("id, title, description, scheduled_date, scheduled_time, status, customers(name, address, phone)")
          .eq("team_id", company_id)
          .eq("scheduled_date", date)
          .order("scheduled_time", { ascending: true });

        if (error) throw error;

        if (!jobs || jobs.length === 0) {
          response = {
            success: true,
            message: `You have no jobs scheduled for ${date}.`,
            data: []
          };
        } else {
          const jobList = jobs.map((job: any) => {
            const time = job.scheduled_time ? job.scheduled_time.slice(0, 5) : "no time set";
            const clientName = job.customers?.name || "Unknown client";
            return `${job.title} for ${clientName} at ${time}`;
          }).join(". ");
          
          response = {
            success: true,
            message: `You have ${jobs.length} job${jobs.length > 1 ? "s" : ""} on ${date}. ${jobList}.`,
            data: jobs
          };
        }
        break;
      }

      case "check_availability": {
        const { date, preferred_time } = parameters as { date: string; preferred_time?: string };

        if (!date) {
          response = {
            success: false,
            message: "I need a date to check availability."
          };
          break;
        }

        // Working hours: 7 AM to 8 PM (same as calendar view)
        const WORK_HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

        // Fetch all jobs for that date
        const { data: jobs, error } = await supabase
          .from("jobs")
          .select("id, title, scheduled_time, customers(name)")
          .eq("team_id", company_id)
          .eq("scheduled_date", date)
          .in("status", ["pending", "scheduled", "in_progress"])
          .order("scheduled_time", { ascending: true });

        if (error) throw error;

        // Build a map of busy hours
        const busyHours: Record<number, { title: string; customer: string }[]> = {};
        (jobs || []).forEach((job: any) => {
          if (job.scheduled_time) {
            const hour = parseInt(job.scheduled_time.split(":")[0]);
            if (!busyHours[hour]) busyHours[hour] = [];
            busyHours[hour].push({
              title: job.title,
              customer: job.customers?.name || "Unknown"
            });
          }
        });

        // Find free slots (hours with no jobs)
        const freeSlots = WORK_HOURS.filter(hour => !busyHours[hour]);
        const busySlots = WORK_HOURS.filter(hour => busyHours[hour]);

        // Format time for display
        const formatHour = (h: number) => {
          const ampm = h >= 12 ? "PM" : "AM";
          const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
          return `${hour12}:00 ${ampm}`;
        };

        // Check preferred time if specified
        let preferredSlotInfo = "";
        if (preferred_time) {
          const prefHour = parseInt(preferred_time.split(":")[0]);
          if (busyHours[prefHour]) {
            const conflicts = busyHours[prefHour].map(j => `"${j.title}" for ${j.customer}`).join(", ");
            preferredSlotInfo = ` Your preferred time (${formatHour(prefHour)}) is busy with: ${conflicts}.`;
          } else if (prefHour >= 7 && prefHour <= 20) {
            preferredSlotInfo = ` Great news - ${formatHour(prefHour)} is available!`;
          }
        }

        // Build response message
        let message = "";
        const dayOfWeek = new Date(date + "T00:00:00").toLocaleDateString('en-US', { weekday: 'long' });

        if (jobs?.length === 0) {
          message = `Your calendar is completely free on ${dayOfWeek} (${date}). All time slots from 7 AM to 8 PM are available.${preferredSlotInfo}`;
        } else if (freeSlots.length === 0) {
          const busyList = Object.entries(busyHours)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([hour, jobs]) => `${formatHour(parseInt(hour))}: ${jobs.map(j => j.title).join(", ")}`)
            .join("; ");
          message = `You're fully booked on ${dayOfWeek} (${date}). Schedule: ${busyList}.${preferredSlotInfo}`;
        } else {
          // Group consecutive free slots for cleaner display
          const freeRanges: string[] = [];
          let rangeStart = freeSlots[0];
          let rangeEnd = freeSlots[0];
          
          for (let i = 1; i <= freeSlots.length; i++) {
            if (i < freeSlots.length && freeSlots[i] === rangeEnd + 1) {
              rangeEnd = freeSlots[i];
            } else {
              if (rangeStart === rangeEnd) {
                freeRanges.push(formatHour(rangeStart));
              } else {
                freeRanges.push(`${formatHour(rangeStart)} - ${formatHour(rangeEnd + 1)}`);
              }
              if (i < freeSlots.length) {
                rangeStart = freeSlots[i];
                rangeEnd = freeSlots[i];
              }
            }
          }

          const busyCount = jobs?.length || 0;
          message = `On ${dayOfWeek} (${date}), you have ${busyCount} job${busyCount > 1 ? "s" : ""} scheduled. `;
          message += `Free slots: ${freeRanges.join(", ")}.${preferredSlotInfo}`;

          // Add busy details
          if (busyCount <= 3) {
            const busyDetails = (jobs || []).map((j: any) => {
              const time = j.scheduled_time ? formatHour(parseInt(j.scheduled_time.split(":")[0])) : "no time";
              return `${j.title} at ${time}`;
            }).join(", ");
            message += ` Currently booked: ${busyDetails}.`;
          }
        }

        response = {
          success: true,
          message,
          data: {
            date,
            total_jobs: jobs?.length || 0,
            free_slots: freeSlots.map(h => ({ hour: h, time: formatHour(h) })),
            busy_slots: Object.entries(busyHours).map(([hour, jobs]) => ({
              hour: parseInt(hour),
              time: formatHour(parseInt(hour)),
              jobs
            }))
          }
        };
        break;
      }

      case "get_week_schedule": {
        const { start_date } = parameters as { start_date?: string };

        // Default to current week starting Monday
        let weekStart: Date;
        if (start_date) {
          weekStart = new Date(start_date);
        } else {
          weekStart = new Date();
          const day = weekStart.getDay();
          const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
          weekStart = new Date(weekStart.setDate(diff));
        }
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startStr = weekStart.toISOString().split("T")[0];
        const endStr = weekEnd.toISOString().split("T")[0];

        const { data: jobs, error } = await supabase
          .from("jobs")
          .select("id, title, scheduled_date, scheduled_time, status, customers(name)")
          .eq("team_id", company_id)
          .gte("scheduled_date", startStr)
          .lte("scheduled_date", endStr)
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true });

        if (error) throw error;

        if (!jobs || jobs.length === 0) {
          response = {
            success: true,
            message: `You have no jobs scheduled for the week of ${startStr} to ${endStr}.`,
            data: []
          };
        } else {
          // Group by date
          const byDate: Record<string, any[]> = {};
          const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          
          jobs.forEach((job: any) => {
            const date = job.scheduled_date;
            if (!byDate[date]) byDate[date] = [];
            byDate[date].push(job);
          });

          const summary = Object.entries(byDate).map(([date, dateJobs]) => {
            const d = new Date(date);
            const dayName = dayNames[d.getDay()];
            const jobCount = dateJobs.length;
            const jobList = dateJobs.slice(0, 2).map((j: any) => {
              const time = j.scheduled_time ? j.scheduled_time.slice(0, 5) : "";
              const client = j.customers?.name || "Unknown";
              return time ? `${j.title} at ${time}` : j.title;
            }).join(", ");
            const more = dateJobs.length > 2 ? ` +${dateJobs.length - 2} more` : "";
            return `${dayName}: ${jobCount} job${jobCount > 1 ? "s" : ""} (${jobList}${more})`;
          }).join(". ");

          response = {
            success: true,
            message: `Week of ${startStr}: You have ${jobs.length} job${jobs.length > 1 ? "s" : ""} scheduled. ${summary}.`,
            data: { jobs, by_date: byDate }
          };
        }
        break;
      }

      case "get_today_summary": {
        // Get today's date
        const today = new Date().toISOString().split("T")[0];
        const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
        
        // Fetch today's jobs
        const { data: todayJobs, error: todayJobsError } = await supabase
          .from("jobs")
          .select("id, title, scheduled_time, status, estimated_value, customers(name)")
          .eq("team_id", company_id)
          .eq("scheduled_date", today)
          .order("scheduled_time", { ascending: true });

        if (todayJobsError) throw todayJobsError;

        // Fetch overdue invoices
        const { data: overdueInvoices, error: overdueError } = await supabase
          .from("invoices")
          .select("id, display_number, total, due_date, customer:customers(name)")
          .eq("team_id", company_id)
          .in("status", ["pending", "overdue"])
          .lt("due_date", today);

        if (overdueError) throw overdueError;

        // Fetch payments received today
        const { data: todayPayments, error: paymentsError } = await supabase
          .from("payments")
          .select("id, amount, invoice:invoices(display_number, customer:customers(name))")
          .eq("team_id", company_id)
          .eq("payment_date", today);

        if (paymentsError) throw paymentsError;

        // Fetch pending quotes (awaiting response)
        const { data: pendingQuotes, error: quotesError } = await supabase
          .from("quotes")
          .select("id, display_number, total, customer:customers(name)")
          .eq("team_id", company_id)
          .eq("status", "sent")
          .order("created_at", { ascending: false })
          .limit(5);

        if (quotesError) throw quotesError;

        // Build the summary message
        const parts: string[] = [];
        parts.push(`Good morning! Here's your ${dayName} briefing.`);

        // Jobs summary
        if (todayJobs && todayJobs.length > 0) {
          const jobsEstimate = todayJobs.reduce((sum: number, j: any) => sum + (parseFloat(j.estimated_value) || 0), 0);
          const jobList = todayJobs.map((job: any) => {
            const time = job.scheduled_time ? job.scheduled_time.slice(0, 5) : "TBD";
            const client = job.customers?.name || "Unknown client";
            return `${time}: ${job.title} for ${client}`;
          }).join("; ");
          parts.push(`📋 Jobs today: ${todayJobs.length} job${todayJobs.length > 1 ? "s" : ""} worth ${currencySymbol}${jobsEstimate.toFixed(0)}. ${jobList}.`);
        } else {
          parts.push("📋 No jobs scheduled for today.");
        }

        // Payments summary
        if (todayPayments && todayPayments.length > 0) {
          const paymentTotal = todayPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
          parts.push(`💰 Payments today: ${currencySymbol}${paymentTotal.toFixed(0)} received from ${todayPayments.length} payment${todayPayments.length > 1 ? "s" : ""}.`);
        }

        // Overdue invoices
        if (overdueInvoices && overdueInvoices.length > 0) {
          const overdueTotal = overdueInvoices.reduce((sum: number, i: any) => sum + (parseFloat(i.total) || 0), 0);
          const oldestOverdue = overdueInvoices.sort((a: any, b: any) => 
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          )[0];
          const daysOverdue = Math.floor((new Date().getTime() - new Date(oldestOverdue.due_date).getTime()) / (1000 * 60 * 60 * 24));
          const customerName = (oldestOverdue.customer as any)?.name || "Unknown";
          parts.push(`⚠️ Overdue: ${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? "s" : ""} totaling ${currencySymbol}${overdueTotal.toFixed(0)}. Oldest is ${daysOverdue} days overdue from ${customerName}.`);
        } else {
          parts.push("✅ No overdue invoices!");
        }

        // Pending quotes
        if (pendingQuotes && pendingQuotes.length > 0) {
          const quoteTotal = pendingQuotes.reduce((sum: number, q: any) => sum + (parseFloat(q.total) || 0), 0);
          parts.push(`📝 Awaiting response: ${pendingQuotes.length} quote${pendingQuotes.length > 1 ? "s" : ""} worth ${currencySymbol}${quoteTotal.toFixed(0)}.`);
        }

        response = {
          success: true,
          message: parts.join(" "),
          data: {
            date: today,
            day: dayName,
            jobs: todayJobs || [],
            payments: todayPayments || [],
            overdue_invoices: overdueInvoices || [],
            pending_quotes: pendingQuotes || []
          }
        };
        break;
      }

      case "get_week_ahead_summary": {
        // Calculate week range (today + next 7 days)
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekEndStr = weekEnd.toISOString().split("T")[0];

        // Fetch jobs for the week
        const { data: weekJobs, error: weekJobsError } = await supabase
          .from("jobs")
          .select("id, title, scheduled_date, scheduled_time, status, estimated_value, customer:customers(name)")
          .eq("team_id", company_id)
          .gte("scheduled_date", todayStr)
          .lte("scheduled_date", weekEndStr)
          .in("status", ["pending", "scheduled", "in_progress"])
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true });

        if (weekJobsError) throw weekJobsError;

        // Fetch invoices due this week
        const { data: dueInvoices, error: dueInvoicesError } = await supabase
          .from("invoices")
          .select("id, display_number, total, due_date, status, customer:customers(name)")
          .eq("team_id", company_id)
          .in("status", ["pending"])
          .gte("due_date", todayStr)
          .lte("due_date", weekEndStr);

        if (dueInvoicesError) throw dueInvoicesError;

        // Fetch quotes expiring this week
        const { data: expiringQuotes, error: expiringQuotesError } = await supabase
          .from("quotes")
          .select("id, display_number, total, valid_until, customer:customers(name)")
          .eq("team_id", company_id)
          .eq("status", "sent")
          .gte("valid_until", todayStr)
          .lte("valid_until", weekEndStr);

        if (expiringQuotesError) throw expiringQuotesError;

        // Fetch overdue invoices (always relevant for planning)
        const { data: overdueInvoices, error: overdueError } = await supabase
          .from("invoices")
          .select("id, display_number, total")
          .eq("team_id", company_id)
          .in("status", ["pending", "overdue"])
          .lt("due_date", todayStr);

        if (overdueError) throw overdueError;

        // Group jobs by day
        const jobsByDay: Record<string, Array<{ title: string; time: string | null; customer: string; value: number }>> = {};
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        (weekJobs || []).forEach((job: any) => {
          const jobDate = new Date(job.scheduled_date);
          const dayName = dayNames[jobDate.getDay()];
          const dateKey = `${dayName} (${job.scheduled_date})`;
          
          if (!jobsByDay[dateKey]) {
            jobsByDay[dateKey] = [];
          }
          jobsByDay[dateKey].push({
            title: job.title,
            time: job.scheduled_time?.slice(0, 5) || null,
            customer: (job.customer as any)?.name || "Unknown",
            value: parseFloat(job.estimated_value) || 0
          });
        });

        // Calculate totals
        const totalJobs = weekJobs?.length || 0;
        const expectedIncome = weekJobs?.reduce((sum: number, j: any) => sum + (parseFloat(j.estimated_value) || 0), 0) || 0;
        const invoicesDueTotal = dueInvoices?.reduce((sum: number, i: any) => sum + (parseFloat(i.total) || 0), 0) || 0;
        const overdueTotal = overdueInvoices?.reduce((sum: number, i: any) => sum + (parseFloat(i.total) || 0), 0) || 0;
        const expiringQuotesTotal = expiringQuotes?.reduce((sum: number, q: any) => sum + (parseFloat(q.total) || 0), 0) || 0;

        // Build the summary message
        const parts: string[] = [];
        parts.push(`📅 Week Ahead Planning Summary:`);

        // Jobs overview
        if (totalJobs > 0) {
          parts.push(`You have ${totalJobs} job${totalJobs > 1 ? "s" : ""} scheduled this week worth an estimated ${currencySymbol}${expectedIncome.toFixed(0)}.`);
          
          // Daily breakdown
          const dailySummary = Object.entries(jobsByDay)
            .map(([day, jobs]) => {
              const dayTotal = jobs.reduce((sum, j) => sum + j.value, 0);
              return `${day}: ${jobs.length} job${jobs.length > 1 ? "s" : ""} (${currencySymbol}${dayTotal.toFixed(0)})`;
            })
            .join("; ");
          parts.push(`Daily breakdown: ${dailySummary}.`);
        } else {
          parts.push("No jobs scheduled for this week yet.");
        }

        // Invoices due
        if (dueInvoices && dueInvoices.length > 0) {
          parts.push(`💳 ${dueInvoices.length} invoice${dueInvoices.length > 1 ? "s" : ""} due this week totaling ${currencySymbol}${invoicesDueTotal.toFixed(0)}.`);
        }

        // Overdue reminder
        if (overdueInvoices && overdueInvoices.length > 0) {
          parts.push(`⚠️ Reminder: ${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""} (${currencySymbol}${overdueTotal.toFixed(0)}) still outstanding.`);
        }

        // Expiring quotes
        if (expiringQuotes && expiringQuotes.length > 0) {
          const quoteList = expiringQuotes.map((q: any) => `${q.display_number} for ${(q.customer as any)?.name || "Unknown"}`).join(", ");
          parts.push(`📝 ${expiringQuotes.length} quote${expiringQuotes.length > 1 ? "s" : ""} expiring this week (${currencySymbol}${expiringQuotesTotal.toFixed(0)}): ${quoteList}. Consider following up.`);
        }

        response = {
          success: true,
          message: parts.join(" "),
          data: {
            week_start: todayStr,
            week_end: weekEndStr,
            total_jobs: totalJobs,
            expected_income: expectedIncome,
            jobs_by_day: jobsByDay,
            invoices_due: dueInvoices || [],
            invoices_due_total: invoicesDueTotal,
            overdue_invoices: overdueInvoices || [],
            overdue_total: overdueTotal,
            expiring_quotes: expiringQuotes || [],
            expiring_quotes_total: expiringQuotesTotal
          }
        };
        break;
      }

      case "get_monthly_summary": {
        const { month, year } = parameters as { month?: number; year?: number };

        // Default to current month
        const now = new Date();
        const targetMonth = month !== undefined ? month : now.getMonth() + 1; // 1-indexed
        const targetYear = year !== undefined ? year : now.getFullYear();

        // Calculate month start and end
        const monthStart = new Date(targetYear, targetMonth - 1, 1);
        const monthEnd = new Date(targetYear, targetMonth, 0); // Last day of month

        const startStr = monthStart.toISOString().split("T")[0];
        const endStr = monthEnd.toISOString().split("T")[0];

        const monthNames = ["January", "February", "March", "April", "May", "June", 
                           "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[targetMonth - 1];

        // Get jobs for the month
        const { data: jobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id, title, scheduled_date, status, estimated_value")
          .eq("team_id", company_id)
          .gte("scheduled_date", startStr)
          .lte("scheduled_date", endStr);

        if (jobsError) throw jobsError;

        // Get invoices for the month (by issue date)
        const { data: invoices, error: invoicesError } = await supabase
          .from("invoices")
          .select("id, total, status, issue_date")
          .eq("team_id", company_id)
          .gte("issue_date", startStr)
          .lte("issue_date", endStr);

        if (invoicesError) throw invoicesError;

        // Get paid invoices for revenue
        const { data: paidInvoices, error: paidError } = await supabase
          .from("invoices")
          .select("id, total")
          .eq("team_id", company_id)
          .eq("status", "paid")
          .gte("issue_date", startStr)
          .lte("issue_date", endStr);

        if (paidError) throw paidError;

        // Group jobs by week
        const weeklyData: Record<number, { jobs: number; estimatedValue: number }> = {};
        
        (jobs || []).forEach((job: any) => {
          const jobDate = new Date(job.scheduled_date);
          const weekOfMonth = Math.ceil((jobDate.getDate()) / 7);
          if (!weeklyData[weekOfMonth]) {
            weeklyData[weekOfMonth] = { jobs: 0, estimatedValue: 0 };
          }
          weeklyData[weekOfMonth].jobs++;
          weeklyData[weekOfMonth].estimatedValue += parseFloat(job.estimated_value) || 0;
        });

        // Calculate totals
        const totalJobs = jobs?.length || 0;
        const completedJobs = jobs?.filter((j: any) => j.status === "completed").length || 0;
        const totalEstimatedValue = jobs?.reduce((sum: number, j: any) => sum + (parseFloat(j.estimated_value) || 0), 0) || 0;
        const totalInvoiced = invoices?.reduce((sum: number, i: any) => sum + (parseFloat(i.total) || 0), 0) || 0;
        const totalPaid = paidInvoices?.reduce((sum: number, i: any) => sum + (parseFloat(i.total) || 0), 0) || 0;

        // Build weekly breakdown
        const weekSummary = Object.entries(weeklyData)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([week, data]) => `Week ${week}: ${data.jobs} jobs (${currencySymbol}${data.estimatedValue.toFixed(0)} estimated)`)
          .join(". ");

        const summary = `${monthName} ${targetYear} Summary: ${totalJobs} total jobs (${completedJobs} completed). ` +
          `Estimated job value: ${currencySymbol}${totalEstimatedValue.toFixed(2)}. ` +
          `Invoiced: ${currencySymbol}${totalInvoiced.toFixed(2)}. ` +
          `Paid: ${currencySymbol}${totalPaid.toFixed(2)}. ` +
          (weekSummary ? `Weekly breakdown: ${weekSummary}.` : "");

        response = {
          success: true,
          message: summary,
          data: {
            month: monthName,
            year: targetYear,
            total_jobs: totalJobs,
            completed_jobs: completedJobs,
            estimated_value: totalEstimatedValue,
            invoiced: totalInvoiced,
            paid: totalPaid,
            weekly_breakdown: weeklyData
          }
        };
        break;
      }

      case "get_outstanding_balance": {
        const { customer_name } = parameters as { customer_name?: string };

        // Get all unpaid invoices (sent or overdue status)
        let query = supabase
          .from("invoices")
          .select("id, display_number, total, status, due_date, customer_id, customers(name)")
          .eq("team_id", company_id)
          .in("status", ["pending", "overdue"]);

        const { data: invoices, error } = await query;

        if (error) throw error;

        if (!invoices || invoices.length === 0) {
          response = {
            success: true,
            message: "Great news! You have no outstanding invoices.",
            data: { total: 0, customers: [] }
          };
          break;
        }

        // Group by customer
        const byCustomer: Record<string, { name: string; total: number; invoices: any[]; oldest_due: string }> = {};

        invoices.forEach((inv: any) => {
          const custId = inv.customer_id;
          const custName = inv.customers?.name || "Unknown";
          
          if (!byCustomer[custId]) {
            byCustomer[custId] = { name: custName, total: 0, invoices: [], oldest_due: inv.due_date };
          }
          
          byCustomer[custId].total += parseFloat(inv.total) || 0;
          byCustomer[custId].invoices.push({
            invoice_number: inv.display_number,
            total: inv.total,
            status: inv.status,
            due_date: inv.due_date
          });
          
          if (inv.due_date < byCustomer[custId].oldest_due) {
            byCustomer[custId].oldest_due = inv.due_date;
          }
        });

        // Filter by customer name if provided
        let customers = Object.entries(byCustomer).map(([id, data]) => ({
          customer_id: id,
          ...data
        }));

        if (customer_name) {
          customers = customers.filter(c => 
            c.name.toLowerCase().includes(customer_name.toLowerCase())
          );
        }

        // Sort by total outstanding (highest first)
        customers.sort((a, b) => b.total - a.total);

        const grandTotal = customers.reduce((sum, c) => sum + c.total, 0);

        if (customers.length === 0) {
          response = {
            success: true,
            message: customer_name 
              ? `${customer_name} has no outstanding invoices.`
              : "You have no outstanding invoices.",
            data: { total: 0, customers: [] }
          };
          break;
        }

        // Build summary
        const customerSummary = customers.slice(0, 5).map(c => {
          const invoiceCount = c.invoices.length;
          const overdueCount = c.invoices.filter((i: any) => i.status === "overdue").length;
          const overdueNote = overdueCount > 0 ? ` (${overdueCount} overdue)` : "";
          return `${c.name}: ${currencySymbol}${c.total.toFixed(2)} (${invoiceCount} invoice${invoiceCount > 1 ? "s" : ""}${overdueNote})`;
        }).join(". ");

        const moreNote = customers.length > 5 ? ` Plus ${customers.length - 5} more customers.` : "";

        response = {
          success: true,
          message: `Total outstanding: ${currencySymbol}${grandTotal.toFixed(2)} across ${customers.length} customer${customers.length > 1 ? "s" : ""}. ${customerSummary}.${moreNote}`,
          data: { 
            grand_total: grandTotal, 
            customer_count: customers.length,
            customers 
          }
        };
        break;
      }

      case "record_payment": {
        const { invoice_id, invoice_number, amount, payment_method, notes } = parameters as {
          invoice_id?: string;
          invoice_number?: string;
          amount: number;
          payment_method?: string;
          notes?: string;
        };

        if (!amount || amount <= 0) {
          response = {
            success: false,
            message: "I need a valid payment amount to record."
          };
          break;
        }

        if (!invoice_id && !invoice_number) {
          response = {
            success: false,
            message: "I need either an invoice ID or invoice number to record the payment against."
          };
          break;
        }

        // Find the invoice
        let invoiceQuery = supabase
          .from("invoices")
          .select("id, display_number, total, status, customers(name)")
          .eq("team_id", company_id);

        if (invoice_id) {
          invoiceQuery = invoiceQuery.eq("id", invoice_id);
        } else if (invoice_number) {
          invoiceQuery = invoiceQuery.ilike("invoice_number", `%${invoice_number}%`);
        }

        const { data: invoices, error: findError } = await invoiceQuery.limit(1);

        if (findError) throw findError;

        if (!invoices || invoices.length === 0) {
          response = {
            success: false,
            message: `I couldn't find an invoice matching "${invoice_number || invoice_id}".`
          };
          break;
        }

        const invoice = invoices[0] as any;

        // Get existing payments for this invoice
        const { data: existingPayments } = await supabase
          .from("payments")
          .select("amount")
          .eq("invoice_id", invoice.id);

        const totalPaid = (existingPayments || []).reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
        const invoiceTotal = parseFloat(invoice.total) || 0;
        const remainingBalance = invoiceTotal - totalPaid;

        if (amount > remainingBalance + 0.01) { // Small tolerance for rounding
          response = {
            success: false,
            message: `The payment of ${currencySymbol}${amount.toFixed(2)} exceeds the remaining balance of ${currencySymbol}${remainingBalance.toFixed(2)} on invoice ${invoice.display_number}.`
          };
          break;
        }

        // Record the payment
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .insert({
            team_id: company_id,
            invoice_id: invoice.id,
            amount: amount,
            payment_method: payment_method || null,
            notes: notes || null,
            payment_date: new Date().toISOString().split("T")[0]
          })
          .select("id, amount, payment_date")
          .single();

        if (paymentError) throw paymentError;

        const newTotalPaid = totalPaid + amount;
        const newRemainingBalance = invoiceTotal - newTotalPaid;

        // Update invoice status if fully paid
        if (newRemainingBalance <= 0.01) {
          await supabase
            .from("invoices")
            .update({ status: "paid" })
            .eq("id", invoice.id);
        }

        const customerName = invoice.customers?.name || "the customer";
        const methodNote = payment_method ? ` via ${payment_method}` : "";
        const balanceNote = newRemainingBalance <= 0.01 
          ? ` Invoice is now fully paid!`
          : ` Remaining balance: ${currencySymbol}${newRemainingBalance.toFixed(2)}.`;

        response = {
          success: true,
          message: `Done! I've recorded a ${currencySymbol}${amount.toFixed(2)} payment${methodNote} on invoice ${invoice.display_number} for ${customerName}.${balanceNote}`,
          data: { 
            payment, 
            invoice_number: invoice.display_number,
            total_paid: newTotalPaid,
            remaining_balance: newRemainingBalance,
            fully_paid: newRemainingBalance <= 0.01
          }
        };
        break;
      }

      case "get_payment_history": {
        const { invoice_id, invoice_number, customer_name, limit: limitParam } = parameters as {
          invoice_id?: string;
          invoice_number?: string;
          customer_name?: string;
          limit?: number;
        };

        let payments: any[] = [];
        let contextInfo = "";

        if (invoice_id || invoice_number) {
          // Get payments for a specific invoice
          let invoiceQuery = supabase
            .from("invoices")
            .select("id, display_number, total, customers(name)")
            .eq("team_id", company_id);

          if (invoice_id) {
            invoiceQuery = invoiceQuery.eq("id", invoice_id);
          } else if (invoice_number) {
            invoiceQuery = invoiceQuery.ilike("invoice_number", `%${invoice_number}%`);
          }

          const { data: invoices, error: invoiceError } = await invoiceQuery.limit(1);
          if (invoiceError) throw invoiceError;

          if (!invoices || invoices.length === 0) {
            response = {
              success: false,
              message: `I couldn't find an invoice matching "${invoice_number || invoice_id}".`
            };
            break;
          }

          const invoice = invoices[0] as any;

          const { data: invoicePayments, error: paymentsError } = await supabase
            .from("payments")
            .select("id, amount, payment_date, payment_method, notes")
            .eq("invoice_id", invoice.id)
            .order("payment_date", { ascending: false });

          if (paymentsError) throw paymentsError;

          payments = invoicePayments || [];
          contextInfo = `invoice ${invoice.display_number} for ${invoice.customers?.name || "Unknown"}`;

        } else if (customer_name) {
          // Get payments for a customer across all invoices
          const { data: customers, error: custError } = await supabase
            .from("customers")
            .select("id, name")
            .eq("team_id", company_id)
            .ilike("name", `%${customer_name}%`)
            .limit(1);

          if (custError) throw custError;

          if (!customers || customers.length === 0) {
            response = {
              success: false,
              message: `I couldn't find a customer matching "${customer_name}".`
            };
            break;
          }

          const customer = customers[0];

          // Get all invoices for this customer
          const { data: customerInvoices } = await supabase
            .from("invoices")
            .select("id, invoice_number")
            .eq("customer_id", customer.id);

          if (customerInvoices && customerInvoices.length > 0) {
            const invoiceIds = customerInvoices.map((i: any) => i.id);

            const { data: customerPayments, error: paymentsError } = await supabase
              .from("payments")
              .select("id, amount, payment_date, payment_method, notes, invoice_id")
              .in("invoice_id", invoiceIds)
              .order("payment_date", { ascending: false })
              .limit(limitParam || 20);

            if (paymentsError) throw paymentsError;

            // Add invoice number to each payment
            const invoiceMap = Object.fromEntries(customerInvoices.map((i: any) => [i.id, i.invoice_number]));
            payments = (customerPayments || []).map((p: any) => ({
              ...p,
              invoice_number: invoiceMap[p.invoice_id]
            }));
          }

          contextInfo = `customer ${customer.name}`;

        } else {
          // Get all recent payments
          const { data: allPayments, error: paymentsError } = await supabase
            .from("payments")
            .select("id, amount, payment_date, payment_method, notes, invoice_id, invoices(invoice_number, customers(name))")
            .eq("team_id", company_id)
            .order("payment_date", { ascending: false })
            .limit(limitParam || 20);

          if (paymentsError) throw paymentsError;

          payments = (allPayments || []).map((p: any) => ({
            ...p,
            invoice_number: p.invoices?.invoice_number,
            customer_name: p.invoices?.customers?.name
          }));

          contextInfo = "all customers";
        }

        if (payments.length === 0) {
          response = {
            success: true,
            message: `No payments found for ${contextInfo}.`,
            data: { payments: [], total: 0 }
          };
          break;
        }

        const totalAmount = payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

        const paymentList = payments.slice(0, 5).map((p: any) => {
          const method = p.payment_method ? ` (${p.payment_method})` : "";
          const invNote = p.invoice_number ? ` on ${p.invoice_number}` : "";
          const custNote = p.customer_name ? ` from ${p.customer_name}` : "";
          return `${currencySymbol}${parseFloat(p.amount).toFixed(2)}${method}${invNote}${custNote} on ${p.payment_date}`;
        }).join(". ");

        const moreNote = payments.length > 5 ? ` Plus ${payments.length - 5} more payments.` : "";

        response = {
          success: true,
          message: `Found ${payments.length} payment${payments.length > 1 ? "s" : ""} for ${contextInfo} totaling ${currencySymbol}${totalAmount.toFixed(2)}. ${paymentList}.${moreNote}`,
          data: { payments, total: totalAmount, count: payments.length }
        };
        break;
      }

      case "suggest_template": {
        const { job_description } = parameters as { job_description: string };

        if (!job_description) {
          response = {
            success: false,
            message: "Please describe the job so I can suggest a template."
          };
          break;
        }

        // Search templates by name and description
        const searchTerms = job_description.toLowerCase().split(/\s+/);
        
        const { data: templates, error } = await supabase
          .from("templates")
          .select("id, name, description, category, labour_rate_default, estimated_duration")
          .eq("team_id", company_id)
          .eq("is_active", true);

        if (error) throw error;

        if (!templates || templates.length === 0) {
          response = {
            success: true,
            message: "You don't have any templates yet. Would you like me to help you create one for this type of job?",
            data: []
          };
          break;
        }

        // Score templates based on keyword matches
        const scored = templates.map((t: any) => {
          const text = `${t.name} ${t.description || ""} ${t.category}`.toLowerCase();
          let score = 0;
          searchTerms.forEach((term: string) => {
            if (text.includes(term)) score += 1;
            if (t.name.toLowerCase().includes(term)) score += 2; // Weight name matches higher
          });
          return { ...t, score };
        }).filter((t: any) => t.score > 0).sort((a: any, b: any) => b.score - a.score);

        if (scored.length === 0) {
          response = {
            success: true,
            message: `I couldn't find a matching template for "${job_description}". Here are some categories you have templates for: ${[...new Set(templates.map((t: any) => t.category))].join(", ")}.`,
            data: []
          };
        } else {
          const best = scored[0];
          const alternatives = scored.slice(1, 3);
          let msg = `For "${job_description}", I'd suggest the "${best.name}" template (${best.category}).`;
          if (alternatives.length > 0) {
            msg += ` Other options: ${alternatives.map((t: any) => t.name).join(", ")}.`;
          }
          msg += ` Would you like me to create a quote or invoice using this template?`;
          
          response = {
            success: true,
            message: msg,
            data: { suggested: best, alternatives }
          };
        }
        break;
      }

      case "get_template_details": {
        const { template_name, template_id } = parameters as {
          template_name?: string;
          template_id?: string;
        };

        if (!template_name && !template_id) {
          response = {
            success: false,
            message: "I need either a template name or ID to look up the details."
          };
          break;
        }

        let templateQuery = supabase
          .from("templates")
          .select("id, name, description, category, labour_rate_default, estimated_duration, is_system_template")
          .eq("team_id", company_id)
          .eq("is_active", true);

        if (template_id) {
          templateQuery = templateQuery.eq("id", template_id);
        } else if (template_name) {
          templateQuery = templateQuery.ilike("name", `%${template_name}%`);
        }

        const { data: templates, error: templateError } = await templateQuery.limit(1);

        if (templateError) throw templateError;

        if (!templates || templates.length === 0) {
          response = {
            success: false,
            message: `I couldn't find a template matching "${template_name || template_id}". Try asking "what templates do I have?" to see your options.`
          };
          break;
        }

        const template = templates[0];

        // Get template items with full details
        const { data: templateItems, error: itemsError } = await supabase
          .from("template_items")
          .select("id, description, quantity, unit_price, unit, is_material, item_type, sort_order")
          .eq("template_id", template.id)
          .order("sort_order");

        if (itemsError) throw itemsError;

        // Calculate estimated total
        const subtotal = (templateItems || []).reduce((sum: number, item: any) => 
          sum + (item.quantity * item.unit_price), 0
        );
        const taxAmount = subtotal * (defaultVatRate / 100);
        const estimatedTotal = subtotal + taxAmount;

        // Format item list
        const itemList = (templateItems || []).map((item: any) => {
          const type = item.is_material ? "Material" : "Labor";
          return `${item.description} (${type}): ${item.quantity} × ${currencySymbol}${item.unit_price.toFixed(2)}`;
        }).join("; ");

        const durationNote = template.estimated_duration 
          ? ` Estimated duration: ${template.estimated_duration} hour${template.estimated_duration !== 1 ? "s" : ""}.` 
          : "";

        response = {
          success: true,
          message: `Template "${template.name}" (${template.category}): ${template.description || "No description"}. Contains ${templateItems?.length || 0} items: ${itemList || "no items yet"}.${durationNote} Estimated total: ${currencySymbol}${estimatedTotal.toFixed(2)} (including ${defaultVatRate}% VAT).`,
          data: { template, items: templateItems, estimatedTotal, subtotal, taxAmount }
        };
        break;
      }

      case "search_templates": {
        const { query: searchQuery, category } = parameters as {
          query: string;
          category?: string;
        };

        if (!searchQuery) {
          response = {
            success: false,
            message: "What would you like to search for? Give me a keyword or job type."
          };
          break;
        }

        let templatesQuery = supabase
          .from("templates")
          .select("id, name, description, category, labour_rate_default, estimated_duration")
          .eq("team_id", company_id)
          .eq("is_active", true)
          .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

        if (category) {
          templatesQuery = templatesQuery.eq("category", category.toLowerCase());
        }

        const { data: templates, error } = await templatesQuery.limit(10);

        if (error) throw error;

        if (!templates || templates.length === 0) {
          const categoryNote = category ? ` in ${category}` : "";
          response = {
            success: true,
            message: `I couldn't find any templates matching "${searchQuery}"${categoryNote}. Would you like me to list all your templates or suggest creating a new one?`,
            data: []
          };
        } else {
          const templateList = templates.map((t: any) => 
            `"${t.name}" (${t.category})${t.description ? `: ${t.description.slice(0, 50)}...` : ""}`
          ).join("; ");

          response = {
            success: true,
            message: `Found ${templates.length} template${templates.length > 1 ? "s" : ""} matching "${searchQuery}": ${templateList}. Would you like details on any of these or use one for a quote/invoice?`,
            data: templates
          };
        }
        break;
      }

      case "list_template_categories": {
        const { data: templates, error } = await supabase
          .from("templates")
          .select("category")
          .eq("team_id", company_id)
          .eq("is_active", true);

        if (error) throw error;

        if (!templates || templates.length === 0) {
          response = {
            success: true,
            message: "You don't have any templates yet. I can help you create templates for common jobs like plumbing, electrical work, HVAC, or general repairs.",
            data: []
          };
          break;
        }

        // Count templates per category
        const categoryCounts: Record<string, number> = {};
        templates.forEach((t: any) => {
          const cat = t.category || "general";
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const categoryList = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, count]) => `${cat} (${count} template${count > 1 ? "s" : ""})`)
          .join(", ");

        response = {
          success: true,
          message: `You have templates in these categories: ${categoryList}. Which category would you like to see?`,
          data: categoryCounts
        };
        break;
      }

      // ============================================
      // BATCH 1: Core CRUD Operations
      // ============================================

      case "list_customers": {
        const { search, limit: limitParam } = parameters as {
          search?: string;
          limit?: number;
        };

        let query = supabase
          .from("customers")
          .select("id, name, email, phone, address, contact_person")
          .eq("team_id", company_id)
          .order("name");

        if (search) {
          query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%`);
        }

        const { data: customers, error } = await query.limit(limitParam || 20);

        if (error) throw error;

        if (!customers || customers.length === 0) {
          response = {
            success: true,
            message: search 
              ? `I couldn't find any customers matching "${search}".` 
              : "You don't have any customers yet.",
            data: []
          };
        } else {
          const customerList = customers.slice(0, 5).map((c: any) => 
            c.phone ? `${c.name} (${c.phone})` : c.name
          ).join(", ");
          
          const moreNote = customers.length > 5 ? ` and ${customers.length - 5} more` : "";
          
          response = {
            success: true,
            message: `You have ${customers.length} customer${customers.length > 1 ? "s" : ""}${search ? ` matching "${search}"` : ""}: ${customerList}${moreNote}.`,
            data: customers
          };
        }
        break;
      }

      case "create_customer": {
        const { name, email, phone, address, contact_person, notes } = parameters as {
          name: string;
          email?: string;
          phone?: string;
          address?: string;
          contact_person?: string;
          notes?: string;
        };

        if (!name) {
          response = {
            success: false,
            message: "I need the customer name to create a new customer."
          };
          break;
        }

        // Check if customer already exists
        const { data: existing } = await supabase
          .from("customers")
          .select("id, name")
          .eq("team_id", company_id)
          .ilike("name", name)
          .limit(1)
          .single();

        if (existing) {
          response = {
            success: false,
            message: `A customer named "${existing.name}" already exists. Would you like me to update their details instead?`
          };
          break;
        }

        const { data: newCustomer, error } = await supabase
          .from("customers")
          .insert({
            team_id: company_id,
            name,
            email: email || null,
            phone: phone || null,
            address: address || null,
            contact_person: contact_person || null,
            notes: notes || null
          })
          .select("id, name, email, phone")
          .single();

        if (error) throw error;

        let details = [];
        if (email) details.push(`email: ${email}`);
        if (phone) details.push(`phone: ${phone}`);
        const detailsStr = details.length > 0 ? ` with ${details.join(" and ")}` : "";

        response = {
          success: true,
          message: `Done! I've created a new customer "${name}"${detailsStr}.`,
          data: newCustomer
        };
        break;
      }

      case "update_customer": {
        const { customer_name, customer_id, name, email, phone, address, contact_person, notes } = parameters as {
          customer_name?: string;
          customer_id?: string;
          name?: string;
          email?: string;
          phone?: string;
          address?: string;
          contact_person?: string;
          notes?: string;
        };

        // Find the customer
        let customerQuery = supabase
          .from("customers")
          .select("id, name, email, phone, address")
          .eq("team_id", company_id);

        if (customer_id) {
          customerQuery = customerQuery.eq("id", customer_id);
        } else if (customer_name) {
          customerQuery = customerQuery.ilike("name", `%${customer_name}%`);
        } else {
          response = {
            success: false,
            message: "I need either the customer name or ID to update their details."
          };
          break;
        }

        const { data: customers, error: findError } = await customerQuery.limit(1);

        if (findError) throw findError;

        if (!customers || customers.length === 0) {
          response = {
            success: false,
            message: `I couldn't find a customer matching "${customer_name || customer_id}".`
          };
          break;
        }

        const customer = customers[0];
        
        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email || null;
        if (phone !== undefined) updates.phone = phone || null;
        if (address !== undefined) updates.address = address || null;
        if (contact_person !== undefined) updates.contact_person = contact_person || null;
        if (notes !== undefined) updates.notes = notes || null;

        if (Object.keys(updates).length === 0) {
          response = {
            success: false,
            message: "I need at least one field to update (name, email, phone, address, contact_person, or notes)."
          };
          break;
        }

        const { error: updateError } = await supabase
          .from("customers")
          .update(updates)
          .eq("id", customer.id);

        if (updateError) throw updateError;

        const updatedFields = Object.keys(updates).join(", ");
        
        response = {
          success: true,
          message: `Done! I've updated ${customer.name}'s ${updatedFields}.`,
          data: { customer_id: customer.id, updates }
        };
        break;
      }

      case "delete_customer": {
        const { customer_name, customer_id, confirm } = parameters as {
          customer_name?: string;
          customer_id?: string;
          confirm?: boolean;
        };

        // Find the customer
        let customerQuery = supabase
          .from("customers")
          .select("id, name")
          .eq("team_id", company_id);

        if (customer_id) {
          customerQuery = customerQuery.eq("id", customer_id);
        } else if (customer_name) {
          customerQuery = customerQuery.ilike("name", `%${customer_name}%`);
        } else {
          response = {
            success: false,
            message: "I need either the customer name or ID to delete them."
          };
          break;
        }

        const { data: customers, error: findError } = await customerQuery.limit(1);

        if (findError) throw findError;

        if (!customers || customers.length === 0) {
          response = {
            success: false,
            message: `I couldn't find a customer matching "${customer_name || customer_id}".`
          };
          break;
        }

        const customer = customers[0];

        // Check for related jobs/invoices/quotes
        const { count: jobCount } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customer.id);

        const { count: invoiceCount } = await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customer.id);

        if ((jobCount || 0) > 0 || (invoiceCount || 0) > 0) {
          response = {
            success: false,
            message: `I can't delete ${customer.name} because they have ${jobCount || 0} job(s) and ${invoiceCount || 0} invoice(s) associated with them. You'll need to delete those first.`
          };
          break;
        }

        const { error: deleteError } = await supabase
          .from("customers")
          .delete()
          .eq("id", customer.id);

        if (deleteError) throw deleteError;

        response = {
          success: true,
          message: `Done! I've deleted the customer "${customer.name}".`,
          data: { deleted_id: customer.id }
        };
        break;
      }

      case "list_jobs": {
        const { status, customer_name, search, date_from, date_to, limit: limitParam } = parameters as {
          status?: string;
          customer_name?: string;
          search?: string;
          date_from?: string;
          date_to?: string;
          limit?: number;
        };

        let query = supabase
          .from("jobs")
          .select("id, title, status, scheduled_date, scheduled_time, estimated_value, customers(name)")
          .eq("team_id", company_id)
          .order("scheduled_date", { ascending: false });

        if (status) {
          query = query.eq("status", status.toLowerCase().replace(/\s+/g, "_"));
        }

        if (search) {
          query = query.ilike("title", `%${search}%`);
        }

        if (date_from) {
          query = query.gte("scheduled_date", date_from);
        }

        if (date_to) {
          query = query.lte("scheduled_date", date_to);
        }

        const { data: jobs, error } = await query.limit(limitParam || 20);

        if (error) throw error;

        // Filter by customer name if provided (post-filter since it's a join)
        let filteredJobs = jobs || [];
        if (customer_name && filteredJobs.length > 0) {
          filteredJobs = filteredJobs.filter((j: any) => 
            j.customers?.name?.toLowerCase().includes(customer_name.toLowerCase())
          );
        }

        if (filteredJobs.length === 0) {
          let filterDesc = [];
          if (status) filterDesc.push(`status "${status}"`);
          if (customer_name) filterDesc.push(`customer "${customer_name}"`);
          if (search) filterDesc.push(`matching "${search}"`);
          const filterStr = filterDesc.length > 0 ? ` with ${filterDesc.join(" and ")}` : "";
          
          response = {
            success: true,
            message: `You don't have any jobs${filterStr}.`,
            data: []
          };
        } else {
          const jobList = filteredJobs.slice(0, 5).map((j: any) => {
            const clientName = j.customers?.name || "Unknown";
            const dateStr = j.scheduled_date || "unscheduled";
            return `"${j.title}" for ${clientName} on ${dateStr} (${j.status})`;
          }).join("; ");
          
          const moreNote = filteredJobs.length > 5 ? ` and ${filteredJobs.length - 5} more` : "";
          
          response = {
            success: true,
            message: `You have ${filteredJobs.length} job${filteredJobs.length > 1 ? "s" : ""}: ${jobList}${moreNote}.`,
            data: filteredJobs
          };
        }
        break;
      }

      case "delete_job": {
        const { job_id, job_title, client_name } = parameters as {
          job_id?: string;
          job_title?: string;
          client_name?: string;
        };

        // Find the job
        let jobQuery = supabase
          .from("jobs")
          .select("id, title, customers(name)")
          .eq("team_id", company_id);

        if (job_id) {
          jobQuery = jobQuery.eq("id", job_id);
        } else if (job_title) {
          jobQuery = jobQuery.ilike("title", `%${job_title}%`);
        } else if (client_name) {
          const { data: customers } = await supabase
            .from("customers")
            .select("id")
            .eq("team_id", company_id)
            .ilike("name", `%${client_name}%`)
            .limit(1);

          if (!customers || customers.length === 0) {
            response = {
              success: false,
              message: `I couldn't find a client matching "${client_name}".`
            };
            break;
          }
          jobQuery = jobQuery.eq("customer_id", customers[0].id);
        } else {
          response = {
            success: false,
            message: "I need either a job ID, job title, or client name to find the job to delete."
          };
          break;
        }

        const { data: jobs, error: findError } = await jobQuery.limit(1);

        if (findError) throw findError;

        if (!jobs || jobs.length === 0) {
          response = {
            success: false,
            message: "I couldn't find that job in your records."
          };
          break;
        }

        const job = jobs[0] as any;

        const { error: deleteError } = await supabase
          .from("jobs")
          .delete()
          .eq("id", job.id);

        if (deleteError) throw deleteError;

        const clientName = job.customers?.name || "unknown client";
        
        response = {
          success: true,
          message: `Done! I've deleted the job "${job.title}" for ${clientName}.`,
          data: { deleted_id: job.id }
        };
        break;
      }

      case "list_quotes": {
        const { status, customer_name, search, limit: limitParam } = parameters as {
          status?: string;
          customer_name?: string;
          search?: string;
          limit?: number;
        };

        let query = supabase
          .from("quotes")
          .select("id, display_number, status, total, valid_until, customer:customers(name)")
          .eq("team_id", company_id)
          .order("created_at", { ascending: false });

        if (status) {
          query = query.eq("status", status.toLowerCase());
        }

        const { data: quotes, error } = await query.limit(limitParam || 20);

        if (error) throw error;

        // Filter by customer name if provided
        let filteredQuotes = quotes || [];
        if (customer_name && filteredQuotes.length > 0) {
          filteredQuotes = filteredQuotes.filter((q: any) => 
            q.customer?.name?.toLowerCase().includes(customer_name.toLowerCase())
          );
        }

        if (search && filteredQuotes.length > 0) {
          filteredQuotes = filteredQuotes.filter((q: any) => 
            q.display_number?.toLowerCase().includes(search.toLowerCase())
          );
        }

        if (filteredQuotes.length === 0) {
          let filterDesc = [];
          if (status) filterDesc.push(`status "${status}"`);
          if (customer_name) filterDesc.push(`customer "${customer_name}"`);
          const filterStr = filterDesc.length > 0 ? ` with ${filterDesc.join(" and ")}` : "";
          
          response = {
            success: true,
            message: `You don't have any quotes${filterStr}.`,
            data: []
          };
        } else {
          const quoteList = filteredQuotes.slice(0, 5).map((q: any) => {
            const clientName = q.customer?.name || "Unknown";
            return `${q.display_number} for ${clientName} (${currencySymbol}${parseFloat(q.total).toFixed(2)}, ${q.status})`;
          }).join("; ");
          
          const moreNote = filteredQuotes.length > 5 ? ` and ${filteredQuotes.length - 5} more` : "";
          
          response = {
            success: true,
            message: `You have ${filteredQuotes.length} quote${filteredQuotes.length > 1 ? "s" : ""}: ${quoteList}${moreNote}.`,
            data: filteredQuotes
          };
        }
        break;
      }

      case "update_quote_status": {
        const { quote_id, quote_number, new_status } = parameters as {
          quote_id?: string;
          quote_number?: string;
          new_status: string;
        };

        const validStatuses = ["draft", "sent", "accepted", "rejected", "expired"];
        const normalizedStatus = new_status.toLowerCase();

        if (!validStatuses.includes(normalizedStatus)) {
          response = {
            success: false,
            message: `Invalid status "${new_status}". Valid options are: draft, sent, accepted, rejected, or expired.`
          };
          break;
        }

        // Find the quote
        let quoteQuery = supabase
          .from("quotes")
          .select("id, display_number, status, customer:customers(name)")
          .eq("team_id", company_id);

        if (quote_id) {
          quoteQuery = quoteQuery.eq("id", quote_id);
        } else if (quote_number) {
          quoteQuery = quoteQuery.eq("display_number", quote_number);
        } else {
          response = {
            success: false,
            message: "I need either a quote ID or quote number to update the status."
          };
          break;
        }

        const { data: quotes, error: findError } = await quoteQuery.limit(1);

        if (findError) throw findError;

        if (!quotes || quotes.length === 0) {
          response = {
            success: false,
            message: `I couldn't find quote "${quote_number || quote_id}".`
          };
          break;
        }

        const quote = quotes[0] as any;
        const oldStatus = quote.status;

        const { error: updateError } = await supabase
          .from("quotes")
          .update({ status: normalizedStatus })
          .eq("id", quote.id);

        if (updateError) throw updateError;

        const clientName = quote.customer?.name || "the customer";
        
        response = {
          success: true,
          message: `Done! I've updated quote ${quote.display_number} for ${clientName} from ${oldStatus} to ${normalizedStatus}.`,
          data: { quote_id: quote.id, old_status: oldStatus, new_status: normalizedStatus }
        };
        break;
      }

      case "delete_quote": {
        const { quote_id, quote_number } = parameters as {
          quote_id?: string;
          quote_number?: string;
        };

        // Find the quote
        let quoteQuery = supabase
          .from("quotes")
          .select("id, display_number, customer:customers(name)")
          .eq("team_id", company_id);

        if (quote_id) {
          quoteQuery = quoteQuery.eq("id", quote_id);
        } else if (quote_number) {
          quoteQuery = quoteQuery.eq("display_number", quote_number);
        } else {
          response = {
            success: false,
            message: "I need either a quote ID or quote number to delete it."
          };
          break;
        }

        const { data: quotes, error: findError } = await quoteQuery.limit(1);

        if (findError) throw findError;

        if (!quotes || quotes.length === 0) {
          response = {
            success: false,
            message: `I couldn't find quote "${quote_number || quote_id}".`
          };
          break;
        }

        const quote = quotes[0] as any;

        // Delete quote items first
        await supabase
          .from("quote_items")
          .delete()
          .eq("quote_id", quote.id);

        const { error: deleteError } = await supabase
          .from("quotes")
          .delete()
          .eq("id", quote.id);

        if (deleteError) throw deleteError;

        const clientName = quote.customer?.name || "unknown client";
        
        response = {
          success: true,
          message: `Done! I've deleted quote ${quote.display_number} for ${clientName}.`,
          data: { deleted_id: quote.id }
        };
        break;
      }

      case "create_invoice": {
        const { client_name, client_phone, items, notes, due_days, tax_rate } = parameters as {
          client_name: string;
          client_phone?: string;
          items: Array<{ description: string; quantity: number; unit_price: number }>;
          notes?: string;
          due_days?: number;
          tax_rate?: number;
        };

        if (!client_name || !items || items.length === 0) {
          response = {
            success: false,
            message: "I need the client name and at least one line item to create an invoice."
          };
          break;
        }

        // Find or create client
        let { data: existingClient } = await supabase
          .from("customers")
          .select("id, name")
          .eq("team_id", company_id)
          .ilike("name", client_name)
          .limit(1)
          .single();

        let customerId: string;
        let clientCreated = false;

        if (existingClient) {
          customerId = existingClient.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from("customers")
            .insert({
              team_id: company_id,
              name: client_name,
              phone: client_phone || null
            })
            .select("id")
            .single();

          if (clientError) throw clientError;
          customerId = newClient.id;
          clientCreated = true;
        }

        // Generate invoice number
        const { data: lastInvoice } = await supabase
          .from("invoices")
          .select("display_number")
          .eq("team_id", company_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let invoiceNumber = "INV-0001";
        if (lastInvoice?.display_number) {
          const num = parseInt(lastInvoice.display_number.replace("INV-", "")) + 1;
          invoiceNumber = `INV-${num.toString().padStart(4, "0")}`;
        }

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const taxRateValue = tax_rate !== undefined ? tax_rate : defaultVatRate;
        const taxAmount = subtotal * (taxRateValue / 100);
        const total = subtotal + taxAmount;

        // Due date
        const daysUntilDue = due_days || 14;
        const dueDate = new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const issueDate = new Date().toISOString().split("T")[0];

        // Create invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            team_id: company_id,
            customer_id: customerId,
            display_number: invoiceNumber,
            subtotal,
            tax_rate: taxRateValue,
            tax_amount: taxAmount,
            total,
            notes: notes || null,
            issue_date: issueDate,
            due_date: dueDate,
            status: "draft"
          })
          .select("id, display_number, total")
          .single();

        if (invoiceError) throw invoiceError;

        // Create invoice items
        const invoiceItems = items.map((item) => ({
          invoice_id: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItems);

        if (itemsError) throw itemsError;

        const clientNote = clientCreated ? ` I also created a new client record for ${client_name}.` : "";
        
        response = {
          success: true,
          message: `Done! I've created invoice ${invoiceNumber} for ${client_name} totaling ${currencySymbol}${total.toFixed(2)}, due on ${dueDate}. It's saved as a draft.${clientNote}`,
          data: { invoice: newInvoice, items: invoiceItems }
        };
        break;
      }

      case "list_invoices": {
        const { status, customer_name, search, limit: limitParam } = parameters as {
          status?: string;
          customer_name?: string;
          search?: string;
          limit?: number;
        };

        let query = supabase
          .from("invoices")
          .select("id, display_number, status, total, due_date, issue_date, customer:customers(name)")
          .eq("team_id", company_id)
          .order("created_at", { ascending: false });

        if (status) {
          query = query.eq("status", status.toLowerCase());
        }

        const { data: invoices, error } = await query.limit(limitParam || 20);

        if (error) throw error;

        // Filter by customer name if provided
        let filteredInvoices = invoices || [];
        if (customer_name && filteredInvoices.length > 0) {
          filteredInvoices = filteredInvoices.filter((i: any) => 
            i.customer?.name?.toLowerCase().includes(customer_name.toLowerCase())
          );
        }

        if (search && filteredInvoices.length > 0) {
          filteredInvoices = filteredInvoices.filter((i: any) => 
            i.invoice_number?.toLowerCase().includes(search.toLowerCase())
          );
        }

        if (filteredInvoices.length === 0) {
          let filterDesc = [];
          if (status) filterDesc.push(`status "${status}"`);
          if (customer_name) filterDesc.push(`customer "${customer_name}"`);
          const filterStr = filterDesc.length > 0 ? ` with ${filterDesc.join(" and ")}` : "";
          
          response = {
            success: true,
            message: `You don't have any invoices${filterStr}.`,
            data: []
          };
        } else {
          const invoiceList = filteredInvoices.slice(0, 5).map((i: any) => {
            const clientName = i.customer?.name || "Unknown";
            return `${i.invoice_number} for ${clientName} (${currencySymbol}${parseFloat(i.total).toFixed(2)}, ${i.status})`;
          }).join("; ");
          
          const moreNote = filteredInvoices.length > 5 ? ` and ${filteredInvoices.length - 5} more` : "";
          
          response = {
            success: true,
            message: `You have ${filteredInvoices.length} invoice${filteredInvoices.length > 1 ? "s" : ""}: ${invoiceList}${moreNote}.`,
            data: filteredInvoices
          };
        }
        break;
      }

      case "update_invoice_status": {
        const { invoice_id, invoice_number, new_status } = parameters as {
          invoice_id?: string;
          invoice_number?: string;
          new_status: string;
        };

        const validStatuses = ["draft", "pending", "paid", "overdue", "cancelled"];
        const normalizedStatus = new_status.toLowerCase();

        if (!validStatuses.includes(normalizedStatus)) {
          response = {
            success: false,
            message: `Invalid status "${new_status}". Valid options are: draft, pending, paid, overdue, or cancelled.`
          };
          break;
        }

        // Find the invoice
        let invoiceQuery = supabase
          .from("invoices")
          .select("id, display_number, status, customer:customers(name)")
          .eq("team_id", company_id);

        if (invoice_id) {
          invoiceQuery = invoiceQuery.eq("id", invoice_id);
        } else if (invoice_number) {
          invoiceQuery = invoiceQuery.eq("display_number", invoice_number);
        } else {
          response = {
            success: false,
            message: "I need either an invoice ID or invoice number to update the status."
          };
          break;
        }

        const { data: invoices, error: findError } = await invoiceQuery.limit(1);

        if (findError) throw findError;

        if (!invoices || invoices.length === 0) {
          response = {
            success: false,
            message: `I couldn't find invoice "${invoice_number || invoice_id}".`
          };
          break;
        }

        const invoice = invoices[0] as any;
        const oldStatus = invoice.status;

        const { error: updateError } = await supabase
          .from("invoices")
          .update({ status: normalizedStatus })
          .eq("id", invoice.id);

        if (updateError) throw updateError;

        const clientName = invoice.customer?.name || "the customer";
        
        response = {
          success: true,
          message: `Done! I've updated invoice ${invoice.display_number} for ${clientName} from ${oldStatus} to ${normalizedStatus}.`,
          data: { invoice_id: invoice.id, old_status: oldStatus, new_status: normalizedStatus }
        };
        break;
      }

      case "delete_invoice": {
        const { invoice_id, invoice_number } = parameters as {
          invoice_id?: string;
          invoice_number?: string;
        };

        // Find the invoice
        let invoiceQuery = supabase
          .from("invoices")
          .select("id, display_number, customer:customers(name)")
          .eq("team_id", company_id);

        if (invoice_id) {
          invoiceQuery = invoiceQuery.eq("id", invoice_id);
        } else if (invoice_number) {
          invoiceQuery = invoiceQuery.eq("display_number", invoice_number);
        } else {
          response = {
            success: false,
            message: "I need either an invoice ID or invoice number to delete it."
          };
          break;
        }

        const { data: invoices, error: findError } = await invoiceQuery.limit(1);

        if (findError) throw findError;

        if (!invoices || invoices.length === 0) {
          response = {
            success: false,
            message: `I couldn't find invoice "${invoice_number || invoice_id}".`
          };
          break;
        }

        const invoice = invoices[0] as any;

        // Delete invoice items first
        await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", invoice.id);

        // Delete any payments
        await supabase
          .from("payments")
          .delete()
          .eq("invoice_id", invoice.id);

        const { error: deleteError } = await supabase
          .from("invoices")
          .delete()
          .eq("id", invoice.id);

        if (deleteError) throw deleteError;

        const clientName = invoice.customer?.name || "unknown client";
        
        response = {
          success: true,
          message: `Done! I've deleted invoice ${invoice.display_number} for ${clientName}.`,
          data: { deleted_id: invoice.id }
        };
        break;
      }

      case "list_expenses": {
        const { category, vendor, job_id, date_from, date_to, limit: limitParam } = parameters as {
          category?: string;
          vendor?: string;
          job_id?: string;
          date_from?: string;
          date_to?: string;
          limit?: number;
        };

        let query = supabase
          .from("expenses")
          .select("id, description, amount, category, vendor, expense_date, jobs(title)")
          .eq("team_id", company_id)
          .order("expense_date", { ascending: false });

        if (category) {
          query = query.eq("category", category.toLowerCase());
        }

        if (vendor) {
          query = query.ilike("vendor", `%${vendor}%`);
        }

        if (job_id) {
          query = query.eq("job_id", job_id);
        }

        if (date_from) {
          query = query.gte("expense_date", date_from);
        }

        if (date_to) {
          query = query.lte("expense_date", date_to);
        }

        const { data: expenses, error } = await query.limit(limitParam || 20);

        if (error) throw error;

        if (!expenses || expenses.length === 0) {
          let filterDesc = [];
          if (category) filterDesc.push(`category "${category}"`);
          if (vendor) filterDesc.push(`vendor "${vendor}"`);
          const filterStr = filterDesc.length > 0 ? ` with ${filterDesc.join(" and ")}` : "";
          
          response = {
            success: true,
            message: `You don't have any expenses${filterStr}.`,
            data: []
          };
        } else {
          const total = expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);
          const expenseList = expenses.slice(0, 5).map((e: any) => 
            `${currencySymbol}${parseFloat(e.amount).toFixed(2)} at ${e.vendor || "unknown"} (${e.category})`
          ).join("; ");
          
          const moreNote = expenses.length > 5 ? ` and ${expenses.length - 5} more` : "";
          
          response = {
            success: true,
            message: `You have ${expenses.length} expense${expenses.length > 1 ? "s" : ""} totaling ${currencySymbol}${total.toFixed(2)}: ${expenseList}${moreNote}.`,
            data: expenses
          };
        }
        break;
      }

      case "delete_expense": {
        const { expense_id, vendor, amount } = parameters as {
          expense_id?: string;
          vendor?: string;
          amount?: number;
        };

        // Find the expense
        let expenseQuery = supabase
          .from("expenses")
          .select("id, description, amount, vendor, category")
          .eq("team_id", company_id);

        if (expense_id) {
          expenseQuery = expenseQuery.eq("id", expense_id);
        } else if (vendor && amount !== undefined) {
          expenseQuery = expenseQuery.ilike("vendor", `%${vendor}%`).eq("amount", amount);
        } else if (vendor) {
          expenseQuery = expenseQuery.ilike("vendor", `%${vendor}%`);
        } else {
          response = {
            success: false,
            message: "I need either an expense ID, or a vendor name (optionally with amount) to find the expense to delete."
          };
          break;
        }

        const { data: expenses, error: findError } = await expenseQuery.limit(1);

        if (findError) throw findError;

        if (!expenses || expenses.length === 0) {
          response = {
            success: false,
            message: "I couldn't find that expense in your records."
          };
          break;
        }

        const expense = expenses[0];

        const { error: deleteError } = await supabase
          .from("expenses")
          .delete()
          .eq("id", expense.id);

        if (deleteError) throw deleteError;

        response = {
          success: true,
          message: `Done! I've deleted the ${currencySymbol}${parseFloat(String(expense.amount)).toFixed(2)} expense from ${expense.vendor || "unknown vendor"} (${expense.category}).`,
          data: { deleted_id: expense.id }
        };
        break;
      }

      case "get_upcoming_jobs": {
        const { days } = parameters as { days?: number };
        const daysAhead = days || 7;
        const today = new Date().toISOString().split("T")[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + daysAhead);
        const endStr = endDate.toISOString().split("T")[0];

        const { data: jobs, error } = await supabase
          .from("jobs")
          .select("id, title, scheduled_date, scheduled_time, status, estimated_value, customers(name)")
          .eq("team_id", company_id)
          .gte("scheduled_date", today)
          .lte("scheduled_date", endStr)
          .in("status", ["pending", "scheduled", "in_progress"])
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true });

        if (error) throw error;

        if (!jobs || jobs.length === 0) {
          response = { success: true, message: `No upcoming jobs in the next ${daysAhead} days.`, data: [] };
        } else {
          const jobList = jobs.slice(0, 5).map((j: any) => {
            const client = j.customers?.name || "Unknown";
            const time = j.scheduled_time ? ` at ${j.scheduled_time.slice(0, 5)}` : "";
            return `${j.title} for ${client} on ${j.scheduled_date}${time}`;
          }).join("; ");
          const more = jobs.length > 5 ? ` and ${jobs.length - 5} more` : "";
          response = { success: true, message: `You have ${jobs.length} upcoming job${jobs.length > 1 ? "s" : ""} in the next ${daysAhead} days: ${jobList}${more}.`, data: jobs };
        }
        break;
      }

      case "get_financial_summary": {
        const { period } = parameters as { period?: string };
        const now = new Date();
        let startDate: string;
        let periodLabel: string;

        if (period === "year") {
          startDate = `${now.getFullYear()}-01-01`;
          periodLabel = `${now.getFullYear()}`;
        } else if (period === "week") {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
          startDate = weekStart.toISOString().split("T")[0];
          periodLabel = "this week";
        } else {
          startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          periodLabel = "this month";
        }
        const endDate = now.toISOString().split("T")[0];

        const [invoicesRes, expensesRes, paymentsRes] = await Promise.all([
          supabase.from("invoices").select("total, status").eq("team_id", company_id).gte("issue_date", startDate).lte("issue_date", endDate),
          supabase.from("expenses").select("amount").eq("team_id", company_id).gte("expense_date", startDate).lte("expense_date", endDate),
          supabase.from("payments").select("amount").eq("team_id", company_id).gte("payment_date", startDate).lte("payment_date", endDate),
        ]);

        const totalInvoiced = (invoicesRes.data || []).reduce((s: number, i: any) => s + (parseFloat(i.total) || 0), 0);
        const totalPaid = (paymentsRes.data || []).reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
        const totalExpenses = (expensesRes.data || []).reduce((s: number, e: any) => s + (parseFloat(e.amount) || 0), 0);
        const profit = totalPaid - totalExpenses;

        response = {
          success: true,
          message: `Financial summary for ${periodLabel}: Invoiced ${currencySymbol}${totalInvoiced.toFixed(2)}, Collected ${currencySymbol}${totalPaid.toFixed(2)}, Expenses ${currencySymbol}${totalExpenses.toFixed(2)}, Net profit ${currencySymbol}${profit.toFixed(2)}.`,
          data: { period: periodLabel, invoiced: totalInvoiced, collected: totalPaid, expenses: totalExpenses, profit }
        };
        break;
      }

      case "search_customer": {
        const { query: searchQuery } = parameters as { query: string };
        if (!searchQuery) {
          response = { success: false, message: "I need a search term to find customers." };
          break;
        }

        const { data: customers, error } = await supabase
          .from("customers")
          .select("id, name, email, phone, address, contact_person")
          .eq("team_id", company_id)
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,contact_person.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;

        if (!customers || customers.length === 0) {
          response = { success: true, message: `No customers found matching "${searchQuery}".`, data: [] };
        } else {
          const list = customers.map((c: any) => c.phone ? `${c.name} (${c.phone})` : c.name).join(", ");
          response = { success: true, message: `Found ${customers.length} customer${customers.length > 1 ? "s" : ""}: ${list}.`, data: customers };
        }
        break;
      }

      case "get_pending_quotes": {
        const { data: quotes, error } = await supabase
          .from("quotes")
          .select("id, display_number, total, valid_until, customer:customers(name)")
          .eq("team_id", company_id)
          .eq("status", "sent")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        if (!quotes || quotes.length === 0) {
          response = { success: true, message: "You have no pending quotes awaiting response.", data: [] };
        } else {
          const total = quotes.reduce((s: number, q: any) => s + (parseFloat(q.total) || 0), 0);
          const list = quotes.slice(0, 5).map((q: any) => `${q.display_number} for ${(q.customer as any)?.name || "Unknown"} (${currencySymbol}${parseFloat(q.total).toFixed(2)})`).join("; ");
          const more = quotes.length > 5 ? ` and ${quotes.length - 5} more` : "";
          response = { success: true, message: `You have ${quotes.length} pending quote${quotes.length > 1 ? "s" : ""} worth ${currencySymbol}${total.toFixed(2)}: ${list}${more}.`, data: quotes };
        }
        break;
      }

      case "get_outstanding_invoices": {
        const { data: invoices, error } = await supabase
          .from("invoices")
          .select("id, display_number, total, due_date, status, customer:customers(name)")
          .eq("team_id", company_id)
          .in("status", ["pending", "overdue"])
          .order("due_date", { ascending: true })
          .limit(20);

        if (error) throw error;

        if (!invoices || invoices.length === 0) {
          response = { success: true, message: "You have no outstanding invoices. All caught up!", data: [] };
        } else {
          const total = invoices.reduce((s: number, i: any) => s + (parseFloat(i.total) || 0), 0);
          const list = invoices.slice(0, 5).map((i: any) => `${i.invoice_number} for ${(i.customer as any)?.name || "Unknown"} (${currencySymbol}${parseFloat(i.total).toFixed(2)}, due ${i.due_date})`).join("; ");
          const more = invoices.length > 5 ? ` and ${invoices.length - 5} more` : "";
          response = { success: true, message: `You have ${invoices.length} outstanding invoice${invoices.length > 1 ? "s" : ""} totaling ${currencySymbol}${total.toFixed(2)}: ${list}${more}.`, data: invoices };
        }
        break;
      }

      default:
        response = {
          success: false,
          message: `I don't recognize the function "${function_name}". I can help with: managing customers, jobs, quotes, invoices, expenses, templates, payments, schedules, financial summaries, and more.`
        };
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("george-webhook error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Sorry, something went wrong: ${message}` 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
