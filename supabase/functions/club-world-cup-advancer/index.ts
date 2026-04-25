// Club World Cup Advancer — simulates due matches and advances stages
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= Math.random() } while (p > L)
  return k - 1
}

function simulate(homeStr: number, awayStr: number, allowDraw = true) {
  const homeAdv = 0.2
  const homeLambda = Math.max(0.5, (homeStr / 25) + homeAdv)
  const awayLambda = Math.max(0.4, awayStr / 28)
  let hg = poisson(homeLambda)
  let ag = poisson(awayLambda)
  let aet = false, pens = false, pensH = 0, pensA = 0
  if (!allowDraw && hg === ag) {
    aet = true
    hg += poisson(homeLambda * 0.3)
    ag += poisson(awayLambda * 0.3)
    if (hg === ag) {
      pens = true
      pensH = 3 + Math.floor(Math.random() * 4)
      pensA = 3 + Math.floor(Math.random() * 4)
      while (pensH === pensA) pensA = pensH + (Math.random() < 0.5 ? 1 : -1)
    }
  }
  return { hg, ag, aet, pens, pensH, pensA }
}

async function teamStrength(supa: any, t: any): Promise<number> {
  if (t.is_bot) return t.bot_strength ?? 75
  const { data } = await supa.rpc('get_user_team_strength', { _user_id: t.user_id })
  return data ?? 75
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date().toISOString()
  let processedMatches = 0
  let advancedStages = 0
  let finishedCups = 0

  // 1) Simular partidas vencidas
  const { data: dueMatches } = await supa
    .from('club_world_cup_matches')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(200)

  for (const m of dueMatches ?? []) {
    const { data: teams } = await supa
      .from('club_world_cup_teams')
      .select('id, user_id, is_bot, bot_strength')
      .in('id', [m.home_team_id, m.away_team_id])

    const home = teams?.find((t: any) => t.id === m.home_team_id)
    const away = teams?.find((t: any) => t.id === m.away_team_id)
    if (!home || !away) continue

    const homeStr = await teamStrength(supa, home)
    const awayStr = await teamStrength(supa, away)
    const allowDraw = m.stage === 'groups'
    const r = simulate(homeStr, awayStr, allowDraw)

    let winnerId: string | null = null
    if (!allowDraw) {
      if (r.hg > r.ag || (r.pens && r.pensH > r.pensA)) winnerId = home.id
      else winnerId = away.id
    }

    await supa.from('club_world_cup_matches').update({
      home_goals: r.hg, away_goals: r.ag, status: 'finished', played_at: now,
      match_data: { aet: r.aet, pens: r.pens, pensH: r.pensH, pensA: r.pensA, winner_team_id: winnerId },
    }).eq('id', m.id)

    // Atualizar standings (apenas grupos)
    if (m.stage === 'groups') {
      const homePts = r.hg > r.ag ? 3 : (r.hg === r.ag ? 1 : 0)
      const awayPts = r.ag > r.hg ? 3 : (r.hg === r.ag ? 1 : 0)
      await supa.rpc('cwc_update_standings', {
        _home_id: home.id, _away_id: away.id,
        _hg: r.hg, _ag: r.ag, _hp: homePts, _ap: awayPts
      }).then(() => {}).catch(async () => {
        // fallback inline update if RPC missing
        await supa.from('club_world_cup_teams').update({
          played: (home as any).played + 1 || 1
        }).eq('id', home.id)
      })
    } else if (winnerId) {
      const loserId = winnerId === home.id ? away.id : home.id
      await supa.from('club_world_cup_teams').update({ eliminated: true }).eq('id', loserId)
    }

    processedMatches++
  }

  // 2) Avançar entre estágios
  const { data: cups } = await supa
    .from('club_world_cups')
    .select('id, current_stage, current_round, name')
    .in('status', ['groups', 'knockout'])

  const STAGE_DAYS: Record<string, number> = { r16: 24, qf: 25, sf: 26, final: 27 }

  for (const cup of cups ?? []) {
    const { count: pending } = await supa
      .from('club_world_cup_matches')
      .select('id', { count: 'exact', head: true })
      .eq('cup_id', cup.id)
      .eq('stage', cup.current_stage)
      .neq('status', 'finished')

    if ((pending ?? 0) > 0) continue

    if (cup.current_stage === 'groups') {
      // Final round of groups: apurar top 2 de cada grupo e gerar R16
      const { data: standings } = await supa
        .from('club_world_cup_teams')
        .select('id, group_letter, points, goals_for, goals_against')
        .eq('cup_id', cup.id)
        .order('group_letter')
        .order('points', { ascending: false })

      const groups: Record<string, any[]> = {}
      for (const t of standings ?? []) {
        if (!t.group_letter) continue
        groups[t.group_letter] = groups[t.group_letter] || []
        groups[t.group_letter].push(t)
      }

      const advancers: Record<string, { first: string, second: string }> = {}
      const eliminatedIds: string[] = []
      for (const [letter, teams] of Object.entries(groups)) {
        teams.sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against) || b.goals_for - a.goals_for)
        advancers[letter] = { first: teams[0].id, second: teams[1].id }
        for (const t of teams.slice(2)) eliminatedIds.push(t.id)
      }

      if (eliminatedIds.length) {
        await supa.from('club_world_cup_teams').update({ eliminated: true }).in('id', eliminatedIds)
      }

      // Pares R16: 1A x 2B, 1C x 2D, 1E x 2F, 1G x 2H, 1B x 2A, 1D x 2C, 1F x 2E, 1H x 2G
      const pairs = [
        ['A', 'B'], ['C', 'D'], ['E', 'F'], ['G', 'H'],
        ['B', 'A'], ['D', 'C'], ['F', 'E'], ['H', 'G'],
      ]
      const today = new Date()
      const r16Date = new Date(today)
      r16Date.setUTCDate(r16Date.getUTCDate() + (STAGE_DAYS.r16 - 22))
      r16Date.setUTCHours(0, 0, 0, 0) // 21h BRT = 00h UTC do dia seguinte

      const r16Matches = pairs.map(([g1, g2]) => ({
        cup_id: cup.id, stage: 'r16', round: 1,
        home_team_id: advancers[g1].first,
        away_team_id: advancers[g2].second,
        scheduled_at: r16Date.toISOString(),
        status: 'scheduled',
      }))
      await supa.from('club_world_cup_matches').insert(r16Matches)
      await supa.from('club_world_cups').update({ status: 'knockout', current_stage: 'r16' }).eq('id', cup.id)
      advancedStages++
      continue
    }

    // Avançar entre estágios eliminatórios
    const stageOrder = ['r16', 'qf', 'sf', 'final']
    const idx = stageOrder.indexOf(cup.current_stage)
    if (idx === -1) continue

    if (cup.current_stage === 'final') {
      // Premiar e finalizar
      await supa.rpc('award_club_world_cup_prizes', { _cup_id: cup.id })
      finishedCups++
      continue
    }

    const nextStage = stageOrder[idx + 1]
    const { data: doneMatches } = await supa
      .from('club_world_cup_matches')
      .select('id, match_data')
      .eq('cup_id', cup.id)
      .eq('stage', cup.current_stage)
      .eq('status', 'finished')
      .order('id')

    const winners = (doneMatches ?? [])
      .map((m: any) => m.match_data?.winner_team_id)
      .filter(Boolean)

    const today = new Date()
    const nextDate = new Date(today)
    nextDate.setUTCDate(nextDate.getUTCDate() + (STAGE_DAYS[nextStage] - 22))
    nextDate.setUTCHours(0, 0, 0, 0)

    const nextMatches: any[] = []
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) {
        nextMatches.push({
          cup_id: cup.id, stage: nextStage, round: 1,
          home_team_id: winners[i], away_team_id: winners[i + 1],
          scheduled_at: nextDate.toISOString(), status: 'scheduled',
        })
      }
    }

    if (nextMatches.length) {
      await supa.from('club_world_cup_matches').insert(nextMatches)
      await supa.from('club_world_cups').update({ current_stage: nextStage }).eq('id', cup.id)
      advancedStages++
    }
  }

  return new Response(JSON.stringify({ ok: true, processedMatches, advancedStages, finishedCups }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
