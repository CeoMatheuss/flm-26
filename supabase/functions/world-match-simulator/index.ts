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
    const { data: { user }, error: authError } = await sb.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] || '');
    
    // 1. Fetch Scheduled Matches
    const { data: matches } = await sb.from("world_matches")
      .select(`*, 
        home_team:world_teams!world_matches_home_team_id_fkey(id, name, strength),
        away_team:world_teams!world_matches_away_team_id_fkey(id, name, strength)
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", now.toISOString())
      .limit(20);

    if (matches && matches.length > 0) {
      for (const m of matches) {
        // Simple Simulation Logic
        const hs = (m.home_team?.strength || 65) * 1.1;
        const as = (m.away_team?.strength || 65);
        const hg = Math.floor(Math.random() * 4 + (hs > as ? 1 : 0));
        const ag = Math.floor(Math.random() * 4 + (as > hs ? 1 : 0));

        // Update Match with synced=true (Trigger will handle standings)
        await sb.from("world_matches").update({ 
          home_goals: hg, 
          away_goals: ag, 
          status: "finished", 
          played_at: now.toISOString(),
          synced: false // Trigger will set to true after processing
        }).eq("id", m.id);

        // Fetch players for discipline/stats
        const { data: players } = await sb.from('world_players').select('id, team_id, name, position, overall').in('team_id', [m.home_team_id, m.away_team_id]);
        
        if (players) {
          const availability = processPlayerDiscipline(players);
          if (availability.length > 0) {
            await sb.from('world_player_availability').upsert(availability, { onConflict: 'player_id,type' });
          }
        }

        // Generate News
        const newsTitle = getHeadline(hg === ag ? 'draw' : (hg > ag ? 'win' : 'loss'), hg > ag ? m.home_team.name : m.away_team.name, hg > ag ? m.away_team.name : m.home_team.name);
        await sb.from('world_league_news').insert({ 
          league_id: m.league_id, match_id: m.id, title: newsTitle, content: "Partida finalizada e sincronizada com sucesso.", template_key: 'league_result'
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