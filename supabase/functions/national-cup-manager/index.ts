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

    const { action, password } = await req.json()

    // Validação de senha para ações administrativas
    const adminPassword = "ADM112828"
    const requiresAdmin = ['generate_all_national_cups', 'advance_phase', 'reset_cups', 'reconcile_sync'].includes(action)
    
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
        const { data: existingCup } = await supabase
          .from('national_cups')
          .select('id')
          .eq('country_code', league.country)
          .eq('season', 1) 
          .maybeSingle();
        
        if (existingCup) continue;

        const { data: cup, error: cupError } = await supabase.from('national_cups').insert({
            name: `Copa de ${league.name}`,
            country_code: league.country,
            season: 1,
            status: 'scheduled',
            current_round: 1,
            total_rounds: 0 
        }).select().single()

        if (cupError || !cup) continue

        const { data: teams } = await supabase.from('world_teams')
            .select('id, name, logo, strength, user_id')
            .eq('country', league.country)
            .order('user_id', { ascending: false })

        if (!teams || teams.length < 2) continue

        const participantsCount = Math.pow(2, Math.floor(Math.log2(teams.length)));
        const totalRounds = Math.log2(participantsCount);

        await supabase.from('national_cups').update({ total_rounds: totalRounds }).eq('id', cup.id);

        const participatingTeams = teams.slice(0, participantsCount);

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
        await drawNextRound(supabase, cup.id, 1)
      }

      return new Response(JSON.stringify({ success: true, message: "Copas geradas com agendamento diário." }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. AVANÇAR FASE / SIMULAR JOGOS DO DIA
    if (action === 'advance_phase') {
        const now = new Date();
        const { data: activeCups } = await supabase
            .from('national_cups')
            .select('*')
            .eq('status', 'in_progress')

        if (!activeCups) return new Response(JSON.stringify({ success: true, message: "Nenhuma copa ativa" }), { headers: corsHeaders })

        for (const cup of activeCups) {
            // Simula jogos agendados para hoje ou antes que ainda não foram finalizados
            const { data: matches } = await supabase
                .from('national_cup_matches')
                .select('*')
                .eq('cup_id', cup.id)
                .in('status', ['scheduled', 'live'])
                .lte('scheduled_at', now.toISOString())

            if (!matches || matches.length === 0) continue;

            for (const match of matches) {
                const homeS = match.home_strength || 50;
                const awayS = match.away_strength || 50;
                const prob = homeS / (homeS + awayS);
                
                const homeScore = Math.floor(Math.random() * 3) + (Math.random() < prob ? 1 : 0);
                const awayScore = Math.floor(Math.random() * 3) + (Math.random() < (1-prob) ? 1 : 0);
                
                let winner_id;
                if (homeScore > awayScore) winner_id = match.home_team_id;
                else if (awayScore > homeScore) winner_id = match.away_team_id;
                else winner_id = Math.random() < prob ? match.home_team_id : match.away_team_id;

                await supabase.from('national_cup_matches').update({
                    home_score: homeScore,
                    away_score: awayScore,
                    status: 'finished',
                    winner_team_id: winner_id
                }).eq('id', match.id);

                const loser_id = winner_id === match.home_team_id ? match.away_team_id : match.home_team_id;
                await supabase.from('national_cup_teams').update({ eliminated: true }).eq('id', loser_id);

                const prize = 50000 * Math.pow(2, match.round - 1);
                await supabase.from('national_cup_prizes').insert({
                    cup_id: cup.id,
                    team_id: winner_id,
                    amount: prize,
                    description: `Prêmio Rodada ${match.round}`
                });
            }

            // Verifica se a rodada atual acabou para sortear a próxima
            const { count: pendingInRound } = await supabase
                .from('national_cup_matches')
                .select('*', { count: 'exact', head: true })
                .eq('cup_id', cup.id)
                .eq('round', cup.current_round)
                .neq('status', 'finished');

            if (pendingInRound === 0) {
                if (cup.current_round < cup.total_rounds) {
                    await drawNextRound(supabase, cup.id, cup.current_round + 1)
                } else {
                    await supabase.from('national_cups').update({ status: 'finished' }).eq('id', cup.id)
                }
            }
        }

        return new Response(JSON.stringify({ success: true, message: "Jogos do dia simulados." }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
    }

    if (action === 'reset_cups') {
        await supabase.from('national_cups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
    }

    if (action === 'reconcile_sync') {
        const now = new Date();
        const day = now.getUTCDate();
        if (day >= 11) {
            await supabase.from('national_cups').update({ status: 'in_progress' }).eq('status', 'scheduled');
        }
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
    }

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
        .eq('eliminated', false);

    if (!teams || teams.length < 2) return;

    // Sorteio
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const matches = [];
    
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    
    // Regra: Começa dia 11. Se for rodada posterior, começa no dia seguinte ao fim da anterior.
    // Mas para simplificar e garantir 1 jogo/dia, vamos usar a data da última partida da copa + 1 dia.
    const { data: lastMatch } = await supabase
        .from('national_cup_matches')
        .select('scheduled_at')
        .eq('cup_id', cupId)
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    let startDate: Date;
    if (lastMatch) {
        startDate = new Date(lastMatch.scheduled_at);
        startDate.setUTCDate(startDate.getUTCDate() + 1);
    } else {
        startDate = new Date(Date.UTC(year, month, 11, 15, 0, 0)); // Dia 11 às 12:00 BRT (15:00 UTC)
    }

    // Distribuir jogos: se temos muitos jogos, podemos colocar vários no mesmo dia, 
    // DESDE QUE os times sejam diferentes. Como é knockout e cada time joga 1x por rodada, 
    // todos os jogos de uma rodada PODEM ocorrer no mesmo dia sem violar a regra de "1 jogo por time por dia".
    for (let i = 0; i < shuffled.length; i += 2) {
        if (shuffled[i + 1]) {
            matches.push({
                cup_id: cupId,
                round: round,
                bracket_pos: Math.floor(i / 2),
                home_team_id: shuffled[i].id,
                away_team_id: shuffled[i+1].id,
                scheduled_at: startDate.toISOString(),
                status: 'scheduled',
                stadium: `Estádio ${shuffled[i].club_name}`
            });
        }
    }

    if (matches.length > 0) {
        await supabase.from('national_cup_matches').insert(matches);
        await supabase.from('national_cups').update({ 
            current_round: round
        }).eq('id', cupId);
    }
}