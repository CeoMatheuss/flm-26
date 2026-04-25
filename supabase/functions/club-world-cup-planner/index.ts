// Club World Cup Planner — creates the annual edition
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const seasonYear = new Date().getFullYear()

  const { data, error } = await supa.rpc('start_club_world_cup', { _season_year: seasonYear })

  return new Response(JSON.stringify({ ok: !error, cup_id: data, error: error?.message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: error ? 500 : 200,
  })
})
