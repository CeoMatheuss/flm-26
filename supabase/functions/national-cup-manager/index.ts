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

    const adminPassword = "ADM112828"
    const requiresAdmin = ['generate_all_national_cups', 'advance_phase', 'reset_cups', 'reconcile_sync'].includes(action)
    
    if (requiresAdmin && password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Senha administrativa inválida' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 1. GERAR TODAS AS COPAS INTEGRADAS ÀS LIGAS
    if (action === 'generate_all_national_cups') {
      // Pega todos os países únicos que possuem ligas ativas
      const { data: countries } = await supabase.from('world_leagues').select('country').eq('active', true);
      const uniqueCountries = [...new Set(countries?.map(c => c.country))];

      if (!uniqueCountries.length) throw new Error("Nenhuma liga encontrada");

      const cupNamesMap: Record<string, string> = {
        'Brasil': 'Copa do Brasil',
        'Espanha': 'Copa del Rey',
        'Inglaterra': 'FA Cup',
        'Alemanha': 'DFB-Pokal',
        'Itália': 'Coppa Italia',
        'França': 'Coupe de France',
        'Portugal': 'Taça de Portugal',
        'Argentina': 'Copa Argentina',
        'Holanda': 'KNVB Beker',
        'Bélgica': 'Belgian Cup',
        'Turquia': 'Türkiye Kupası',
        'Escócia': 'Scottish Cup',
        'Estados Unidos': 'U.S. Open Cup',
        'México': 'Copa MX',
        'Japão': 'Emperor\'s Cup',
        'Arábia Saudita': 'King Cup'
      };

      for (const countryName of uniqueCountries) {
        const officialName = cupNamesMap[countryName] || `Copa de ${countryName}`;

        // Busca a Copa existente ou cria uma nova
        const { data: cup, error: cupError } = await supabase.from('national_cups').upsert({
            name: officialName,
            country_code: countryName,
            season: 1, 
            status: 'scheduled',
            current_round: 1
        }, { onConflict: 'country_code, season' }).select().single();


        if (cupError || !cup) continue;

        // Detecta AUTOMATICAMENTE todos os times das ligas desse país
        const { data: teams } = await supabase.from('world_teams')
            .select('id, name, logo, strength, user_id, league_id')
            .eq('country', countryName);

        if (!teams || teams.length < 2) continue;

        // Se a copa já tem times, pula a inscrição mas garante o total_teams atualizado
        const { count } = await supabase.from('national_cup_teams').select('*', { count: 'exact', head: true }).eq('cup_id', cup.id);
        
        if (!count || count === 0) {
            const cupTeams = teams.map((t, idx) => ({
              cup_id: cup.id,
              club_id: t.id,
              club_name: t.name,
              club_logo: t.logo,
              user_id: t.user_id,
              strength: t.strength,
              league_id: t.league_id,
              is_bot: !t.user_id,
              seed: idx
            }));

            await supabase.from('national_cup_teams').insert(cupTeams);
        }

        // Determina total de fases baseado no número de times (Potência de 2)
        const totalTeams = teams.length;
        const participantsCount = Math.pow(2, Math.floor(Math.log2(totalTeams)));
        const totalRounds = Math.log2(participantsCount);

        await supabase.from('national_cups').update({ 
            total_teams: totalTeams,
            total_rounds: Math.max(totalRounds, 1)
        }).eq('id', cup.id);
        
        // Sorteio inicial (Round 1)
        await drawNextRound(supabase, cup.id, 1);
      }

      return new Response(JSON.stringify({ success: true, message: "Copas geradas e integradas às ligas nacionais." }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 2. SIMULAR E AVANÇAR (Mantendo a lógica diária do passo anterior)
    if (action === 'advance_phase') {
        const now = new Date();
        const { data: activeCups } = await supabase.from('national_cups').select('*').eq('status', 'in_progress');

        if (!activeCups) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

        for (const cup of activeCups) {
            const { data: matches } = await supabase
                .from('national_cup_matches')
                .select(`
                    *,
                    home:national_cup_teams!home_team_id(strength, club_name, user_id),
                    away:national_cup_teams!away_team_id(strength, club_name, user_id)
                `)
                .eq('cup_id', cup.id)
                .in('status', ['scheduled', 'live'])
            // DEBUG: Forçando simulação imediata para teste de nomes e calendário
            // .lte('scheduled_at', now.toISOString());




            if (!matches || matches.length === 0) continue;

            for (const match of matches) {
                // Simulação ultra-rápida (autoritativa)
                const homeS = match.home?.strength || 50;
                const awayS = match.away?.strength || 50;
                const prob = homeS / (homeS + awayS);
                
                const homeGoals = Math.floor(Math.random() * 3) + (Math.random() < prob ? 1 : 0);
                const awayGoals = Math.floor(Math.random() * 3) + (Math.random() < (1-prob) ? 1 : 0);
                
                let winner_id;
                let homePen = null;
                let awayPen = null;

                if (homeGoals > awayGoals) {
                    winner_id = match.home_team_id;
                } else if (awayGoals > homeGoals) {
                    winner_id = match.away_team_id;
                } else {
                    // Empate em Copa = Pênaltis obrigatórios
                    homePen = Math.floor(Math.random() * 5) + 3;
                    awayPen = Math.floor(Math.random() * 5) + 3;
                    if (homePen === awayPen) homePen++; // Desempate simples
                    winner_id = homePen > awayPen ? match.home_team_id : match.away_team_id;
                }

                await supabase.from('national_cup_matches').update({
                    home_score: homeGoals,
                    away_score: awayGoals,
                    home_penalties: homePen,
                    away_penalties: awayPen,
                    status: 'finished',
                    winner_team_id: winner_id,
                    match_data: {
                        stats: {
                            possession: [Math.floor(prob * 100), 100 - Math.floor(prob * 100)],
                            shots: [Math.floor(Math.random() * 15), Math.floor(Math.random() * 15)]
                        }
                    }
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

            const { count: pendingInRound } = await supabase
                .from('national_cup_matches')
                .select('*', { count: 'exact', head: true })
                .eq('cup_id', cup.id)
                .eq('round', cup.current_round)
                .neq('status', 'finished');

            if (pendingInRound === 0) {
                if (cup.current_round < cup.total_rounds) {
                    await drawNextRound(supabase, cup.id, cup.current_round + 1);
                } else {
                    await supabase.from('national_cups').update({ status: 'finished' }).eq('id', cup.id);
                }
            }
        }

        return new Response(JSON.stringify({ success: true, message: "Simulação diária concluída." }), { headers: corsHeaders });
    }

    if (action === 'reset_cups') {
        await supabase.from('national_cups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
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
        startDate = new Date(Date.UTC(year, month, 11, 15, 0, 0)); 
    }

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
        await supabase.from('national_cups').update({ current_round: round, status: 'in_progress' }).eq('id', cupId);
    }
}