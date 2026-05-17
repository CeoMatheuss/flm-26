// Edge Function: legacy-auto-sim
// Server-side simulation of friendly_invites, league_matches and custom_tournament_matches.
// Runs independently of any user being online (called via cron).
// Processes up to MAX_BATCH per call, atomic guards prevent double-sim.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_BATCH = 30;

function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulate(homeStr: number, awayStr: number) {
  const hs = Math.max(30, homeStr) * 1.15;
  const as = Math.max(30, awayStr);
  const total = hs + as;
  const baseGoals = 2.6;
  const lambdaHome = baseGoals * (hs / total) * 1.05;
  const lambdaAway = baseGoals * (as / total) * 0.95;
  return {
    home: Math.min(7, poisson(lambdaHome)),
    away: Math.min(7, poisson(lambdaAway)),
  };
}

function genEvents(hg: number, ag: number, homeName: string, awayName: string) {
  const events: Array<{ minute: number; type: string; team: 'home' | 'away'; isGoal: boolean; playerName: string; description: string }> = [];
  const used = new Set<number>();
  const add = (team: 'home' | 'away', name: string) => {
    let m = 1; let tries = 0;
    do { m = Math.floor(Math.random() * 90) + 1; tries++; } while (used.has(m) && tries < 20);
    used.add(m);
    events.push({ minute: m, type: 'goal', team, isGoal: true, playerName: 'Atacante', description: `⚽ GOOOL de ${name}!` });
  };
  for (let i = 0; i < hg; i++) add('home', homeName);
  for (let i = 0; i < ag; i++) add('away', awayName);
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

async function getStrength(supabase: any, userId: string | null): Promise<number> {
  if (!userId) return 60;
  const { data, error } = await supabase.rpc('get_user_team_strength', { _user_id: userId });
  if (error || data == null) return 60;
  const n = Number(data);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

async function notify(supabase: any, userId: string, opponent: string, mine: number, theirs: number, comp: string) {
  try {
    const result = mine > theirs ? '🟢 Vitória' : mine === theirs ? '🟡 Empate' : '🔴 Derrota';
    await supabase.from('user_notifications').insert({
      user_id: userId,
      type: 'match_auto_simulated',
      icon: '🤖',
      title: 'Partida simulada automaticamente',
      message: `${result} ${mine}x${theirs} vs ${opponent} (${comp})`,
      data: { auto_simulated: true, my_goals: mine, opp_goals: theirs, opponent, competition: comp },
    });
  } catch { /* noop */ }
}

async function processFriendlies(supabase: any): Promise<number> {
  const nowIso = new Date().toISOString();
  // Regra: só auto-simula amistosos cujo horário oficial já chegou (com 5min de tolerância)
  // E onde NENHUM jogador entrou no lobby. Se ao menos 1 entrou, a partida segue normal.
  const tolerance = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: list } = await supabase
    .from('friendly_invites')
    .select('id, sender_id, receiver_id, sender_club_name, receiver_club_name, home_team_id, match_date, auto_sim_at, home_joined, away_joined')
    .eq('status', 'accepted')
    .is('match_result', null)
    .lte('match_date', tolerance)
    .not('home_joined', 'is', true)
    .not('away_joined', 'is', true)
    .limit(MAX_BATCH);
  if (!list || list.length === 0) return 0;

  let processed = 0;
  for (const f of list) {
    const homeIsSender = f.home_team_id === f.sender_id;
    const senderStr = await getStrength(supabase, f.sender_id);
    const receiverStr = await getStrength(supabase, f.receiver_id);
    const homeStr = homeIsSender ? senderStr : receiverStr;
    const awayStr = homeIsSender ? receiverStr : senderStr;
    const homeName = homeIsSender ? f.sender_club_name : f.receiver_club_name;
    const awayName = homeIsSender ? f.receiver_club_name : f.sender_club_name;
    const { home: hg, away: ag } = simulate(homeStr, awayStr);
    const events = genEvents(hg, ag, homeName, awayName);

    const { data: updated } = await supabase
      .from('friendly_invites')
      .update({
        status: 'finished',
        match_result: { home_goals: hg, away_goals: ag, events, auto_simulated: true, simulated: true, home_name: homeName, away_name: awayName },
      })
      .eq('id', f.id)
      .eq('status', 'accepted')
      .select('id');
    if (!updated || updated.length === 0) continue;

    const senderGoals = homeIsSender ? hg : ag;
    const receiverGoals = homeIsSender ? ag : hg;
    await notify(supabase, f.sender_id, f.receiver_club_name, senderGoals, receiverGoals, 'Amistoso');
    await notify(supabase, f.receiver_id, f.sender_club_name, receiverGoals, senderGoals, 'Amistoso');
    processed++;
  }
  return processed;
}

async function processLeagueMatches(supabase: any): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: list } = await supabase
    .from('league_matches')
    .select('id, league_id, home_user_id, away_user_id, match_data')
    .eq('status', 'scheduled')
    .lte('auto_sim_at', nowIso)
    .order('auto_sim_at', { ascending: true })
    .limit(MAX_BATCH);
  if (!list || list.length === 0) return 0;

  let processed = 0;
  for (const m of list) {
    const homeStr = await getStrength(supabase, m.home_user_id);
    const awayStr = await getStrength(supabase, m.away_user_id);
    const { home: hg, away: ag } = simulate(homeStr, awayStr);

    const { data: members } = await supabase
      .from('league_members')
      .select('user_id, club_name')
      .eq('league_id', m.league_id)
      .in('user_id', [m.home_user_id, m.away_user_id]);
    const homeName = members?.find((x: any) => x.user_id === m.home_user_id)?.club_name || 'Mandante';
    const awayName = members?.find((x: any) => x.user_id === m.away_user_id)?.club_name || 'Visitante';
    const events = genEvents(hg, ag, homeName, awayName);

    const { data: updated } = await supabase
      .from('league_matches')
      .update({
        home_goals: hg, away_goals: ag, status: 'finished',
        played_at: new Date().toISOString(),
        match_data: { ...(m.match_data || {}), events, auto_simulated: true, simulated: true, home_name: homeName, away_name: awayName },
      })
      .eq('id', m.id)
      .eq('status', 'scheduled')
      .select('id');
    if (!updated || updated.length === 0) continue;

    for (const u of [
      { uid: m.home_user_id, gf: hg, ga: ag, win: hg > ag, draw: hg === ag, loss: hg < ag },
      { uid: m.away_user_id, gf: ag, ga: hg, win: ag > hg, draw: hg === ag, loss: ag < hg },
    ]) {
      const { data: row } = await supabase
        .from('league_members')
        .select('points,wins,draws,losses,goals_for,goals_against,played')
        .eq('league_id', m.league_id).eq('user_id', u.uid).maybeSingle();
      if (!row) continue;
      await supabase.from('league_members').update({
        points: row.points + (u.win ? 3 : u.draw ? 1 : 0),
        wins: row.wins + (u.win ? 1 : 0),
        draws: row.draws + (u.draw ? 1 : 0),
        losses: row.losses + (u.loss ? 1 : 0),
        goals_for: row.goals_for + u.gf,
        goals_against: row.goals_against + u.ga,
        played: row.played + 1,
      }).eq('league_id', m.league_id).eq('user_id', u.uid);
    }

    await notify(supabase, m.home_user_id, awayName, hg, ag, 'Liga');
    await notify(supabase, m.away_user_id, homeName, ag, hg, 'Liga');
    processed++;
  }
  return processed;
}

async function processTournamentMatches(supabase: any): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: list } = await supabase
    .from('custom_tournament_matches')
    .select('id, tournament_id, home_team_id, away_team_id, round, stage, match_data')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true })
    .limit(MAX_BATCH);
  if (!list || list.length === 0) return 0;

  let processed = 0;
  for (const m of list) {
    const { data: teams } = await supabase
      .from('custom_tournament_teams')
      .select('id, club_name, user_id, bot_strength, points, wins, draws, losses, goals_for, goals_against, played')
      .in('id', [m.home_team_id, m.away_team_id]);
    const home = teams?.find((t: any) => t.id === m.home_team_id);
    const away = teams?.find((t: any) => t.id === m.away_team_id);
    if (!home || !away) continue;

    const homeStr = home.user_id ? await getStrength(supabase, home.user_id) : Math.max(30, Math.min(95, home.bot_strength || 60));
    const awayStr = away.user_id ? await getStrength(supabase, away.user_id) : Math.max(30, Math.min(95, away.bot_strength || 60));
    let { home: hg, away: ag } = simulate(homeStr, awayStr);
    // No-draw em mata-mata: força vencedor por força relativa
    const isKO = m.stage && ['knockout', 'r16', 'qf', 'sf', 'final', 'quarter', 'semi'].includes(String(m.stage).toLowerCase());
    if (isKO && hg === ag) {
      if (homeStr >= awayStr) hg += 1; else ag += 1;
    }
    const events = genEvents(hg, ag, home.club_name, away.club_name);

    const { data: updated } = await supabase
      .from('custom_tournament_matches')
      .update({
        home_goals: hg, away_goals: ag, status: 'finished',
        played_at: new Date().toISOString(),
        match_data: { ...(m.match_data || {}), events, auto_simulated: true, simulated: true, home_name: home.club_name, away_name: away.club_name },
      })
      .eq('id', m.id)
      .eq('status', 'scheduled')
      .select('id');
    if (!updated || updated.length === 0) continue;

    for (const u of [
      { row: home, gf: hg, ga: ag, win: hg > ag, draw: hg === ag, loss: hg < ag },
      { row: away, gf: ag, ga: hg, win: ag > hg, draw: hg === ag, loss: ag < hg },
    ]) {
      await supabase.from('custom_tournament_teams').update({
        points: (u.row.points || 0) + (u.win ? 3 : u.draw ? 1 : 0),
        wins: (u.row.wins || 0) + (u.win ? 1 : 0),
        draws: (u.row.draws || 0) + (u.draw ? 1 : 0),
        losses: (u.row.losses || 0) + (u.loss ? 1 : 0),
        goals_for: (u.row.goals_for || 0) + u.gf,
        goals_against: (u.row.goals_against || 0) + u.ga,
        played: (u.row.played || 0) + 1,
      }).eq('id', u.row.id);
    }

    if (home.user_id) await notify(supabase, home.user_id, away.club_name, hg, ag, 'Campeonato');
    if (away.user_id) await notify(supabase, away.user_id, home.club_name, ag, hg, 'Campeonato');
    processed++;
  }
  return processed;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const friendlies = await processFriendlies(supabase);
    const league = await processLeagueMatches(supabase);
    const tournament = await processTournamentMatches(supabase);

    return new Response(JSON.stringify({
      ok: true,
      processed: { friendlies, league, tournament, total: friendlies + league + tournament },
      ts: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
