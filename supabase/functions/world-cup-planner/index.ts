// World Cup Planner — gera mata-mata das copas nacionais
// Formato: 16 times (top 16 da liga D1 do país), 4 rodadas (R16, QF, SF, F)
// Início: matchday 10 da temporada. Kickoffs: 12h-15h BRT (horários cedo)
// Idempotente: só gera se cup_matches não existe ainda para a copa

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// BRT (UTC-3) -> UTC ISO
function brtToUtcIso(dateStr: string, hour: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcHour = hour + 3;
  const dt = utcHour >= 24
    ? new Date(Date.UTC(y, m - 1, d + 1, utcHour - 24, 0, 0))
    : new Date(Date.UTC(y, m - 1, d, utcHour, 0, 0));
  return dt.toISOString();
}

// Adiciona N dias a uma data ISO (yyyy-mm-dd)
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

// Fisher-Yates seguro
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { force?: boolean; cupId?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }

  // Cups elegíveis: status pending OU force
  const { data: cups, error: cupsErr } = await supabase
    .from("world_cups")
    .select("id, country, cup_name, season, starts_on_matchday, status")
    .in("status", body.force ? ["pending", "in_progress"] : ["pending"]);

  if (cupsErr) {
    return new Response(JSON.stringify({ error: cupsErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let skipped = 0;
  const results: any[] = [];

  for (const cup of cups ?? []) {
    if (body.cupId && cup.id !== body.cupId) continue;

    // Check existing matches
    const { count: existingCount } = await supabase
      .from("world_cup_matches")
      .select("*", { count: "exact", head: true })
      .eq("cup_id", cup.id);

    if ((existingCount ?? 0) > 0 && !body.force) {
      skipped++;
      continue;
    }

    // Limpa se force
    if (body.force && (existingCount ?? 0) > 0) {
      await supabase.from("world_cup_matches").delete().eq("cup_id", cup.id);
    }

    // Pega liga D1 do país na temporada atual
    const { data: d1League } = await supabase
      .from("world_leagues")
      .select("id, season_started_at")
      .eq("country", cup.country)
      .eq("division", 1)
      .eq("season", cup.season)
      .maybeSingle();

    if (!d1League) {
      results.push({ cup: cup.cup_name, skipped: "no D1 league" });
      continue;
    }

    // Pega top 16 da D1 por classificação atual (pontos, SG, GP)
    const { data: teams } = await supabase
      .from("world_league_teams")
      .select("id, club_name, points, goals_for, goals_against")
      .eq("league_id", d1League.id)
      .order("points", { ascending: false })
      .order("goals_for", { ascending: false })
      .limit(16);

    if (!teams || teams.length < 16) {
      results.push({ cup: cup.cup_name, skipped: `only ${teams?.length ?? 0} teams` });
      continue;
    }

    // Sorteia chaveamento
    const shuffled = shuffle(teams);

    // Calcula data base: season_started_at + (starts_on_matchday - 1) dias
    const seasonStart = d1League.season_started_at
      ? new Date(d1League.season_started_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const baseDateStr = addDays(seasonStart, cup.starts_on_matchday - 1);

    // Kickoff hours por rodada (12-15h BRT, copa é cedo)
    const STAGES = [
      { round: 1, stage: "R16", hour: 12, dayOffset: 0 },
      { round: 2, stage: "QF", hour: 13, dayOffset: 5 },
      { round: 3, stage: "SF", hour: 14, dayOffset: 10 },
      { round: 4, stage: "F", hour: 15, dayOffset: 15 },
    ];

    // R16: 8 jogos com os 16 sorteados
    const r16 = STAGES[0];
    const matches: any[] = [];
    for (let i = 0; i < 8; i++) {
      matches.push({
        cup_id: cup.id,
        round: r16.round,
        stage: r16.stage,
        home_team_id: shuffled[i * 2].id,
        away_team_id: shuffled[i * 2 + 1].id,
        kickoff_at: brtToUtcIso(baseDateStr, r16.hour),
        status: "scheduled",
      });
    }

    const { error: insErr } = await supabase.from("world_cup_matches").insert(matches);
    if (insErr) {
      results.push({ cup: cup.cup_name, error: insErr.message });
      continue;
    }

    // Marca cup como in_progress
    await supabase
      .from("world_cups")
      .update({ status: "in_progress", current_round: 1 })
      .eq("id", cup.id);

    processed++;
    results.push({
      cup: cup.cup_name,
      country: cup.country,
      r16_matches: matches.length,
      first_kickoff: matches[0].kickoff_at,
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed,
      skipped,
      total_cups: cups?.length ?? 0,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
