// World Cup Tournament Planner — Mundial de Clubes
// Desbloqueia: temporada 3+ (após 2 ciclos de 30 dias)
// Formato: 8 times (6 campeões continentais + 2 vice-campeões da Europa/AmSul)
// 3 rodadas mata-mata: QF (4 jogos), SF (2), F (1). Kickoff 21h BRT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { force?: boolean } = {};
  try { body = await req.json(); } catch { /* no body */ }

  // Pega temporada atual (maior season de world_leagues)
  const { data: maxSeasonRow } = await supabase
    .from("world_leagues")
    .select("season")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();
  const currentSeason = maxSeasonRow?.season ?? 1;

  // Desbloqueia mundiais elegíveis
  await supabase
    .from("world_cup_tournament")
    .update({ status: "pending" })
    .eq("status", "locked")
    .lte("unlocks_in_season", currentSeason);

  const { data: tournaments, error: tErr } = await supabase
    .from("world_cup_tournament")
    .select("id, edition, season, status")
    .in("status", body.force ? ["pending", "in_progress"] : ["pending"]);

  if (tErr) {
    return new Response(JSON.stringify({ error: tErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  let processed = 0;
  let skipped = 0;

  for (const tour of tournaments ?? []) {
    const { count: existingMatches } = await supabase
      .from("world_cup_tournament_matches")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tour.id);

    if ((existingMatches ?? 0) > 0 && !body.force) {
      skipped++;
      continue;
    }
    if (body.force && (existingMatches ?? 0) > 0) {
      await supabase.from("world_cup_tournament_matches").delete().eq("tournament_id", tour.id);
      await supabase.from("world_cup_tournament_clubs").delete().eq("tournament_id", tour.id);
    }

    // Classificação: campeões das 6 internacionais da temporada anterior + 2 vice (Europa/AmSul)
    const targetSeason = Math.max(1, tour.season - 1);
    const { data: intlComps } = await supabase
      .from("international_competitions")
      .select("id, continent, champion_team_id")
      .eq("season", targetSeason)
      .not("champion_team_id", "is", null);

    const qualifiers: { team_id: string; source: string }[] = [];
    for (const comp of intlComps ?? []) {
      qualifiers.push({
        team_id: comp.champion_team_id!,
        source: `${comp.continent}_champion`,
      });
    }

    // Se não atingir 8, completa com top times da D1 das potências (Europa/AmSul)
    if (qualifiers.length < 8) {
      const TOP_COUNTRIES = ["Brasil", "Espanha", "Inglaterra", "Itália", "Alemanha", "França", "Argentina"];
      const need = 8 - qualifiers.length;
      const usedIds = new Set(qualifiers.map((q) => q.team_id));

      const { data: topTeams } = await supabase
        .from("world_league_teams")
        .select("id, club_name, world_leagues!inner(country, division, season)")
        .eq("world_leagues.division", 1)
        .eq("world_leagues.season", targetSeason)
        .in("world_leagues.country", TOP_COUNTRIES)
        .order("points", { ascending: false })
        .order("goals_for", { ascending: false })
        .limit(need * 3);

      for (const t of topTeams ?? []) {
        if (qualifiers.length >= 8) break;
        if (usedIds.has(t.id)) continue;
        qualifiers.push({ team_id: t.id, source: "wildcard_top_country" });
        usedIds.add(t.id);
      }
    }

    if (qualifiers.length < 4) {
      results.push({ edition: tour.edition, skipped: `only ${qualifiers.length} qualifiers` });
      continue;
    }

    // Trava em 8 (ou 4 se bem pouco)
    const finalSize = qualifiers.length >= 8 ? 8 : 4;
    const finalQualifiers = qualifiers.slice(0, finalSize);

    // Inscreve clubes
    await supabase.from("world_cup_tournament_clubs").insert(
      finalQualifiers.map((q) => ({
        tournament_id: tour.id,
        team_id: q.team_id,
        qualification_source: q.source,
      })),
    );

    // Sorteia chaveamento
    const bracket = shuffle(finalQualifiers);

    // Data base: hoje + 3 dias (start delay)
    const today = new Date().toISOString().slice(0, 10);
    const baseDate = addDays(today, 3);

    // Estágios
    const STAGES = finalSize === 8
      ? [
          { round: 1, stage: "QF", count: 4, dayOffset: 0 },
          { round: 2, stage: "SF", count: 2, dayOffset: 5 },
          { round: 3, stage: "F",  count: 1, dayOffset: 10 },
        ]
      : [
          { round: 1, stage: "SF", count: 2, dayOffset: 0 },
          { round: 2, stage: "F",  count: 1, dayOffset: 5 },
        ];

    const first = STAGES[0];
    const matches: any[] = [];
    for (let i = 0; i < first.count; i++) {
      matches.push({
        tournament_id: tour.id,
        round: first.round,
        stage: first.stage,
        home_team_id: bracket[i * 2].team_id,
        away_team_id: bracket[i * 2 + 1].team_id,
        kickoff_at: brtToUtcIso(addDays(baseDate, first.dayOffset), 21),
        status: "scheduled",
      });
    }

    const { error: insErr } = await supabase.from("world_cup_tournament_matches").insert(matches);
    if (insErr) {
      results.push({ edition: tour.edition, error: insErr.message });
      continue;
    }

    await supabase
      .from("world_cup_tournament")
      .update({ status: "in_progress", current_round: 1 })
      .eq("id", tour.id);

    processed++;
    results.push({
      edition: tour.edition,
      qualifiers: finalQualifiers.length,
      first_stage: first.stage,
      first_kickoff: matches[0].kickoff_at,
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      current_season: currentSeason,
      total_tournaments: tournaments?.length ?? 0,
      processed,
      skipped,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
