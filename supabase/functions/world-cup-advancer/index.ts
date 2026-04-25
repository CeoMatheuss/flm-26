// World Cup Round Advancer — verifica copas com rodada completa e gera próxima rodada
// Roda periodicamente (cron). Idempotente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGE_FLOW: Record<string, { next: string | null; round: number; hour: number; daysAhead: number }> = {
  R16: { next: "QF", round: 2, hour: 13, daysAhead: 5 },
  QF: { next: "SF", round: 3, hour: 14, daysAhead: 5 },
  SF: { next: "F", round: 4, hour: 15, daysAhead: 5 },
  F: { next: null, round: 5, hour: 15, daysAhead: 0 },
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: cups } = await supabase
    .from("world_cups")
    .select("id, country, cup_name, current_round")
    .eq("status", "in_progress");

  const advanced: any[] = [];

  for (const cup of cups ?? []) {
    // Pega todas as partidas da rodada atual
    const { data: roundMatches } = await supabase
      .from("world_cup_matches")
      .select("id, stage, home_team_id, away_team_id, home_goals, away_goals, status, kickoff_at")
      .eq("cup_id", cup.id)
      .eq("round", cup.current_round);

    if (!roundMatches || roundMatches.length === 0) continue;
    const allFinished = roundMatches.every((m) => m.status === "finished");
    if (!allFinished) continue;

    const stage = roundMatches[0].stage as string;
    const flow = STAGE_FLOW[stage];
    if (!flow) continue;

    if (flow.next === null) {
      // Final terminada — campeão
      const final = roundMatches[0];
      const champion = (final.home_goals ?? 0) > (final.away_goals ?? 0)
        ? final.home_team_id : final.away_team_id;
      await supabase
        .from("world_cups")
        .update({ status: "finished", champion_team_id: champion })
        .eq("id", cup.id);
      advanced.push({ cup: cup.cup_name, finished: true });
      continue;
    }

    // Gera próxima rodada com vencedores
    const winners = roundMatches.map((m) =>
      (m.home_goals ?? 0) >= (m.away_goals ?? 0) ? m.home_team_id : m.away_team_id
    );

    // Data: pega a maior kickoff_at da rodada atual + daysAhead
    const lastKickoff = roundMatches
      .map((m) => new Date(m.kickoff_at))
      .sort((a, b) => b.getTime() - a.getTime())[0];
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
      await supabase
        .from("world_cups")
        .update({ current_round: flow.round })
        .eq("id", cup.id);
      advanced.push({ cup: cup.cup_name, next_stage: flow.next, matches: nextMatches.length });
    }
  }

  return new Response(JSON.stringify({ ok: true, advanced }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
