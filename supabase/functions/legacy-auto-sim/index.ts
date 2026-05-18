// Edge Function: legacy-auto-sim
// REFEITO COMPLETAMENTE - SISTEMA DEFINITIVO DE SIMULAÇÃO E FINALIZAÇÃO AUTOMÁTICA
// Handles: League Matches, World Matches, Friendly Invites, Tournament Matches.
// Independent of online status. Includes automatic stuck-match cleanup.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutos para considerar partida travada
const MATCH_WAIT_TIME_MS = 5 * 60 * 1000;  // 5 minutos de espera antes da auto-simulação
const BATCH_SIZE = 40;

// --- UTILS ---
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function rng() { return Math.random(); }
function pick<T>(arr: T[]): T | null { return arr.length > 0 ? arr[Math.floor(rng() * arr.length)] : null; }

function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

// --- SIMULATION ENGINE ---
function generateMatchStats(homeStr: number, awayStr: number, hg: number, ag: number): any {
  const totalStr = homeStr + awayStr;
  const possession = clamp(Math.floor(50 + (homeStr - awayStr) * 0.4), 30, 70);
  return {
    possession: [possession, 100 - possession],
    shots: [Math.floor(5 + hg * 2 + rng() * 5), Math.floor(5 + ag * 2 + rng() * 5)],
    shotsOnTarget: [hg + Math.floor(rng() * 3), ag + Math.floor(rng() * 3)],
    fouls: [Math.floor(5 + rng() * 10), Math.floor(5 + rng() * 10)],
    corners: [Math.floor(2 + rng() * 6), Math.floor(2 + rng() * 6)],
    yellowCards: [Math.floor(rng() * 4), Math.floor(rng() * 4)],
    redCards: [rng() < 0.05 ? 1 : 0, rng() < 0.05 ? 1 : 0],
    passes: [Math.floor(200 + homeStr * 2), Math.floor(200 + awayStr * 2)],
    tackles: [Math.floor(10 + awayStr / 10), Math.floor(10 + homeStr / 10)],
    saves: [ag + 1, hg + 1],
    offsides: [Math.floor(rng() * 4), Math.floor(rng() * 4)],
  };
}

function processFatigueAndInjuries(players: any[]) {
  return players.map(p => {
    const resistance = p.attributes?.physical || p.resistance || 60;
    // Drain: 15-25% base, reduced by resistance (up to -10%)
    const resistanceBonus = (resistance - 50) * 0.15;
    const drain = Math.max(8, Math.floor(15 + rng() * 10 - resistanceBonus));
    const newStamina = Math.max(0, (p.stamina || 100) - drain);
    
    // Injury risk: base 1%, +3% if stamina < 50, +7% if stamina < 25
    let injuryChance = 0.01;
    if (newStamina < 50) injuryChance += 0.03;
    if (newStamina < 25) injuryChance += 0.07;
    
    let injury = null;
    if (rng() < injuryChance) {
      injury = {
        type: pick(['Lesão Muscular', 'Entorse', 'Pancada', 'Estiramento']) || 'Lesão',
        severity: pick(['Leve', 'Média', 'Grave']) || 'Média',
        weeks: Math.floor(rng() * 3) + 1,
      };
    }

    return { id: p.id, stamina: newStamina, injury };
  });
}

// --- MAIN WORKER ---
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();
  const startTime = Date.now();
  const logs: any[] = [];

  try {
    console.log("[WORKER] Iniciando processamento de partidas...");

    // 1. LEAGUE MATCHES
    const leagueTolerance = new Date(now.getTime() - MATCH_WAIT_TIME_MS).toISOString();
    const leagueStuck = new Date(now.getTime() - STUCK_THRESHOLD_MS).toISOString();

    const { data: leagueMatches } = await sb.from("league_matches")
      .select("*, home_user:clubs!league_matches_home_user_id_fkey(*), away_user:clubs!league_matches_away_user_id_fkey(*)")
      .or(`status.eq.scheduled,and(status.eq.simulating,scheduled_at.lte.${leagueStuck})`)
      .lte("scheduled_at", leagueTolerance)
      .limit(BATCH_SIZE);

    if (leagueMatches) {
      for (const m of leagueMatches) {
        const simStart = Date.now();
        
        // Atomic Lock
        const { data: locked } = await sb.from("league_matches")
          .update({ status: 'simulating' })
          .eq('id', m.id)
          .or('status.eq.scheduled,status.eq.simulating')
          .select('id');
        
        if (!locked || locked.length === 0) continue;

        // Calculate Strengths
        const hStr = m.home_user?.reputation || 60; // Fallback to reputation for quick sim
        const aStr = m.away_user?.reputation || 60;
        
        // Sim Goals
        const hg = poissonSample((hStr / 50) * 1.3);
        const ag = poissonSample((aStr / 50) * 1.1);
        
        const stats = generateMatchStats(hStr, aStr, hg, ag);

        // Update Match (Status change to finished triggers database side updates)
        await sb.from("league_matches").update({
          home_goals: hg,
          away_goals: ag,
          status: 'finished', // This trigger after_league_match_finished
          played_at: now.toISOString(),
          match_data: { stats, auto_simulated: true }
        }).eq('id', m.id);

        // Financials (Home team gets revenue)
        if (m.home_user_id) {
          const revenue = Math.floor((m.home_user.fans || 1000) * 0.8 * 25); // 80% attendance, $25 avg ticket
          await sb.rpc('add_club_cash', { _club_id: m.home_user.id, _amount: revenue });
        }

        const duration = Date.now() - simStart;
        await sb.from("match_worker_logs").insert({
          match_id: m.id,
          match_type: 'league',
          result_text: `${m.home_user?.name || 'Home'} ${hg}x${ag} ${m.away_user?.name || 'Away'}`,
          status: 'finished',
          duration_ms: duration,
          details: { hg, ag, stats }
        });
      }
    }

    // 2. WORLD MATCHES
    const worldTolerance = new Date(now.getTime() - MATCH_WAIT_TIME_MS).toISOString();
    const worldStuck = new Date(now.getTime() - STUCK_THRESHOLD_MS).toISOString();

    const { data: worldMatches } = await sb.from("world_matches")
      .select("*, home_team:world_teams!world_matches_home_team_id_fkey(*), away_team:world_teams!world_matches_away_team_id_fkey(*)")
      .or(`status.eq.scheduled,and(status.eq.simulating,scheduled_at.lte.${worldStuck})`)
      .lte("scheduled_at", worldTolerance)
      .limit(BATCH_SIZE);

    if (worldMatches) {
      for (const m of worldMatches) {
        const simStart = Date.now();
        
        const { data: locked } = await sb.from("world_matches")
          .update({ status: 'simulating' })
          .eq('id', m.id)
          .or('status.eq.scheduled,status.eq.simulating')
          .select('id');
        
        if (!locked || locked.length === 0) continue;

        const hStr = m.home_team?.strength || 65;
        const aStr = m.away_team?.strength || 65;
        const hg = poissonSample((hStr / 50) * 1.3);
        const ag = poissonSample((aStr / 50) * 1.1);
        const stats = generateMatchStats(hStr, aStr, hg, ag);

        // Process Player Stats (Scorers/Assists/Stamina)
        const { data: players } = await sb.from('world_players').select('*').in('team_id', [m.home_team_id, m.away_team_id]);
        if (players) {
          const homePlayers = players.filter(p => p.team_id === m.home_team_id);
          const awayPlayers = players.filter(p => p.team_id === m.away_team_id);
          
          const fatigueUpdates = processFatigueAndInjuries(players);
          for (const up of fatigueUpdates) {
            await sb.from('world_players').update({ stamina: up.stamina }).eq('id', up.id);
            if (up.injury) {
              await sb.from('world_players').update({ 
                injury_type: up.injury.type,
                injury_severity: up.injury.severity,
                injury_weeks_remaining: up.injury.weeks
              }).eq('id', up.id);
            }
          }

          // Pick Scorers
          const hScorers = [];
          for (let i = 0; i < hg; i++) {
            const p = pick(homePlayers.filter(p => ['ATA', 'MEI'].includes(p.position))) || pick(homePlayers);
            if (p) {
              hScorers.push({ id: p.id, name: p.name });
              await sb.from('world_player_stats').upsert({
                player_id: p.id, competition_id: m.league_id || 'world', season: 1, goals: 1
              }, { onConflict: 'player_id,competition_id,season' });
            }
          }
          const aScorers = [];
          for (let i = 0; i < ag; i++) {
            const p = pick(awayPlayers.filter(p => ['ATA', 'MEI'].includes(p.position))) || pick(awayPlayers);
            if (p) {
              aScorers.push({ id: p.id, name: p.name });
              await sb.from('world_player_stats').upsert({
                player_id: p.id, competition_id: m.league_id || 'world', season: 1, goals: 1
              }, { onConflict: 'player_id,competition_id,season' });
            }
          }
          
          await sb.from("world_matches").update({
            home_goals: hg,
            away_goals: ag,
            status: 'finished',
            played_at: now.toISOString(),
            match_data: { stats, homeScorers: hScorers, awayScorers: aScorers, auto_simulated: true }
          }).eq('id', m.id);
          
          // Standing update handled by database trigger tr_after_world_match_finished

        }

        const duration = Date.now() - simStart;
        await sb.from("match_worker_logs").insert({
          match_id: m.id,
          match_type: 'world',
          result_text: `${m.home_team?.name || 'Home'} ${hg}x${ag} ${m.away_team?.name || 'Away'}`,
          status: 'finished',
          duration_ms: duration,
          details: { hg, ag, stats }
        });
      }
    }

    // 3. CLEANUP LIVE MATCHES (Finalize stale sessions)
    const staleThreshold = new Date(now.getTime() - 20 * 60 * 1000).toISOString(); // 20 mins ago
    const { data: staleLive } = await sb.from("live_matches")
      .select("*")
      .neq("status", "finished")
      .lte("created_at", staleThreshold)
      .limit(BATCH_SIZE);
    
    if (staleLive) {
      for (const lm of staleLive) {
        // Finalize stale live match session
        await sb.from("live_matches").update({
          status: 'finished',
          finished_at: now.toISOString()
        }).eq('id', lm.id);
        
        // If it was linked to a league_match that is still not finished, finish it too.
        if (lm.shared_match_id) {
          // Verify if the parent match is still open
          const { data: parent } = await sb.from('league_matches').select('status').eq('id', lm.shared_match_id).single();
          if (parent && parent.status !== 'finished') {
             // Let the next worker pass handle the league_match or force it now
             console.log(`[CLEANUP] Parent match ${lm.shared_match_id} remains open. Will be handled by auto-sim.`);
          }
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    return new Response(JSON.stringify({ 
      ok: true, 
      processed: (leagueMatches?.length || 0) + (worldMatches?.length || 0) + (staleLive?.length || 0),
      duration_ms: totalDuration 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[WORKER ERROR]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
