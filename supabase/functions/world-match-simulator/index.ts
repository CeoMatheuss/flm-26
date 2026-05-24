// Edge Function: world-match-simulator
// Simulates stuck/scheduled world league matches.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STUCK_THRESHOLD_MS = 15 * 60 * 1000;
const MATCH_WAIT_TIME_MS = 5 * 60 * 1000;
const BATCH_SIZE = 40;

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
  const debug: any[] = [];

  try {
    const tolerance = new Date(now.getTime() - MATCH_WAIT_TIME_MS).toISOString();
    const stuckCut = new Date(now.getTime() - STUCK_THRESHOLD_MS).toISOString();

    // Scheduled past tolerance
    const { data: scheduledMatches, error: errSched } = await sb.from("world_matches")
      .select("*, home_team:world_teams!world_matches_home_team_id_fkey(id,name,strength), away_team:world_teams!world_matches_away_team_id_fkey(id,name,strength)")
      .eq("status", "scheduled")
      .lte("scheduled_at", tolerance)
      .order("scheduled_at", { ascending: true })
      .limit(BATCH_SIZE);

    // Also simulate World Cup matches
    const { data: cupMatches } = await sb.from("world_cup_matches")
      .select("*, home_team:world_teams!world_cup_matches_home_team_id_fkey(id,name,strength), away_team:world_teams!world_cup_matches_away_team_id_fkey(id,name,strength)")
      .eq("status", "scheduled")
      .lte("scheduled_at", tolerance)
      .limit(BATCH_SIZE);

    if (errSched) debug.push({ stage: "select_scheduled", err: errSched.message });

    // Stuck "live" matches (older than 15min) — failed prior simulations
    const { data: stuckMatches, error: errStuck } = await sb.from("world_matches")
      .select("*, home_team:world_teams!world_matches_home_team_id_fkey(id,name,strength), away_team:world_teams!world_matches_away_team_id_fkey(id,name,strength)")
      .eq("status", "live")
      .lte("scheduled_at", stuckCut)
      .limit(BATCH_SIZE);

    if (errStuck) debug.push({ stage: "select_stuck", err: errStuck.message });

    const matches = [
      ...(scheduledMatches || []).map(m => ({ ...m, type: 'league' })),
      ...(stuckMatches || []).map(m => ({ ...m, type: 'league' })),
      ...(cupMatches || []).map(m => ({ ...m, type: 'cup' }))
    ];
    let finalized = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const m of matches) {
      const simStart = Date.now();
      try {
        const table = m.type === 'cup' ? 'world_cup_matches' : 'world_matches';
        
        // Atomic claim
        const { data: locked, error: lockErr } = await sb.from(table)
          .update({ status: "live" })
          .eq("id", m.id)
          .in("status", ["scheduled", "live"])
          .select("id");

        if (lockErr) { errors.push({ id: m.id, stage: "lock", err: lockErr.message }); skipped++; continue; }
        if (!locked || locked.length === 0) { skipped++; continue; }

        const hStr = m.home_team?.strength || 65;
        const aStr = m.away_team?.strength || 65;
        const hg = poissonSample((hStr / 50) * 1.3);
        const ag = poissonSample((aStr / 50) * 1.1);

        const { data: players } = await sb.from("world_players")
          .select("id,name,position,team_id")
          .in("team_id", [m.home_team_id, m.away_team_id]);

        const homePlayers = (players || []).filter((p: any) => p.team_id === m.home_team_id);
        const awayPlayers = (players || []).filter((p: any) => p.team_id === m.away_team_id);

        const hScorers: any[] = [];
        for (let i = 0; i < hg; i++) {
          const p = pick(homePlayers.filter((pl: any) => ["ATA", "MEI"].includes(pl.position))) || pick(homePlayers);
          if (p) hScorers.push({ id: p.id, name: p.name });
        }
        const aScorers: any[] = [];
        for (let i = 0; i < ag; i++) {
          const p = pick(awayPlayers.filter((pl: any) => ["ATA", "MEI"].includes(pl.position))) || pick(awayPlayers);
          if (p) aScorers.push({ id: p.id, name: p.name });
        }

        // Finalize first (most important)
        const { error: finErr } = await sb.from("world_matches").update({
          home_goals: hg,
          away_goals: ag,
          status: "finished",
          played_at: now.toISOString(),
          match_data: { homeScorers: hScorers, awayScorers: aScorers, auto_simulated: true },
        }).eq("id", m.id);

        if (finErr) {
          errors.push({ id: m.id, stage: "finalize", err: finErr.message });
          // Try to revert lock
          await sb.from("world_matches").update({ status: "scheduled" }).eq("id", m.id);
          skipped++;
          continue;
        }

        finalized++;

        // Best-effort: scorer stats
        for (const s of hScorers) {
          await sb.from("world_player_stats").upsert(
            { player_id: s.id, competition_id: m.league_id || "world", season: 1, goals: 1 },
            { onConflict: "player_id,competition_id,season" }
          ).then(() => {}, () => {});
        }
        for (const s of aScorers) {
          await sb.from("world_player_stats").upsert(
            { player_id: s.id, competition_id: m.league_id || "world", season: 1, goals: 1 },
            { onConflict: "player_id,competition_id,season" }
          ).then(() => {}, () => {});
        }

        // Best-effort standings sync
        if (m.league_id) {
          await sb.rpc("sync_world_league_standings", { _league_id: m.league_id }).then(() => {}, (e: any) => {
            errors.push({ id: m.id, stage: "sync_standings", err: e?.message });
          });
        }

        await sb.from("match_worker_logs").insert({
          match_id: m.id,
          match_type: "world",
          result_text: `${m.home_team?.name} ${hg}x${ag} ${m.away_team?.name}`,
          status: "finished",
          duration_ms: Date.now() - simStart,
          details: { hg, ag, round: m.round },
        }).then(() => {}, () => {});
      } catch (e: any) {
        errors.push({ id: m.id, stage: "exception", err: e?.message || String(e) });
      }
    }

    // Refresh global player rankings if any match was finalized
    if (finalized > 0) {
      await sb.rpc("calculate_player_ranking_points").then(() => {}, (e: any) => {
        debug.push({ stage: "sync_player_rankings", err: e?.message });
      });
    }

    return new Response(JSON.stringify({

      ok: true,
      found: matches.length,
      finalized,
      skipped,
      errors,
      debug,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, debug }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
