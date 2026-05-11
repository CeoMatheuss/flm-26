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

    const { action, cupId, countryCode, password } = await req.json()

    // 1. GERAR TODAS AS COPAS (Pode ser via Cron ou Botão Admin)
    if (action === 'generate_all_national_cups') {
      const { data: leagues } = await supabase.from('world_leagues').select('country, name')
      if (!leagues) throw new Error("Nenhuma liga encontrada")

      for (const league of leagues) {
        // Criar a Copa se não existir na season atual
        const { data: cup, error: cupError } = await supabase.from('national_cups').upsert({
            name: `Copa de ${league.name}`,
            country_code: league.country,
            season: 1, // TODO: Dynamic season
            status: 'in_progress',
            current_round: 1
        }, { onConflict: 'country_code, season' }).select().single()

        if (cupError || !cup) continue

        // Buscar times do país (Prioriza humanos, preenche com bots)
        const { data: teams } = await supabase.from('world_teams')
            .select('id, name, logo, strength, user_id')
            .eq('country', league.country)
            .limit(64) // Padrão 64 times (Round of 64)

        if (!teams || teams.length < 2) continue

        // Se já houver times na copa, não re-inscreve
        const { count } = await supabase.from('national_cup_teams').select('*', { count: 'exact', head: true }).eq('cup_id', cup.id)
        if (count && count > 0) continue

        const cupTeams = teams.map((t, idx) => ({
          cup_id: cup.id,
          club_id: t.id,
          club_name: t.name,
          club_logo: t.logo,
          user_id: t.user_id,
          strength: t.strength,
          is_bot: !t.user_id,
          seed: idx
        }))

        await supabase.from('national_cup_teams').insert(cupTeams)
        
        // Sorteio inicial (Round 1)
        await drawNextRound(supabase, cup.id, 1)
      }

      return new Response(JSON.stringify({ success: true, message: "Copas geradas" }), { headers: corsHeaders })
    }

    // 2. SIMULAR RODADA E AVANÇAR
    if (action === 'advance_phase') {
        const { data: activeCups } = await supabase.from('national_cups').select('*').eq('status', 'in_progress')
        if (!activeCups) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

        for (const cup of activeCups) {
            const { data: matches } = await supabase.from('national_cup_matches')
                .select('*')
                .eq('cup_id', cup.id)
                .eq('round', cup.current_round)
                .eq('status', 'scheduled')

            for (const match of matches) {
                // Simulação ultra-rápida (autoritativa)
                const homeS = match.home_strength || 50;
                const awayS = match.away_strength || 50;
                const prob = homeS / (homeS + awayS);
                
                const homeGoals = Math.floor(Math.random() * 3) + (Math.random() < prob ? 1 : 0);
                const awayGoals = Math.floor(Math.random() * 3) + (Math.random() < (1-prob) ? 1 : 0);
                
                let winner;
                if (homeGoals > awayGoals) winner = match.home_team_id;
                else if (awayGoals > homeGoals) winner = match.away_team_id;
                else winner = Math.random() < prob ? match.home_team_id : match.away_team_id;

                await supabase.from('national_cup_matches').update({
                    home_score: homeGoals,
                    away_score: awayGoals,
                    status: 'finished',
                    winner_team_id: winner
                }).eq('id', match.id)

                const loser = winner === match.home_team_id ? match.away_team_id : match.home_team_id;
                await supabase.from('national_cup_teams').update({ eliminated: true }).eq('id', loser)

                // Pagar prêmio (50k por avanço)
                await supabase.from('national_cup_prizes').insert({
                    cup_id: cup.id,
                    team_id: winner,
                    amount: 50000,
                    description: `Prêmio Rodada ${cup.current_round}`
                })
            }

            // Gerar próxima rodada ou finalizar
            const { data: stillAlive } = await supabase.from('national_cup_teams').select('id').eq('cup_id', cup.id).eq('eliminated', false)
            if (stillAlive && stillAlive.length > 1) {
                await drawNextRound(supabase, cup.id, cup.current_round + 1)
            } else {
                await supabase.from('national_cups').update({ status: 'finished' }).eq('id', cup.id)
            }
        }
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})

async function drawNextRound(supabase: any, cupId: string, round: number) {
    const { data: teams } = await supabase.from('national_cup_teams')
        .select('id, strength, club_name')
        .eq('cup_id', cupId)
        .eq('eliminated', false)

    if (!teams || teams.length < 2) return

    // Embaralhar
    teams.sort(() => Math.random() - 0.5)

    const matches = []
    const scheduledAt = new Date()
    scheduledAt.setHours(12, 0, 0, 0) // Sempre às 12:00

    for (let i = 0; i < teams.length; i += 2) {
        if (teams[i+1]) {
            matches.push({
                cup_id: cupId,
                round: round,
                bracket_pos: Math.floor(i / 2),
                home_team_id: teams[i].id,
                away_team_id: teams[i+1].id,
                status: 'scheduled',
                scheduled_at: scheduledAt.toISOString(),
                stadium: `Estádio ${teams[i].club_name}`
            })
        }
    }

    if (matches.length > 0) {
        await supabase.from('national_cup_matches').insert(matches)
        await supabase.from('national_cups').update({ 
            current_round: round,
            total_rounds: Math.max(round, 1) // simplificado
        }).eq('id', cupId)
    }
}