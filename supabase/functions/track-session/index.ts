// track-session: called by the client on every successful sign-in. Records
// the session and detects concurrent sessions on the same account from
// different devices/IPs. When detected, older sessions are revoked (latest
// login wins) and an alert email is sent to rorourke@revamo.ai.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = claimsData.claims.sub as string
    const email = (claimsData.claims as any).email as string | undefined

    const { clientSessionId } = await req.json().catch(() => ({}))
    if (!clientSessionId || typeof clientSessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing clientSessionId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ip = getIp(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const country = req.headers.get('cf-ipcountry') || null

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Upsert this session
    await admin.from('auth_sessions').upsert(
      {
        user_id: userId,
        client_session_id: clientSessionId,
        ip,
        user_agent: userAgent,
        country,
        last_seen_at: new Date().toISOString(),
        revoked_at: null,
        revoked_reason: null,
      },
      { onConflict: 'user_id,client_session_id' },
    )

    // Find other active sessions from a different device/IP
    const { data: otherSessions } = await admin
      .from('auth_sessions')
      .select('id, client_session_id, ip, user_agent, last_seen_at')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .neq('client_session_id', clientSessionId)

    const conflicting = (otherSessions || []).filter((s: any) => {
      const sameIp = s.ip && s.ip === ip
      const sameUa = s.user_agent && s.user_agent === userAgent
      // Only flag truly different devices/networks
      return !(sameIp && sameUa)
    })

    if (conflicting.length > 0) {
      // Revoke older sessions — latest login wins
      const idsToRevoke = conflicting.map((s: any) => s.id)
      await admin
        .from('auth_sessions')
        .update({ revoked_at: new Date().toISOString(), revoked_reason: 'concurrent_session' })
        .in('id', idsToRevoke)

      await admin.from('security_events').insert({
        event_type: 'concurrent_sessions',
        user_id: userId,
        email: email || null,
        ip,
        user_agent: userAgent,
        details: {
          revokedSessionCount: conflicting.length,
          revokedSessions: conflicting.map((s: any) => ({
            ip: s.ip, userAgent: s.user_agent, lastSeenAt: s.last_seen_at,
          })),
          country,
        },
      })

      admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'security-alert',
          idempotencyKey: `sec-concurrent-${userId}-${Date.now()}`,
          templateData: {
            eventType: 'concurrent_sessions',
            email: email || null,
            ip,
            country,
            userAgent,
            details: {
              revokedSessionCount: conflicting.length,
              previousSessions: conflicting.map((s: any) => ({
                ip: s.ip, userAgent: s.user_agent, lastSeenAt: s.last_seen_at,
              })),
            },
            occurredAt: new Date().toISOString(),
          },
        },
      }).catch((e) => console.warn('alert email failed', e))
    }

    return new Response(JSON.stringify({ ok: true, revoked: conflicting.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('track-session fatal', err)
    return new Response(JSON.stringify({ ok: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
