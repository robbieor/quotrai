import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');

    if (!code || !stateParam) {
      return new Response('Missing code or state', { status: 400 });
    }

    const { team_id } = JSON.parse(atob(stateParam));
    if (!team_id) {
      return new Response('Invalid state: missing team_id', { status: 400 });
    }

    const clientId = Deno.env.get('XERO_CLIENT_ID')!;
    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const redirectUri = `${supabaseUrl}/functions/v1/xero-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Token exchange failed:', err);
      return new Response(`Token exchange failed: ${err}`, { status: 400 });
    }

    const tokens = await tokenRes.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Get connected tenants (orgs)
    const connectionsRes = await fetch('https://api.xero.com/connections', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });

    if (!connectionsRes.ok) {
      const err = await connectionsRes.text();
      console.error('Connections fetch failed:', err);
      return new Response(`Failed to get Xero tenants: ${err}`, { status: 400 });
    }

    const connections = await connectionsRes.json();
    if (!connections.length) {
      return new Response('No Xero organisations found', { status: 400 });
    }

    // Use first tenant
    const tenant = connections[0];

    // Store in database using service role
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: upsertError } = await supabase
      .from('xero_connections')
      .upsert({
        team_id,
        xero_tenant_id: tenant.tenantId,
        xero_tenant_name: tenant.tenantName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        scopes: tokens.scope || '',
        connected_by: team_id, // Will be updated properly
        updated_at: new Date().toISOString(),
      }, { onConflict: 'team_id,xero_tenant_id' });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(`Database error: ${upsertError.message}`, { status: 500 });
    }

    // Redirect back to settings with success
    const appUrl = 'https://foreman.ie';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${appUrl}/settings?tab=billing&xero=connected`,
      },
    });
  } catch (error) {
    console.error('Callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Error: ${message}`, { status: 500 });
  }
});
