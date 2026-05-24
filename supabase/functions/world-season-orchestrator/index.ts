import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * world-season-orchestrator
 * Manages the 30-day season cycle.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: state, error: sErr } = await sb
      .from("season_system_state")
      .select("*")
      .limit(1)
      .single();

    if (sErr || !state) throw new Error("Season state not found.");

    const now = new Date();
    const start = new Date(state.season_start_at);
    const currentDay = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const logs = [];

    if (state.current_day !== currentDay) {
      await sb.from("season_system_state").update({ current_day: currentDay }).eq("id", state.id);
    }

    // --- DAY 01: LEAGUE START ---
    if (currentDay === 1 && state.phase !== 'league') {
      logs.push("Initializing Season Day 1");
      await sb.functions.invoke('world-leagues-reset');
      await sb.functions.invoke('world-season-planner', { body: { force: true, rounds_per_day: 2 } });
      await sb.from("season_system_state").update({ phase: 'league' }).eq("id", state.id);
    }

    // --- DAY 19: LEAGUE END & QUALIFY ---
    if (currentDay === 19 && state.phase === 'league') {
      logs.push("Processing League End (Day 19)");
      await sb.rpc('qualify_teams_for_mundial');
      await sb.from("season_system_state").update({ phase: 'transition' }).eq("id", state.id);
    }

    // --- DAY 20: GENERATE MUNDIAL ---
    if (currentDay === 20 && state.phase === 'transition') {
      logs.push("Generating Super Mundial (Day 20)");
      
      const { data: qualified } = await sb.from("world_league_table")
        .select("team_id, team:world_teams(name, logo, strength)")
        .eq("qualified_for_mundial", true)
        .limit(32);

      if (qualified && qualified.length >= 8) {
        const { data: cup } = await sb.from("tournaments").insert({
          name: `Super Mundial de Clubes - Temp ${state.current_season}`,
          type: 'world_cup',
          season: state.current_season,
          status: 'active',
          host_country: 'Suíça'
        }).select().single();

        if (cup) {
          const teams = qualified.map(q => q.team_id);
          const numGroups = Math.min(8, Math.floor(teams.length / 4));
          
          for (let g = 0; g < numGroups; g++) {
            const groupName = `Grupo ${String.fromCharCode(65 + g)}`;
            const { data: group } = await sb.from("tournament_groups").insert({
              tournament_id: cup.id,
              name: groupName
            }).select().single();

            if (group) {
              const groupTeams = teams.slice(g * 4, (g + 1) * 4);
              const matchInserts = [];
              for (let i = 0; i < groupTeams.length; i++) {
                for (let j = i + 1; j < groupTeams.length; j++) {
                  const dayOffset = i + j - 1;
                  const kickoff = new Date(start.getTime() + (19 + dayOffset) * 24 * 60 * 60 * 1000);
                  kickoff.setUTCHours(19, 30, 0, 0);

                  matchInserts.push({
                    tournament_id: cup.id,
                    group_id: group.id,
                    home_team_id: groupTeams[i],
                    away_team_id: groupTeams[j],
                    stage: 'group',
                    status: 'scheduled',
                    scheduled_at: kickoff.toISOString()
                  });
                }
              }
              await sb.from("tournament_matches").insert(matchInserts);
            }
          }
        }
      }
      await sb.from("season_system_state").update({ phase: 'mundial' }).eq("id", state.id);
    }

    // --- DAY 30: RESET ---
    if (currentDay >= 30) {
      logs.push("Season Cycle Complete. Resetting...");
      await sb.from("season_system_state").update({
        current_season: state.current_season + 1,
        season_start_at: now.toISOString(),
        current_day: 1,
        phase: 'league'
      }).eq("id", state.id);
      return await sb.functions.invoke('world-season-orchestrator');
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
