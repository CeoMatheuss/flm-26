import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_COUNTRIES = [
  { code: "BR", name: "Brasil", d1_name: "Brasileirão Série A", flag: "🇧🇷" },
  { code: "EN", name: "Inglaterra", d1_name: "Premier League", flag: "🏴" },
  { code: "ES", name: "Espanha", d1_name: "LaLiga", flag: "🇪🇸" },
  { code: "IT", name: "Itália", d1_name: "Serie A TIM", flag: "🇮🇹" },
  { code: "DE", name: "Alemanha", d1_name: "Bundesliga", flag: "🇩🇪" },
  { code: "FR", name: "França", d1_name: "Ligue 1", flag: "🇫🇷" },
  { code: "PT", name: "Portugal", d1_name: "Liga Portugal", flag: "🇵🇹" },
  { code: "AR", name: "Argentina", d1_name: "Liga Profesional", flag: "🇦🇷" },
  { code: "NL", name: "Holanda", d1_name: "Eredivisie", flag: "🇳🇱" },
  { code: "BE", name: "Bélgica", d1_name: "Jupiler Pro League", flag: "🇧🇪" },
  { code: "TR", name: "Turquia", d1_name: "Süper Lig", flag: "🇹🇷" },
  { code: "UY", name: "Uruguai", d1_name: "Primera División", flag: "🇺🇾" },
  { code: "CO", name: "Colômbia", d1_name: "Primera A", flag: "🇨🇴" },
  { code: "MX", name: "México", d1_name: "Liga MX", flag: "🇲🇽" },
  { code: "US", name: "Estados Unidos", d1_name: "MLS", flag: "🇺🇸" },
  { code: "SA", name: "Arábia Saudita", d1_name: "Saudi Pro League", flag: "🇸🇦" },
  { code: "JP", name: "Japão", d1_name: "J1 League", flag: "🇯🇵" },
];

const SCHEDULE_TIMES = {
  1: "21:00:00", // Série A
  2: "20:30:00", // Série B
  3: "19:30:00", // Série C
  4: "18:30:00", // Série D
  5: "17:30:00", // Série E
};

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
      schedules_fixed: 0,
      errors: []
    };

    // --- PHASE 1: Ensure All D1s are Active and Exist ---
    for (const country of MASTER_COUNTRIES) {
      const { data: existingD1 } = await sb.from("world_leagues")
        .select("id, name, active")
        .eq("country", country.name)
        .eq("division_level", 1)
        .eq("season_year", currentSeason)
        .maybeSingle();

      if (!existingD1) {
        console.log(`Re-activating D1 for ${country.name}: ${country.d1_name}`);
        const { data: newLeague, error: lErr } = await sb.from("world_leagues").insert({
          country: country.name,
          name: country.d1_name,
          division_level: 1,
          tier_level: 1,
          active: true,
          status: "active",
          season_year: currentSeason,
          current_round: 1,
          max_teams: 20,
          total_matchdays: 38,
          total_slots: 20
        }).select().single();

        if (lErr) {
          summary.errors.push(`Error creating D1 for ${country.name}: ${lErr.message}`);
          continue;
        }

        // Fill with bots if needed
        await sb.rpc("generate_world_league_calendar", { 
          p_league_id: newLeague.id,
          p_start_date: new Date().toISOString(),
          p_match_time: SCHEDULE_TIMES[1]
        });
        
        summary.leagues_activated++;
      } else if (!existingD1.active) {
        console.log(`Activating existing D1 for ${country.name}`);
        await sb.from("world_leagues").update({ active: true, status: "active" }).eq("id", existingD1.id);
        summary.leagues_activated++;
      }
    }

    // --- PHASE 2: Dynamic Reorganization (ONLY FOR D2+) ---
    // Rule: D1 is NEVER deactivated. Lower divisions removed only if empty of human players.
    const { data: lowerLeagues } = await sb.from("world_leagues")
      .select("id, name, country, division_level")
      .gt("division_level", 1);

    if (lowerLeagues) {
      for (const league of lowerLeagues) {
        const { count } = await sb.from("world_teams")
          .select("id", { count: 'exact', head: true })
          .eq("league_id", league.id)
          .eq("is_bot", false);

        if (count === 0) {
          console.log(`Deactivating empty lower league: ${league.name}`);
          await sb.from("world_leagues").update({ active: false, status: "inactive" }).eq("id", league.id);
          summary.divisions_removed++;
        }
      }
    }

    // --- PHASE 3: Catch-up Simulation (Sync with Global Round) ---
    const { data: behindLeagues } = await sb.from("world_leagues")
      .select("id, name, current_round")
      .eq("active", true)
      .lt("current_round", globalRound);

    if (behindLeagues) {
      for (const league of behindLeagues) {
        console.log(`Syncing ${league.name} to round ${globalRound}`);
        const { data: matches } = await sb.from("world_matches")
          .select("id")
          .eq("league_id", league.id)
          .eq("status", "scheduled")
          .lte("round", globalRound);

        if (matches && matches.length > 0) {
          const ids = matches.map(m => m.id);
          // Process in sub-batches
          for (let i = 0; i < ids.length; i += 100) {
            const batch = ids.slice(i, i + 100);
            await sb.rpc("batch_simulate_matches", { p_match_ids: batch });
            summary.matches_simulated += batch.length;
          }
          
          await sb.from("world_leagues").update({ current_round: globalRound }).eq("id", league.id);
          await sb.rpc("sync_world_league_standings", { _league_id: league.id });
          summary.leagues_synced++;
        } else {
          // If no matches found but round is behind, just update the round counter
          await sb.from("world_leagues").update({ current_round: globalRound }).eq("id", league.id);
          summary.leagues_synced++;
        }
      }
    }

    // --- PHASE 4: Fix Schedules and Ensure Correct Times ---
    const { data: activeLeagues } = await sb.from("world_leagues")
      .select("id, division_level")
      .eq("active", true);

    if (activeLeagues) {
      for (const league of activeLeagues) {
        const targetTime = SCHEDULE_TIMES[league.division_level as keyof typeof SCHEDULE_TIMES] || "21:00:00";
        await sb.rpc("fix_world_match_schedules", { 
          p_league_id: league.id, 
          p_target_time: targetTime 
        });
        summary.schedules_fixed++;
      }
    }

    await sb.from("world_system_config").update({ last_processed_at: new Date().toISOString() }).eq("id", config.id);

    return new Response(JSON.stringify({ ok: true, summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("Global update failed:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});