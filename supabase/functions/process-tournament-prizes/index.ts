import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { action } = await req.json().catch(() => ({ action: 'process_all' }))

    const results: any = {
      cups: [],
      leagues: [],
      multiplayer_leagues: []
    }

    if (action === 'process_cups' || action === 'process_all') {
      results.cups = await processCupPrizes(supabase)
    }

    if (action === 'process_leagues' || action === 'process_all') {
      results.leagues = await processLeaguePrizes(supabase)
    }

    if (action === 'process_multiplayer_leagues' || action === 'process_all') {
      results.multiplayer_leagues = await processMultiplayerLeaguePrizes(supabase)
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function processCupPrizes(supabase: any) {
  const processed = []
  
  const { data: cups } = await supabase
    .from('national_cups')
    .select('*')
    .neq('status', 'scheduled')

  if (!cups) return []

  for (const cup of cups) {
    const currentRound = cup.current_round
    if (cup.prizes_paid_current_round >= currentRound) continue

    const { data: matches, error: mErr } = await supabase
      .from('national_cup_matches')
      .select('id, status, winner_team_id, home_team_id, away_team_id, phase_name')
      .eq('cup_id', cup.id)
      .eq('round', currentRound)

    if (mErr || !matches || matches.length === 0) continue

    const allFinished = matches.every((m: any) => m.status === 'finished')
    if (!allFinished) continue

    const isFinal = currentRound === cup.total_rounds
    const phaseName = matches[0].phase_name || `Fase ${currentRound}`
    
    const { data: config } = await supabase
      .from('prize_configurations')
      .select('*')
      .eq('competition_type', 'cup')

    const getPrize = (name: string) => config?.find((c: any) => c.rank_or_phase === name)?.amount || 0

    for (const match of matches) {
      if (isFinal) {
        const winnerId = match.winner_team_id
        const loserId = winnerId === match.home_team_id ? match.away_team_id : match.home_team_id
        
        const { data: winnerTeam } = await supabase.from('national_cup_teams').select('club_id, club_name').eq('id', winnerId).single()
        const { data: loserTeam } = await supabase.from('national_cup_teams').select('club_id, club_name').eq('id', loserId).single()
        
        if (winnerTeam) {
          await supabase.rpc('grant_tournament_prize', {
            p_club_id: winnerTeam.club_id,
            p_competition_id: cup.id,
            p_competition_type: 'cup',
            p_competition_name: cup.name,
            p_phase_or_rank: 'Campeão',
            p_amount: getPrize('Final_Winner'),
            p_season_year: cup.season
          })
        }
        
        if (loserTeam) {
          await supabase.rpc('grant_tournament_prize', {
            p_club_id: loserTeam.club_id,
            p_competition_id: cup.id,
            p_competition_type: 'cup',
            p_competition_name: cup.name,
            p_phase_or_rank: 'Vice-Campeão',
            p_amount: getPrize('Final_RunnerUp'),
            p_season_year: cup.season
          })
        }
      } else {
        const winnerId = match.winner_team_id
        const { data: winnerTeam } = await supabase.from('national_cup_teams').select('club_id, club_name').eq('id', winnerId).single()
        
        if (winnerTeam) {
          const amount = getPrize(phaseName) || getPrize(`Fase ${currentRound}`) || 0
          if (amount > 0) {
            await supabase.rpc('grant_tournament_prize', {
              p_club_id: winnerTeam.club_id,
              p_competition_id: cup.id,
              p_competition_type: 'cup',
              p_competition_name: cup.name,
              p_phase_or_rank: phaseName,
              p_amount: amount,
              p_season_year: cup.season
            })
          }
        }
      }
    }

    await supabase.from('national_cups').update({ prizes_paid_current_round: currentRound }).eq('id', cup.id)
    processed.push({ cup_id: cup.id, round: currentRound })
  }
  return processed
}

async function processLeaguePrizes(supabase: any) {
  const processed = []
  const { data: leagues } = await supabase
    .from('world_leagues')
    .select('*')
    .eq('active', true)
    .eq('prizes_paid', false)

  if (!leagues) return []

  for (const league of leagues) {
    const { count: pending } = await supabase
      .from('world_matches')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id)
      .eq('season', league.season)
      .neq('status', 'finished')

    if (pending && pending > 0) continue

    const { data: standings } = await supabase
      .from('league_standings')
      .select('club_id, position, club_name')
      .eq('league_id', league.id)
      .eq('season', league.season)
      .order('position', { ascending: true })

    if (!standings || standings.length === 0) continue

    const { data: config } = await supabase
      .from('prize_configurations')
      .select('*')
      .eq('competition_type', 'league')

    const getPrize = (rank: string) => config?.find((c: any) => c.rank_or_phase === rank)?.amount || 0

    for (const entry of standings) {
      const amount = getPrize(entry.position.toString())
      if (amount > 0) {
        await supabase.rpc('grant_tournament_prize', {
          p_club_id: entry.club_id,
          p_competition_id: league.id,
          p_competition_type: 'league',
          p_competition_name: `${league.country} - Liga ${league.division}`,
          p_phase_or_rank: `Posição ${entry.position}`,
          p_amount: amount,
          p_season_year: league.season
        })
      }
    }

    await supabase.from('world_leagues').update({ prizes_paid: true }).eq('id', league.id)
    processed.push({ league_id: league.id, season: league.season })
  }
  return processed
}

async function processMultiplayerLeaguePrizes(supabase: any) {
  const processed = []
  const { data: leagues } = await supabase
    .from('multiplayer_leagues')
    .select('*')
    .eq('season_status', 'finished')
    .eq('prizes_paid', false)

  if (!leagues) return []

  for (const league of leagues) {
    const { data: standings } = await supabase
      .from('league_standings')
      .select('*')
      .eq('league_id', league.id)
      .order('position', { ascending: true })

    if (!standings || standings.length === 0) continue

    const { data: config } = await supabase
      .from('prize_configurations')
      .select('*')
      .eq('competition_type', 'league')

    const getPrize = (rank: string) => config?.find((c: any) => c.rank_or_phase === rank)?.amount || 0

    for (const entry of standings) {
      // Find club_id by user_id for multiplayer leagues
      const { data: club } = await supabase
        .from('clubs')
        .select('id')
        .eq('user_id', entry.user_id)
        .maybeSingle()
      
      if (!club) continue

      const amount = getPrize(entry.position.toString())
      if (amount > 0) {
        await supabase.rpc('grant_tournament_prize', {
          p_club_id: club.id,
          p_competition_id: league.id,
          p_competition_type: 'multiplayer_league',
          p_competition_name: league.name,
          p_phase_or_rank: `Posição ${entry.position}`,
          p_amount: amount,
          p_season_year: league.season
        })
      }
    }

    await supabase.from('multiplayer_leagues').update({ prizes_paid: true }).eq('id', league.id)
    processed.push({ league_id: league.id, season: league.season })
  }
  return processed
}
