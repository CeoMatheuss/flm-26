// Edge Function: world-match-simulator
// Central Engine for World Leagues and Cups Synchronization
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// --- Mercado Dinâmico: Lógica de Valor de Mercado ---
function calculatePlayerMarketValue(p: any, clubReputation: number = 50) {
  const ovr = p.overall || 60;
  const age = p.age || 25;
  const potential = p.potential || (ovr + 5);
  const playerRep = p.reputation || 50;

  // 1. Base por Overall
  let baseValue = 0;
  if (ovr >= 90)      baseValue = 100000000 + (ovr - 90) * 15000000;
  else if (ovr >= 85) baseValue = 40000000 + (ovr - 85) * 12000000;
  else if (ovr >= 80) baseValue = 15000000 + (ovr - 80) * 5000000;
  else if (ovr >= 75) baseValue = 5000000 + (ovr - 75) * 2000000;
  else if (ovr >= 70) baseValue = 1500000 + (ovr - 70) * 700000;
  else if (ovr >= 60) baseValue = 300000 + (ovr - 60) * 120000;
  else                baseValue = ovr * 5000;

  // 2. Multiplicadores
  let ageMult = age < 22 ? 1.5 : age < 29 ? 1.2 : age < 33 ? 0.9 : 0.6;
  let potMult = age < 25 ? 1.0 + (Math.max(0, potential - ovr) * 0.04) : 1.0;
  let repMult = 1.0 + (playerRep * 0.005) + (clubReputation * 0.002);

  return Math.floor(baseValue * ageMult * potMult * repMult);
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Headlines for Sync News
const HEADLINES = {
  win: ["{winner} atropela o {loser} em exibição de gala!", "Vitória maiúscula: {winner} garante os 3 pontos."],
  draw: ["Equilíbrio total! {team1} e {team2} ficam no empate.", "Tudo igual! {team1} e {team2} dividem os pontos."],
  loss: ["Noite para esquecer: {loser} cai diante do {winner}.", "{loser} luta, mas não evita a derrota."]
};

function getHeadline(type: 'win' | 'draw' | 'loss', winner: string, loser: string) {
  const list = HEADLINES[type];
  const template = list[Math.floor(Math.random() * list.length)];
  return template.replace(/{winner}/g, winner).replace(/{loser}/g, loser).replace(/{team1}/g, winner).replace(/{team2}/g, loser);
}


// ── SYNCED STATS LOGIC ──────────────────────────────────────

function getAttribute(p: any, key: string, fallback: number = 50): number {
    return p.attributes?.[key] || p[key] || fallback;
}

function calculateRolePower(p: any, role: 'finishing' | 'creation'): number {
    const ovr = p.overall || 60;
    if (role === 'finishing') {
        const shooting = getAttribute(p, 'shooting', ovr);
        const positioning = getAttribute(p, 'positioning', ovr);
        if (p.position === 'ATA') return shooting * 0.7 + positioning * 0.3;
        if (p.position === 'MEI') return shooting * 0.5 + positioning * 0.3;
        return shooting * 0.3;
    } else {
        const passing = getAttribute(p, 'passing', ovr);
        const vision = getAttribute(p, 'vision', ovr);
        if (p.position === 'MEI') return passing * 0.6 + vision * 0.4;
        if (p.position === 'LAT' || p.position === 'ATA') return passing * 0.5 + vision * 0.3;
        return passing * 0.4;
    }
}

function pickPlayerByRole(players: any[], role: 'finishing' | 'creation'): any {
    if (!players || players.length === 0) return null;
    const weights = players.map(p => {
        const power = calculateRolePower(p, role);
        return Math.pow(power, 2.5); // Amplifies difference
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < players.length; i++) {
        r -= weights[i];
        if (r <= 0) return players[i];
    }
    return players[0];
}
// Logic to process injuries, cards and STAMINA drain
function processPlayerMatchFatigue(players: any[]) {
  const updates: any[] = [];
  players.forEach(p => {
    // Stamina Drain Logic
    // Base drain: 15-25%
    // Resistance (Physical attribute) reduces drain: higher physical = less drain
    const physical = p.attributes?.physical || 60;
    const resistanceBonus = (physical - 50) * 0.15; // +50 physical = -7.5% drain
    const drain = Math.max(8, Math.floor(Math.random() * 10 + 15 - resistanceBonus));
    
    const newStamina = Math.max(0, (p.stamina || 100) - drain);
    
    // Performance impact (simplified for sim results calculation if needed, 
    // but here we just store the new state)
    
    // Injury Risk Logic
    // If stamina < 50%, risk increases significantly
    let injuryChance = 0.01; // Base 1%
    if (newStamina < 50) injuryChance += 0.03;
    if (newStamina < 30) injuryChance += 0.06;
    
    let injuryData = null;
    if (Math.random() < injuryChance) {
      injuryData = {
        player_id: p.id,
        team_id: p.team_id,
        type: 'injury',
        rounds_remaining: Math.floor(Math.random() * 3) + 1,
        reason: 'Lesão por fadiga excessiva'
      };
    }

    updates.push({
      id: p.id,
      stamina: newStamina,
      injury: injuryData
    });
  });
  return updates;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();
  
  try {
    // 1. Fetch Scheduled or Stuck Matches
    // We fetch matches that are scheduled AND their time has passed, 
    // OR matches stuck in 'simulating' for more than 20 minutes.
    const stuckThreshold = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
    
    const { data: matches } = await sb.from("world_matches")
      .select(`*, 
        home_team:world_teams!world_matches_home_team_id_fkey(id, name, strength),
        away_team:world_teams!world_matches_away_team_id_fkey(id, name, strength)
      `)
      .or(`status.eq.scheduled,and(status.eq.simulating,scheduled_at.lte.${stuckThreshold})`)
      .lte("scheduled_at", now.toISOString())
      .limit(50);

    if (matches && matches.length > 0) {
      // Pre-fetch all players for all teams in batch to avoid N+1 queries
      const teamIds = [...new Set(matches.flatMap(m => [m.home_user_id, m.away_user_id]).filter(Boolean))];
      const { data: allPlayers } = await sb.from('world_players')
        .select('*')
        .in('team_id', teamIds);
      
      // Fetch club reputations
      const { data: clubs } = await sb.from('clubs').select('id, reputation').in('id', teamIds);
      const clubRepMap = Object.fromEntries((clubs || []).map(c => [c.id, c.reputation || 50]));


      for (const m of matches) {
        const simStart = Date.now();
        await sb.from("match_simulation_logs").insert({
          match_id: m.id,
          match_type: 'world',
          step: 'start',
          details: { scheduled_at: m.scheduled_at, status: m.status }
        });

        // Atomic Lock: Mark as simulating to prevent race conditions
        const { data: locked } = await sb.from("world_matches")
          .update({ status: 'simulating' })
          .eq('id', m.id)
          .or('status.eq.scheduled,status.eq.simulating') // allow re-sim if stuck
          .select('id');
        
        if (!locked || locked.length === 0) continue;

        // Simple Simulation Logic (League Match Engine)
        const hs = (m.home_team?.strength || 65) * 1.1;
        const as = (m.away_team?.strength || 65);
        const hg = Math.floor(Math.random() * 4 + (hs > as ? 1 : 0));
        const ag = Math.floor(Math.random() * 4 + (as > hs ? 1 : 0));

        // Calculate scorers and assisters based on attributes
        const homePlayers = (allPlayers || []).filter(p => p.team_id === m.home_team_id);
        const awayPlayers = (allPlayers || []).filter(p => p.team_id === m.away_team_id);
        const match_data_stats: any = { homeScorers: [], awayScorers: [] };


        for (let i = 0; i < hg; i++) {
            const scorer = pickPlayerByRole(homePlayers, 'finishing');
            const assister = Math.random() < 0.7 ? pickPlayerByRole(homePlayers.filter(p => p.id !== scorer?.id), 'creation') : null;
            match_data_stats.homeScorers.push({ name: scorer?.name, id: scorer?.id, assist: assister?.name, assistId: assister?.id });
        }
        for (let i = 0; i < ag; i++) {
            const scorer = pickPlayerByRole(awayPlayers, 'finishing');
            const assister = Math.random() < 0.7 ? pickPlayerByRole(awayPlayers.filter(p => p.id !== scorer?.id), 'creation') : null;
            match_data_stats.awayScorers.push({ name: scorer?.name, id: scorer?.id, assist: assister?.name, assistId: assister?.id });
        }

        // Update Match with synced=false (Trigger trigger_update_standings will handle the sync)
        const { error: updateErr } = await sb.from("world_matches").update({ 
          home_goals: hg, 
          away_goals: ag, 
          status: "finished", 
          played_at: now.toISOString(),
          synced: false, match_data: match_data_stats 
        }).eq("id", m.id);

        if (updateErr) {
          console.error(`Error updating match ${m.id}:`, updateErr);
          await sb.from("match_simulation_logs").insert({
            match_id: m.id,
            match_type: 'world',
            step: 'error',
            details: { error: updateErr, phase: 'finalizing' }
          });
          continue;
        }

        const simDuration = Date.now() - simStart;
        await sb.from("match_simulation_logs").insert({
          match_id: m.id,
          match_type: 'world',
          step: 'finalizing',
          details: { 
            duration_ms: simDuration, 
            score: `${hg}x${ag}`,
            home: m.home_team.name,
            away: m.away_team.name
          }
        });


        // Process fatigue and injuries for these specific players
        const matchPlayers = (allPlayers || []).filter(p => p.team_id === m.home_team_id || p.team_id === m.away_team_id);
        if (matchPlayers.length > 0) {
          const fatigueUpdates = processPlayerMatchFatigue(matchPlayers);
          for (const up of fatigueUpdates) {
            await sb.from('world_players').update({ stamina: up.stamina }).eq('id', up.id);
            if (up.injury) {
              await sb.from('world_player_availability').upsert(up.injury, { onConflict: 'player_id,type' });
            }
          }
        }



        // Generate News for synchronization feedback
        const newsTitle = getHeadline(hg === ag ? 'draw' : (hg > ag ? 'win' : 'loss'), hg > ag ? m.home_team.name : m.away_team.name, hg > ag ? m.away_team.name : m.home_team.name);
        
        // ── SYNC PLAYER STATS TO RANKINGS ────────────────────────
        try {
          const statsPayload = matchPlayers.map(p => {
            const isHome = p.team_id === m.home_team_id;
            const pScorers = isHome ? match_data_stats.homeScorers : match_data_stats.awayScorers;
            const goals = pScorers.filter(s => s.id === p.id).length;
            const assists = pScorers.filter(s => s.assistId === p.id).length;

            
            return {
              player_id: p.id,
              team_id: p.team_id,
              goals: goals,
              assists: assists,
              rating: 6.0 + (goals * 1.2) + (assists * 0.7), // simplified rating for quick sim
              yellow_card: Math.random() < 0.1,
              red_card: Math.random() < 0.01 ? 1 : 0,
              is_gk: p.position === 'GOL',
              clean_sheet: (isHome ? ag === 0 : hg === 0)
            };
          });

          await sb.rpc('sync_player_match_stats', {
            _match_id: String(m.id),
            _competition_id: m.league_id || 'world_league',
            _season: 1,
            _player_stats: statsPayload
          });
        } catch (e) {
          console.error('[WorldStatsSync] Error:', e);
        }

        // --- ATUALIZAÇÃO DE VALOR DE MERCADO PÓS-JOGO ---
        try {
          for (const p of matchPlayers) {
             const isHome = p.team_id === m.home_team_id;
             const goals = (isHome ? match_data_stats.homeScorers : match_data_stats.awayScorers).filter((s: any) => s.id === p.id).length;
             const rating = 6.0 + (goals * 1.2); 
             
             // Update reputation based on performance
             const repChange = rating > 7.5 ? 1 : rating < 5.5 ? -1 : 0;
             const newRep = Math.max(0, Math.min(100, (p.reputation || 50) + repChange));
             
             const newValue = calculatePlayerMarketValue({ ...p, reputation: newRep }, clubRepMap[p.team_id] || 50);
             const history = p.market_value_history || [];
             const newHistory = [...history, { date: now.toISOString(), value: newValue }].slice(-10);
             const trend = newValue > (p.market_value || 0) ? 'up' : newValue < (p.market_value || 0) ? 'down' : 'stable';

             await sb.from('world_players').update({
               reputation: newRep,
               market_value: newValue,
               market_value_history: newHistory,
               evolution_trend: trend
             }).eq('id', p.id);
          }
        } catch (e) {
          console.error('[MarketValueUpdate] Error:', e);
        }

    
        await sb.from('world_league_news').insert({ 
          league_id: m.league_id, match_id: m.id, title: newsTitle, content: "Partida sincronizada automaticamente com a tabela da liga.", template_key: 'league_result'
        });
      }
    }

    // 2. National Cup Matches (Simplified sync)
    const { data: cMatches } = await sb.from("national_cup_matches")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now.toISOString())
      .limit(20);
    
    if (cMatches) {
      for (const m of cMatches) {
        const hg = Math.floor(Math.random() * 4);
        const ag = Math.floor(Math.random() * 4);
        let winnerId = hg > ag ? m.home_team_id : (ag > hg ? m.away_team_id : (Math.random() > 0.5 ? m.home_team_id : m.away_team_id));
        
        await sb.from("national_cup_matches").update({ 
          home_score: hg, away_score: ag, status: "finished", winner_team_id: winnerId, played_at: now.toISOString() 
        }).eq("id", m.id);
        
        const loserId = winnerId === m.home_team_id ? m.away_team_id : m.home_team_id;
        await sb.from('national_cup_teams').update({ eliminated: true }).eq('id', loserId);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: (matches?.length || 0) + (cMatches?.length || 0) }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (e: any) { 
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }); 
  }
});