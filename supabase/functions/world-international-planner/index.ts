// World International Planner — gera competições continentais
// Formato: top 4 D1 de cada país do continente, fase de grupos + mata-mata
// Desbloqueia: temporada 2+ (após primeiro ciclo de 30 dias)
// Kickoffs: 20h-21h BRT (depois das ligas)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mapa país -> continente (alinhado com international_competitions.continent)
const COUNTRY_CONTINENT: Record<string, string> = {
  // Europa
  "Inglaterra": "Europa", "Espanha": "Europa", "Itália": "Europa", "Alemanha": "Europa",
  "França": "Europa", "Portugal": "Europa", "Holanda": "Europa", "Bélgica": "Europa",
  "Áustria": "Europa", "Suíça": "Europa", "Dinamarca": "Europa", "Suécia": "Europa",
  "Noruega": "Europa", "Rússia": "Europa", "Turquia": "Europa",
  // América do Sul
  "Brasil": "América do Sul", "Argentina": "América do Sul", "Chile": "América do Sul",
  "Colômbia": "América do Sul",
  // América do Norte
  "Estados Unidos": "América do Norte", "México": "América do Norte",
  // Ásia
  "Japão": "Ásia", "Coreia do Sul": "Ásia", "China": "Ásia", "Arábia Saudita": "Ásia",
  "Índia": "Ásia",
  // África
  "Egito": "África", "Nigéria": "África", "África do Sul": "África",
  // Oceania
  "Austrália": "Oceania",
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { force?: boolean; competitionId?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }

  // Atualiza unlocks: marca como pending qualquer locked cuja season seja >= unlocks_in_season
  // Para isso precisamos saber a season "atual global" — usamos a maior season de world_leagues
  const { data: maxSeasonRow } = await supabase
    .from("world_leagues")
    .select("season")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentSeason = maxSeasonRow?.season ?? 1;

  // Desbloqueia internacionais elegíveis
  await supabase
    .from("international_competitions")
    .update({ status: "pending" })
    .eq("status", "locked")
    .lte("unlocks_in_season", currentSeason);

  const { data: comps, error: compsErr } = await supabase
    .from("international_competitions")
    .select("id, continent, competition_name, season, status")
    .in("status", body.force ? ["pending", "in_progress"] : ["pending"]);

  if (compsErr) {
    return new Response(JSON.stringify({ error: compsErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let skipped = 0;
  const results: any[] = [];

  for (const comp of comps ?? []) {
    if (body.competitionId && comp.id !== body.competitionId) continue;

    const { count: existingMatches } = await supabase
      .from("international_matches")
      .select("*", { count: "exact", head: true })
      .eq("competition_id", comp.id);

    if ((existingMatches ?? 0) > 0 && !body.force) {
      skipped++;
      continue;
    }

    if (body.force && (existingMatches ?? 0) > 0) {
      await supabase.from("international_matches").delete().eq("competition_id", comp.id);
      await supabase.from("international_competition_clubs").delete().eq("competition_id", comp.id);
    }

    // Países do continente
    const countriesInContinent = Object.entries(COUNTRY_CONTINENT)
      .filter(([_, cont]) => cont === comp.continent)
      .map(([country]) => country);

    if (countriesInContinent.length === 0) {
      results.push({ comp: comp.competition_name, skipped: "no countries" });
      continue;
    }

    // Pega top 4 D1 de cada país (temporada anterior se existir)
    const targetSeason = Math.max(1, comp.season - 1);
    const { data: d1Leagues } = await supabase
      .from("world_leagues")
      .select("id, country, season_started_at")
      .in("country", countriesInContinent)
      .eq("division", 1)
      .eq("season", targetSeason);

    const qualifiedTeams: { id: string; country: string; club_name: string }[] = [];
    let baseSeasonStart: string | null = null;

    for (const lg of d1Leagues ?? []) {
      const { data: top4 } = await supabase
        .from("world_league_teams")
        .select("id, club_name")
        .eq("league_id", lg.id)
        .order("points", { ascending: false })
        .order("goals_for", { ascending: false })
        .limit(4);

      for (const t of top4 ?? []) {
        qualifiedTeams.push({ id: t.id, country: lg.country, club_name: t.club_name });
      }
      if (!baseSeasonStart && lg.season_started_at) {
        baseSeasonStart = new Date(lg.season_started_at).toISOString().slice(0, 10);
      }
    }

    if (qualifiedTeams.length < 8) {
      results.push({ comp: comp.competition_name, skipped: `only ${qualifiedTeams.length} qualified` });
      continue;
    }

    // Limita a 16 (4 grupos de 4) ou 8 se o continente tem poucos
    const targetSize = qualifiedTeams.length >= 16 ? 16 : 8;
    const shuffled = shuffle(qualifiedTeams).slice(0, targetSize);

    // Inscreve clubes
    const numGroups = targetSize === 16 ? 4 : 2;
    const teamsPerGroup = targetSize / numGroups;
    const clubsPayload: any[] = [];
    for (let i = 0; i < shuffled.length; i++) {
      const groupIdx = Math.floor(i / teamsPerGroup);
      clubsPayload.push({
        competition_id: comp.id,
        team_id: shuffled[i].id,
        group_label: String.fromCharCode(65 + groupIdx),
      });
    }
    await supabase.from("international_competition_clubs").insert(clubsPayload);

    // Gera fase de grupos: round-robin dentro do grupo
    const baseDate = baseSeasonStart ?? new Date().toISOString().slice(0, 10);
    // Internacional começa matchday 5 (após copas iniciarem)
    const startDate = addDays(baseDate, 4);

    const matches: any[] = [];
    let dayCursor = 0;

    for (let g = 0; g < numGroups; g++) {
      const groupTeams = shuffled.slice(g * teamsPerGroup, (g + 1) * teamsPerGroup);
      // Round-robin simples (ida apenas)
      const rounds: { home: string; away: string }[][] = [];
      const n = groupTeams.length;
      for (let i = 0; i < n - 1; i++) {
        const round: { home: string; away: string }[] = [];
        for (let j = i + 1; j < n; j++) {
          round.push({ home: groupTeams[i].id, away: groupTeams[j].id });
        }
        rounds.push(round);
      }
      // Distribui rodadas em dias diferentes
      rounds.forEach((rnd, rIdx) => {
        rnd.forEach((m) => {
          matches.push({
            competition_id: comp.id,
            round: rIdx + 1,
            stage: `Grupo ${String.fromCharCode(65 + g)}`,
            home_team_id: m.home,
            away_team_id: m.away,
            kickoff_at: brtToUtcIso(addDays(startDate, rIdx * 3), 20),
            status: "scheduled",
          });
        });
      });
    }

    const { error: insErr } = await supabase.from("international_matches").insert(matches);
    if (insErr) {
      results.push({ comp: comp.competition_name, error: insErr.message });
      continue;
    }

    await supabase
      .from("international_competitions")
      .update({ status: "in_progress", current_round: 1 })
      .eq("id", comp.id);

    processed++;
    results.push({
      comp: comp.competition_name,
      continent: comp.continent,
      qualified: shuffled.length,
      groups: numGroups,
      group_matches: matches.length,
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed,
      skipped,
      current_season: currentSeason,
      total_comps: comps?.length ?? 0,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
