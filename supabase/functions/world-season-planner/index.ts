// Edge Function: world-season-planner
// Gera calendário de 30 dias (round-robin duplo) para ligas oficiais world_leagues
// usando horários fixos BRT por divisão. Idempotente: pula ligas que já têm matches.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Round-robin (Berger) — n par. Retorna array de rodadas: cada rodada é array de [home,away].
function buildRoundRobin(teamIds: string[]): Array<Array<[string, string]>> {
  const n = teamIds.length;
  if (n % 2 !== 0) throw new Error("Número de times deve ser par");
  const rounds: Array<Array<[string, string]>> = [];
  const arr = [...teamIds];
  const fixed = arr[0];
  let rotating = arr.slice(1);
  const totalRounds = n - 1;
  for (let r = 0; r < totalRounds; r++) {
    const round: Array<[string, string]> = [];
    const left = [fixed, ...rotating.slice(0, n / 2 - 1)];
    const right = rotating.slice(n / 2 - 1).reverse();
    for (let i = 0; i < n / 2; i++) {
      const home = r % 2 === 0 ? left[i] : right[i];
      const away = r % 2 === 0 ? right[i] : left[i];
      round.push([home, away]);
    }
    rounds.push(round);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }
  return rounds;
}

// Fisher-Yates seguro
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  const buf = new Uint32Array(1);
  for (let i = a.length - 1; i > 0; i--) {
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Converte uma data (YYYY-MM-DD) + hora/min BRT para UTC ISO
function brtDateTimeToUtcIso(dateStr: string, hour: number, minute = 0): string {
  // BRT = UTC-3
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcHour = hour + 3;
  if (utcHour >= 24) {
    const dt = new Date(Date.UTC(y, m - 1, d + 1, utcHour - 24, minute, 0));
    return dt.toISOString();
  }
  const dt = new Date(Date.UTC(y, m - 1, d, utcHour, minute, 0));
  return dt.toISOString();
}

// Adiciona N dias a uma data YYYY-MM-DD (BRT) e retorna nova string YYYY-MM-DD
function addDaysBrt(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// Hoje em BRT como YYYY-MM-DD
function todayBrt(): string {
  const now = new Date();
  // converte para BRT subtraindo 3h
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
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
    const onlyLeagueId: string | undefined = body?.league_id;
    const force: boolean = body?.force === true;

    // 1. Buscar ligas ativas
    let q = supabase
      .from("world_leagues")
      .select("id, country, division, kickoff_hour, kickoff_minute, season, current_matchday, status, season_started_at")
      .eq("status", "in_progress");
    if (onlyLeagueId) q = q.eq("id", onlyLeagueId);

    const { data: leagues, error: lErr } = await q;
    if (lErr) throw lErr;
    if (!leagues || leagues.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Nenhuma liga ativa encontrada", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let processed = 0;
    let skipped = 0;
    let totalMatches = 0;
    const errors: Array<{ league_id: string; error: string }> = [];

    for (const league of leagues) {
      try {
        // Já tem matches?
        const { count: existing } = await supabase
          .from("world_matches")
          .select("id", { count: "exact", head: true })
          .eq("league_id", league.id)
          .eq("season", league.season);

        if (existing && existing > 0 && !force) {
          skipped++;
          continue;
        }

        if (force && existing && existing > 0) {
          await supabase
            .from("world_matches")
            .delete()
            .eq("league_id", league.id)
            .eq("season", league.season);
        }

        // Buscar 20 times
        const { data: teams, error: tErr } = await supabase
          .from("world_league_teams")
          .select("id")
          .eq("league_id", league.id);
        if (tErr) throw tErr;
        if (!teams || teams.length !== 20) {
          errors.push({
            league_id: league.id,
            error: `Esperava 20 times, encontrou ${teams?.length ?? 0}`,
          });
          continue;
        }

        // Gerar round-robin duplo (38 rodadas) com ordem embaralhada
        const ids = shuffle(teams.map((t) => t.id));
        const firstHalf = buildRoundRobin(ids); // 19 rodadas
        const secondHalf = firstHalf.map((round) =>
          round.map(([h, a]) => [a, h] as [string, string]),
        );
        const allRounds = [...firstHalf, ...secondHalf]; // 38 rodadas

        // Mas a temporada é 30 dias → cada dia tem 1 rodada → 30 rodadas
        // Usamos as primeiras 30 rodadas (todos jogam todos no turno + parte do returno)
        const rounds = allRounds.slice(0, 30);

        const startDate = league.season_started_at
          ? new Date(league.season_started_at).toISOString().slice(0, 10)
          : todayBrt();

        const inserts: any[] = [];
        rounds.forEach((round, idx) => {
          const matchday = idx + 1;
          const dateStr = addDaysBrt(startDate, idx);
          const kickoffUtc = brtDateTimeToUtcIso(dateStr, league.kickoff_hour);
          for (const [home, away] of round) {
            inserts.push({
              league_id: league.id,
              season: league.season,
              matchday,
              home_team_id: home,
              away_team_id: away,
              kickoff_at: kickoffUtc,
              status: "scheduled",
            });
          }
        });

        // Insert em chunks de 200
        for (let i = 0; i < inserts.length; i += 200) {
          const chunk = inserts.slice(i, i + 200);
          const { error: insErr } = await supabase.from("world_matches").insert(chunk);
          if (insErr) throw insErr;
        }

        totalMatches += inserts.length;
        processed++;
      } catch (e: any) {
        errors.push({ league_id: league.id, error: e?.message ?? String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed,
        skipped,
        total_matches_created: totalMatches,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
