// Edge Function: world-match-simulator
// REFEITO COMPLETAMENTE - SISTEMA DEFINITIVO DE SIMULAÇÃO DE LIGAS MUNDIAIS
// Central Engine for World Leagues and Cups Synchronization

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STUCK_THRESHOLD_MS = 15 * 60 * 1000;
const MATCH_WAIT_TIME_MS = 5 * 60 * 1000;
const BATCH_SIZE = 40;

// --- UTILS ---
function rng() { return Math.random(); }
function pick<T>(arr: T[]): T | null { return arr.length > 0 ? arr[Math.floor(rng() * arr.length)] : null; }
function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();

  try {
    // 1. Fetch Scheduled or Stuck World Matches
    const worldTolerance = new Date(now.getTime() - MATCH_WAIT_TIME_MS).toISOString();
    const worldStuck = new Date(now.getTime() - STUCK_THRESHOLD_MS).toISOString();

    const { data: matches } = await sb.from("world_matches")
      .select("*, home_team:world_teams!world_matches_home_team_id_fkey(*), away_team:world_teams!world_matches_away_team_id_fkey(*)")
      .or(`status.eq.scheduled,and(status.eq.simulating,scheduled_at.lte.${worldStuck})`)
      .lte("scheduled_at", worldTolerance)
      .limit(BATCH_SIZE);

    if (matches && matches.length > 0) {
      for (const m of matches) {
        const simStart = Date.now();
        
        // Atomic Lock
        const { data: locked } = await sb.from("world_matches")
          .update({ status: 'simulating' })
          .eq('id', m.id)
          .or('status.eq.scheduled,status.eq.simulating')
          .select('id');
        
        if (!locked || locked.length === 0) continue;

        // Realistic Simulation Logic
        const hStr = m.home_team?.strength || 65;
        const aStr = m.away_team?.strength || 65;
        const hg = poissonSample((hStr / 50) * 1.3);
        const ag = poissonSample((aStr / 50) * 1.1);

        // Fetch players for stats
        const { data: players } = await sb.from('world_players').select('*').in('team_id', [m.home_team_id, m.away_team_id]);
        const homePlayers = (players || []).filter(p => p.team_id === m.home_team_id);
        const awayPlayers = (players || []).filter(p => p.team_id === m.away_team_id);

        const hScorers = [];
        for (let i = 0; i < hg; i++) {
          const p = pick(homePlayers.filter(pl => ['ATA', 'MEI'].includes(pl.position))) || pick(homePlayers);
          if (p) {
            hScorers.push({ id: p.id, name: p.name });
            await sb.from('world_player_stats').upsert({
              player_id: p.id, competition_id: m.league_id || 'world', season: 1, goals: 1
            }, { onConflict: 'player_id,competition_id,season' });
          }
        }
        const aScorers = [];
        for (let i = 0; i < ag; i++) {
          const p = pick(awayPlayers.filter(pl => ['ATA', 'MEI'].includes(pl.position))) || pick(awayPlayers);
          if (p) {
            aScorers.push({ id: p.id, name: p.name });
            await sb.from('world_player_stats').upsert({
              player_id: p.id, competition_id: m.league_id || 'world', season: 1, goals: 1
            }, { onConflict: 'player_id,competition_id,season' });
          }
        }

        // Finalize Match
        await sb.from("world_matches").update({ 
          home_goals: hg, 
          away_goals: ag, 
          status: "finished", 
          played_at: now.toISOString(),
          match_data: { homeScorers: hScorers, awayScorers: aScorers, auto_simulated: true } 
        }).eq("id", m.id);

        // Sync Table Standings
        await sb.rpc('sync_world_league_standings', { _league_id: m.league_id });

        // Log execution
        const duration = Date.now() - simStart;
        await sb.from("match_worker_logs").insert({
          match_id: m.id,
          match_type: 'world',
          result_text: `${m.home_team?.name} ${hg}x${ag} ${m.away_team?.name}`,
          status: 'finished',
          duration_ms: duration,
          details: { hg, ag }
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: matches?.length || 0 }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (e: any) { 
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }); 
  }
});
