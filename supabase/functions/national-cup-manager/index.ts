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

    // Validação de senha para ações administrativas
    const adminPassword = "ADM112828"
    const requiresAdmin = ['generate_all_national_cups', 'advance_phase', 'reset_cups'].includes(action)
    
    if (requiresAdmin && password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Senha administrativa inválida' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 1. GERAR TODAS AS COPAS (DIA 10)
    if (action === 'generate_all_national_cups') {
      const { data: leagues } = await supabase.from('world_leagues').select('country_code, name')
      if (!leagues) throw new Error("Nenhuma liga encontrada")

      for (const league of leagues) {
        // Criar a Copa
        const { data: cup, error: cupError } = await supabase.from('national_cups').insert({
            name: `Copa de ${league.name}`,
            country_code: league.country_code,
            season: 1,
            status: 'scheduled',
            current_round: 1,
            total_rounds: 5 // 32 times
        }).select().single()

        if (cupError || !cup) continue

        // Buscar times (Priorizar humanos ativos, depois bots da liga)
        const { data: teams } = await supabase.from('world_teams')
            .select('id, name, logo, strength, user_id')
            .eq('country_code', league.country_code)
            .order('user_id', { ascending: false })
            .limit(32)

        if (!teams || teams.length < 2) continue

        // Inscrever times
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
        
        // Sorteio inicial (Round 1) - Jogos começam dia 11
        await drawNextRound(supabase, cup.id, 1)
      }

      return new Response(JSON.stringify({ success: true, message: "Copas geradas e sorteios realizados para o dia 11." }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. AVANÇAR FASE (SIMULAR RODADA)
    if (action === 'advance_phase') {
        const { data: activeCups } = await supabase
            .from('national_cups')
            .select('*')
            .eq('status', 'in_progress')

        if (!activeCups) return new Response(JSON.stringify({ success: true, message: "Nenhuma copa ativa" }), { headers: corsHeaders })

        for (const cup of activeCups) {
            const { data: matches } = await supabase
                .from('national_cup_matches')
                .select('*')
                .eq('cup_id', cup.id)
                .eq('round', cup.current_round)
                .eq('status', 'scheduled')

            for (const match of matches) {
                // Simulação rápida (integrar com simulador 2D no futuro)
                const homeScore = Math.floor(Math.random() * 4)
                const awayScore = Math.floor(Math.random() * 4)
                const winner_team_id = homeScore >= awayScore ? match.home_team_id : match.away_team_id
                
                await supabase.from('national_cup_matches').update({
                    home_score: homeScore,
                    away_score: awayScore,
                    status: 'finished',
                    winner_team_id: winner_team_id
                }).eq('id', match.id)

                const loser_team_id = winner_team_id === match.home_team_id ? match.away_team_id : match.home_team_id
                if (loser_team_id) {
                    await supabase.from('national_cup_teams').update({ eliminated: true }).eq('id', loser_team_id)
                }

                // Premiação por fase (exemplo: 50k por vitória)
                await supabase.from('national_cup_prizes').insert({
                    cup_id: cup.id,
                    team_id: winner_team_id,
                    amount: 50000,
                    description: `Prêmio Rodada ${cup.current_round}`
                })

                // Jornal
                await supabase.from('newspaper_entries').insert({
                    category: 'COPA',
                    text: `[COPA] ${cup.name}: O ${homeScore >= awayScore ? 'Mandante' : 'Visitante'} avançou para a próxima fase!`,
                })
            }

            if (cup.current_round < cup.total_rounds) {
                await drawNextRound(supabase, cup.id, cup.current_round + 1)
            } else {
                await supabase.from('national_cups').update({ status: 'finished' }).eq('id', cup.id)
            }
        }

        return new Response(JSON.stringify({ success: true, message: "Rodada simulada e fases avançadas" }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
    }

    // 3. REINICIAR COPAS
    if (action === 'reset_cups') {
        await supabase.from('national_cups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        return new Response(JSON.stringify({ success: true, message: "Todas as copas foram removidas" }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

async function drawNextRound(supabase: any, cupId: string, round: number) {
    const { data: teams } = await supabase.from('national_cup_teams')
        .select('*')
        .eq('cup_id', cupId)
        .eq('eliminated', false)

    if (!teams || teams.length < 2) return

    const shuffled = teams.sort(() => Math.random() - 0.5)
    const matches = []
    
    // Jogos às 12:00, começando dia 11. 1 jogo por dia (round)
    const kickoff = new Date()
    kickoff.setDate(11 + (round - 1))
    kickoff.setHours(12, 0, 0, 0)

    for (let i = 0; i < shuffled.length; i += 2) {
        if (shuffled[i + 1]) {
            matches.push({
                cup_id: cupId,
                round: round,
                bracket_pos: Math.floor(i / 2),
                home_team_id: shuffled[i].id,
                away_team_id: shuffled[i+1].id,
                scheduled_at: kickoff.toISOString(),
                status: 'scheduled'
            })
        }
    }

    if (matches.length > 0) {
        await supabase.from('national_cup_matches').insert(matches)
        await supabase.from('national_cups').update({ 
            status: 'in_progress',
            current_round: round
        }).eq('id', cupId)
    }
}
