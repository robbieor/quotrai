import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const realmId = url.searchParams.get('realmId');

  if (!code || !stateParam || !realmId) {
    return new Response('Missing parameters', { status: 400 });
  }

  try {
    const { team_id } = JSON.parse(atob(stateParam));
    if (!team_id) throw new Error('Invalid state');

    const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')!;
    const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const redirectUri = `${supabaseUrl}/functions/v1/quickbooks-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token exchange failed: ${err}`);
    }

    const tokens = await tokenRes.json();

    // Get company info
    const companyRes = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json',
        },
      }
    );

    let companyName = null;
    if (companyRes.ok) {
      const companyData = await companyRes.json();
      companyName = companyData?.CompanyInfo?.CompanyName || null;
    }

    // Save connection
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase.from('quickbooks_connections').upsert({
      team_id,
      realm_id: realmId,
      company_name: companyName,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'team_id' });

    if (error) throw error;

    // Redirect back to settings
    const appUrl = Deno.env.get('APP_URL') || supabaseUrl.replace('.supabase.co', '.lovable.app');
    return new Response(null, {
      status: 302,
      headers: { 'Location': `${appUrl}/settings?tab=integrations&quickbooks=connected` },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`QuickBooks connection failed: ${message}`, { status: 500 });
  }
});
