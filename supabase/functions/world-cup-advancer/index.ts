// World Cup Advancer — avança rodadas de TODAS as competições mata-mata:
//   • world_cups (R16 → QF → SF → F)
//   • international_competitions (Grupo → Oitavas → QF → SF → F)
//   • world_cup_tournament (QF → SF → F)
// Roda periodicamente. Idempotente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CUP_FLOW: Record<string, { next: string | null; round: number; hour: number; daysAhead: number }> = {
  R16: { next: "QF", round: 2, hour: 13, daysAhead: 5 },
  QF:  { next: "SF", round: 3, hour: 14, daysAhead: 5 },
  SF:  { next: "F",  round: 4, hour: 15, daysAhead: 5 },
  F:   { next: null, round: 5, hour: 15, daysAhead: 0 },
};

// Mundial: kickoff 21h
const WCT_FLOW: Record<string, { next: string | null; round: number; daysAhead: number }> = {
  QF: { next: "SF", round: 2, daysAhead: 5 },
  SF: { next: "F",  round: 3, daysAhead: 5 },
  F:  { next: null, round: 4, daysAhead: 0 },
};

function brtToUtcIso(dateStr: string, hour: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcHour = hour + 3;
  const dt = utcHour >= 24
    ? new Date(Date.UTC(y, m - 1, d + 1, utcHour - 24, 0, 0))
    : new Date(Date.UTC(y, m - 1, d, utcHour, 0, 0));
  return dt.toISOString();
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

async function advanceWorldCups(supabase: any, advanced: any[]) {
  const { data: cups } = await supabase
    .from("world_cups")
    .select("id, country, cup_name, current_round")
    .eq("status", "in_progress");

  for (const cup of cups ?? []) {
    const { data: roundMatches } = await supabase
      .from("world_cup_matches")
      .select("id, stage, home_team_id, away_team_id, home_goals, away_goals, status, kickoff_at")
      .eq("cup_id", cup.id)
      .eq("round", cup.current_round);

    if (!roundMatches || roundMatches.length === 0) continue;
    if (!roundMatches.every((m: any) => m.status === "played")) continue;

    const stage = roundMatches[0].stage as string;
    const flow = CUP_FLOW[stage];
    if (!flow) continue;

    if (flow.next === null) {
      const final = roundMatches[0];
      const champion = (final.home_goals ?? 0) > (final.away_goals ?? 0)
        ? final.home_team_id : final.away_team_id;
      await supabase
        .from("world_cups")
        .update({ status: "finished", champion_team_id: champion })
        .eq("id", cup.id);
      advanced.push({ kind: "cup", name: cup.cup_name, finished: true });
      continue;
    }

    const winners = roundMatches.map((m: any) =>
      (m.home_goals ?? 0) >= (m.away_goals ?? 0) ? m.home_team_id : m.away_team_id
    );
    const lastKickoff = roundMatches.map((m: any) => new Date(m.kickoff_at))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
    const baseDate = addDays(lastKickoff.toISOString().slice(0, 10), flow.daysAhead);

    const nextMatches: any[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 >= winners.length) break;
      nextMatches.push({
        cup_id: cup.id,
        round: flow.round,
        stage: flow.next,
        home_team_id: winners[i],
        away_team_id: winners[i + 1],
        kickoff_at: brtToUtcIso(baseDate, flow.hour),
        status: "scheduled",
      });
    }
    if (nextMatches.length > 0) {
      await supabase.from("world_cup_matches").insert(nextMatches);
      await supabase.from("world_cups").update({ current_round: flow.round }).eq("id", cup.id);
      advanced.push({ kind: "cup", name: cup.cup_name, next: flow.next, matches: nextMatches.length });
    }
  }
}

async function advanceWorldTournament(supabase: any, advanced: any[]) {
  const { data: tours } = await supabase
    .from("world_cup_tournament")
    .select("id, edition, current_round")
    .eq("status", "in_progress");

  for (const tour of tours ?? []) {
    const { data: roundMatches } = await supabase
      .from("world_cup_tournament_matches")
      .select("id, stage, home_team_id, away_team_id, home_goals, away_goals, status, kickoff_at")
      .eq("tournament_id", tour.id)
      .eq("round", tour.current_round);

    if (!roundMatches || roundMatches.length === 0) continue;
    if (!roundMatches.every((m: any) => m.status === "played")) continue;

    const stage = roundMatches[0].stage as string;
    const flow = WCT_FLOW[stage];
    if (!flow) continue;

    if (flow.next === null) {
      const final = roundMatches[0];
      const champion = (final.home_goals ?? 0) > (final.away_goals ?? 0)
        ? final.home_team_id : final.away_team_id;
      await supabase
        .from("world_cup_tournament")
        .update({ status: "finished", champion_team_id: champion })
        .eq("id", tour.id);
      advanced.push({ kind: "world_cup_tournament", edition: tour.edition, finished: true });
      continue;
    }

    const winners = roundMatches.map((m: any) =>
      (m.home_goals ?? 0) >= (m.away_goals ?? 0) ? m.home_team_id : m.away_team_id
    );
    const lastKickoff = roundMatches.map((m: any) => new Date(m.kickoff_at))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
    const baseDate = addDays(lastKickoff.toISOString().slice(0, 10), flow.daysAhead);

    const nextMatches: any[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 >= winners.length) break;
      nextMatches.push({
        tournament_id: tour.id,
        round: flow.round,
        stage: flow.next,
        home_team_id: winners[i],
        away_team_id: winners[i + 1],
        kickoff_at: brtToUtcIso(baseDate, 21),
        status: "scheduled",
      });
    }
    if (nextMatches.length > 0) {
      await supabase.from("world_cup_tournament_matches").insert(nextMatches);
      await supabase.from("world_cup_tournament").update({ current_round: flow.round }).eq("id", tour.id);
      advanced.push({ kind: "world_cup_tournament", edition: tour.edition, next: flow.next, matches: nextMatches.length });
    }
  }
}

async function advanceInternational(supabase: any, advanced: any[]) {
  const { data: comps } = await supabase
    .from("international_competitions")
    .select("id, competition_name, continent, current_round")
    .eq("status", "in_progress");

  for (const comp of comps ?? []) {
    // Verifica se TODAS as partidas da fase de grupos terminaram
    const { data: groupMatches } = await supabase
      .from("international_matches")
      .select("id, stage, home_team_id, away_team_id, home_goals, away_goals, status, kickoff_at")
      .eq("competition_id", comp.id)
      .like("stage", "Grupo %");

    if (!groupMatches || groupMatches.length === 0) continue;
    const groupsFinished = groupMatches.every((m: any) => m.status === "played");
    if (!groupsFinished) continue;

    // Já criamos mata-mata?
    const { count: knockoutCount } = await supabase
      .from("international_matches")
      .select("*", { count: "exact", head: true })
      .eq("competition_id", comp.id)
      .not("stage", "like", "Grupo %");

    if ((knockoutCount ?? 0) === 0) {
      // Calcula classificação por grupo: top 2 avançam
      const { data: clubs } = await supabase
        .from("international_competition_clubs")
        .select("team_id, group_label")
        .eq("competition_id", comp.id);

      // Calcula pontos por time
      const stats: Record<string, { team_id: string; group: string; pts: number; gd: number; gf: number }> = {};
      for (const c of clubs ?? []) {
        stats[c.team_id] = { team_id: c.team_id, group: c.group_label || "A", pts: 0, gd: 0, gf: 0 };
      }
      for (const m of groupMatches) {
        const hg = m.home_goals ?? 0;
        const ag = m.away_goals ?? 0;
        const h = stats[m.home_team_id];
        const a = stats[m.away_team_id];
        if (!h || !a) continue;
        h.gf += hg; h.gd += (hg - ag);
        a.gf += ag; a.gd += (ag - hg);
        if (hg > ag) h.pts += 3;
        else if (ag > hg) a.pts += 3;
        else { h.pts += 1; a.pts += 1; }
      }

      // Top 2 por grupo
      const groupMap: Record<string, typeof stats[string][]> = {};
      Object.values(stats).forEach((s) => {
        groupMap[s.group] = groupMap[s.group] || [];
        groupMap[s.group].push(s);
      });

      const qualified: { team_id: string; group: string; rank: number }[] = [];
      Object.entries(groupMap).forEach(([g, teams]) => {
        teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
        teams.slice(0, 2).forEach((t, i) => qualified.push({ team_id: t.team_id, group: g, rank: i + 1 }));
      });

      if (qualified.length < 4) continue;

      // Cria mata-mata: cruzamento 1ºA x 2ºB, 1ºB x 2ºA, etc.
      const firsts = qualified.filter((q) => q.rank === 1);
      const seconds = qualified.filter((q) => q.rank === 2);
      const lastKickoff = groupMatches.map((m: any) => new Date(m.kickoff_at))
        .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
      const baseDate = addDays(lastKickoff.toISOString().slice(0, 10), 5);

      const stage = qualified.length === 8 ? "QF" : "SF";
      const knockoutMatches: any[] = [];
      for (let i = 0; i < firsts.length; i++) {
        // Cruza: 1ºA vs 2ºB, 1ºB vs 2ºA (rotação)
        const opponent = seconds[(i + 1) % seconds.length];
        if (!opponent || opponent.team_id === firsts[i].team_id) continue;
        knockoutMatches.push({
          competition_id: comp.id,
          round: 100, // marca início mata-mata
          stage,
          home_team_id: firsts[i].team_id,
          away_team_id: opponent.team_id,
          kickoff_at: brtToUtcIso(baseDate, 20),
          status: "scheduled",
        });
      }
      if (knockoutMatches.length > 0) {
        await supabase.from("international_matches").insert(knockoutMatches);
        await supabase.from("international_competitions").update({ current_round: 100 }).eq("id", comp.id);
        advanced.push({ kind: "international", name: comp.competition_name, started_knockout: stage, matches: knockoutMatches.length });
      }
      continue;
    }

    // Mata-mata em andamento: avança rodadas
    const { data: knockMatches } = await supabase
      .from("international_matches")
      .select("id, stage, round, home_team_id, away_team_id, home_goals, away_goals, status, kickoff_at")
      .eq("competition_id", comp.id)
      .eq("round", comp.current_round)
      .not("stage", "like", "Grupo %");

    if (!knockMatches || knockMatches.length === 0) continue;
    if (!knockMatches.every((m: any) => m.status === "played")) continue;

    const currentStage = knockMatches[0].stage;
    const STAGE_NEXT: Record<string, { next: string | null; round: number }> = {
      QF: { next: "SF", round: 101 },
      SF: { next: "F", round: 102 },
      F: { next: null, round: 103 },
    };
    const next = STAGE_NEXT[currentStage];
    if (!next) continue;

    if (next.next === null) {
      const final = knockMatches[0];
      const champion = (final.home_goals ?? 0) > (final.away_goals ?? 0)
        ? final.home_team_id : final.away_team_id;
      await supabase
        .from("international_competitions")
        .update({ status: "finished", champion_team_id: champion })
        .eq("id", comp.id);
      advanced.push({ kind: "international", name: comp.competition_name, finished: true });
      continue;
    }

    const winners = knockMatches.map((m: any) =>
      (m.home_goals ?? 0) >= (m.away_goals ?? 0) ? m.home_team_id : m.away_team_id
    );
    const lastKickoff = knockMatches.map((m: any) => new Date(m.kickoff_at))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
    const baseDate = addDays(lastKickoff.toISOString().slice(0, 10), 5);

    const nextMatches: any[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 >= winners.length) break;
      nextMatches.push({
        competition_id: comp.id,
        round: next.round,
        stage: next.next,
        home_team_id: winners[i],
        away_team_id: winners[i + 1],
        kickoff_at: brtToUtcIso(baseDate, 20),
        status: "scheduled",
      });
    }
    if (nextMatches.length > 0) {
      await supabase.from("international_matches").insert(nextMatches);
      await supabase.from("international_competitions").update({ current_round: next.round }).eq("id", comp.id);
      advanced.push({ kind: "international", name: comp.competition_name, next: next.next, matches: nextMatches.length });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const advanced: any[] = [];

  try {
    await advanceWorldCups(supabase, advanced);
    await advanceInternational(supabase, advanced);
    await advanceWorldTournament(supabase, advanced);
  } catch (e: any) {
    console.error("[advancer] error:", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e), advanced }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, advanced }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
