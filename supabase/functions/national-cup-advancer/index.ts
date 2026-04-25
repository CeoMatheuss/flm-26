// National Cup Advancer — simulates due matches, advances rounds, awards continental slot
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple Poisson goal sim with extra time + penalties
function poisson(lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

function simulateMatch(homeStr: number, awayStr: number) {
  const homeAdv = 0.25
  const homeLambda = Math.max(0.4, (homeStr / 25) + homeAdv)
  const awayLambda = Math.max(0.3, awayStr / 28)
  let hg = poisson(homeLambda)
  let ag = poisson(awayLambda)
  let pens = false
  let aet = false
  let pensH = 0, pensA = 0
  if (hg === ag) {
    // extra time
    aet = true
    hg += poisson(homeLambda * 0.3)
    ag += poisson(awayLambda * 0.3)
    if (hg === ag) {
      pens = true
      // shootout — sudden death simplified
      pensH = 3 + Math.floor(Math.random() * 4)
      pensA = 3 + Math.floor(Math.random() * 4)
      while (pensH === pensA) pensA = pensH + (Math.random() < 0.5 ? 1 : -1)
    }
  }
  return { hg, ag, aet, pens, pensH, pensA }
}

const ROUND_STAGES = ['R32', 'R16', 'Quartas', 'Semi', 'Final']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date().toISOString()
  let processedMatches = 0
  let advancedRounds = 0
  let finishedCups = 0

  // 1) Simular partidas vencidas
  const { data: dueMatches } = await supa
    .from('cup_matches')
    .select('id, cup_id, round, home_team_id, away_team_id, scheduled_at')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(200)

  for (const m of dueMatches ?? []) {
    const { data: teams } = await supa
      .from('cup_teams')
      .select('id, user_id, is_bot, bot_strength, club_name')
      .in('id', [m.home_team_id, m.away_team_id])

    const home = teams?.find(t => t.id === m.home_team_id)
    const away = teams?.find(t => t.id === m.away_team_id)
    if (!home || !away) continue

    const homeStr = home.is_bot
      ? (home.bot_strength ?? 60)
      : (await supa.rpc('get_user_team_strength', { _user_id: home.user_id }).then(r => r.data ?? 70))
    const awayStr = away.is_bot
      ? (away.bot_strength ?? 60)
      : (await supa.rpc('get_user_team_strength', { _user_id: away.user_id }).then(r => r.data ?? 70))

    const r = simulateMatch(homeStr, awayStr)

    // Determine winner (home advances on penalties tie)
    let winnerId = home.id, loserId = away.id
    if (r.ag > r.hg || (r.pens && r.pensA > r.pensH)) {
      winnerId = away.id; loserId = home.id
    }

    await supa.from('cup_matches').update({
      home_goals: r.hg,
      away_goals: r.ag,
      status: 'finished',
      played_at: now,
      match_data: { aet: r.aet, pens: r.pens, pensH: r.pensH, pensA: r.pensA, winner_team_id: winnerId },
    }).eq('id', m.id)

    await supa.from('cup_teams').update({ eliminated: true }).eq('id', loserId)
    processedMatches++
  }

  // 2) Avançar rodadas (criar próxima rodada quando todas finalizadas)
  const { data: cups } = await supa
    .from('cup_competitions')
    .select('id, current_round, total_rounds, country, season_year')
    .eq('status', 'in_progress')
    .eq('cup_type', 'national')

  for (const cup of cups ?? []) {
    const { count: pending } = await supa
      .from('cup_matches')
      .select('id', { count: 'exact', head: true })
      .eq('cup_id', cup.id)
      .eq('round', cup.current_round)
      .neq('status', 'finished')

    if ((pending ?? 0) > 0) continue

    // Próxima rodada
    const nextRound = cup.current_round + 1

    if (cup.current_round >= cup.total_rounds) {
      // Copa terminou
      await supa.from('cup_competitions').update({ status: 'finished' }).eq('id', cup.id)
      await supa.rpc('finish_national_cup_award_continental', { _cup_id: cup.id })
      finishedCups++
      continue
    }

    // Pegar vencedores da rodada atual
    const { data: doneMatches } = await supa
      .from('cup_matches')
      .select('id, match_data')
      .eq('cup_id', cup.id)
      .eq('round', cup.current_round)
      .eq('status', 'finished')
      .order('id')

    const winners = (doneMatches ?? [])
      .map(m => (m.match_data as any)?.winner_team_id)
      .filter(Boolean)

    // Datas das rodadas: round 1=dia atual+0 (já criada), 2=+2d, 3=+4d, 4=+6d, 5=+7d
    // Usamos offset relativo à hoje
    const today = new Date()
    const offsets = [0, 2, 4, 6, 7] // R32, R16, QF, SF, F
    const offset = offsets[nextRound - 1] ?? 0
    const matchDate = new Date(today)
    matchDate.setUTCDate(matchDate.getUTCDate() + offset)
    matchDate.setUTCHours(15, 0, 0, 0) // 12h BRT = 15h UTC

    // Criar pares para próxima rodada
    const newMatches: any[] = []
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) {
        newMatches.push({
          cup_id: cup.id,
          round: nextRound,
          leg: 1,
          home_team_id: winners[i],
          away_team_id: winners[i + 1],
          scheduled_at: matchDate.toISOString(),
          status: 'scheduled',
        })
      }
    }

    if (newMatches.length > 0) {
      await supa.from('cup_matches').insert(newMatches)
      await supa.from('cup_competitions').update({ current_round: nextRound }).eq('id', cup.id)
      advancedRounds++
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    processedMatches,
    advancedRounds,
    finishedCups,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
