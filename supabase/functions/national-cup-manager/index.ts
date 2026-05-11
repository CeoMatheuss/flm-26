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

    const { action, cupId, countryCode } = await req.json()

    // 1. GERAR TODAS AS COPAS (DIA 10)
    if (action === 'generate_all_national_cups') {
      const { data: leagues } = await supabase.from('world_leagues').select('country_code, name')
      if (!leagues) throw new Error("Nenhuma liga encontrada")

      for (const league of leagues) {
        // Criar a Copa
        const { data: cup, error: cupError } = await supabase.from('national_cups').insert({
            name: `Copa de ${league.name}`,
            country_code: league.country_code,
            season: 1, // Pode ser dinâmico no futuro
            status: 'scheduled',
            current_round: 1,
            total_rounds: 5 // 32 times
        }).select().single()

        if (cupError || !cup) continue

        // Buscar times (Priorizar humanos, depois bots da liga)
        const { data: teams } = await supabase.from('world_teams')
            .select('id, name, logo, strength, user_id')
            .eq('country_code', league.country_code)
            .order('user_id', { ascending: false }) // Humanos primeiro
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
        
        // Sorteio inicial (Round 1)
        await drawNextRound(supabase, cup.id, 1)
      }

      return new Response(JSON.stringify({ success: true, message: "Copas geradas e sorteios realizados" }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. REALIZAR SORTEIO DE UMA FASE
    if (action === 'draw_round') {
      if (!cupId) throw new Error("cupId é obrigatório")
      const { data: cup } = await supabase.from('national_cups').select('*').eq('id', cupId).single()
      if (!cup) throw new Error("Copa não encontrada")

      await drawNextRound(supabase, cupId, cup.current_round)

      return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 3. SIMULAR RODADA (AVANÇAR FASE)
    if (action === 'advance_phase') {
        const { data: activeCups } = await supabase
            .from('national_cups')
            .select('*')
            .eq('status', 'in_progress')

        if (!activeCups) return new Response(JSON.stringify({ success: true, message: "Nenhuma copa ativa" }), { headers: corsHeaders })

        for (const cup of activeCups) {
            // 1. Simular partidas da rodada atual que ainda não terminaram
            const { data: matches } = await supabase
                .from('national_cup_matches')
                .select('*')
                .eq('cup_id', cup.id)
                .eq('round', cup.current_round)
                .eq('status', 'scheduled')

            for (const match of matches) {
                // Simulação rápida para o exemplo (no futuro, chamar o simulador 2D)
                const homeScore = Math.floor(Math.random() * 4)
                const awayScore = Math.floor(Math.random() * 4)
                let winner_team_id = homeScore >= awayScore ? match.home_team_id : match.away_team_id
                
                // Salvar resultado
                await supabase.from('national_cup_matches').update({
                    home_score: homeScore,
                    away_score: awayScore,
                    status: 'finished',
                    winner_team_id: winner_team_id
                }).eq('id', match.id)

                // Eliminar o perdedor
                const loser_team_id = winner_team_id === match.home_team_id ? match.away_team_id : match.home_team_id
                if (loser_team_id) {
                    await supabase.from('national_cup_teams').update({ eliminated: true }).eq('id', loser_team_id)
                }

                // Gerar Notícia
                await supabase.from('newspaper_entries').insert({
                    category: 'RESULTADO',
                    text: `[COPA] ${cup.name}: O time do vencedor avançou após vencer por ${homeScore}x${awayScore}!`,
                })
            }

            // 2. Se não for a final, sortear próxima rodada
            if (cup.current_round < cup.total_rounds) {
                await drawNextRound(supabase, cup.id, cup.current_round + 1)
            } else {
                // Finalizar Copa
                await supabase.from('national_cups').update({ status: 'finished' }).eq('id', cup.id)
            }
        }

        return new Response(JSON.stringify({ success: true, message: "Fases avançadas com sucesso" }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
    }

    // 4. REINICIAR COPAS
    if (action === 'reset_cups') {
        await supabase.from('national_cups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        return new Response(JSON.stringify({ success: true }), { 
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
    // Buscar times não eliminados
    const { data: teams } = await supabase.from('national_cup_teams')
        .select('*')
        .eq('cup_id', cupId)
        .eq('eliminated', false)

    if (!teams || teams.length < 2) return

    // Embaralhar para sorteio real
    const shuffled = teams.sort(() => Math.random() - 0.5)
    const matches = []
    
    // Data do jogo: Começa dia 11, às 12:00
    const kickoff = new Date()
    kickoff.setDate(11 + (round - 1)) // 1 jogo por dia
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
        } else {
            // Bye (passa direto se for ímpar, mas limitamos a 32, 16, 8... então não deve ocorrer)
            await supabase.from('national_cup_teams')
                .update({ eliminated: false }) // Mantém ativo
                .eq('id', shuffled[i].id)
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
