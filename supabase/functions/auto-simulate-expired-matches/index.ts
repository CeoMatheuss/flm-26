// Auto-simulates pending matches whose 5-min play window has expired.
// Triggered by pg_cron every minute. Idempotent via status filter + LIMIT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const WINDOW_MINUTES = 5;
const MAX_PER_RUN = 50;

// ── Poisson sampler ──────────────────────────────────────────────
function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

// ── Sim a single match given two strengths ───────────────────────
function simulateGoals(homeStr: number, awayStr: number, isHomeAdv = true) {
  const adv = isHomeAdv ? 5 : 0;
  const hs = Math.max(30, homeStr + adv);
  const as = Math.max(30, awayStr);
  const total = hs + as;
  const baseGoals = 2.6; // average expected total goals
  const lambdaHome = baseGoals * (hs / total) * 1.1;
  const lambdaAway = baseGoals * (as / total) * 0.95;
  return {
    home: Math.min(7, poisson(lambdaHome)),
    away: Math.min(7, poisson(lambdaAway)),
  };
}

// ── Generate synthetic match events ──────────────────────────────
function genEvents(homeGoals: number, awayGoals: number, homeName: string, awayName: string) {
  const events: any[] = [];
  const used = new Set<number>();
  const addGoal = (team: 'home' | 'away', name: string) => {
    let m: number;
    do { m = Math.floor(Math.random() * 90) + 1; } while (used.has(m));
    used.add(m);
    events.push({
      minute: m,
      type: 'goal',
      team,
      isGoal: true,
      playerName: 'Atacante',
      description: `⚽ GOOOL de ${name}!`,
    });
  };
  for (let i = 0; i < homeGoals; i++) addGoal('home', homeName);
  for (let i = 0; i < awayGoals; i++) addGoal('away', awayName);
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

// ── Get strength from squad if user, else bot_strength ───────────
async function getUserStrength(adminClient: any, userId: string): Promise<number> {
  const { data: save } = await adminClient
    .from('game_saves')
    .select('club_data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!save?.club_data?.players) return 60;
  const players = (save.club_data.players as any[]).filter(p => !p.injured);
  if (players.length === 0) return 60;
  // Top 11 by ovr
  const top = [...players].sort((a, b) => (b.ovr || 0) - (a.ovr || 0)).slice(0, 11);
  const avg = top.reduce((s, p) => s + (p.ovr || 60), 0) / top.length;
  return Math.round(avg);
}

// ── Update league_members standings ──────────────────────────────
async function updateLeagueStandings(adminClient: any, leagueId: string, homeUid: string, awayUid: string, hg: number, ag: number) {
  const updates = [
    { uid: homeUid, gf: hg, ga: ag, win: hg > ag, draw: hg === ag, loss: hg < ag },
    { uid: awayUid, gf: ag, ga: hg, win: ag > hg, draw: hg === ag, loss: ag < hg },
  ];
  for (const u of updates) {
    const { data: m } = await adminClient
      .from('league_members')
      .select('points,wins,draws,losses,goals_for,goals_against,played')
      .eq('league_id', leagueId).eq('user_id', u.uid).maybeSingle();
    if (!m) continue;
    await adminClient.from('league_members').update({
      points: m.points + (u.win ? 3 : u.draw ? 1 : 0),
      wins: m.wins + (u.win ? 1 : 0),
      draws: m.draws + (u.draw ? 1 : 0),
      losses: m.losses + (u.loss ? 1 : 0),
      goals_for: m.goals_for + u.gf,
      goals_against: m.goals_against + u.ga,
      played: m.played + 1,
    }).eq('league_id', leagueId).eq('user_id', u.uid);
  }
}

// ── Notify a user ────────────────────────────────────────────────
async function notify(adminClient: any, userId: string, opponent: string, myGoals: number, oppGoals: number, comp: string) {
  const result = myGoals > oppGoals ? '🟢 Vitória' : myGoals === oppGoals ? '🟡 Empate' : '🔴 Derrota';
  await adminClient.from('user_notifications').insert({
    user_id: userId,
    type: 'match_auto_simulated',
    icon: '🤖',
    title: 'Partida simulada automaticamente',
    message: `Você não entrou em campo. ${result} ${myGoals}x${oppGoals} vs ${opponent} (${comp})`,
    data: { auto_simulated: true, my_goals: myGoals, opp_goals: oppGoals, opponent, competition: comp },
  });
}

// ── MAIN HANDLER ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Optional cron-secret check (skip if header missing; allow admin manual triggers via JWT)
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('Authorization');
    const isCron = cronSecret && providedSecret === cronSecret;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // If not cron, validate admin JWT for manual trigger
    if (!isCron) {
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: claimsData } = await userClient.auth.getClaims(token);
      if (!claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: roleRow } = await adminClient
        .from('user_roles').select('role').eq('user_id', claimsData.claims.sub).eq('role', 'admin').maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    let leagueCount = 0, cupCount = 0, customCount = 0, friendlyCount = 0;

    // ── 1. LEAGUE MATCHES ──────────────────────────────────────
    const { data: leagueMatches } = await adminClient
      .from('league_matches')
      .select('id, league_id, home_user_id, away_user_id, round, match_data')
      .eq('status', 'scheduled')
      .lt('created_at', cutoff)
      .limit(MAX_PER_RUN);

    for (const m of leagueMatches || []) {
      const homeStr = await getUserStrength(adminClient, m.home_user_id);
      const awayStr = await getUserStrength(adminClient, m.away_user_id);
      const { home: hg, away: ag } = simulateGoals(homeStr, awayStr, true);
      const { data: members } = await adminClient
        .from('league_members')
        .select('user_id, club_name')
        .eq('league_id', m.league_id)
        .in('user_id', [m.home_user_id, m.away_user_id]);
      const homeName = members?.find((x: any) => x.user_id === m.home_user_id)?.club_name || 'Mandante';
      const awayName = members?.find((x: any) => x.user_id === m.away_user_id)?.club_name || 'Visitante';
      const events = genEvents(hg, ag, homeName, awayName);

      const { error: updErr } = await adminClient
        .from('league_matches')
        .update({
          home_goals: hg,
          away_goals: ag,
          status: 'finished',
          played_at: new Date().toISOString(),
          match_data: { ...(m.match_data || {}), events, auto_simulated: true, home_name: homeName, away_name: awayName },
        })
        .eq('id', m.id)
        .eq('status', 'scheduled'); // double-guard
      if (updErr) continue;

      await updateLeagueStandings(adminClient, m.league_id, m.home_user_id, m.away_user_id, hg, ag);
      await notify(adminClient, m.home_user_id, awayName, hg, ag, 'Liga');
      await notify(adminClient, m.away_user_id, homeName, ag, hg, 'Liga');
      leagueCount++;
    }

    // ── 2. CUP MATCHES ─────────────────────────────────────────
    const { data: cupMatches } = await adminClient
      .from('cup_matches')
      .select('id, cup_id, home_team_id, away_team_id, match_data')
      .eq('status', 'scheduled')
      .lt('scheduled_at', cutoff)
      .limit(MAX_PER_RUN);

    for (const m of cupMatches || []) {
      const { data: teams } = await adminClient
        .from('cup_teams')
        .select('id, user_id, club_name, bot_strength, is_bot')
        .in('id', [m.home_team_id, m.away_team_id].filter(Boolean));
      const homeT = teams?.find((t: any) => t.id === m.home_team_id);
      const awayT = teams?.find((t: any) => t.id === m.away_team_id);
      if (!homeT || !awayT) continue;
      const homeStr = homeT.is_bot ? (homeT.bot_strength || 60) : await getUserStrength(adminClient, homeT.user_id);
      const awayStr = awayT.is_bot ? (awayT.bot_strength || 60) : await getUserStrength(adminClient, awayT.user_id);
      const { home: hg, away: ag } = simulateGoals(homeStr, awayStr, true);
      const events = genEvents(hg, ag, homeT.club_name, awayT.club_name);

      const { error: updErr } = await adminClient
        .from('cup_matches')
        .update({
          home_goals: hg, away_goals: ag, status: 'finished',
          played_at: new Date().toISOString(),
          match_data: { ...(m.match_data || {}), events, auto_simulated: true, home_name: homeT.club_name, away_name: awayT.club_name },
        })
        .eq('id', m.id).eq('status', 'scheduled');
      if (updErr) continue;

      if (homeT.user_id) await notify(adminClient, homeT.user_id, awayT.club_name, hg, ag, 'Copa');
      if (awayT.user_id) await notify(adminClient, awayT.user_id, homeT.club_name, ag, hg, 'Copa');
      cupCount++;
    }

    // ── 3. CUSTOM TOURNAMENT MATCHES ──────────────────────────
    const { data: customMatches } = await adminClient
      .from('custom_tournament_matches')
      .select('id, tournament_id, home_team_id, away_team_id, match_data')
      .eq('status', 'scheduled')
      .lt('scheduled_at', cutoff)
      .limit(MAX_PER_RUN);

    for (const m of customMatches || []) {
      const { data: teams } = await adminClient
        .from('custom_tournament_teams')
        .select('id, user_id, club_name, bot_strength, is_bot, points, wins, draws, losses, goals_for, goals_against, played')
        .in('id', [m.home_team_id, m.away_team_id]);
      const homeT = teams?.find((t: any) => t.id === m.home_team_id);
      const awayT = teams?.find((t: any) => t.id === m.away_team_id);
      if (!homeT || !awayT) continue;
      const homeStr = homeT.is_bot ? (homeT.bot_strength || 60) : await getUserStrength(adminClient, homeT.user_id);
      const awayStr = awayT.is_bot ? (awayT.bot_strength || 60) : await getUserStrength(adminClient, awayT.user_id);
      const { home: hg, away: ag } = simulateGoals(homeStr, awayStr, true);
      const events = genEvents(hg, ag, homeT.club_name, awayT.club_name);

      const { error: updErr } = await adminClient
        .from('custom_tournament_matches')
        .update({
          home_goals: hg, away_goals: ag, status: 'finished',
          played_at: new Date().toISOString(),
          match_data: { ...(m.match_data || {}), events, auto_simulated: true, home_name: homeT.club_name, away_name: awayT.club_name },
        })
        .eq('id', m.id).eq('status', 'scheduled');
      if (updErr) continue;

      // Update standings
      for (const t of [
        { row: homeT, gf: hg, ga: ag, win: hg > ag, draw: hg === ag, loss: hg < ag },
        { row: awayT, gf: ag, ga: hg, win: ag > hg, draw: hg === ag, loss: ag < hg },
      ]) {
        await adminClient.from('custom_tournament_teams').update({
          points: t.row.points + (t.win ? 3 : t.draw ? 1 : 0),
          wins: t.row.wins + (t.win ? 1 : 0),
          draws: t.row.draws + (t.draw ? 1 : 0),
          losses: t.row.losses + (t.loss ? 1 : 0),
          goals_for: t.row.goals_for + t.gf,
          goals_against: t.row.goals_against + t.ga,
          played: t.row.played + 1,
        }).eq('id', t.row.id);
      }
      if (homeT.user_id) await notify(adminClient, homeT.user_id, awayT.club_name, hg, ag, 'Torneio');
      if (awayT.user_id) await notify(adminClient, awayT.user_id, homeT.club_name, ag, hg, 'Torneio');
      customCount++;
    }

    // ── 4. FRIENDLY INVITES ───────────────────────────────────
    const { data: friendlies } = await adminClient
      .from('friendly_invites')
      .select('id, sender_id, receiver_id, sender_club_name, receiver_club_name, home_team_id, match_date, match_result')
      .eq('status', 'accepted')
      .is('match_result', null)
      .lt('match_date', cutoff)
      .limit(MAX_PER_RUN);

    for (const f of friendlies || []) {
      const homeIsHomeTeam = f.home_team_id === f.sender_id;
      const senderStr = await getUserStrength(adminClient, f.sender_id);
      const receiverStr = await getUserStrength(adminClient, f.receiver_id);
      const homeStr = homeIsHomeTeam ? senderStr : receiverStr;
      const awayStr = homeIsHomeTeam ? receiverStr : senderStr;
      const homeName = homeIsHomeTeam ? f.sender_club_name : f.receiver_club_name;
      const awayName = homeIsHomeTeam ? f.receiver_club_name : f.sender_club_name;
      const { home: hg, away: ag } = simulateGoals(homeStr, awayStr, true);
      const events = genEvents(hg, ag, homeName, awayName);

      const { error: updErr } = await adminClient
        .from('friendly_invites')
        .update({
          status: 'finished',
          match_result: { home_goals: hg, away_goals: ag, events, auto_simulated: true, home_name: homeName, away_name: awayName },
        })
        .eq('id', f.id).eq('status', 'accepted');
      if (updErr) continue;

      const senderGoals = homeIsHomeTeam ? hg : ag;
      const receiverGoals = homeIsHomeTeam ? ag : hg;
      await notify(adminClient, f.sender_id, f.receiver_club_name, senderGoals, receiverGoals, 'Amistoso');
      await notify(adminClient, f.receiver_id, f.sender_club_name, receiverGoals, senderGoals, 'Amistoso');
      friendlyCount++;
    }

    return new Response(JSON.stringify({
      ok: true,
      simulated: { league: leagueCount, cup: cupCount, custom: customCount, friendly: friendlyCount },
      total: leagueCount + cupCount + customCount + friendlyCount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('auto-sim error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
