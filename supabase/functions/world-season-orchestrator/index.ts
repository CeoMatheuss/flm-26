import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * world-season-orchestrator
 * Manages the 30-day season cycle:
 * Day 01: Reset and Plan League (2 rounds/day for 19 days)
 * Day 19: End League, Process Awards, Qualify for Mundial
 * Day 20: Generate Mundial Matches
 * Day 30: End Season, Reset
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Get current season state
    const { data: state, error: sErr } = await sb
      .from("season_system_state")
      .select("*")
      .limit(1)
      .single();

    if (sErr || !state) {
      throw new Error("Season state not found. Run migration first.");
    }

    // Calculate current day based on season_start_at
    const now = new Date();
    const start = new Date(state.season_start_at);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = diffDays; // No clamping here to allow multi-season progression

    console.log(`[Season Orchestrator] Day ${currentDay} of Season ${state.current_season}`);

    // Update state day if changed
    if (state.current_day !== currentDay) {
      await sb.from("season_system_state").update({ current_day: currentDay }).eq("id", state.id);
    }

    const logs = [];

    // --- DAY 01: START LEAGUE ---
    if (currentDay === 1 && state.phase !== 'league') {
      logs.push("Starting Day 1: League Initialization");
      
      // Reset Leagues
      const resetRes = await sb.functions.invoke('world-leagues-reset', { body: {} });
      logs.push(`Leagues Reset: ${JSON.stringify(resetRes.data)}`);

      // Plan Season with 2 rounds per day
      const planRes = await sb.functions.invoke('world-season-planner', { 
        body: { force: true, rounds_per_day: 2 } 
      });
      logs.push(`Season Planned: ${JSON.stringify(planRes.data)}`);

      await sb.from("season_system_state").update({ phase: 'league' }).eq("id", state.id);
    }

    // --- DAY 19: LEAGUE END & MUNDIAL QUALIFICATION ---
    if (currentDay === 19 && state.phase === 'league') {
      logs.push("Day 19: Processing League End");

      // Verify if all matches finished (best effort)
      const { count: pending } = await sb.from("world_matches")
        .select("id", { count: 'exact', head: true })
        .neq("status", "finished");

      if (pending && pending > 0) {
        logs.push(`Warning: ${pending} matches still pending. Forcing simulation...`);
        await sb.functions.invoke('world-match-simulator', { body: { force_until_empty: true } });
      }

      // Qualify teams for Mundial
      await sb.rpc('qualify_teams_for_mundial');
      logs.push("Teams qualified for Mundial");

      // Process Awards
      await sb.functions.invoke('process-season-awards');
      logs.push("Season awards processed");

      await sb.from("season_system_state").update({ phase: 'transition' }).eq("id", state.id);
    }

    // --- DAY 20: MUNDIAL START ---
    if (currentDay === 20 && state.phase === 'transition') {
      logs.push("Day 20: Generating Mundial");

      // We'll call a dedicated logic for Mundial Generation
      const { data: qualified } = await sb.from("world_league_table")
        .select("team_id, team:world_teams(name, logo, strength)")
        .eq("qualified_for_mundial", true);

      if (qualified && qualified.length > 0) {
        // Create Mundial Competition
        const { data: cup } = await sb.from("world_cup_competitions").insert({
          name: `Mundial de Clubes - Temporada ${state.current_season}`,
          season_year: state.current_season,
          status: 'active'
        }).select().single();

        if (cup) {
           // Insert teams into Mundial
           const cupTeams = qualified.map(q => ({
             cup_id: cup.id,
             team_id: q.team_id
           }));
           await sb.from("world_cup_teams").insert(cupTeams);

           // Generate matches (simple knockout for now or group stage if needed)
           // For now, let's assume a simplified version
           logs.push(`Mundial competition ${cup.id} created with ${qualified.length} teams`);
        }
      }

      await sb.from("season_system_state").update({ phase: 'mundial' }).eq("id", state.id);
    }

    // --- DAY 30: SEASON RESET ---
    if (currentDay >= 30) {
      logs.push("Day 30+: Resetting for new season");
      await sb.from("season_system_state").update({ 
        current_season: state.current_season + 1,
        season_start_at: now.toISOString(),
        current_day: 1,
        phase: 'league'
      }).eq("id", state.id);
      
      // Trigger Day 1 logic immediately for the new season
      await sb.functions.invoke('world-season-orchestrator');
    }

    return new Response(JSON.stringify({ ok: true, day: currentDay, logs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
