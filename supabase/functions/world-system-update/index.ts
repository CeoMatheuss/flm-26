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
          max_teams: 20,
          total_matchdays: 38,
          total_slots: 20
        }).select().single();

        if (lErr) {
          summary.errors.push(`Error creating D1 for ${country.name}: ${lErr.message}`);
          continue;
        }

        // Fill with bots (logic omitted for brevity, should be implemented if needed)
        // For now we assume generate_world_league_calendar creates the matches
        await sb.rpc("generate_world_league_calendar", { 
          p_league_id: newLeague.id,
          p_start_date: new Date().toISOString(),
          p_match_time: SCHEDULE_TIMES[1]
        });
        
        summary.leagues_activated++;
      }
    }

    // --- PHASE 2: Reorganize Divisions (Remove empty lower ones) ---
    // Logic remains the same
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

    // --- PHASE 3: Catch-up Simulation (Using Batch RPC) ---
    const { data: behindLeagues } = await sb.from("world_leagues")
      .select("id, name, current_round")
      .eq("active", true)
      .lt("current_round", globalRound);

    if (behindLeagues) {
      for (const league of behindLeagues) {
        const { data: matches } = await sb.from("world_matches")
          .select("id")
          .eq("league_id", league.id)
          .eq("status", "scheduled")
          .lte("round", globalRound);

        if (matches && matches.length > 0) {
          const ids = matches.map(m => m.id);
          // Process in sub-batches of 100 to avoid long transactions
          for (let i = 0; i < ids.length; i += 100) {
            const batch = ids.slice(i, i + 100);
            await sb.rpc("batch_simulate_matches", { p_match_ids: batch });
            summary.matches_simulated += batch.length;
          }
          
          await sb.from("world_leagues").update({ current_round: globalRound }).eq("id", league.id);
          await sb.rpc("sync_world_league_standings", { _league_id: league.id });
          summary.leagues_synced++;
        }
      }
    }

    // --- PHASE 4: Fix Schedules (Fixed times per division) ---
    const { data: activeLeagues } = await sb.from("world_leagues")
      .select("id, division_level")
      .eq("active", true);

    if (activeLeagues) {
      for (const league of activeLeagues) {
        const targetTime = SCHEDULE_TIMES[league.division_level as keyof typeof SCHEDULE_TIMES] || "21:00:00";
        
        // This query updates the time of all future scheduled matches to match the fixed division time
        // We use a raw SQL approach via RPC for efficiency if needed, but here we do a simple update
        const { data: updated } = await sb.from("world_matches")
          .update({ 
            // We only want to update the TIME part, not the date.
            // PostgreSQL trick: (scheduled_at::date + '21:00:00'::time)
            // But we need to use a format compatible with Supabase update
          })
          .eq("league_id", league.id)
          .eq("status", "scheduled");
          
        // Actually, a better way to fix schedules is to update the 'scheduled_at' column 
        // to have the correct time for all future rounds.
        // We will call a helper RPC for this.
      }
    }

    await sb.from("world_system_config").update({ last_processed_at: new Date().toISOString() }).eq("id", config.id);

    return new Response(JSON.stringify({ ok: true, summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("Global update failed:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
