import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const season = body.season || 1;
    const startDate = body.start_date || new Date().toISOString().slice(0, 10);

    const { data: champions, error: cErr } = await supabase
      .from("world_league_teams")
      .select("*, world_leagues(country, continent)")
      .eq("last_season_position", 1);

    if (cErr) throw cErr;
    
    let participants = champions || [];
    if (participants.length < 32) {
        const { data: topTeams } = await supabase
            .from("world_league_teams")
            .select("*, world_leagues(country, continent)")
            .order("strength", { ascending: false })
            .limit(32);
        participants = topTeams || [];
    }

    if (participants.length < 32) throw new Error("Não há times suficientes para o Mundial");

    const { data: tournament, error: tErr } = await supabase
      .from("tournaments")
      .insert({
        name: "Super Mundial FLM",
        type: "world_cup",
        season: season,
        status: "in_progress",
        host_country: "Sede Neutra"
      })
      .select()
      .single();

    if (tErr) throw tErr;

    const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const shuffledTeams = shuffle(participants);
    const insertsMatches: any[] = [];

    for (let i = 0; i < 8; i++) {
      const groupName = `Grupo ${groupNames[i]}`;
      const { data: group } = await supabase
        .from("tournament_groups")
        .insert({ tournament_id: tournament.id, name: groupName })
        .select()
        .single();
      
      const groupTeams = shuffledTeams.slice(i * 4, (i + 1) * 4);
      
      await supabase.from("tournament_group_standings").insert(
        groupTeams.map(t => ({ group_id: group.id, team_id: t.id }))
      );

      const days = [16, 18, 20];
      const pairings = [
        [[0, 1], [2, 3]],
        [[0, 2], [1, 3]],
        [[0, 3], [1, 2]]
      ];

      pairings.forEach((pDay, dIdx) => {
        const dateStr = addDaysBrt(startDate, days[dIdx] - 1);
        pDay.forEach(([hIdx, aIdx]) => {
          insertsMatches.push({
            tournament_id: tournament.id,
            group_id: group.id,
            stage: "group",
            home_team_id: groupTeams[hIdx].id,
            away_team_id: groupTeams[aIdx].id,
            scheduled_at: brtDateTimeToUtcIso(dateStr, 21, 0),
            stadium: "Estádio Mundial"
          });
        });
      });
    }

    await supabase.from("tournament_matches").insert(insertsMatches);

    return new Response(JSON.stringify({ ok: true, tournament_id: tournament.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
