// Edge Function: world-match-simulator
// Processa e simula partidas de ligas mundiais e copas nacionais que atingiram o horário de início.
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
  const hs = Math.max(30, homeStr) * 1.15; // Home advantage
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
    // Consider matches scheduled up to TOLERANCE_MS ago
    const overdueTime = new Date(now.getTime() - TOLERANCE_MS).toISOString();

    let totalProcessed = 0;

    // --- 1. PROCESS WORLD LEAGUE MATCHES ---
    const { data: wMatches, error: wErr } = await sb
      .from("world_matches")
      .select(`
        id, league_id, home_team_id, away_team_id, round, season_month, season_year,
        home_team:world_teams!world_matches_home_team_id_fkey(name, strength, user_id),
        away_team:world_teams!world_matches_away_team_id_fkey(name, strength, user_id)
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", now.toISOString()) // Simulate immediately if passed
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (!wErr && wMatches) {
      for (const match of wMatches) {
        // Skip if a live match session exists (human playing)
        const { data: live } = await sb.from('live_matches').select('id').eq('shared_match_id', match.id).limit(1).maybeSingle();
        if (live) continue;

        const homeStr = match.home_team?.strength || 65;
        const awayStr = match.away_team?.strength || 65;
        const { home: hg, away: ag } = simulate(homeStr, awayStr);

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
        totalProcessed++;

        // Update Table
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
            // Use V (Vitória), E (Empate), D (Derrota) for form
            const resChar = t.win ? 'V' : (t.draw ? 'E' : 'D');
            const newForm = ((row.last_5_games || '').replace(/-/g, '') + resChar).slice(-5);
            
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
      }
    }

    // --- 2. PROCESS NATIONAL CUP MATCHES ---
    const { data: cMatches, error: cErr } = await sb
      .from("national_cup_matches")
      .select(`
        *,
        home_team:national_cup_teams!national_cup_matches_home_team_id_fkey(*),
        away_team:national_cup_teams!national_cup_matches_away_team_id_fkey(*)
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", now.toISOString())
      .limit(20);

    if (!cErr && cMatches) {
      for (const match of cMatches) {
        // Only simulate if status is 'in_progress' (starts on day 11)
        const { data: cupStatus } = await sb.from('national_cups').select('status').eq('id', match.cup_id).single();
        if (cupStatus?.status !== 'in_progress') continue;

        const homeStr = match.home_team?.strength || 65;
        const awayStr = match.away_team?.strength || 65;
        const { home: hg, away: ag } = simulate(homeStr, awayStr);

        let homeScore = hg;
        let awayScore = ag;
        let winnerId = homeScore > awayScore ? match.home_team_id : (awayScore > homeScore ? match.away_team_id : null);
        
        // Handle penalties if draw in knockout
        let homePen = 0;
        let awayPen = 0;
        if (homeScore === awayScore) {
          homePen = Math.floor(Math.random() * 6) + 3;
          awayPen = Math.floor(Math.random() * 6) + 3;
          while (homePen === awayPen) {
            awayPen = Math.floor(Math.random() * 6) + 3;
          }
          winnerId = homePen > awayPen ? match.home_team_id : match.away_team_id;
        }

        const { error: uErr } = await sb
          .from("national_cup_matches")
          .update({
            home_score: homeScore,
            away_score: awayScore,
            home_penalties: homePen > 0 ? homePen : null,
            away_penalties: awayPen > 0 ? awayPen : null,
            status: "finished",
            winner_team_id: winnerId
          })
          .eq("id", match.id);

        if (uErr) continue;
        totalProcessed++;

        // Mark loser as eliminated
        const loserId = winnerId === match.home_team_id ? match.away_team_id : match.home_team_id;
        await sb.from('national_cup_teams').update({ eliminated: true }).eq('id', loserId);

        // Add prize for winner (50k as requested)
        await sb.from('national_cup_prizes').insert({
          cup_id: match.cup_id,
          team_id: winnerId,
          amount: 50000,
          description: `Vitória na Rodada ${match.round}`
        });
      }
    }

    // --- 3. AUTO-UPDATE LEAGUE ROUNDS ---
    const { data: activeLeagues } = await sb
      .from("world_leagues")
      .select("id, season_started_at, current_round")
      .eq("status", "in_progress");

    if (activeLeagues) {
      for (const league of activeLeagues) {
        if (!league.season_started_at) continue;
        
        const start = new Date(league.season_started_at);
        // BRT offset consideration (start date is typically 00:00 BRT)
        // We calculate days elapsed in UTC but the logic remains the same for daily rounds
        const elapsedMs = now.getTime() - start.getTime();
        const daysElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
        const targetRound = Math.min(38, Math.max(1, daysElapsed + 1));

        if (targetRound !== league.current_round) {
          await sb.from("world_leagues").update({ current_round: targetRound }).eq("id", league.id);
          console.log(`[LeagueRound] Updated League ${league.id} to round ${targetRound}`);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});