// Edge Function: world-match-simulator
// Processa e simula partidas de ligas mundiais e copas nacionais.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HEADLINES = {
  win: [
    "{winner} atropela o {loser} em exibição de gala!",
    "Show de bola! {winner} não toma conhecimento do {loser}.",
    "Vitória maiúscula: {winner} garante os 3 pontos contra {loser}.",
    "Domínio total! {winner} vence o clássico contra {loser}."
  ],
  draw: [
    "Equilíbrio total! {team1} e {team2} ficam no empate.",
    "Jogo truncado termina sem vencedor entre {team1} e {team2}.",
    "Tudo igual! {team1} e {team2} dividem os pontos.",
    "Batalha épica! Empate eletrizante entre {team1} e {team2}."
  ],
  loss: [
    "Noite para esquecer: {loser} cai diante do {winner}.",
    "Decepção! {loser} é derrotado pelo {winner} em casa.",
    "Superioridade técnica: {winner} supera o {loser}.",
    "{loser} luta, mas não evita a derrota para o {winner}."
  ]
};

function getHeadline(type: 'win' | 'draw' | 'loss', winner: string, loser: string) {
  const list = HEADLINES[type];
  const template = list[Math.floor(Math.random() * list.length)];
  return template.replace(/{winner}/g, winner).replace(/{loser}/g, loser).replace(/{team1}/g, winner).replace(/{team2}/g, loser);
}
  if (hg === ag) return 'league_draw';
  if (isHome) return hg > ag ? 'league_win' : 'league_loss';
  return ag > hg ? 'league_win' : 'league_loss';
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
      if (r <= 0) { p.goals = (p.goals || 0) + 1; scorers.push(p.name); remainingGoals--; break; }
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
      if (r <= 0) { p.assists = (p.assists || 0) + 1; remainingAssists--; break; }
    }
  }
  for (const p of players) {
    let rating = 6.0 + (Math.random() * 2 - 1);
    if (p.goals) rating += p.goals * 1.5;
    if (p.assists) rating += p.assists * 0.8;
    if (isWinner) rating += 0.5;
    if (goalsConceded === 0 && (p.position === 'ZAG' || p.position === 'LAT' || p.position === 'GOL')) { rating += 1.0; p.clean_sheets = 1; }
    if (p.position === 'GOL') p.goals_conceded = goalsConceded;
    statsUpdates.push({ player_id: p.id, player_name: p.name, team_id: p.team_id, goals: p.goals || 0, assists: p.assists || 0, avg_rating: Math.min(10, Math.max(3, rating)), matches_played: 1, clean_sheets: p.clean_sheets || 0, goals_conceded: p.goals_conceded || 0, minutes_played: 90, yellow_cards: Math.random() < 0.15 ? 1 : 0, red_cards: Math.random() < 0.02 ? 1 : 0, motm_count: 0 });
  }
  if (statsUpdates.length > 0) { const best = statsUpdates.reduce((prev, curr) => (prev.avg_rating > curr.avg_rating) ? prev : curr); best.motm_count = 1; }
  return { statsUpdates, scorers };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();
  const tolerance = new Date(now.getTime() - 5 * 60 * 1000); // Wait 5 minutes


  try {
    // --- 1. LEAGUE MATCHES ---
    const { data: wMatches } = await sb.from("world_matches").select(`*, 
      home_team:world_teams!world_matches_home_team_id_fkey(id, name, strength, user_id),
      away_team:world_teams!world_matches_away_team_id_fkey(id, name, strength, user_id)
    `).eq("status", "scheduled").lte("scheduled_at", tolerance.toISOString()).limit(20);

    if (wMatches) {
      for (const m of wMatches) {
        const hs = Math.max(30, m.home_team?.strength || 65) * 1.15;
        const as = Math.max(30, m.away_team?.strength || 65);
        const { home: hg, away: ag } = { home: Math.min(7, Math.floor(Math.random() * 3 + (hs / (hs+as) * 2))), away: Math.min(7, Math.floor(Math.random() * 3 + (as / (hs+as) * 2))) };

        const { data: hPlayers } = await sb.from('world_players').select('*').eq('team_id', m.home_team_id);
        const { data: aPlayers } = await sb.from('world_players').select('*').eq('team_id', m.away_team_id);
        const hRes = distributeStats(hPlayers || [], hg, ag, hg > ag);
        const aRes = distributeStats(aPlayers || [], ag, hg, ag > hg);

        for (const stats of [hRes.statsUpdates, aRes.statsUpdates]) {
          if (stats.length > 0) await sb.rpc('batch_upsert_player_stats', { _table_name: 'world_player_stats', _comp_id_field: 'league_id', _comp_id: m.league_id, _team_id_field: 'team_id', _updates: stats.map(s => ({ ...s, season_month: m.season_month, season_year: m.season_year })) });
        }

        const newsTitle = getHeadline(hg === ag ? 'draw' : (hg > ag ? 'win' : 'loss'), hg > ag ? m.home_team.name : m.away_team.name, hg > ag ? m.away_team.name : m.home_team.name);
        const template = getMatchTemplate(hg, ag, true);
        const metadata = { team_name: m.home_team.name, opponent_name: m.away_team.name, score: `${hg}x${ag}`, competition: 'Liga Mundial' };
        
        await sb.from('world_league_news').insert({ 
          league_id: m.league_id, match_id: m.id, title: newsTitle, 
          content: hg === ag ? "Empate em jogo disputado!" : `${hg > ag ? m.home_team.name : m.away_team.name} vence com autoridade.`,
          template_key: template, metadata, importance: (Math.abs(hg - ag) >= 3) ? 3 : 1
        });

        await sb.from("world_matches").update({ home_goals: hg, away_goals: ag, status: "finished", played_at: now.toISOString() }).eq("id", m.id);
        // Table update omitted for brevity
      }
    }

    // --- 2. CUP MATCHES ---
    const { data: cMatches } = await sb.from("national_cup_matches").select(`*, 
      home_team:national_cup_teams!national_cup_matches_home_team_id_fkey(*),
      away_team:national_cup_teams!national_cup_matches_away_team_id_fkey(*)
    `).eq("status", "scheduled").lte("scheduled_at", tolerance.toISOString()).limit(20);

    if (cMatches) {
      for (const m of cMatches) {
        const { data: cs } = await sb.from('national_cups').select('status, name').eq('id', m.cup_id).single();
        if (cs?.status !== 'in_progress') continue;

        const { home: hg, away: ag } = { home: Math.floor(Math.random() * 4), away: Math.floor(Math.random() * 4) };
        let winnerId = hg > ag ? m.home_team_id : (ag > hg ? m.away_team_id : null);
        let hPen = null, aPen = null;
        if (hg === ag) { hPen = Math.floor(Math.random() * 6) + 3; aPen = Math.floor(Math.random() * 6) + 3; winnerId = hPen > aPen ? m.home_team_id : m.away_team_id; }

        const winner = winnerId === m.home_team_id ? m.home_team : m.away_team;
        const loser = winnerId === m.home_team_id ? m.away_team : m.home_team;
        
        const metadata = { team_name: winner.club_name, opponent_name: loser.club_name, score: `${hg}x${ag}`, competition: cs.name, phase: `Rodada ${m.round}` };
        
        await sb.from('cup_news').insert({ 
          cup_id: m.cup_id, title: `Copa: ${m.home_team.club_name} ${hg}x${ag} ${m.away_team.club_name}`, 
          content: `${winner.club_name} segue firme na disputa!`,
          template_key: 'cup_advance', metadata
        });

        await sb.from("national_cup_matches").update({ home_score: hg, away_score: ag, home_penalties: hPen, away_penalties: aPen, status: "finished", winner_team_id: winnerId }).eq("id", m.id);
        await sb.from('national_cup_teams').update({ eliminated: true }).eq('id', loser.id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
