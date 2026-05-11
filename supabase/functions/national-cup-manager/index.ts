import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, cupId } = await req.json()

    if (action === 'generate_all_national_cups') {
      const { data: leagues } = await supabase.from('world_leagues').select('country_code, name')
      for (const league of leagues) {
        const { data: cup } = await supabase.from('national_cups').insert({
          name: `Copa de ${league.country_code}`, country_code: league.country_code,
          season: 1, status: 'scheduled', total_rounds: 5
        }).select().single()
        if (!cup) continue
        const { data: teams } = await supabase.from('world_teams').select('id, name, logo, strength, user_id')
          .eq('country_code', league.country_code).limit(32)
        const cupTeams = teams.map((t, idx) => ({
          cup_id: cup.id, club_name: t.name, club_logo: t.logo,
          user_id: t.user_id, strength: t.strength, seed: idx + 1
        }))
        await supabase.from('national_cup_teams').insert(cupTeams)
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'draw_round') {
      const { data: cup } = await supabase.from('national_cups').select('*').eq('id', cupId).single()
      const { data: teams } = await supabase.from('national_cup_teams').select('*').eq('cup_id', cupId).eq('eliminated', false)
      const shuffled = teams.sort(() => Math.random() - 0.5)
      const matches = []
      const kickoff = new Date(); kickoff.setDate(11); kickoff.setHours(12, 0, 0, 0)
      for (let i = 0; i < shuffled.length; i += 2) {
        if (shuffled[i+1]) {
          matches.push({
            cup_id: cupId, round: cup.current_round, bracket_pos: Math.floor(i / 2),
            home_team_id: shuffled[i].id, away_team_id: shuffled[i+1].id,
            scheduled_at: kickoff.toISOString(), status: 'scheduled'
          })
        }
      }
      await supabase.from('national_cup_matches').insert(matches)
      await supabase.from('national_cups').update({ status: 'in_progress' }).eq('id', cupId)
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
