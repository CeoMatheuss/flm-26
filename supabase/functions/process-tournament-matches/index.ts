import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function rng() { return Math.random(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

interface TeamData {
  id: string;
  club_name: string;
  bot_strength: number;
  is_bot: boolean;
  bot_squad: any[] | null;
  user_id: string | null;
}

function simulateMatch(homeTeam: TeamData, awayTeam: TeamData) {
  const homeStr = homeTeam.bot_strength || 60;
  const awayStr = awayTeam.bot_strength || 60;
  
  // Poisson-based simulation
  const homeLambda = clamp((homeStr / 50) * 1.4 + 0.15, 0.3, 4.5); // home advantage
  const awayLambda = clamp((awayStr / 50) * 1.2, 0.2, 4.0);
  
  const homeGoals = poissonSample(homeLambda);
  const awayGoals = poissonSample(awayLambda);

  // Generate basic events
  const events: any[] = [];
  events.push({ minute: 0, type: 'kickoff', description: `⚽ ${homeTeam.club_name} x ${awayTeam.club_name} - Começa o jogo!`, team: 'neutral' });
  
  // Goal events
  const allGoals: { minute: number; team: 'home' | 'away'; name: string; assist?: string }[] = [];
  const homeSquad = Array.isArray(homeTeam.bot_squad) ? homeTeam.bot_squad : [];
  const awaySquad = Array.isArray(awayTeam.bot_squad) ? awayTeam.bot_squad : [];
  const homeAttackers = homeSquad.filter((p: any) => ['ATA', 'MEI', 'VOL'].includes(p.position));
  const awayAttackers = awaySquad.filter((p: any) => ['ATA', 'MEI', 'VOL'].includes(p.position));

  for (let i = 0; i < homeGoals; i++) {
    const min = Math.floor(rng() * 90) + 1;
    const scorer = homeAttackers.length > 0 ? pick(homeAttackers) : { name: `Jogador ${i + 1}` };
    const assister = homeAttackers.length > 1 ? pick(homeAttackers.filter((p: any) => p.name !== scorer.name)) : null;
    allGoals.push({ minute: min, team: 'home', name: scorer.name, assist: assister?.name });
  }
  for (let i = 0; i < awayGoals; i++) {
    const min = Math.floor(rng() * 90) + 1;
    const scorer = awayAttackers.length > 0 ? pick(awayAttackers) : { name: `Jogador ${i + 1}` };
    const assister = awayAttackers.length > 1 ? pick(awayAttackers.filter((p: any) => p.name !== scorer.name)) : null;
    allGoals.push({ minute: min, team: 'away', name: scorer.name, assist: assister?.name });
  }

  allGoals.sort((a, b) => a.minute - b.minute);
  const goalScorers = allGoals.map(g => ({
    minute: g.minute,
    name: g.name,
    assist: g.assist || null,
    team: g.team,
  }));

  for (const g of allGoals) {
    const teamName = g.team === 'home' ? homeTeam.club_name : awayTeam.club_name;
    events.push({
      minute: g.minute,
      type: 'goal',
      description: `⚽ GOL! ${g.name} marca para ${teamName}!${g.assist ? ` Assistência de ${g.assist}.` : ''}`,
      team: g.team,
      playerName: g.name,
      assistName: g.assist,
      isGoal: true,
    });
  }

  events.push({ minute: 45, type: 'halftime', description: '⏱️ Intervalo!', team: 'neutral' });
  events.push({ minute: 90, type: 'fulltime', description: `🏁 Fim de jogo! ${homeTeam.club_name} ${homeGoals} x ${awayGoals} ${awayTeam.club_name}`, team: 'neutral' });
  events.sort((a, b) => a.minute - b.minute);

  // Player ratings
  const playerRatings: Record<string, number> = {};
  for (const p of homeSquad) {
    playerRatings[p.id || p.name] = clamp(parseFloat((6 + rng() * 3 + (homeGoals > awayGoals ? 0.5 : -0.3)).toFixed(1)), 4, 10);
  }
  for (const p of awaySquad) {
    playerRatings[p.id || p.name] = clamp(parseFloat((6 + rng() * 3 + (awayGoals > homeGoals ? 0.5 : -0.3)).toFixed(1)), 4, 10);
  }

  return {
    homeGoals,
    awayGoals,
    events,
    goalScorers,
    playerRatings,
    homePlayers: homeSquad,
    stats: {
      possession: [clamp(45 + (homeStr - awayStr) * 0.3 + (rng() * 10 - 5), 30, 70), 0],
      shots: [clamp(Math.floor(3 + homeStr / 15 + rng() * 5), 2, 20), clamp(Math.floor(3 + awayStr / 15 + rng() * 5), 2, 20)],
      shotsOnTarget: [clamp(Math.floor(1 + homeGoals + rng() * 3), 0, 15), clamp(Math.floor(1 + awayGoals + rng() * 3), 0, 15)],
      fouls: [Math.floor(5 + rng() * 12), Math.floor(5 + rng() * 12)],
      corners: [Math.floor(1 + rng() * 7), Math.floor(1 + rng() * 7)],
      yellowCards: [Math.floor(rng() * 4), Math.floor(rng() * 4)],
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // Find all scheduled matches whose time has passed
    const { data: dueMatches, error: fetchErr } = await supabase
      .from('custom_tournament_matches')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!dueMatches || dueMatches.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Group by tournament
    const tournamentIds = [...new Set(dueMatches.map(m => m.tournament_id))];
    
    // Load all teams for these tournaments
    const { data: allTeams } = await supabase
      .from('custom_tournament_teams')
      .select('*')
      .in('tournament_id', tournamentIds);

    const teamsMap: Record<string, TeamData[]> = {};
    for (const t of (allTeams || [])) {
      if (!teamsMap[t.tournament_id]) teamsMap[t.tournament_id] = [];
      teamsMap[t.tournament_id].push(t as any);
    }

    let processed = 0;

    for (const match of dueMatches) {
      const teams = teamsMap[match.tournament_id] || [];
      const homeTeam = teams.find(t => t.id === match.home_team_id);
      const awayTeam = teams.find(t => t.id === match.away_team_id);
      if (!homeTeam || !awayTeam) continue;

      // If a real player is involved and hasn't entered manually, still auto-simulate
      const result = simulateMatch(homeTeam, awayTeam);

      // Update match
      await supabase.from('custom_tournament_matches').update({
        home_goals: result.homeGoals,
        away_goals: result.awayGoals,
        match_data: {
          events: result.events,
          goal_scorers: result.goalScorers,
          player_ratings: result.playerRatings,
          home_players: result.homePlayers,
          stats: result.stats,
        },
        status: 'played',
        played_at: now,
      }).eq('id', match.id);

      // Update team stats
      const homePoints = result.homeGoals > result.awayGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;
      const awayPoints = result.awayGoals > result.homeGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;

      await supabase.from('custom_tournament_teams').update({
        played: (homeTeam as any).played + 1,
        wins: (homeTeam as any).wins + (homePoints === 3 ? 1 : 0),
        draws: (homeTeam as any).draws + (homePoints === 1 ? 1 : 0),
        losses: (homeTeam as any).losses + (homePoints === 0 ? 1 : 0),
        goals_for: (homeTeam as any).goals_for + result.homeGoals,
        goals_against: (homeTeam as any).goals_against + result.awayGoals,
        points: (homeTeam as any).points + homePoints,
      }).eq('id', homeTeam.id);

      await supabase.from('custom_tournament_teams').update({
        played: (awayTeam as any).played + 1,
        wins: (awayTeam as any).wins + (awayPoints === 3 ? 1 : 0),
        draws: (awayTeam as any).draws + (awayPoints === 1 ? 1 : 0),
        losses: (awayTeam as any).losses + (awayPoints === 0 ? 1 : 0),
        goals_for: (awayTeam as any).goals_for + result.awayGoals,
        goals_against: (awayTeam as any).goals_against + result.homeGoals,
        points: (awayTeam as any).points + awayPoints,
      }).eq('id', awayTeam.id);

      // Send notifications to real players
      for (const team of [homeTeam, awayTeam]) {
        if (!team.is_bot && team.user_id) {
          const isHome = team.id === homeTeam.id;
          const userGoals = isHome ? result.homeGoals : result.awayGoals;
          const oppGoals = isHome ? result.awayGoals : result.homeGoals;
          const oppName = isHome ? awayTeam.club_name : homeTeam.club_name;
          const resultText = userGoals > oppGoals ? '✅ Vitória' : userGoals < oppGoals ? '❌ Derrota' : '🤝 Empate';
          
          await supabase.from('user_notifications').insert({
            user_id: team.user_id,
            type: 'match_result',
            title: `⚽ ${resultText}: ${homeTeam.club_name} ${result.homeGoals} x ${result.awayGoals} ${awayTeam.club_name}`,
            message: `Jogo do campeonato foi simulado automaticamente.\n${resultText} contra ${oppName}.\n⚽ Placar: ${result.homeGoals} x ${result.awayGoals}`,
            icon: userGoals > oppGoals ? '🏆' : userGoals < oppGoals ? '😔' : '🤝',
            data: { matchId: match.id, tournamentId: match.tournament_id },
          });
        }
      }

      // Newspaper entry
      await supabase.from('newspaper_entries').insert({
        user_id: homeTeam.user_id || awayTeam.user_id || '00000000-0000-0000-0000-000000000000',
        text: `⚽ CAMPEONATO: ${homeTeam.club_name} ${result.homeGoals} x ${result.awayGoals} ${awayTeam.club_name}. ${result.goalScorers.map((g: any) => `⚽ ${g.name} (${g.minute}')`).join(', ') || 'Sem gols.'}`,
        category: 'CAMPEONATO',
        is_event: true,
      });

      processed++;
    }

    // Check if any tournament round is fully played and advance knockout brackets
    for (const tournamentId of tournamentIds) {
      const { data: tournament } = await supabase
        .from('custom_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (!tournament || (tournament.format !== 'knockout' && tournament.format !== 'group_knockout')) continue;

      const { data: allMatches } = await supabase
        .from('custom_tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true });

      if (!allMatches) continue;

      const currentRound = tournament.current_round || 1;
      const roundMatches = allMatches.filter(m => m.round === currentRound);
      const allPlayed = roundMatches.every(m => m.status === 'played');

      if (allPlayed && roundMatches.length > 0) {
        // Determine winners
        const winners: string[] = [];
        for (const m of roundMatches) {
          if ((m.home_goals ?? 0) > (m.away_goals ?? 0)) winners.push(m.home_team_id);
          else if ((m.away_goals ?? 0) > (m.home_goals ?? 0)) winners.push(m.away_team_id);
          else {
            // Tie => random winner (penalty simulation)
            winners.push(rng() > 0.5 ? m.home_team_id : m.away_team_id);
          }

          // Eliminate losers
          const loserId = winners[winners.length - 1] === m.home_team_id ? m.away_team_id : m.home_team_id;
          await supabase.from('custom_tournament_teams').update({ eliminated: true }).eq('id', loserId);
        }

        // If more than 1 winner, generate next round
        if (winners.length > 1) {
          const stageNames = ['Final', 'Semi', 'Quartas', 'Oitavas', 'R32', 'R64'];
          const nextRound = currentRound + 1;
          const totalRoundsNeeded = Math.ceil(Math.log2(winners.length));
          const stageName = stageNames[Math.min(totalRoundsNeeded - 1, stageNames.length - 1)] || `R${winners.length}`;

          const shuffled = [...winners].sort(() => rng() - 0.5);
          const nextMatches: any[] = [];
          const intervalHours = tournament.match_interval_hours || 24;
          const baseDate = new Date();

          for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
            const scheduledAt = new Date(baseDate.getTime() + (i + 1) * intervalHours * 3600000);
            nextMatches.push({
              tournament_id: tournamentId,
              home_team_id: shuffled[i * 2],
              away_team_id: shuffled[i * 2 + 1],
              round: nextRound,
              stage: stageName,
              scheduled_at: scheduledAt.toISOString(),
              status: 'scheduled',
            });
          }

          if (nextMatches.length > 0) {
            await supabase.from('custom_tournament_matches').insert(nextMatches);
          }

          await supabase.from('custom_tournaments').update({
            current_round: nextRound,
            total_rounds: nextRound,
          }).eq('id', tournamentId);
        } else if (winners.length === 1) {
          // Tournament finished
          await supabase.from('custom_tournaments').update({
            status: 'finished',
          }).eq('id', tournamentId);

          // Notify winner
          const winnerTeam = (teamsMap[tournamentId] || []).find(t => t.id === winners[0]);
          if (winnerTeam && !winnerTeam.is_bot && winnerTeam.user_id) {
            await supabase.from('user_notifications').insert({
              user_id: winnerTeam.user_id,
              type: 'tournament_win',
              title: `🏆 CAMPEÃO! ${tournament.name}`,
              message: `Parabéns! ${winnerTeam.club_name} é o campeão do ${tournament.name}! 🎉`,
              icon: '🏆',
              data: { tournamentId },
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing tournament matches:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
