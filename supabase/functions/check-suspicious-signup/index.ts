// check-suspicious-signup: flags signup attempts that look like abuse.
// Logs to security_events and emails rorourke@revamo.ai. Never blocks the
// signup — notify only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com',
  'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com',
  'maildrop.cc', 'throwawaymail.com', 'fakeinbox.com', 'temp-mail.org',
  'dispostable.com', 'mintemail.com',
])

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
    const { email, fullName } = await req.json().catch(() => ({}))
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ ok: true, flagged: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalized = email.trim().toLowerCase()
    const domain = normalized.split('@')[1] || ''
    const ip = getIp(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const country = req.headers.get('cf-ipcountry') || null

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const reasons: string[] = []

    // 1. Disposable domain
    if (DISPOSABLE_DOMAINS.has(domain)) reasons.push('disposable_email_domain')

    // 2. Burned account check
    try {
      const emailHashBuf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(normalized),
      )
      const emailHash = Array.from(new Uint8Array(emailHashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const { data: burned } = await admin
        .from('burned_accounts')
        .select('id')
        .eq('identifier_hash', emailHash)
        .maybeSingle()
      if (burned) reasons.push('burned_account_match')
    } catch (e) {
      // burned_accounts may have a different schema — non-fatal
      console.warn('burned check skipped', e)
    }

    // 3. 3+ signup-flagging events from same IP in 24h (heuristic for abuse)
    if (ip && ip !== 'unknown') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await admin
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ip)
        .eq('event_type', 'suspicious_signup')
        .gte('created_at', since)
      if ((count ?? 0) >= 3) reasons.push('high_volume_from_ip')
    }

    if (reasons.length === 0) {
      return new Response(JSON.stringify({ ok: true, flagged: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log + notify
    await admin.from('security_events').insert({
      event_type: 'suspicious_signup',
      email: normalized,
      ip,
      user_agent: userAgent,
      details: { reasons, fullName: fullName || null, country },
    })

    // Fire-and-forget email
    admin.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'security-alert',
        idempotencyKey: `sec-suspicious-${normalized}-${Date.now()}`,
        templateData: {
          eventType: 'suspicious_signup',
          email: normalized,
          ip,
          country,
          userAgent,
          details: { reasons, fullName: fullName || null },
          occurredAt: new Date().toISOString(),
        },
      },
    }).catch((e) => console.warn('alert email failed', e))

    return new Response(JSON.stringify({ ok: true, flagged: true, reasons }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('check-suspicious-signup fatal', err)
    return new Response(JSON.stringify({ ok: true, flagged: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
