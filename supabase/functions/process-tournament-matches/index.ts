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

const EVENT_TYPES = {
  goals: ['foot_goal', 'header_goal'],
  chances: ['great_save', 'woodwork', 'long_shot_miss', 'header_miss', 'corner_danger'],
  fouls: ['dangerous_foul', 'midfield_foul', 'yellow_card'],
  possession: ['possession', 'dribble_ok', 'through_ball', 'crossing', 'long_pass', 'pressing', 'tackle'],
};

function generateRichEvents(
  homeTeam: TeamData, awayTeam: TeamData,
  homeGoals: number, awayGoals: number
) {
  const homeStr = homeTeam.bot_strength || 60;
  const awayStr = awayTeam.bot_strength || 60;
  const homeSquad = Array.isArray(homeTeam.bot_squad) ? homeTeam.bot_squad : [];
  const awaySquad = Array.isArray(awayTeam.bot_squad) ? awayTeam.bot_squad : [];
  const homeAttackers = homeSquad.filter((p: any) => ['ATA', 'MEI', 'VOL'].includes(p.position));
  const awayAttackers = awaySquad.filter((p: any) => ['ATA', 'MEI', 'VOL'].includes(p.position));
  const homeDefenders = homeSquad.filter((p: any) => ['ZAG', 'LAT', 'GOL'].includes(p.position));
  const awayDefenders = awaySquad.filter((p: any) => ['ZAG', 'LAT', 'GOL'].includes(p.position));

  const events: any[] = [];
  const usedMinutes = new Set<number>([0, 45, 46]);

  function pickMinute(pool: number[]): number {
    const avail = pool.filter(m => !usedMinutes.has(m));
    if (!avail.length) return -1;
    const m = avail[Math.floor(rng() * avail.length)];
    usedMinutes.add(m);
    return m;
  }

  const firstHalf = Array.from({ length: 44 }, (_, i) => i + 1);
  const secondHalf = Array.from({ length: 44 }, (_, i) => i + 47);
  const allMinutes = [...firstHalf, ...secondHalf];

  events.push({ minute: 0, type: 'kickoff', description: `📢 ${homeTeam.club_name} x ${awayTeam.club_name} - Começa o jogo!`, team: 'neutral', animType: 'kickoff' });

  const goalScorers: any[] = [];
  const goalTypes = ['foot_goal', 'header_goal'];

  for (let i = 0; i < homeGoals; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const scorer = homeAttackers.length > 0 ? pick(homeAttackers) : { name: `Jogador ${i + 1}` };
    const assister = homeAttackers.length > 1 ? pick(homeAttackers.filter((p: any) => p.name !== scorer.name)) : null;
    const goalType = pick(goalTypes);
    const desc = goalType === 'header_goal'
      ? `⚽ GOL DE CABEÇA! ${scorer.name} sobe mais que todo mundo e cabeceia para o gol!${assister ? ` Cruzamento de ${assister.name}.` : ''}`
      : `⚽ GOL! ${scorer.name} finaliza com categoria para o gol de ${homeTeam.club_name}!${assister ? ` Assistência de ${assister.name}.` : ''}`;
    events.push({ minute: min, type: goalType, description: desc, team: 'home', playerName: scorer.name, assistName: assister?.name, isGoal: true, goalType: goalType === 'header_goal' ? 'Cabeçada' : 'Chute', animType: 'goal' });
    goalScorers.push({ minute: min, name: scorer.name, assist: assister?.name, team: 'home' });
  }

  for (let i = 0; i < awayGoals; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const scorer = awayAttackers.length > 0 ? pick(awayAttackers) : { name: `Jogador ${i + 1}` };
    const assister = awayAttackers.length > 1 ? pick(awayAttackers.filter((p: any) => p.name !== scorer.name)) : null;
    const goalType = pick(goalTypes);
    const desc = goalType === 'header_goal'
      ? `⚽ GOL DE CABEÇA! ${scorer.name} sobe mais que todo mundo e cabeceia para o gol!${assister ? ` Cruzamento de ${assister.name}.` : ''}`
      : `⚽ GOL! ${scorer.name} finaliza com categoria para o gol de ${awayTeam.club_name}!${assister ? ` Assistência de ${assister.name}.` : ''}`;
    events.push({ minute: min, type: goalType, description: desc, team: 'away', playerName: scorer.name, assistName: assister?.name, isGoal: true, goalType: goalType === 'header_goal' ? 'Cabeçada' : 'Chute', animType: 'goal' });
    goalScorers.push({ minute: min, name: scorer.name, assist: assister?.name, team: 'away' });
  }

  if (rng() < 0.12) {
    const min = pickMinute(allMinutes.filter(m => m >= 20));
    if (min > 0) {
      const team: 'home' | 'away' = rng() < 0.55 ? 'home' : 'away';
      const squad = team === 'home' ? homeAttackers : awayAttackers;
      const kicker = squad.length > 0 ? pick(squad) : { name: 'Jogador' };
      const isGoal = rng() < 0.75;
      if (isGoal) {
        events.push({ minute: min, type: 'penalty_goal', description: `⚽ GOL DE PÊNALTI! ${kicker.name} bate firme e marca!`, team, playerName: kicker.name, isGoal: true, goalType: 'Pênalti', animType: 'penalty' });
      } else {
        events.push({ minute: min, type: 'penalty_miss', description: `❌ PÊNALTI PERDIDO! ${kicker.name} isola a bola!`, team, playerName: kicker.name, isGoal: false, animType: 'penalty' });
      }
    }
  }

  const chanceCount = 4 + Math.floor(rng() * 6);
  for (let i = 0; i < chanceCount; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const team: 'home' | 'away' = rng() < 0.55 ? 'home' : 'away';
    const attackers = team === 'home' ? homeAttackers : awayAttackers;
    const player = attackers.length > 0 ? pick(attackers) : { name: 'Jogador' };
    const chanceType = pick(EVENT_TYPES.chances);
    const descriptions: Record<string, string> = {
      great_save: `🧤 GRANDE DEFESA! O goleiro faz uma defesa espetacular em chute de ${player.name}!`,
      woodwork: `🥅 NA TRAVE! ${player.name} acerta o poste! Quase gol!`,
      long_shot_miss: `🎯 ${player.name} arrisca de fora da área, mas a bola sai pela linha de fundo.`,
      header_miss: `🎯 ${player.name} cabeceia, mas a bola passa por cima do gol!`,
      corner_danger: `🏳️ Escanteio perigoso! ${player.name} cabeceia na primeira trave, o goleiro defende!`,
    };
    events.push({ minute: min, type: chanceType, description: descriptions[chanceType] || `Lance de ${player.name}`, team, playerName: player.name, animType: chanceType === 'great_save' ? 'save' : 'chance' });
  }

  const foulCount = 3 + Math.floor(rng() * 5);
  for (let i = 0; i < foulCount; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const team: 'home' | 'away' = rng() < 0.5 ? 'home' : 'away';
    const defenders = team === 'home' ? homeDefenders : awayDefenders;
    const allP = team === 'home' ? homeSquad : awaySquad;
    const player = defenders.length > 0 ? pick(defenders) : allP.length > 0 ? pick(allP) : { name: 'Jogador' };
    const foulType = pick(EVENT_TYPES.fouls);
    const descriptions: Record<string, string> = {
      dangerous_foul: `⚠️ Falta perigosa de ${player.name}! Livre direto na entrada da área.`,
      midfield_foul: `⚠️ ${player.name} comete falta no meio de campo.`,
      yellow_card: `🟡 CARTÃO AMARELO para ${player.name}! Entrada imprudente.`,
    };
    events.push({ minute: min, type: foulType, description: descriptions[foulType] || `Falta de ${player.name}`, team, playerName: player.name, animType: foulType === 'yellow_card' ? 'card' : 'foul' });
  }

  const possCount = 8 + Math.floor(rng() * 8);
  for (let i = 0; i < possCount; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const team: 'home' | 'away' = rng() < 0.5 ? 'home' : 'away';
    const squad = team === 'home' ? homeSquad : awaySquad;
    const player = squad.length > 0 ? pick(squad) : { name: 'Jogador' };
    const possType = pick(EVENT_TYPES.possession);
    const descriptions: Record<string, string> = {
      possession: `${(team === 'home' ? homeTeam : awayTeam).club_name} troca passes no campo ofensivo.`,
      dribble_ok: `💨 ${player.name} dribla com classe e avança!`,
      through_ball: `⚡ ${player.name} faz um lançamento preciso!`,
      crossing: `↗️ ${player.name} cruza na área!`,
      long_pass: `${player.name} faz um lançamento longo preciso.`,
      pressing: `${(team === 'home' ? homeTeam : awayTeam).club_name} pressiona alto no campo adversário.`,
      tackle: `🦶 ${player.name} desarma com precisão!`,
    };
    events.push({ minute: min, type: possType, description: descriptions[possType] || `Lance de ${player.name}`, team, playerName: player.name });
  }

  events.push({ minute: 45, type: 'halftime', description: `⏸ Intervalo! ${homeTeam.club_name} ${goalScorers.filter(g => g.team === 'home' && g.minute <= 45).length} x ${goalScorers.filter(g => g.team === 'away' && g.minute <= 45).length} ${awayTeam.club_name}`, team: 'neutral', animType: 'halftime' });
  events.push({ minute: 46, type: 'kickoff', description: `📢 Começa o segundo tempo!`, team: 'neutral', animType: 'kickoff' });
  events.push({ minute: 90, type: 'final_whistle', description: `🏁 Fim de jogo! ${homeTeam.club_name} ${homeGoals} x ${awayGoals} ${awayTeam.club_name}`, team: 'neutral', animType: 'final' });

  events.sort((a, b) => a.minute - b.minute);

  const playerRatings: Record<string, number> = {};
  for (const p of homeSquad) {
    playerRatings[p.id || p.name] = clamp(parseFloat((6 + rng() * 3 + (homeGoals > awayGoals ? 0.5 : -0.3)).toFixed(1)), 4, 10);
  }
  for (const p of awaySquad) {
    playerRatings[p.id || p.name] = clamp(parseFloat((6 + rng() * 3 + (awayGoals > homeGoals ? 0.5 : -0.3)).toFixed(1)), 4, 10);
  }

  const stats = {
    possession: [clamp(45 + (homeStr - awayStr) * 0.3 + (rng() * 10 - 5), 30, 70), 0] as [number, number],
    shots: [clamp(Math.floor(3 + homeStr / 15 + rng() * 5), 2, 20), clamp(Math.floor(3 + awayStr / 15 + rng() * 5), 2, 20)],
    shotsOnTarget: [clamp(Math.floor(1 + homeGoals + rng() * 3), 0, 15), clamp(Math.floor(1 + awayGoals + rng() * 3), 0, 15)],
    fouls: [Math.floor(5 + rng() * 12), Math.floor(5 + rng() * 12)],
    corners: [Math.floor(1 + rng() * 7), Math.floor(1 + rng() * 7)],
    yellowCards: [0, 0] as [number, number],
    redCards: [0, 0] as [number, number],
    passes: [Math.floor(150 + rng() * 200), Math.floor(150 + rng() * 200)],
    tackles: [Math.floor(5 + rng() * 10), Math.floor(5 + rng() * 10)],
    saves: [Math.floor(1 + rng() * 5), Math.floor(1 + rng() * 5)],
    offsides: [Math.floor(rng() * 5), Math.floor(rng() * 5)],
  };
  stats.possession[1] = 100 - stats.possession[0];
  for (const ev of events) {
    if (ev.type === 'yellow_card') stats.yellowCards[ev.team === 'home' ? 0 : 1]++;
  }

  return { events, goalScorers, playerRatings, homePlayers: homeSquad, stats };
}

function simulateMatch(homeTeam: TeamData, awayTeam: TeamData) {
  const homeStr = homeTeam.bot_strength || 60;
  const awayStr = awayTeam.bot_strength || 60;
  const homeLambda = clamp((homeStr / 50) * 1.4 + 0.15, 0.3, 4.5);
  const awayLambda = clamp((awayStr / 50) * 1.2, 0.2, 4.0);
  const homeGoals = poissonSample(homeLambda);
  const awayGoals = poissonSample(awayLambda);
  const result = generateRichEvents(homeTeam, awayTeam, homeGoals, awayGoals);
  return { homeGoals, awayGoals, ...result };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const nowISO = now.toISOString();

    // Find all scheduled matches whose time has passed
    const { data: dueMatches, error: fetchErr } = await supabase
      .from('custom_tournament_matches')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowISO)
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!dueMatches || dueMatches.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tournamentIds = [...new Set(dueMatches.map(m => m.tournament_id))];

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

      // ── KEY CHANGE: Only auto-simulate if BOTH teams are bots ──
      // If at least one team has a human player, skip automatic simulation.
      // The human player must play the match manually via the Match page.
      // Exception: if 48+ hours have passed since scheduled_at, auto-simulate as W.O.
      const hasHuman = (!homeTeam.is_bot && homeTeam.user_id) || (!awayTeam.is_bot && awayTeam.user_id);
      
      if (hasHuman) {
        const scheduledAt = new Date(match.scheduled_at).getTime();
        const hoursSinceScheduled = (now.getTime() - scheduledAt) / (1000 * 60 * 60);
        
        if (hoursSinceScheduled < 48) {
          // Human still has time to play — skip this match
          continue;
        }
        // 48h+ expired — auto-simulate as timeout/W.O.
        console.log(`[Tournament] Match ${match.id} expired (${hoursSinceScheduled.toFixed(1)}h). Auto-simulating.`);
      }

      const result = simulateMatch(homeTeam, awayTeam);

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
        played_at: nowISO,
      }).eq('id', match.id);

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
          const isExpired = hasHuman;
          
          await supabase.from('user_notifications').insert({
            user_id: team.user_id,
            type: 'match_result',
            title: `⚽ ${resultText}: ${homeTeam.club_name} ${result.homeGoals} x ${result.awayGoals} ${awayTeam.club_name}`,
            message: isExpired
              ? `⏰ Você não jogou a partida no prazo (48h). O jogo foi simulado automaticamente.\n${resultText} contra ${oppName}.\n⚽ Placar: ${result.homeGoals} x ${result.awayGoals}`
              : `Jogo do campeonato foi simulado automaticamente.\n${resultText} contra ${oppName}.\n⚽ Placar: ${result.homeGoals} x ${result.awayGoals}\n\n📺 Assista o replay na aba de Campeonatos.`,
            icon: userGoals > oppGoals ? '🏆' : userGoals < oppGoals ? '😔' : '🤝',
            data: { matchId: match.id, tournamentId: match.tournament_id },
          });
        }
      }

      await supabase.from('newspaper_entries').insert({
        user_id: homeTeam.user_id || awayTeam.user_id || '00000000-0000-0000-0000-000000000000',
        text: `⚽ CAMPEONATO: ${homeTeam.club_name} ${result.homeGoals} x ${result.awayGoals} ${awayTeam.club_name}. ${result.goalScorers.map((g: any) => `⚽ ${g.name} (${g.minute}')`).join(', ') || 'Sem gols.'}`,
        category: 'CAMPEONATO',
        is_event: true,
      });

      processed++;
    }

    // Check knockout advancement
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
        const winners: string[] = [];
        for (const m of roundMatches) {
          if ((m.home_goals ?? 0) > (m.away_goals ?? 0)) winners.push(m.home_team_id);
          else if ((m.away_goals ?? 0) > (m.home_goals ?? 0)) winners.push(m.away_team_id);
          else winners.push(rng() > 0.5 ? m.home_team_id : m.away_team_id);

          const loserId = winners[winners.length - 1] === m.home_team_id ? m.away_team_id : m.home_team_id;
          await supabase.from('custom_tournament_teams').update({ eliminated: true }).eq('id', loserId);
        }

        if (winners.length > 1) {
          const stageNames = ['Final', 'Semi', 'Quartas', 'Oitavas', 'R32', 'R64'];
          const nextRound = currentRound + 1;
          const totalRoundsNeeded = Math.ceil(Math.log2(winners.length));
          const stageName = stageNames[Math.min(totalRoundsNeeded - 1, stageNames.length - 1)] || `R${winners.length}`;

          const shuffled = [...winners].sort(() => rng() - 0.5);
          const nextMatches: any[] = [];
          const intervalHours = tournament.match_interval_hours || 24;
          const matchTime = tournament.match_time || '20:00';
          const baseDate = new Date();

          for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
            const scheduledDate = new Date(baseDate.getTime() + (i + 1) * intervalHours * 3600000);
            const [hours, minutes] = matchTime.split(':').map(Number);
            scheduledDate.setHours(hours || 20, minutes || 0, 0, 0);

            nextMatches.push({
              tournament_id: tournamentId,
              home_team_id: shuffled[i * 2],
              away_team_id: shuffled[i * 2 + 1],
              round: nextRound,
              stage: stageName,
              scheduled_at: scheduledDate.toISOString(),
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
          await supabase.from('custom_tournaments').update({ status: 'finished' }).eq('id', tournamentId);

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
