import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CONTINENTAL_COMPETITIONS } from "../../src/utils/continentalUtils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function brtDateTimeToUtcIso(dateStr: string, hour: number, minute = 0): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcHour = hour + 3;
  const dt = new Date(Date.UTC(y, m - 1, d, utcHour, minute, 0));
  return dt.toISOString();
}

function addDaysBrt(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const season = body.season || 1;
    const startDate = body.start_date || new Date().toISOString().slice(0, 10);

    const results = [];

    // Para cada continente, criar sua competição
    for (const [continentKey, competition] of Object.entries(CONTINENTAL_COMPETITIONS)) {
      // Buscar times do continente (top 32 por força que não são campeões nacionais - simplificação)
      // No futuro: usar classificação real
      const { data: teams, error: tErr } = await supabase
        .from("world_league_teams")
        .select("*, world_leagues!inner(country, continent)")
        .eq("world_leagues.continent", continentKey)
        .order("strength", { ascending: false })
        .limit(32);

      if (tErr || !teams || teams.length < 32) continue;

      // 1. Criar Torneio
      const { data: tournament, error: tourErr } = await supabase
        .from("tournaments")
        .insert({
          name: competition.name,
          type: "continental",
          season: season,
          status: "in_progress",
          continent: continentKey
        })
        .select()
        .single();

      if (tourErr) continue;

      // 2. Criar Rodadas (16 avos, Oitavas, Quartas, Semi, Final)
      const stages = [
        { name: "16 avos", order: 1, day: 5 },
        { name: "Oitavas", order: 2, day: 10 },
        { name: "Quartas", order: 3, day: 15 },
        { name: "Semi", order: 4, day: 20 },
        { name: "Final", order: 5, day: 28 }
      ];

      const shuffledTeams = shuffle(teams);
      const matchesToInsert: any[] = [];

      // 16 avos (32 times -> 16 confrontos ida e volta)
      const stage16 = stages[0];
      const dateIda = addDaysBrt(startDate, stage16.day - 1);
      const dateVolta = addDaysBrt(startDate, stage16.day + 1);

      for (let i = 0; i < 16; i++) {
        const home = shuffledTeams[i * 2];
        const away = shuffledTeams[i * 2 + 1];

        // Ida
        matchesToInsert.push({
          tournament_id: tournament.id,
          stage: "16_avos_ida",
          home_team_id: home.id,
          away_team_id: away.id,
          scheduled_at: brtDateTimeToUtcIso(dateIda, 21, 0),
          stadium: `Estádio de ${home.club_name}`
        });

        // Volta
        matchesToInsert.push({
          tournament_id: tournament.id,
          stage: "16_avos_volta",
          home_team_id: away.id,
          away_team_id: home.id,
          scheduled_at: brtDateTimeToUtcIso(dateVolta, 21, 0),
          stadium: `Estádio de ${away.club_name}`
        });
      }

      if (matchesToInsert.length > 0) {
        await supabase.from("tournament_matches").insert(matchesToInsert);
      }

      results.push({ continent: continentKey, tournament_id: tournament.id, matches: matchesToInsert.length });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});