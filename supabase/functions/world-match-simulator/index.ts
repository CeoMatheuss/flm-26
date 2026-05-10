// Edge Function: world-match-simulator
// Processa e simula partidas de ligas mundiais que atingiram o horário de início.
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
  return {
    home: Math.min(7, poisson(baseGoals * (hs / total))),
    away: Math.min(7, poisson(baseGoals * (as / total))),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    const nowIso = new Date(now.getTime() - TOLERANCE_MS).toISOString();

    // 1. Fetch overdue world_matches
    const { data: matches, error } = await sb
      .from("world_matches")
      .select(`
        id, league_id, home_team_id, away_team_id, round, season_month, season_year,
        home_team:world_teams!world_matches_home_team_id_fkey(name, strength, user_id),
        away_team:world_teams!world_matches_away_team_id_fkey(name, strength, user_id)
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(10);

    if (error) throw error;
    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: corsHeaders });
    }

    let processed = 0;
    for (const match of matches) {
      // 2. Check if a human is in the lobby or already playing
      const { data: live } = await sb.from('live_matches').select('id').eq('shared_match_id', match.id).limit(1).maybeSingle();
      if (live) continue; // Skip if human is involved

      // 3. Simulate
      const homeStr = match.home_team?.strength || 65;
      const awayStr = match.away_team?.strength || 65;
      const { home: hg, away: ag } = simulate(homeStr, awayStr);

      // 4. Update match
      const { error: uErr } = await sb
        .from("world_matches")
        .update({
          home_goals: hg,
          away_goals: ag,
          status: "finished",
          played_at: now.toISOString()
        })
        .eq("id", match.id)
        .eq("status", "scheduled");

      if (uErr) continue;
      processed++;

      // 5. Update Table
      const teams = [
        { id: match.home_team_id, gf: hg, ga: ag, win: hg > ag, draw: hg === ag },
        { id: match.away_team_id, gf: ag, ga: hg, win: ag > hg, draw: hg === ag }
      ];

      for (const t of teams) {
        const { data: row } = await sb.from("world_league_table")
          .select("*")
          .eq("team_id", t.id)
          .eq("league_id", match.league_id)
          .eq("season_month", match.season_month)
          .eq("season_year", match.season_year)
          .maybeSingle();

        if (row) {
          const resChar = t.win ? 'W' : (t.draw ? 'D' : 'L');
          const newForm = (row.last_5_games || '-----').slice(1) + resChar;
          
          await sb.from("world_league_table").update({
            played: row.played + 1,
            wins: row.wins + (t.win ? 1 : 0),
            draws: row.draws + (t.draw ? 1 : 0),
            losses: row.losses + (!t.win && !t.draw ? 1 : 0),
            goals_for: row.goals_for + t.gf,
            goals_against: row.goals_against + t.ga,
            points: row.points + (t.win ? 3 : t.draw ? 1 : 0),
            last_5_games: newForm,
            win_rate: ((row.wins + (t.win ? 1 : 0)) / (row.played + 1)) * 100
          }).eq("id", row.id);
        }
      }

      // 6. Stats & News (simplified for auto-sim)
      if (Math.random() > 0.5) {
        await sb.from("world_league_news").insert({
          league_id: match.league_id,
          match_id: match.id,
          title: `${match.home_team.name} ${hg}x${ag} ${match.away_team.name}`,
          content: `Resultado final da rodada ${match.round}. ${hg > ag ? match.home_team.name : (ag > hg ? match.away_team.name : 'As equipes')} somam pontos importantes.`,
          category: 'match_report'
        });
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