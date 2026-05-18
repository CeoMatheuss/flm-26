// Edge Function: world-match-simulator
// Central Engine for World Leagues and Cups Synchronization
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
// Logic to process injuries and cards
function processPlayerDiscipline(players: any[]) {
  const availabilityUpdates: any[] = [];
  players.forEach(p => {
    // 10% chance of yellow card
    if (Math.random() < 0.10) {
      // Logic for yellow/red can be added here or via trigger
    }
    // 2% chance of injury
    if (Math.random() < 0.02) {
      availabilityUpdates.push({
        player_id: p.id,
        team_id: p.team_id,
        type: 'injury',
        rounds_remaining: Math.floor(Math.random() * 3) + 1,
        reason: 'Contusão em jogo'
      });
    }
  });
  return availabilityUpdates;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();
  
  try {
    // 1. Fetch Scheduled Matches
    const { data: matches } = await sb.from("world_matches")
      .select(`*, 
        home_team:world_teams!world_matches_home_team_id_fkey(id, name, strength),
        away_team:world_teams!world_matches_away_team_id_fkey(id, name, strength)
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", now.toISOString())
      .limit(50);

    if (matches && matches.length > 0) {
      for (const m of matches) {
        // Simple Simulation Logic (League Match Engine)
        const hs = (m.home_team?.strength || 65) * 1.1;
        const as = (m.away_team?.strength || 65);
        const hg = Math.floor(Math.random() * 4 + (hs > as ? 1 : 0));
        const ag = Math.floor(Math.random() * 4 + (as > hs ? 1 : 0));

        // Calculate scorers and assisters based on attributes
        const homePlayers = players.filter(p => p.team_id === m.home_team_id);
        const awayPlayers = players.filter(p => p.team_id === m.away_team_id);
        const match_data_stats: any = { homeScorers: [], awayScorers: [] };

        for (let i = 0; i < hg; i++) {
            const scorer = pickPlayerByRole(homePlayers, 'finishing');
            const assister = Math.random() < 0.7 ? pickPlayerByRole(homePlayers.filter(p => p.id !== scorer?.id), 'creation') : null;
            match_data_stats.homeScorers.push({ name: scorer?.name, id: scorer?.id, assist: assister?.name });
        }
        for (let i = 0; i < ag; i++) {
            const scorer = pickPlayerByRole(awayPlayers, 'finishing');
            const assister = Math.random() < 0.7 ? pickPlayerByRole(awayPlayers.filter(p => p.id !== scorer?.id), 'creation') : null;
            match_data_stats.awayScorers.push({ name: scorer?.name, id: scorer?.id, assist: assister?.name });
        }

        // Update Match with synced=false (Trigger trigger_update_standings will handle the sync)
        const { error: updateErr } = await sb.from("world_matches").update({ 
          home_goals: hg, 
          away_goals: ag, 
          status: "finished", 
          played_at: now.toISOString(),
          synced: false, match_data: match_data_stats 
        }).eq("id", m.id);

        if (updateErr) console.error(`Error updating match ${m.id}:`, updateErr);

        // Fetch players for discipline/stats
        const { data: players } = await sb.from('world_players').select('id, team_id, name, position, overall').in('team_id', [m.home_team_id, m.away_team_id]);
        
        if (players) {
          const availability = processPlayerDiscipline(players);
          if (availability.length > 0) {
            await sb.from('world_player_availability').upsert(availability, { onConflict: 'player_id,type' });
          }
        }

        // Generate News for synchronization feedback
        const newsTitle = getHeadline(hg === ag ? 'draw' : (hg > ag ? 'win' : 'loss'), hg > ag ? m.home_team.name : m.away_team.name, hg > ag ? m.away_team.name : m.home_team.name);
        
        // ── SYNC PLAYER STATS TO RANKINGS ────────────────────────
        try {
          const statsPayload = players.map(p => {
            const isHome = p.team_id === m.home_team_id;
            const pScorers = isHome ? match_data_stats.homeScorers : match_data_stats.awayScorers;
            const goals = pScorers.filter(s => s.id === p.id).length;
            const assists = pScorers.filter(s => s.assistId === p.id).length; // match_data_stats needs assistId
            
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