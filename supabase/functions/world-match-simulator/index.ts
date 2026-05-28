import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();

    // 1. Get matches that should start but aren't finished
    const { data: matches, error: fetchError } = await sb.from("world_matches")
      .select("*, home_team:world_teams(*), away_team:world_teams(*), league:world_leagues(*)")
      .or('status.eq.scheduled,simulated.eq.false')
      .lte("scheduled_at", now.toISOString())
      .limit(500);

    if (fetchError) throw fetchError;

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No matches to simulate" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = [];
    const uniqueLeagues = new Set<string>();
    
    // Batch update matches
    for (const match of matches) {
      const homeStrength = match.home_team?.strength || 70;
      const awayStrength = match.away_team?.strength || 70;
      
      const homeScore = Math.floor(Math.random() * (homeStrength / 20 + 2));
      const awayScore = Math.floor(Math.random() * (awayStrength / 20 + 2));

      await sb.from("world_matches").update({
        home_goals: homeScore,
        away_goals: awayScore,
        status: "finished",
        played_at: now.toISOString()
      }).eq("id", match.id);

      if (match.league_id) uniqueLeagues.add(match.league_id);
      results.push({ id: match.id, result: `${homeScore}-${awayScore}` });
    }

    // Sync standings once per league
    for (const leagueId of uniqueLeagues) {
      await sb.rpc("sync_world_league_standings", { _league_id: leagueId });
    }

    return new Response(JSON.stringify({ ok: true, simulated: results.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
