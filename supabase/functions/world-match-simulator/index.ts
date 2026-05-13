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

// Auxiliar para distribuir estatísticas entre jogadores
function distributeStats(players: any[], goals: number, goalsConceded: number, isWinner: boolean) {
  const statsUpdates: any[] = [];
  const scorers: string[] = [];
  
  // Sort players by position weights for goals
  const getWeight = (pos: string) => {
    if (pos === 'ATA') return 10;
    if (pos === 'MEI') return 5;
    if (pos === 'VOL') return 2;
    if (pos === 'ZAG' || pos === 'LAT') return 1;
    return 0;
  };

  // Assign goals
  let remainingGoals = goals;
  while (remainingGoals > 0 && players.length > 0) {
    const pool = players.filter(p => p.position !== 'GOL');
    if (pool.length === 0) break;
    
    const totalWeight = pool.reduce((acc, p) => acc + getWeight(p.position) * (p.overall / 50), 0);
    let r = Math.random() * totalWeight;
    for (const p of pool) {
      r -= getWeight(p.position) * (p.overall / 50);
      if (r <= 0) {
        p.goals = (p.goals || 0) + 1;
        scorers.push(p.name);
        remainingGoals--;
        break;
      }
    }
  }

  // Assign assists (70% of goals have assists)
  let remainingAssists = Math.floor(goals * 0.7);
  while (remainingAssists > 0 && players.length > 0) {
    const pool = players.filter(p => p.position !== 'GOL');
    const totalWeight = pool.reduce((acc, p) => acc + (p.position === 'MEI' ? 10 : 5) * (p.overall / 50), 0);
    let r = Math.random() * totalWeight;
    for (const p of pool) {
      r -= (p.position === 'MEI' ? 10 : 5) * (p.overall / 50);
      if (r <= 0) {
        p.assists = (p.assists || 0) + 1;
        remainingAssists--;
        break;
      }
    }
  }

  // Generate ratings and other stats
  for (const p of players) {
    let rating = 6.0 + (Math.random() * 2 - 1); // Base 5-7
    if (p.goals) rating += p.goals * 1.5;
    if (p.assists) rating += p.assists * 0.8;
    if (isWinner) rating += 0.5;
    if (goalsConceded === 0 && (p.position === 'ZAG' || p.position === 'LAT' || p.position === 'GOL')) {
      rating += 1.0;
      p.clean_sheets = 1;
    }
    if (p.position === 'GOL') {
      p.goals_conceded = goalsConceded;
    }

    statsUpdates.push({
      player_id: p.id,
      player_name: p.name,
      team_id: p.team_id,
      goals: p.goals || 0,
      assists: p.assists || 0,
      avg_rating: Math.min(10, Math.max(3, rating)),
      matches_played: 1,
      clean_sheets: p.clean_sheets || 0,
      goals_conceded: p.goals_conceded || 0,
      minutes_played: 90,
      yellow_cards: Math.random() < 0.15 ? 1 : 0,
      red_cards: Math.random() < 0.02 ? 1 : 0,
      motm_count: 0 // Will decide outside
    });
  }

  // Decide MOTM (highest rating)
  if (statsUpdates.length > 0) {
    const best = statsUpdates.reduce((prev, curr) => (prev.avg_rating > curr.avg_rating) ? prev : curr);
    best.motm_count = 1;
  }

  return statsUpdates;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    let totalProcessed = 0;

    // --- 1. PROCESS WORLD LEAGUE MATCHES ---
    const { data: wMatches, error: wErr } = await sb
      .from("world_matches")
      .select(`
        id, league_id, home_team_id, away_team_id, round, season_month, season_year,
        home_team:world_teams!world_matches_home_team_id_fkey(id, name, strength, user_id),
        away_team:world_teams!world_matches_away_team_id_fkey(id, name, strength, user_id)
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", now.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (!wErr && wMatches) {
      for (const match of wMatches) {
        const { data: live } = await sb.from('live_matches').select('id').eq('shared_match_id', match.id).limit(1).maybeSingle();
        if (live) continue;

        const homeStr = match.home_team?.strength || 65;
        const awayStr = match.away_team?.strength || 65;
        const { home: hg, away: ag } = simulate(homeStr, awayStr);

        // Fetch players for stats
        const { data: hPlayers } = await sb.from('world_players').select('*').eq('team_id', match.home_team_id);
        const { data: aPlayers } = await sb.from('world_players').select('*').eq('team_id', match.away_team_id);

        const hStats = distributeStats(hPlayers || [], hg, ag, hg > ag);
        const aStats = distributeStats(aPlayers || [], ag, hg, ag > hg);

        // Persist Stats using batch RPC
        if (hStats.length > 0) {
          await sb.rpc('batch_upsert_player_stats', {
            _table_name: 'world_player_stats',
            _comp_id_field: 'league_id',
            _comp_id: match.league_id,
            _team_id_field: 'team_id',
            _updates: hStats.map(s => ({ ...s, season_month: match.season_month, season_year: match.season_year }))
          });
        }
        if (aStats.length > 0) {
          await sb.rpc('batch_upsert_player_stats', {
            _table_name: 'world_player_stats',
            _comp_id_field: 'league_id',
            _comp_id: match.league_id,
            _team_id_field: 'team_id',
            _updates: aStats.map(s => ({ ...s, season_month: match.season_month, season_year: match.season_year }))
          });
        }

        await sb.from("world_matches").update({
          home_goals: hg,
          away_goals: ag,
          status: "finished",
          played_at: now.toISOString()
        }).eq("id", match.id);

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
        const { data: cupStatus } = await sb.from('national_cups').select('status').eq('id', match.cup_id).single();
        if (cupStatus?.status !== 'in_progress') continue;

        const homeStr = match.home_team?.strength || 65;
        const awayStr = match.away_team?.strength || 65;
        const { home: hg, away: ag } = simulate(homeStr, awayStr);

        let homeScore = hg;
        let awayScore = ag;
        let winnerId = homeScore > awayScore ? match.home_team_id : (awayScore > homeScore ? match.away_team_id : null);
        
        if (homeScore === awayScore) {
          const homePen = Math.floor(Math.random() * 6) + 3;
          let awayPen = Math.floor(Math.random() * 6) + 3;
          while (homePen === awayPen) awayPen = Math.floor(Math.random() * 6) + 3;
          winnerId = homePen > awayPen ? match.home_team_id : match.away_team_id;
          
          await sb.from("national_cup_matches").update({
            home_penalties: homePen,
            away_penalties: awayPen
          }).eq("id", match.id);
        }

        // Stats for Cup
        const { data: hPlayers } = await sb.from('world_players').select('*').eq('team_id', match.home_team_id);
        const { data: aPlayers } = await sb.from('world_players').select('*').eq('team_id', match.away_team_id);
        
        const hStats = distributeStats(hPlayers || [], hg, ag, winnerId === match.home_team_id);
        const aStats = distributeStats(aPlayers || [], ag, hg, winnerId === match.away_team_id);

        if (hStats.length > 0) {
          await sb.rpc('batch_upsert_player_stats', {
            _table_name: 'cup_player_stats',
            _comp_id_field: 'cup_id',
            _comp_id: match.cup_id,
            _team_id_field: 'team_id',
            _updates: hStats
          });
        }
        if (aStats.length > 0) {
          await sb.rpc('batch_upsert_player_stats', {
            _table_name: 'cup_player_stats',
            _comp_id_field: 'cup_id',
            _comp_id: match.cup_id,
            _team_id_field: 'team_id',
            _updates: aStats
          });
        }

        await sb.from("national_cup_matches").update({
          home_score: homeScore,
          away_score: awayScore,
          status: "finished",
          winner_team_id: winnerId
        }).eq("id", match.id);

        totalProcessed++;

        const loserId = winnerId === match.home_team_id ? match.away_team_id : match.home_team_id;
        await sb.from('national_cup_teams').update({ eliminated: true }).eq('id', loserId);
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
        const elapsedMs = now.getTime() - start.getTime();
        const daysElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
        const targetRound = Math.min(38, Math.max(1, daysElapsed + 1));
        if (targetRound !== league.current_round) {
          await sb.from("world_leagues").update({ current_round: targetRound }).eq("id", league.id);
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