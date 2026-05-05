// check-email-exists: pre-flight check on signup so users with existing
// accounts get redirected to login instead of the "verification email sent"
// dead end. Fails open: any internal error returns { exists: false } so a
// broken check never blocks signup.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { email } = await req.json().catch(() => ({}))
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ exists: false, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const normalized = email.trim().toLowerCase()
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Use admin listUsers with email filter (uses GoTrue admin API)
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      // @ts-expect-error filter supported by GoTrue
      filter: `email.eq.${normalized}`,
    })

    if (error) {
      console.error('check-email-exists admin error', error)
      return new Response(JSON.stringify({ exists: false, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const exists = !!data?.users?.some((u: any) => (u.email || '').toLowerCase() === normalized)
    return new Response(JSON.stringify({ exists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('check-email-exists fatal', err)
    return new Response(JSON.stringify({ exists: false, fallback: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
