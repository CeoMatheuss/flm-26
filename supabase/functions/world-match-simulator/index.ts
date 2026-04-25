// Edge Function: world-match-simulator
// Processa NO MÁXIMO 1 partida world_matches por chamada, respeitando:
//   • Fila de prioridade: Mundial > Internacional > Liga D1 > D2 > D3 > D4
//   • Janela horária: kickoff_at <= now (com tolerância de 5 min para humanos)
//   • Atualiza estatísticas em world_league_teams
//   • Notifica jogadores humanos
//
// Body opcional: { force_until_empty?: boolean, max?: number }
//   force_until_empty + max: drena fila simulando até `max` partidas (watchdog).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tolerância: dá tempo do humano entrar antes de auto-simular
const HUMAN_TOLERANCE_MS = 5 * 60_000;

function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0,
    p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
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
  const events: Array<any> = [];
  const used = new Set<number>();
  const add = (team: "home" | "away", name: string) => {
    let m = 1;
    let tries = 0;
    do {
      m = Math.floor(Math.random() * 90) + 1;
      tries++;
    } while (used.has(m) && tries < 20);
    used.add(m);
    events.push({
      minute: m,
      type: "goal",
      team,
      isGoal: true,
      playerName: "Atacante",
      description: `⚽ GOOOL de ${name}!`,
    });
  };
  for (let i = 0; i < hg; i++) add("home", homeName);
  for (let i = 0; i < ag; i++) add("away", awayName);
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

async function getHumanStrength(
  supabase: any,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("get_user_team_strength", {
    _user_id: userId,
  });
  if (error || data == null) return 60;
  const n = Number(data);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

async function teamStrength(supabase: any, team: any): Promise<number> {
  if (team.user_id) return await getHumanStrength(supabase, team.user_id);
  return Math.max(30, Math.min(95, team.bot_strength || 60));
}

async function notifyHuman(
  supabase: any,
  userId: string,
  opponent: string,
  mine: number,
  theirs: number,
  comp: string,
) {
  const result =
    mine > theirs ? "🟢 Vitória" : mine === theirs ? "🟡 Empate" : "🔴 Derrota";
  await supabase.from("user_notifications").insert({
    user_id: userId,
    type: "match_auto_simulated",
    icon: "🤖",
    title: "Partida simulada automaticamente",
    message: `${result} ${mine}x${theirs} vs ${opponent} (${comp})`,
    data: {
      auto_simulated: true,
      my_goals: mine,
      opp_goals: theirs,
      opponent,
      competition: comp,
    },
  });
}

// Busca a próxima partida elegível seguindo a prioridade global:
// 1. Mundial de Clubes (kind='world_cup_tournament')
// 2. Internacional (kind='international')
// 3. Liga D1 -> D2 -> D3 -> D4 (kind='league')
// 4. Copa Nacional (kind='cup')
// Retorna objeto unificado { kind, ...match } ou null.
async function fetchNextMatch(supabase: any) {
  const nowIso = new Date(Date.now() - HUMAN_TOLERANCE_MS).toISOString();

  // 1. Mundial de Clubes (world_cup_tournament_matches) — máxima prioridade
  const { data: wctData } = await supabase
    .from("world_cup_tournament_matches")
    .select("id, tournament_id, round, stage, home_team_id, away_team_id, kickoff_at, match_data, world_cup_tournament!inner(edition)")
    .eq("status", "scheduled")
    .lte("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(1);
  if (wctData && wctData.length > 0) {
    return { ...wctData[0], _kind: "world_tournament" };
  }

  // 2. Internacional
  const { data: intlData } = await supabase
    .from("international_matches")
    .select("id, competition_id, round, stage, home_team_id, away_team_id, kickoff_at, match_data, international_competitions!inner(competition_name, continent)")
    .eq("status", "scheduled")
    .lte("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(1);
  if (intlData && intlData.length > 0) {
    return { ...intlData[0], _kind: "international" };
  }

  // 3. Ligas — pega top 50 e ordena por divisão
  const { data: leagueData } = await supabase
    .from("world_matches")
    .select(
      "id, league_id, season, matchday, home_team_id, away_team_id, kickoff_at, match_data, world_leagues!inner(division, kickoff_hour, country, league_name)",
    )
    .eq("status", "scheduled")
    .lte("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(50);

  if (leagueData && leagueData.length > 0) {
    const sorted = [...leagueData].sort((a: any, b: any) => {
      const da = a.world_leagues?.division ?? 99;
      const db = b.world_leagues?.division ?? 99;
      if (da !== db) return da - db;
      return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
    });
    return { ...sorted[0], _kind: "league" };
  }

  // 4. Copa Nacional
  const { data: cupData } = await supabase
    .from("world_cup_matches")
    .select("id, cup_id, round, stage, home_team_id, away_team_id, kickoff_at, match_data, world_cups!inner(cup_name, country)")
    .eq("status", "scheduled")
    .lte("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(1);
  if (cupData && cupData.length > 0) {
    return { ...cupData[0], _kind: "cup" };
  }

  return null;
}

async function processMatch(supabase: any, match: any): Promise<boolean> {
  const kind = match._kind || "league";

  // Buscar os dois times
  const { data: teams, error: tErr } = await supabase
    .from("world_league_teams")
    .select(
      "id, user_id, club_name, bot_strength, points, wins, draws, losses, goals_for, goals_against, played",
    )
    .in("id", [match.home_team_id, match.away_team_id]);

  if (tErr) throw tErr;
  const home = teams?.find((t: any) => t.id === match.home_team_id);
  const away = teams?.find((t: any) => t.id === match.away_team_id);
  if (!home || !away) return false;

  const homeStr = await teamStrength(supabase, home);
  const awayStr = await teamStrength(supabase, away);
  let { home: hg, away: ag } = simulate(homeStr, awayStr);

  // Em mata-mata (cup/intl knockout) não há empate — força decisão por disputa
  const isKnockout = kind === "cup" || (kind === "international" && match.stage && !String(match.stage).startsWith("Grupo"));
  if (isKnockout && hg === ag) {
    if (Math.random() < (homeStr / (homeStr + awayStr))) hg++; else ag++;
  }

  const events = genEvents(hg, ag, home.club_name, away.club_name);

  const matchPayload = {
    home_goals: hg,
    away_goals: ag,
    status: "finished",
    played_at: new Date().toISOString(),
    match_data: {
      ...(match.match_data || {}),
      events,
      auto_simulated: true,
      simulated: true,
      home_name: home.club_name,
      away_name: away.club_name,
      home_strength: homeStr,
      away_strength: awayStr,
      kind,
    },
  };

  // Atomic guard por tabela
  const tableMap: Record<string, string> = {
    league: "world_matches",
    cup: "world_cup_matches",
    international: "international_matches",
  };
  const table = tableMap[kind];

  const { data: updated, error: uErr } = await supabase
    .from(table)
    .update(matchPayload)
    .eq("id", match.id)
    .eq("status", "scheduled")
    .select("id");

  if (uErr) throw uErr;
  if (!updated || updated.length === 0) return false;

  // Estatísticas só são atualizadas para LIGA (cups/intl não somam pontos na liga)
  if (kind === "league") {
    for (const u of [
      { row: home, gf: hg, ga: ag, win: hg > ag, draw: hg === ag, loss: hg < ag },
      { row: away, gf: ag, ga: hg, win: ag > hg, draw: hg === ag, loss: ag < hg },
    ]) {
      await supabase
        .from("world_league_teams")
        .update({
          points: (u.row.points || 0) + (u.win ? 3 : u.draw ? 1 : 0),
          wins: (u.row.wins || 0) + (u.win ? 1 : 0),
          draws: (u.row.draws || 0) + (u.draw ? 1 : 0),
          losses: (u.row.losses || 0) + (u.loss ? 1 : 0),
          goals_for: (u.row.goals_for || 0) + u.gf,
          goals_against: (u.row.goals_against || 0) + u.ga,
          played: (u.row.played || 0) + 1,
        })
        .eq("id", u.row.id);
    }
    await maybeAdvanceMatchday(supabase, match.league_id, match.season, match.matchday);
  }

  // Notifica humanos
  let compName = "Partida";
  if (kind === "league") {
    compName = (match.world_leagues?.country || "") + " " + (match.world_leagues?.league_name || "");
  } else if (kind === "cup") {
    compName = "🏆 " + (match.world_cups?.cup_name || "Copa");
  } else if (kind === "international") {
    compName = "🌍 " + (match.international_competitions?.competition_name || "Continental");
  }

  if (home.user_id) {
    await notifyHuman(supabase, home.user_id, away.club_name, hg, ag, compName);
  }
  if (away.user_id) {
    await notifyHuman(supabase, away.user_id, home.club_name, ag, hg, compName);
  }

  return true;
}

async function maybeAdvanceMatchday(
  supabase: any,
  leagueId: string,
  season: number,
  matchday: number,
) {
  // Se todas as partidas dessa rodada estão finished, avança o ponteiro
  const { count: pending } = await supabase
    .from("world_matches")
    .select("id", { count: "exact", head: true })
    .eq("league_id", leagueId)
    .eq("season", season)
    .eq("matchday", matchday)
    .neq("status", "finished");

  if (pending === 0) {
    await supabase
      .from("world_leagues")
      .update({ current_matchday: matchday })
      .eq("id", leagueId);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const force = body?.force_until_empty === true;
    const max = Math.max(1, Math.min(50, Number(body?.max) || 1));

    let processed = 0;
    let consecutiveMisses = 0;

    while (processed < max) {
      const next = await fetchNextMatch(supabase);
      if (!next) break;

      try {
        const ok = await processMatch(supabase, next);
        if (ok) {
          processed++;
          consecutiveMisses = 0;
        } else {
          consecutiveMisses++;
          if (consecutiveMisses >= 3) break;
        }
      } catch (e) {
        console.error("[world-match-sim] processMatch error", e);
        break;
      }

      if (!force) break; // por padrão: 1 por chamada
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[world-match-sim] fatal", e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
