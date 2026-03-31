import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth: require admin role or cron secret
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')

    if (expectedSecret && cronSecret === expectedSecret) {
      // Cron caller — allowed
    } else {
      // Check if caller is admin
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )

      const token = authHeader.replace('Bearer ', '')
      const { data: claims, error: claimsError } = await anonClient.auth.getClaims(token)
      if (claimsError || !claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check admin role
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      const { data: roleData } = await serviceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', claims.claims.sub)
        .eq('role', 'admin')
        .limit(1)

      if (!roleData?.length) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, streak')
      .gt('streak', 0)

    let notified = 0

    for (const profile of profiles ?? []) {
      const { data: readYesterday } = await supabase
        .from('completed_days')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('read_date', yesterdayStr)
        .limit(1)

      const { data: readBefore } = await supabase
        .from('completed_days')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('read_date', twoDaysAgoStr)
        .limit(1)

      const missedYesterday = !readYesterday?.length && readBefore?.length
      if (missedYesterday) {
        notified++
      }
    }

    return new Response(
      JSON.stringify({ ok: true, notified }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
