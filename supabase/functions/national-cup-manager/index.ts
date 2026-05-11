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

    // 1. GERAR TODAS AS COPAS (DIA 10 - PRÉ-PRODUÇÃO)
    if (action === 'generate_all_national_cups') {
      const { data: leagues } = await supabase.from('world_leagues').select('country, name')
      if (!leagues) throw new Error("Nenhuma liga encontrada")

      for (const league of leagues) {
        // Verificar se já existe copa para este país nesta temporada
        const { data: existingCup } = await supabase
          .from('national_cups')
          .select('id')
          .eq('country_code', league.country)
          .eq('season', 1) // TODO: Pegar season dinâmica
          .maybeSingle();
        
        if (existingCup) continue;

        // Criar a Copa em status 'scheduled' (Pronta para o dia 11)
        const { data: cup, error: cupError } = await supabase.from('national_cups').insert({
            name: `Copa de ${league.name}`,
            country_code: league.country,
            season: 1,
            status: 'scheduled',
            current_round: 1,
            total_rounds: 0 
        }).select().single()

        if (cupError || !cup) continue

        // Buscar times (Priorizar humanos ativos, depois bots da liga)
        const { data: teams } = await supabase.from('world_teams')
            .select('id, name, logo, strength, user_id')
            .eq('country', league.country)
            .order('user_id', { ascending: false })

        if (!teams || teams.length < 2) continue

        // Power of 2 for brackets (32, 64, 128...)
        const participantsCount = Math.pow(2, Math.floor(Math.log2(teams.length)));
        const totalRounds = Math.log2(participantsCount);

        await supabase.from('national_cups').update({ total_rounds: totalRounds }).eq('id', cup.id);

        const participatingTeams = teams.slice(0, participantsCount);

        // Inscrever times
        const cupTeams = participatingTeams.map((t, idx) => ({
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
        
        // Sorteio inicial (Round 1) - Jogos agendados para começar dia 11
        // drawNextRound já cuida de colocar status 'scheduled' nas partidas
        await drawNextRound(supabase, cup.id, 1)
      }

      return new Response(JSON.stringify({ success: true, message: "Copas pré-produzidas no dia 10. Início automático dia 11." }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
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
    // 3. REINICIAR COPAS
    if (action === 'reset_cups') {
        await supabase.from('national_cups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        return new Response(JSON.stringify({ success: true, message: "Todas as copas foram removidas" }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
    }

    // 4. RECONCILIAR / SINCRONIZAR / ATIVAR
    if (action === 'reconcile_sync') {
        const now = new Date();
        const day = now.getUTCDate(); // Usar UTC para consistência
        
        // Ativação automática no dia 11
        if (day >= 11) {
            await supabase
                .from('national_cups')
                .update({ status: 'in_progress' })
                .eq('status', 'scheduled');
        }

        const { data: cups } = await supabase.from('national_cups').select('*').neq('status', 'finished')
        if (cups) {
            for (const cup of cups) {
                const { count: pending } = await supabase.from('national_cup_matches')
                    .select('*', { count: 'exact', head: true })
                    .eq('cup_id', cup.id)
                    .eq('round', cup.current_round)
                    .eq('status', 'scheduled')
                
                // Se não há mais jogos agendados na rodada atual e a copa está em progresso
                if (pending === 0 && cup.status === 'in_progress') {
                    if (cup.current_round < cup.total_rounds) {
                        await drawNextRound(supabase, cup.id, cup.current_round + 1)
                    } else {
                        await supabase.from('national_cups').update({ status: 'finished' }).eq('id', cup.id)
                    }
                }
            }
        }
        return new Response(JSON.stringify({ success: true, message: "Sincronização e ativação concluídas" }), { headers: corsHeaders })
    }

    if (matches.length > 0) {
        await supabase.from('national_cup_matches').insert(matches)
        await supabase.from('national_cups').update({ 
            current_round: round,
            total_rounds: Math.max(round, 1) // simplificado
        }).eq('id', cupId)
    }
}