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
      leagues: []
    }

    if (action === 'process_cups' || action === 'process_all') {
      results.cups = await processCupPrizes(supabase)
    }

    if (action === 'process_leagues' || action === 'process_all') {
      results.leagues = await processLeaguePrizes(supabase)
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
  
  // 1. Find cups where a round is finished but prizes for that round haven't been fully processed
  const { data: cups } = await supabase
    .from('national_cups')
    .select('*')
    .neq('status', 'scheduled')

  if (!cups) return []

  for (const cup of cups) {
    const currentRound = cup.current_round
    
    // Check if prizes were already paid for this round
    if (cup.prizes_paid_current_round >= currentRound) continue

    // Check if all matches for the current round are finished
    const { data: matches, error: mErr } = await supabase
      .from('national_cup_matches')
      .select('id, status, winner_team_id, home_team_id, away_team_id, phase_name')
      .eq('cup_id', cup.id)
      .eq('round', currentRound)

    if (mErr || !matches || matches.length === 0) continue

    const allFinished = matches.every((m: any) => m.status === 'finished')
    if (!allFinished) continue

    // All finished! Let's pay the qualifiers
    const isFinal = currentRound === cup.total_rounds
    const phaseName = matches[0].phase_name || `Fase ${currentRound}`
    
    // Get prize config
    const { data: config } = await supabase
      .from('prize_configurations')
      .select('*')
      .eq('competition_type', 'cup')

    const getPrize = (name: string) => config?.find((c: any) => c.rank_or_phase === name)?.amount || 0

    for (const match of matches) {
      if (isFinal) {
        // Winner gets Final_Winner prize
        const winnerId = match.winner_team_id
        const loserId = winnerId === match.home_team_id ? match.away_team_id : match.home_team_id
        
        // Find club IDs
        const { data: winnerTeam } = await supabase.from('national_cup_teams').select('club_id').eq('id', winnerId).single()
        const { data: loserTeam } = await supabase.from('national_cup_teams').select('club_id').eq('id', loserId).single()
        
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

          // Generate news for Champion
          await supabase.from('cup_news').insert({
            cup_id: cup.id,
            title: `🏆 ${winnerTeam.club_name} É CAMPEÃO!`,
            content: `O ${winnerTeam.club_name} venceu a final e faturou o bônus milionário de campeão!`,
            template_key: 'cup_champion',
            metadata: { team_name: winnerTeam.club_name, competition: cup.name }
          })
          
          await supabase.from('world_league_news').insert({
            title: `🏆 ${winnerTeam.club_name} Campeão da Copa!`,
            content: `Com uma campanha histórica, o ${winnerTeam.club_name} conquista o título e recebe a premiação máxima.`,
            category: 'cup',
            importance: 3
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
        // Winner gets phase prize
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

            // Notification news
            await supabase.from('cup_news').insert({
              cup_id: cup.id,
              title: `Premiação: ${winnerTeam.club_name}`,
              content: `${winnerTeam.club_name} recebeu a premiação pela classificação para a próxima fase (${phaseName}).`,
              template_key: 'cup_advance',
              metadata: { team_name: winnerTeam.club_name, competition: cup.name, phase: phaseName }
            })
          }
        }
      }
    }

    // Mark round as paid
    await supabase.from('national_cups').update({ prizes_paid_current_round: currentRound }).eq('id', cup.id)
    processed.push({ cup_id: cup.id, round: currentRound })
  }

  return processed
}

async function processLeaguePrizes(supabase: any) {
  const processed = []

  // 1. Find leagues that finished and haven't paid prizes
  // A league is finished if current_matchday >= 38 (for 20 teams) and status is 'finished' or all matches are played
  const { data: leagues } = await supabase
    .from('world_leagues')
    .select('*')
    .eq('active', true)
    .eq('prizes_paid', false)

  if (!leagues) return []

  for (const league of leagues) {
    // Check if all matches for the season are finished
    const { count: pending } = await supabase
      .from('world_matches')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id)
      .eq('season', league.season)
      .neq('status', 'finished')

    // If matches are still pending, we don't pay
    if (pending && pending > 0) continue

    // Double check if there are matches at all
    const { count: total } = await supabase
      .from('world_matches')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id)
      .eq('season', league.season)
    
    if (!total || total === 0) continue

    // League is finished! Let's get the final standings
    // We assume there's a table league_standings or similar that is kept up-to-date
    // Or we calculate it now. The migration list showed 'league_standings'.
    const { data: standings, error: sErr } = await supabase
      .from('league_standings')
      .select('club_id, position, club_name')
      .eq('league_id', league.id)
      .eq('season', league.season)
      .order('position', { ascending: true })

    if (sErr || !standings || standings.length === 0) continue

    // Get prize config
    const { data: config } = await supabase
      .from('prize_configurations')
      .select('*')
      .eq('competition_type', 'league')

    const getPrize = (rank: string) => config?.find((c: any) => c.rank_or_phase === rank)?.amount || config?.find((c: any) => c.rank_or_phase === 'participation')?.amount || 0

    for (const entry of standings) {
      const amount = getPrize(entry.position.toString())
      if (amount > 0) {
        await supabase.rpc('grant_tournament_prize', {
          p_club_id: entry.club_id,
          p_competition_id: league.id,
          p_competition_type: 'league',
          p_competition_name: `${league.country} - Division ${league.division}`,
          p_phase_or_rank: `Posição ${entry.position}`,
          p_amount: amount,
          p_season_year: league.season
        })
      }
    }

    // Generate Global League News
    await supabase.from('world_league_news').insert({
      league_id: league.id,
      title: `Temporada Encerrada: ${league.country}`,
      content: `A temporada da liga foi oficialmente encerrada e todas as premiações por posição foram distribuídas aos clubes.`,
      category: 'league',
      importance: 3
    })

    // Mark league as paid
    await supabase.from('world_leagues').update({ prizes_paid: true, status: 'finished' }).eq('id', league.id)
    processed.push({ league_id: league.id, season: league.season })
  }

  return processed
}
