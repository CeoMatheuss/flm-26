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
    
    // For automatic calls, we might want to skip password but keep it for manual
    const isInternal = req.headers.get('x-internal-call') === 'true'
    const requiresAdmin = ['generate_all_national_cups', 'advance_phase', 'reset_cups'].includes(action)
    
    if (requiresAdmin && !isInternal && password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (action === 'generate_all_national_cups') {
      const { data: leagues } = await supabase.from('world_leagues').select('country').eq('active', true);
      const uniqueCountries = [...new Set(leagues?.map(c => c.country))];

      for (const country of uniqueCountries) {
        const name = `Copa de ${country}`;
        const { data: cup } = await supabase.from('national_cups').upsert({
          name, country_code: country, season: 1, status: 'scheduled', current_round: 1
        }, { onConflict: 'country_code, season' }).select().single();

        if (!cup) continue;

        const { data: teams } = await supabase.from('world_teams').select('*').eq('country', country);
        if (!teams || teams.length < 2) continue;

        // Use ALL teams (online + bots) for the cup
        // The total number of teams should ideally be a power of 2 for a perfect knockout bracket
        // If it's not a power of 2, we cap it or we could implement "byes", but the current engine prefers power of 2.
        const participantsCount = Math.pow(2, Math.floor(Math.log2(teams.length)));
        
        // Sort teams: priority to humans, then strength
        const selectedTeams = teams
          .sort((a: any, b: any) => {
            if (a.user_id && !b.user_id) return -1;
            if (!a.user_id && b.user_id) return 1;
            return b.strength - a.strength;
          })
          .slice(0, participantsCount);

        const cupTeams = selectedTeams.map((t: any, idx: number) => ({
          cup_id: cup.id, club_id: t.id, club_name: t.name, club_logo: t.logo,
          user_id: t.user_id, strength: t.strength, is_bot: !t.user_id, seed: idx
        }));

        await supabase.from('national_cup_teams').delete().eq('cup_id', cup.id);
        await supabase.from('national_cup_teams').insert(cupTeams);
        await supabase.from('national_cups').update({ 
          total_teams: participantsCount, total_rounds: Math.log2(participantsCount) 
        }).eq('id', cup.id);
        
        for (const ct of cupTeams) {
          await grantPrize(supabase, ct.club_id, 100000, "Participação na Copa", cup.id);
        }

        await drawNextRound(supabase, cup.id, 1, Math.log2(participantsCount));
        await createCupNews(supabase, cup.id, `Copa de ${country} Iniciada!`, `O sorteio foi realizado e ${participantsCount} times começam a busca pelo troféu.`);
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === 'advance_phase' || action === 'check_overdue_cups') {
      const { data: activeCups } = await supabase.from('national_cups').select('*').eq('status', 'in_progress');
      if (!activeCups) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

      // 12h overdue threshold: só auto-simula se a partida NÃO começou no horário marcado há mais de 12h
      const OVERDUE_MS = 12 * 60 * 60 * 1000;
      const overdueIso = new Date(Date.now() - OVERDUE_MS).toISOString();
      let autoSimulated = 0;

      for (const cup of activeCups) {
        // Pega TODAS as fases pendentes da copa (não apenas a current_round) para evitar travas
        const { data: matches } = await supabase.from('national_cup_matches')
          .select('*, home:national_cup_teams!home_team_id(*), away:national_cup_teams!away_team_id(*)')
          .eq('cup_id', cup.id).eq('status', 'scheduled')
          .lte('scheduled_at', overdueIso);

        if (matches && matches.length > 0) {
          for (const match of matches) {
            if (!match.home || !match.away) continue;
            const result = simulateMatch(match.home.strength, match.away.strength);
            const winnerId = result.winnerId === 'home' ? match.home_team_id : match.away_team_id;
            const loserId = result.winnerId === 'home' ? match.away_team_id : match.home_team_id;

            await supabase.from('national_cup_matches').update({
              home_score: result.homeGoals, away_score: result.awayGoals,
              home_penalties: result.homePen, away_penalties: result.awayPen,
              status: 'finished', winner_team_id: winnerId,
              auto_simulated: true,
            }).eq('id', match.id);

            await supabase.from('national_cup_teams').update({ eliminated: true }).eq('id', loserId);

            const prize = getPrizeForRound(match.round, cup.total_rounds);
            await grantPrize(supabase, winnerId, prize, `Prêmio Rodada ${match.round} (auto)`, cup.id);
            await assignGoalsToPlayers(supabase, winnerId, result.winnerId === 'home' ? result.homeGoals : result.awayGoals, cup.id);
            await assignGoalsToPlayers(supabase, loserId, result.winnerId === 'home' ? result.awayGoals : result.homeGoals, cup.id);
            autoSimulated++;
          }
        }

        // Após simular vencidos, verifica se a fase atual terminou para sortear a próxima
        const { count: pending } = await supabase.from('national_cup_matches')
          .select('*', { count: 'exact', head: true })
          .eq('cup_id', cup.id).eq('round', cup.current_round).neq('status', 'finished');

        if (pending === 0) {
          if (cup.current_round < cup.total_rounds) {
            await drawNextRound(supabase, cup.id, cup.current_round + 1, cup.total_rounds);
            await createCupNews(supabase, cup.id, `Próxima Fase Sorteada!`, `Os classificados já conhecem seus adversários na próxima fase.`);
          } else {
            await supabase.from('national_cups').update({ status: 'finished' }).eq('id', cup.id);
            const { data: winnerMatch } = await supabase.from('national_cup_matches')
              .select('winner_team_id').eq('cup_id', cup.id).eq('round', cup.total_rounds).single();
            if (winnerMatch) {
              await supabase.from('national_cups').update({ winner_team_id: winnerMatch.winner_team_id }).eq('id', cup.id);
              await createCupNews(supabase, cup.id, `🏆 TEMOS UM CAMPEÃO!`, `Fim de torneio! A taça da ${cup.name} tem dono.`);
              await grantPrize(supabase, winnerMatch.winner_team_id, 10000000, "Campeão da Copa", cup.id);
              await processEndOfCupBonuses(supabase, cup.id);
            }
          }
        }
      }
      return new Response(JSON.stringify({ success: true, auto_simulated: autoSimulated, cups_checked: activeCups.length }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})

// Próximo horário fixo de Copa: 15:00 BRT (18:00 UTC) do próximo dia
function nextCupKickoff(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(18, 0, 0, 0);
  return d;
}

function simulateMatch(homeS: number, awayS: number) {
  const prob = homeS / (homeS + awayS);
  let hG = Math.floor(Math.random() * 3) + (Math.random() < prob ? 1 : 0);
  let aG = Math.floor(Math.random() * 3) + (Math.random() < (1-prob) ? 1 : 0);
  
  let winnerId: 'home' | 'away' = hG > aG ? 'home' : 'away';
  let hP = null, aP = null;

  if (hG === aG) {
    hP = Math.floor(Math.random() * 5) + 3;
    aP = Math.floor(Math.random() * 5) + 3;
    while (hP === aP) if (Math.random() > 0.5) hP++; else aP++;
    winnerId = hP > aP ? 'home' : 'away';
  }
  return { homeGoals: hG, awayGoals: aG, homePen: hP, awayPen: aP, winnerId };
}

async function drawNextRound(supabase: any, cupId: string, round: number, total: number) {
  // Idempotency: don't draw if matches already exist for this round
  const { count: existing } = await supabase.from('national_cup_matches')
    .select('*', { count: 'exact', head: true }).eq('cup_id', cupId).eq('round', round);
  if ((existing ?? 0) > 0) {
    await supabase.from('national_cups').update({ current_round: round, status: 'in_progress' }).eq('id', cupId);
    return;
  }
  const { data: teams } = await supabase.from('national_cup_teams').select('*').eq('cup_id', cupId).eq('eliminated', false);
  if (!teams || teams.length < 2) return;
  // Cap to expected size for this round (handles legacy duplicates): expected = total_teams / 2^(round-1)

  const shuffled = teams.sort(() => Math.random() - 0.5);
  const matches = [];
  const phaseName = getPhaseName(round, total);

  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      matches.push({
        cup_id: cupId, round, bracket_pos: i / 2,
        home_team_id: shuffled[i].id, away_team_id: shuffled[i+1].id,
        status: 'scheduled', phase_name: phaseName,
        scheduled_at: nextCupKickoff().toISOString()
      });
    }
  }
  if (matches.length) {
    await supabase.from('national_cup_matches').insert(matches);
    await supabase.from('national_cups').update({ current_round: round, status: 'in_progress' }).eq('id', cupId);
  }
}

function getPhaseName(round: number, total: number) {
  const rem = total - round;
  if (rem === 0) return "Final";
  if (rem === 1) return "Semifinal";
  if (rem === 2) return "Quartas de Final";
  if (rem === 3) return "Oitavas de Final";
  return `Fase ${round}`;
}

function getPrizeForRound(round: number, total: number) {
  const rem = total - round;
  // Based on user requirements:
  // Final (Campeão) -> 10M (granted via winner logic)
  // Semifinal -> 5M
  // Quartas -> 2M
  // Oitavas -> 1M
  // Round 3 -> 500K
  // Round 2 -> 500K
  // Round 1 -> 250K
  
  if (rem === 0) return 10000000;
  if (rem === 1) return 5000000;
  if (rem === 2) return 2000000;
  if (rem === 3) return 1000000;
  if (round === 3) return 500000;
  if (round === 2) return 500000;
  if (round === 1) return 250000;
  return 100000;
}

async function grantPrize(supabase: any, target: string, amount: number, desc: string, cupId: string) {
  // target can be club_id (legacy/internal) or national_cup_teams.id
  let clubId = target;
  let userId = null;
  let teamId = null;

  // Try to find if target is national_cup_teams.id first
  const { data: cupTeam } = await supabase.from('national_cup_teams').select('user_id, club_id, id').eq('id', target).single();
  if (cupTeam) {
    clubId = cupTeam.club_id;
    userId = cupTeam.user_id;
    teamId = cupTeam.id;
  } else {
    // If not found, assume target is club_id and find the cup team record
    const { data: ctByClub } = await supabase.from('national_cup_teams').select('user_id, id').eq('club_id', target).eq('cup_id', cupId).single();
    if (ctByClub) {
      userId = ctByClub.user_id;
      teamId = ctByClub.id;
    }
  }

  // Idempotency: avoid duplicate payments for the same phase/team
  const { data: existing } = await supabase.from('national_cup_prizes')
    .select('id').eq('cup_id', cupId).eq('team_id', teamId).eq('description', desc).single();
  if (existing) return;

  await supabase.from('national_cup_prizes').insert({
    cup_id: cupId, team_id: teamId, amount, description: desc
  });

  if (userId) {
    const { data: save } = await supabase.from('game_saves').select('club_data').eq('user_id', userId).single();
    if (save?.club_data) {
      save.club_data.club.budget = (save.club_data.club.budget || 0) + amount;
      await supabase.from('game_saves').update({ club_data: save.club_data }).eq('user_id', userId);
      
      // Register transaction in history
      await supabase.from('club_transactions').insert({
        user_id: userId,
        amount: amount,
        type: 'income',
        description: `Copa: ${desc}`,
        category: 'tournament'
      });

      // Send notification
      await supabase.from('user_notifications').insert({
        user_id: userId,
        title: 'Premiação da Copa Recebida',
        message: `Seu clube recebeu R$ ${(amount/1000000).toFixed(1)}M da ${desc}. Dinheiro adicionado ao caixa!`,
        type: 'finance'
      });
    }
  }
}

async function assignGoalsToPlayers(supabase: any, teamId: string, goals: number, cupId: string) {
  if (goals <= 0) return;
  const { data: cupTeam } = await supabase.from('national_cup_teams').select('club_id').eq('id', teamId).single();
  if (!cupTeam) return;

  const { data: players } = await supabase.from('world_players').select('id').eq('team_id', cupTeam.club_id).order('overall', { ascending: false }).limit(5);
  if (!players || players.length === 0) return;

  for (let i = 0; i < goals; i++) {
    const p = players[Math.floor(Math.random() * players.length)];
    await supabase.rpc('increment_cup_goals', { p_cup_id: cupId, p_player_id: p.id, p_team_id: cupTeam.club_id });
  }
}

async function processEndOfCupBonuses(supabase: any, cupId: string) {
  const { data: matches } = await supabase.from('national_cup_matches').select('*').eq('cup_id', cupId).eq('status', 'finished');
  if (!matches) return;

  const teamStats: Record<string, { goalsScored: number, goalsConceded: number }> = {};
  
  matches.forEach((m: any) => {
    if (!teamStats[m.home_team_id]) teamStats[m.home_team_id] = { goalsScored: 0, goalsConceded: 0 };
    if (!teamStats[m.away_team_id]) teamStats[m.away_team_id] = { goalsScored: 0, goalsConceded: 0 };
    
    teamStats[m.home_team_id].goalsScored += m.home_score || 0;
    teamStats[m.home_team_id].goalsConceded += m.away_score || 0;
    teamStats[m.away_team_id].goalsScored += m.away_score || 0;
    teamStats[m.away_team_id].goalsConceded += m.home_score || 0;
  });

  let bestAttackTeam = null;
  let maxGoals = -1;
  let bestDefenseTeam = null;
  let minConceded = Infinity;

  for (const [teamId, stats] of Object.entries(teamStats)) {
    if (stats.goalsScored > maxGoals) {
      maxGoals = stats.goalsScored;
      bestAttackTeam = teamId;
    }
    if (stats.goalsConceded < minConceded) {
      minConceded = stats.goalsConceded;
      bestDefenseTeam = teamId;
    }
  }

  if (bestAttackTeam) {
    await grantPrize(supabase, bestAttackTeam, 500000, "Melhor Ataque da Copa", cupId);
  }
  if (bestDefenseTeam) {
    await grantPrize(supabase, bestDefenseTeam, 500000, "Melhor Defesa da Copa", cupId);
  }
}

async function createCupNews(supabase: any, cupId: string, title: string, content: string) {
  await supabase.from('cup_news').insert({ cup_id: cupId, title, content });
  await supabase.from('world_league_news').insert({ title, content, category: 'cup', created_at: new Date().toISOString() });
}
