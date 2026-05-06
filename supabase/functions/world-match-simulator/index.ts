// Edge Function: world-match-simulator (Unified Global Simulator)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOLERANCE_MS = 5 * 60_000; // 5 minutes after scheduled time

function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulate(homeStr: number, awayStr: number) {
  const hs = Math.max(30, homeStr) * 1.15;
  const as = Math.max(30, awayStr);
  const total = hs + as;
  const baseGoals = 2.6;
  const lambdaHome = baseGoals * (hs / total);
  const lambdaAway = baseGoals * (as / total);
  return {
    home: Math.min(7, poisson(lambdaHome)),
    away: Math.min(7, poisson(lambdaAway)),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const nowIso = new Date(Date.now() - TOLERANCE_MS).toISOString();

    // Fetch next scheduled matches that are overdue
    const { data: matches, error } = await supabase
      .from("matches")
      .select(`
        id, league_id, home_team_id, away_team_id, scheduled_at,
        home_team:teams!matches_home_team_id_fkey(name, is_bot),
        away_team:teams!matches_away_team_id_fkey(name, is_bot)
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (error) throw error;

    let processed = 0;
    for (const match of (matches || [])) {
      // For now using 65 as base strength for auto-sim if we don't calculate OVR here
      // Realistically we should fetch player OVRs, but for batch sync 65 is fine
      const { home: hg, away: ag } = simulate(65, 65);

      const { error: uErr } = await supabase
        .from("matches")
        .update({
          home_score: hg,
          away_score: ag,
          status: "finished",
          finished_at: new Date().toISOString()
        })
        .eq("id", match.id)
        .eq("status", "scheduled");

      if (!uErr) processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});