// Edge Function: world-match-simulator (Updated for New League System)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HUMAN_TOLERANCE_MS = 1 * 60_000;

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
  const lambdaHome = baseGoals * (hs / total) * 1.05;
  const lambdaAway = baseGoals * (as / total) * 0.95;
  return {
    home: Math.min(7, poisson(lambdaHome)),
    away: Math.min(7, poisson(lambdaAway)),
  };
}

async function getTeamStrength(supabase: any, teamId: UUID, userId: UUID | null, botStrength: number): Promise<number> {
  if (userId) {
    const { data } = await supabase.rpc("get_user_team_strength", { _user_id: userId });
    return Number(data) || 60;
  }
  return botStrength || 60;
}

async function notifyHuman(supabase: any, userId: string, opponent: string, mine: number, theirs: number, comp: string) {
  const result = mine > theirs ? "🟢 Vitória" : mine === theirs ? "🟡 Empate" : "🔴 Derrota";
  await supabase.from("user_notifications").insert({
    user_id: userId,
    type: "match_auto_simulated",
    icon: "🤖",
    title: "Partida da Liga Simulada",
    message: `${result} ${mine}x${theirs} vs ${opponent} (${comp})`,
    data: { my_goals: mine, opp_goals: theirs, opponent, competition: comp },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const nowIso = new Date(Date.now() - HUMAN_TOLERANCE_MS).toISOString();

    // Fetch next scheduled league match
    const { data: matches, error } = await supabase
      .from("league_matches")
      .select(`
        id, league_id, round, home_user_id, away_user_id, home_team_id, away_team_id, scheduled_at,
        league:world_leagues(name),
        home_team:world_league_teams!league_matches_home_team_id_fkey(club_name, bot_strength),
        away_team:world_league_teams!league_matches_away_team_id_fkey(club_name, bot_strength)
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(10);

    if (error) throw error;

    let processed = 0;
    for (const match of (matches || [])) {
      const homeStr = await getTeamStrength(supabase, match.home_team_id, match.home_user_id, match.home_team.bot_strength);
      const awayStr = await getTeamStrength(supabase, match.away_team_id, match.away_user_id, match.away_team.bot_strength);

      const { home: hg, away: ag } = simulate(homeStr, awayStr);

      const { error: uErr } = await supabase
        .from("league_matches")
        .update({
          home_goals: hg,
          away_goals: ag,
          status: "played",
          played_at: new Date().toISOString(),
          match_data: { simulated: true, home_strength: homeStr, away_strength: awayStr }
        })
        .eq("id", match.id)
        .eq("status", "scheduled");

      if (!uErr) {
        processed++;
        if (match.home_user_id) await notifyHuman(supabase, match.home_user_id, match.away_team.club_name, hg, ag, match.league.name);
        if (match.away_user_id) await notifyHuman(supabase, match.away_user_id, match.home_team.club_name, ag, hg, match.league.name);
      }
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
