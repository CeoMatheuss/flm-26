import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_COUNTRIES = [
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "EN", name: "Inglaterra", flag: "🏴" },
  { code: "ES", name: "Espanha", flag: "🇪🇸" },
  { code: "IT", name: "Itália", flag: "🇮🇹" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪" },
  { code: "FR", name: "França", flag: "🇫🇷" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "NL", name: "Holanda", flag: "🇳🇱" },
  { code: "BE", name: "Bélgica", flag: "🇧🇪" },
  { code: "TR", name: "Turquia", flag: "🇹🇷" },
  { code: "UY", name: "Uruguai", flag: "🇺🇾" },
  { code: "CO", name: "Colômbia", flag: "🇨🇴" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "SA", name: "Arábia Saudita", flag: "🇸🇦" },
  { code: "JP", name: "Japão", flag: "🇯🇵" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "full_update";

    console.log(`Starting world system update: ${action}`);

    // 1. Get global config
    const { data: config } = await sb.from("world_system_config").select("*").single();
    if (!config) throw new Error("Global config not found");

    const globalRound = config.global_round;
    const currentSeason = config.current_season;

    const summary: any = {
      leagues_activated: 0,
      leagues_synced: 0,
      matches_simulated: 0,
      divisions_removed: 0,
      errors: []
    };

    // --- PHASE 1: Activate All D1s ---
    for (const country of MASTER_COUNTRIES) {
      const { data: existingD1 } = await sb.from("world_leagues")
        .select("id")
        .eq("country", country.name)
        .eq("division_level", 1)
        .eq("season_year", currentSeason)
        .maybeSingle();

      if (!existingD1) {
        console.log(`Activating D1 for ${country.name}`);
        const { data: newLeague, error: lErr } = await sb.from("world_leagues").insert({
          country: country.name,
          name: `${country.name} - Série A`,
          division_level: 1,
          tier_level: 1,
          active: true,
          status: "active",
          season_year: currentSeason,
          current_round: 1,
          max_teams: 20
        }).select().single();

        if (lErr) {
          summary.errors.push(`Error creating D1 for ${country.name}: ${lErr.message}`);
          continue;
        }

        // Fill with bots and generate calendar
        await sb.rpc("generate_world_league_calendar", { 
          p_league_id: newLeague.id,
          p_start_date: new Date().toISOString(),
          p_match_time: "21:00:00"
        });
        
        summary.leagues_activated++;
      }
    }

    // --- PHASE 2: Reorganize Divisions (Remove empty lower ones) ---
    // Get all leagues > Tier 1
    const { data: lowerLeagues } = await sb.from("world_leagues")
      .select("*, world_teams(id, is_bot)")
      .gt("division_level", 1);

    if (lowerLeagues) {
      for (const league of lowerLeagues) {
        const humanCount = league.world_teams?.filter((t: any) => !t.is_bot).length || 0;
        if (humanCount === 0) {
          console.log(`Marking empty lower league for removal: ${league.name} (${league.country})`);
          // Instead of immediate delete, we mark it as 'to_be_removed' or just deactivate
          await sb.from("world_leagues").update({ active: false, status: "inactive" }).eq("id", league.id);
          summary.divisions_removed++;
        }
      }
    }

    // --- PHASE 3: Catch-up Simulation ---
    // Find all active leagues that are behind globalRound
    const { data: behindLeagues } = await sb.from("world_leagues")
      .select("id, name, current_round")
      .eq("active", true)
      .lt("current_round", globalRound);

    if (behindLeagues) {
      for (const league of behindLeagues) {
        console.log(`Syncing league ${league.name}: Round ${league.current_round} -> ${globalRound}`);
        
        // Find scheduled matches for rounds between current_round and globalRound
        const { data: matchesToSim } = await sb.from("world_matches")
          .select("id, round")
          .eq("league_id", league.id)
          .eq("status", "scheduled")
          .lte("round", globalRound);

        if (matchesToSim && matchesToSim.length > 0) {
          console.log(`Simulating ${matchesToSim.length} matches for ${league.name}`);
          
          for (const match of matchesToSim) {
            // Very simple random simulation for catch-up
            const hScore = Math.floor(Math.random() * 4);
            const aScore = Math.floor(Math.random() * 3);
            
            await sb.from("world_matches").update({
              home_goals: hScore,
              away_goals: aScore,
              status: "finished",
              played_at: new Date().toISOString()
            }).eq("id", match.id);
            
            summary.matches_simulated++;
          }
          
          // Update league current_round
          await sb.from("world_leagues").update({ current_round: globalRound }).eq("id", league.id);
          // Sync standings
          await sb.rpc("sync_world_league_standings", { _league_id: league.id });
          
          summary.leagues_synced++;
        }
      }
    }

    // Update last processed timestamp
    await sb.from("world_system_config").update({ last_processed_at: new Date().toISOString() }).eq("id", config.id);

    return new Response(JSON.stringify({ ok: true, summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("Global update failed:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
