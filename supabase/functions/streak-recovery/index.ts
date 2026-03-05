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

    // Get all profiles with streak > 0
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, streak')
      .gt('streak', 0)

    let notified = 0

    for (const profile of profiles ?? []) {
      // Check if they read yesterday
      const { data: readYesterday } = await supabase
        .from('completed_days')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('read_date', yesterdayStr)
        .limit(1)

      // Check if they read the day before
      const { data: readBefore } = await supabase
        .from('completed_days')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('read_date', twoDaysAgoStr)
        .limit(1)

      const missedYesterday = !readYesterday?.length && readBefore?.length
      if (missedYesterday) {
        notified++
        // The actual notification (push/email) would go here
        // For now we just count users who missed
      }
    }

    return new Response(
      JSON.stringify({ ok: true, notified }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
