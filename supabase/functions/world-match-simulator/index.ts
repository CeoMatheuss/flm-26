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

function distributeStats(players: any[], goals: number, goalsConceded: number, isWinner: boolean) {
  const statsUpdates: any[] = [];
  const scorers: string[] = [];
  
  const getWeight = (pos: string) => {
    if (pos === 'ATA') return 10;
    if (pos === 'MEI') return 5;
    if (pos === 'VOL') return 2;
    if (pos === 'ZAG' || pos === 'LAT') return 1;
    return 0;
  };

  let remainingGoals = goals;
  while (remainingGoals > 0 && players.length > 0) {
    const pool = players.filter(p => p.position !== 'GOL');
    if (pool.length === 0) break;
    const totalWeight = pool.reduce((acc, p) => acc + getWeight(p.position) * (p.overall / 50), 0);
    if (totalWeight <= 0) break;
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

  let remainingAssists = Math.floor(goals * 0.7);
  while (remainingAssists > 0 && players.length > 0) {
    const pool = players.filter(p => p.position !== 'GOL');
    if (pool.length === 0) break;
    const totalWeight = pool.reduce((acc, p) => acc + (p.position === 'MEI' ? 10 : 5) * (p.overall / 50), 0);
    if (totalWeight <= 0) break;
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

  for (const p of players) {
    let rating = 6.0 + (Math.random() * 2 - 1);
    if (p.goals) rating += p.goals * 1.5;
    if (p.assists) rating += p.assists * 0.8;
    if (isWinner) rating += 0.5;
    if (goalsConceded === 0 && (p.position === 'ZAG' || p.position === 'LAT' || p.position === 'GOL')) {
      rating += 1.0;
      p.clean_sheets = 1;
    }
    if (p.position === 'GOL') p.goals_conceded = goalsConceded;

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
      motm_count: 0
    });
  }

  if (statsUpdates.length > 0) {
    const best = statsUpdates.reduce((prev, curr) => (prev.avg_rating > curr.avg_rating) ? prev : curr);
    best.motm_count = 1;
  }
  return { statsUpdates, scorers };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();
  let totalProcessed = 0;

  try {
    // --- 1. LEAGUE MATCHES ---
    // Fetch scheduled matches AND finished matches without stats (self-correction)
    const { data: wMatches } = await sb.from("world_matches").select(`*, 
      home_team:world_teams!world_matches_home_team_id_fkey(id, name, strength, user_id),
      away_team:world_teams!world_matches_away_team_id_fkey(id, name, strength, user_id)
    `).or(`status.eq.scheduled,status.eq.finished`).lte("scheduled_at", now.toISOString()).limit(50);

    if (wMatches) {
      for (const m of wMatches) {
        // Only re-process finished if played_at is recent and stats might be missing
        if (m.status === 'finished') {
          const { count } = await sb.from('world_player_stats').select('*', { count: 'exact', head: true }).eq('league_id', m.league_id).eq('team_id', m.home_team_id).eq('season_month', m.season_month).eq('season_year', m.season_year).limit(1);
          if (count && count > 0) continue; // Already has stats
        }

        const { data: live } = await sb.from('live_matches').select('id').eq('shared_match_id', m.id).limit(1).maybeSingle();
        if (live && m.status === 'scheduled') continue;

        let hg = m.home_goals || 0;
        let ag = m.away_goals || 0;
        
        if (m.status === 'scheduled') {
           const simulated = simulate(m.home_team?.strength || 65, m.away_team?.strength || 65);
           hg = simulated.home;
           ag = simulated.away;
        }

        const { data: hPlayers } = await sb.from('world_players').select('*').eq('team_id', m.home_team_id);
        const { data: aPlayers } = await sb.from('world_players').select('*').eq('team_id', m.away_team_id);
        
        const hRes = distributeStats(hPlayers || [], hg, ag, hg > ag);
        const aRes = distributeStats(aPlayers || [], ag, hg, ag > hg);

        // Batch Persist
        for (const stats of [hRes.statsUpdates, aRes.statsUpdates]) {
          if (stats.length > 0) {
            await sb.rpc('batch_upsert_player_stats', {
              _table_name: 'world_player_stats', _comp_id_field: 'league_id', _comp_id: m.league_id, _team_id_field: 'team_id',
              _updates: stats.map(s => ({ ...s, season_month: m.season_month, season_year: m.season_year }))
            });
          }
        }

        if (m.status === 'scheduled') {
           const newsTitle = `${m.home_team.name} ${hg} x ${ag} ${m.away_team.name}`;
           const newsContent = hg === ag ? "Empate eletrizante em campo!" : `${hg > ag ? m.home_team.name : m.away_team.name} domina o adversário e garante 3 pontos.`;
           await sb.from('world_league_news').insert({ league_id: m.league_id, match_id: m.id, title: newsTitle, content: newsContent });

           await sb.from("world_matches").update({ home_goals: hg, away_goals: ag, status: "finished", played_at: now.toISOString() }).eq("id", m.id);
           
           for (const t of [{ id: m.home_team_id, gf: hg, ga: ag, win: hg > ag, draw: hg === ag }, { id: m.away_team_id, gf: ag, ga: hg, win: ag > hg, draw: hg === ag }]) {
             const { data: row } = await sb.from("world_league_table").select("*").eq("team_id", t.id).eq("league_id", m.league_id).eq("season_month", m.season_month).eq("season_year", m.season_year).maybeSingle();
             if (row) {
               const res = t.win ? 'V' : (t.draw ? 'E' : 'D');
               const newForm = ((row.last_5_games || '').replace(/-/g, '') + res).slice(-5);
               await sb.from("world_league_table").update({
                 played: row.played + 1, wins: row.wins + (t.win ? 1 : 0), draws: row.draws + (t.draw ? 1 : 0),
                 losses: row.losses + (!t.win && !t.draw ? 1 : 0), goals_for: row.goals_for + t.gf, goals_against: row.goals_against + t.ga,
                 points: row.points + (t.win ? 3 : t.draw ? 1 : 0), last_5_games: newForm, win_rate: ((row.wins + (t.win ? 1 : 0)) / (row.played + 1)) * 100
               }).eq("id", row.id);
             }
           }
        }
        totalProcessed++;
      }
    }

    // --- 2. CUP MATCHES ---
    const { data: cMatches } = await sb.from("national_cup_matches").select(`*, 
      home_team:national_cup_teams!national_cup_matches_home_team_id_fkey(*),
      away_team:national_cup_teams!national_cup_matches_away_team_id_fkey(*)
    `).or(`status.eq.scheduled,status.eq.finished`).lte("scheduled_at", now.toISOString()).limit(50);

    if (cMatches) {
      for (const m of cMatches) {
        if (m.status === 'finished') {
          const { count } = await sb.from('cup_player_stats').select('*', { count: 'exact', head: true }).eq('cup_id', m.cup_id).eq('team_id', m.home_team_id).limit(1);
          if (count && count > 0) continue;
        }

        const { data: cs } = await sb.from('national_cups').select('status').eq('id', m.cup_id).single();
        if (cs?.status !== 'in_progress') continue;

        let hg = m.home_score || 0;
        let ag = m.away_score || 0;
        let winnerId = m.winner_team_id || (hg > ag ? m.home_team_id : (ag > hg ? m.away_team_id : null));

        if (m.status === 'scheduled') {
           const simulated = simulate(m.home_team?.strength || 65, m.away_team?.strength || 65);
           hg = simulated.home;
           ag = simulated.away;
           winnerId = hg > ag ? m.home_team_id : (ag > hg ? m.away_team_id : null);
        }

        let hPen = m.home_penalties, aPen = m.away_penalties;
        if (hg === ag && !winnerId) {
          hPen = Math.floor(Math.random() * 6) + 3;
          aPen = Math.floor(Math.random() * 6) + 3;
          while (hPen === aPen) aPen = Math.floor(Math.random() * 6) + 3;
          winnerId = hPen > aPen ? m.home_team_id : m.away_team_id;
        }

        const { data: hPlayers } = await sb.from('world_players').select('*').eq('team_id', m.home_team_id);
        const { data: aPlayers } = await sb.from('world_players').select('*').eq('team_id', m.away_team_id);
        const hRes = distributeStats(hPlayers || [], hg, ag, winnerId === m.home_team_id);
        const aRes = distributeStats(aPlayers || [], ag, hg, winnerId === m.away_team_id);

        for (const stats of [hRes.statsUpdates, aRes.statsUpdates]) {
          if (stats.length > 0) await sb.rpc('batch_upsert_player_stats', { _table_name: 'cup_player_stats', _comp_id_field: 'cup_id', _comp_id: m.cup_id, _team_id_field: 'team_id', _updates: stats });
        }

        if (m.status === 'scheduled') {
           await sb.from('cup_news').insert({ cup_id: m.cup_id, title: `Copa: ${m.home_team.club_name} ${hg}x${ag} ${m.away_team.club_name}`, content: `Duelo intenso na Copa Nacional. ${winnerId === m.home_team_id ? m.home_team.club_name : m.away_team.club_name} avança!` });
           await sb.from("national_cup_matches").update({ home_score: hg, away_score: ag, home_penalties: hPen, away_penalties: aPen, status: "finished", winner_team_id: winnerId }).eq("id", m.id);
           const loserId = winnerId === m.home_team_id ? m.away_team_id : m.home_team_id;
           await sb.from('national_cup_teams').update({ eliminated: true }).eq('id', loserId);
           await sb.from('national_cup_prizes').insert({ cup_id: m.cup_id, team_id: winnerId, amount: 50000, description: `Vitória na Rodada ${m.round}` });
        }
        totalProcessed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: totalProcessed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});