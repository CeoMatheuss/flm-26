import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface PlayerStats {
  user_id: string;
  player_name: string;
  position: string;
  overall: number;
  club_name: string;
  goals: number;
  assists: number;
  cleanSheets: number;
  ratings: number[];
  games: number;
  league_id?: string | null;
  age?: number;
}

const POSITION_GROUP: Record<string, 'GK' | 'DEF' | 'MID' | 'ATT'> = {
  GOL: 'GK',
  ZAG: 'DEF', LAT: 'DEF',
  VOL: 'MID', MEI: 'MID',
  ATA: 'ATT',
};

function groupOf(pos?: string): 'GK' | 'DEF' | 'MID' | 'ATT' | 'OTHER' {
  if (!pos) return 'OTHER';
  return POSITION_GROUP[pos.toUpperCase()] || 'OTHER';
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calcScore(s: PlayerStats): number {
  const ar = avg(s.ratings);
  return s.goals * 4 + s.assists * 3 + s.cleanSheets * 2 + (ar - 6) * 5;
}

function tieBreaker(a: PlayerStats, b: PlayerStats): number {
  const sa = calcScore(a), sb = calcScore(b);
  if (sb !== sa) return sb - sa;
  const ra = avg(a.ratings), rb = avg(b.ratings);
  if (rb !== ra) return rb - ra;
  if (b.games !== a.games) return b.games - a.games;
  return (a.age || 30) - (b.age || 30); // younger wins on final tie
}

async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch { return null; }
}

async function generateNarrative(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um jornalista esportivo brasileiro. Escreva em pt-BR, 3 parágrafos curtos, tom épico mas profissional.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch { return null; }
}

async function uploadDataUrlToBucket(
  admin: any,
  dataUrl: string,
  filename: string
): Promise<string | null> {
  try {
    const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!m) return null;
    const mime = m[1];
    const base64 = m[2];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const ext = mime.split('/')[1].split('+')[0];
    const path = `awards/${filename}.${ext}`;
    const { error } = await admin.storage.from('club-logos').upload(path, bytes, {
      contentType: mime,
      upsert: true,
    });
    if (error) { console.error('upload err', error); return null; }
    const { data } = admin.storage.from('club-logos').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('uploadDataUrlToBucket', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const season: number = body?.season ?? 1;
    const leagueIdFilter: string | undefined = body?.league_id;
    const skipAI: boolean = body?.skip_ai === true || !LOVABLE_API_KEY;

    // ─────────────────────────────────────────────
    // 1) Aggregate player stats from match_history
    // ─────────────────────────────────────────────
    const { data: matches, error: mhErr } = await admin
      .from('match_history')
      .select('id, user_id, home_team, away_team, home_goals, away_goals, is_home, goal_scorers, events, player_ratings, home_players, competition, played_at')
      .order('played_at', { ascending: false })
      .limit(5000);

    if (mhErr) return json({ error: mhErr.message }, 500);

    const statsMap = new Map<string, PlayerStats>();
    const teamMap = new Map<string, { user_id: string; club_name: string; wins: number; draws: number; losses: number; gf: number; ga: number; titles: number }>();

    for (const m of matches || []) {
      const homeP = (m.home_players || []) as any[];
      const ratings = (m.player_ratings || {}) as Record<string, number>;
      const goalScorers = (m.goal_scorers || []) as any[];
      const conceded = m.is_home ? (m.away_goals || 0) : (m.home_goals || 0);
      const cleanSheet = conceded === 0;

      // team aggregate (user club)
      const myTeam = m.is_home ? m.home_team : m.away_team;
      const teamKey = `${m.user_id}__${myTeam}`;
      const myGoals = m.is_home ? (m.home_goals || 0) : (m.away_goals || 0);
      const oppGoals = conceded;
      let t = teamMap.get(teamKey);
      if (!t) {
        t = { user_id: m.user_id, club_name: myTeam, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, titles: 0 };
        teamMap.set(teamKey, t);
      }
      t.gf += myGoals; t.ga += oppGoals;
      if (myGoals > oppGoals) t.wins++;
      else if (myGoals === oppGoals) t.draws++;
      else t.losses++;

      for (const p of homeP) {
        if (!p?.id || !p?.name) continue;
        const key = `${m.user_id}__${p.id}`;
        let s = statsMap.get(key);
        if (!s) {
          s = {
            user_id: m.user_id, player_name: p.name, position: p.position || 'MEI',
            overall: p.overall || 60, club_name: myTeam,
            goals: 0, assists: 0, cleanSheets: 0, ratings: [], games: 0, age: p.age,
          };
          statsMap.set(key, s);
        }
        s.games++;
        const r = ratings[p.id];
        if (typeof r === 'number') s.ratings.push(r);
        if (cleanSheet && (s.position === 'GOL' || s.position === 'ZAG' || s.position === 'LAT')) s.cleanSheets++;
      }

      for (const g of goalScorers) {
        if (!g?.playerId) continue;
        const key = `${m.user_id}__${g.playerId}`;
        const s = statsMap.get(key);
        if (s) {
          if (g.type === 'goal') s.goals++;
          else if (g.type === 'assist') s.assists++;
        }
      }
    }

    const allPlayers = Array.from(statsMap.values()).filter(s => s.games >= 5);

    // ─────────────────────────────────────────────
    // 2) Compose award winners
    // ─────────────────────────────────────────────
    const awards: Array<{
      scope: string; scope_id: string | null; award_type: string;
      winner: PlayerStats | null; teamWinner?: any; team_of_season?: any[];
      label: string;
    }> = [];

    // GLOBAL
    if (!leagueIdFilter) {
      const sortedAll = [...allPlayers].sort(tieBreaker);
      if (sortedAll[0]) awards.push({ scope: 'global', scope_id: null, award_type: 'ballon_dor', winner: sortedAll[0], label: 'Bola de Ouro' });

      const topScorer = [...allPlayers].sort((a, b) => b.goals - a.goals || tieBreaker(a, b))[0];
      if (topScorer) awards.push({ scope: 'global', scope_id: null, award_type: 'top_scorer', winner: topScorer, label: 'Artilheiro Mundial' });

      const topAssists = [...allPlayers].sort((a, b) => b.assists - a.assists || tieBreaker(a, b))[0];
      if (topAssists) awards.push({ scope: 'global', scope_id: null, award_type: 'top_assists', winner: topAssists, label: 'Rei das Assistências' });

      const goalkeepers = allPlayers.filter(p => p.position === 'GOL');
      const bestGK = goalkeepers.sort((a, b) => b.cleanSheets - a.cleanSheets || avg(b.ratings) - avg(a.ratings))[0];
      if (bestGK) awards.push({ scope: 'global', scope_id: null, award_type: 'best_gk', winner: bestGK, label: 'Luva de Ouro' });

      // Best team (most wins overall)
      const teamArr = Array.from(teamMap.values()).sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws));
      const bestTeam = teamArr[0];
      if (bestTeam) {
        awards.push({
          scope: 'global', scope_id: null, award_type: 'best_team',
          winner: null, teamWinner: bestTeam, label: 'Melhor Time do Mundo',
        });
      }
    }

    // PER LEAGUE
    const { data: leagues } = await admin
      .from('multiplayer_leagues')
      .select('id, name, country')
      .eq(leagueIdFilter ? 'id' : 'auto_created', leagueIdFilter || true);

    for (const lg of leagues || []) {
      // For now group all players (we don't have league_id on history); we'll filter by club_name -> league_members
      const { data: members } = await admin
        .from('league_members')
        .select('user_id, club_name, points, wins, draws, losses, goals_for, goals_against')
        .eq('league_id', lg.id)
        .order('points', { ascending: false });

      const memberUserIds = new Set((members || []).map(m => m.user_id));
      const leaguePlayers = allPlayers.filter(p => memberUserIds.has(p.user_id));
      if (leaguePlayers.length === 0) continue;

      const sorted = [...leaguePlayers].sort(tieBreaker);
      if (sorted[0]) awards.push({ scope: 'league', scope_id: lg.id, award_type: 'best_player', winner: sorted[0], label: `Melhor Jogador — ${lg.name}` });

      const ts = [...leaguePlayers].sort((a, b) => b.goals - a.goals || tieBreaker(a, b))[0];
      if (ts) awards.push({ scope: 'league', scope_id: lg.id, award_type: 'top_scorer', winner: ts, label: `Artilheiro — ${lg.name}` });

      const ta = [...leaguePlayers].sort((a, b) => b.assists - a.assists || tieBreaker(a, b))[0];
      if (ta) awards.push({ scope: 'league', scope_id: lg.id, award_type: 'top_assists', winner: ta, label: `Líder Assistências — ${lg.name}` });

      const lgGK = leaguePlayers.filter(p => p.position === 'GOL').sort((a, b) => b.cleanSheets - a.cleanSheets || avg(b.ratings) - avg(a.ratings))[0];
      if (lgGK) awards.push({ scope: 'league', scope_id: lg.id, award_type: 'best_gk', winner: lgGK, label: `Melhor Goleiro — ${lg.name}` });

      const champion = (members || [])[0];
      if (champion) {
        awards.push({
          scope: 'league', scope_id: lg.id, award_type: 'best_team',
          winner: null, teamWinner: champion, label: `Campeão — ${lg.name}`,
        });
      }

      // Team of the season per league: 1 GK, 4 DEF, 3 MID, 3 ATT
      const gks = leaguePlayers.filter(p => groupOf(p.position) === 'GK').sort(tieBreaker).slice(0, 1);
      const defs = leaguePlayers.filter(p => groupOf(p.position) === 'DEF').sort(tieBreaker).slice(0, 4);
      const mids = leaguePlayers.filter(p => groupOf(p.position) === 'MID').sort(tieBreaker).slice(0, 3);
      const atts = leaguePlayers.filter(p => groupOf(p.position) === 'ATT').sort(tieBreaker).slice(0, 3);
      const tos = [...gks, ...defs, ...mids, ...atts];
      if (tos.length >= 7) {
        awards.push({
          scope: 'league', scope_id: lg.id, award_type: 'team_of_season',
          winner: null, team_of_season: tos.map(p => ({
            name: p.player_name, position: p.position, overall: p.overall,
            club: p.club_name, goals: p.goals, assists: p.assists, rating: +avg(p.ratings).toFixed(2),
          })),
          label: `Seleção da Temporada — ${lg.name}`,
        });
      }
    }

    // ─────────────────────────────────────────────
    // 3) Persist awards (idempotent via UPSERT)
    // ─────────────────────────────────────────────
    let insertedCount = 0;
    let skippedCount = 0;

    for (const a of awards) {
      // Check if exists
      const { data: existing } = await admin
        .from('season_awards')
        .select('id')
        .eq('season', season)
        .eq('scope', a.scope)
        .eq('award_type', a.award_type)
        .is(a.scope_id ? 'scope_id' : 'scope_id', a.scope_id || null)
        .maybeSingle();

      if (existing) { skippedCount++; continue; }

      let ai_image_url: string | null = null;
      let ai_narrative: string | null = null;

      const subjectName = a.winner?.player_name || a.teamWinner?.club_name || a.label;

      if (!skipAI) {
        const imgPrompt = a.team_of_season
          ? `Pôster esportivo épico da Seleção da Temporada de futebol, 11 jogadores em formação 4-3-3 num campo iluminado, troféu dourado, estilo cartaz cinematográfico, fundo escuro com luzes douradas`
          : a.teamWinner
            ? `Pôster cinematográfico de time campeão de futebol "${a.teamWinner.club_name}" erguendo troféu dourado, vestiário comemorativo, luzes brilhantes, confete dourado, estilo épico`
            : `Pôster cinematográfico do jogador de futebol "${a.winner!.player_name}" erguendo troféu de ${a.label}, holofotes, estádio lotado, confete dourado, estilo épico, alta qualidade`;

        const narPrompt = a.team_of_season
          ? `Escreva uma matéria celebrando a Seleção da Temporada da liga, destacando os 11 melhores jogadores: ${a.team_of_season!.map((p: any) => `${p.name} (${p.position})`).join(', ')}.`
          : a.teamWinner
            ? `Escreva uma matéria celebrando o título do "${a.teamWinner.club_name}" como ${a.label}. Saldo: ${a.teamWinner.gf || a.teamWinner.goals_for || 0} gols pró, ${a.teamWinner.ga || a.teamWinner.goals_against || 0} sofridos.`
            : `Escreva uma matéria celebrando "${a.winner!.player_name}" (${a.winner!.club_name}) ganhando "${a.label}". Estatísticas: ${a.winner!.goals} gols, ${a.winner!.assists} assistências, ${a.winner!.cleanSheets} clean sheets, nota média ${avg(a.winner!.ratings).toFixed(2)} em ${a.winner!.games} jogos.`;

        const [imgRes, narRes] = await Promise.allSettled([
          generateImage(imgPrompt, LOVABLE_API_KEY),
          generateNarrative(narPrompt, LOVABLE_API_KEY),
        ]);

        if (imgRes.status === 'fulfilled' && imgRes.value) {
          const fname = `s${season}-${a.scope}-${a.award_type}-${(a.scope_id || 'g').slice(0, 8)}-${Date.now()}`;
          ai_image_url = await uploadDataUrlToBucket(admin, imgRes.value, fname);
        }
        if (narRes.status === 'fulfilled') ai_narrative = narRes.value;
      }

      const insertRow: any = {
        season, scope: a.scope, scope_id: a.scope_id, award_type: a.award_type,
        player_name: a.winner?.player_name || subjectName,
        player_position: a.winner?.position || null,
        player_overall: a.winner?.overall || null,
        user_id: a.winner?.user_id || a.teamWinner?.user_id || null,
        club_name: a.winner?.club_name || a.teamWinner?.club_name || null,
        club_logo: a.teamWinner?.club_logo || null,
        stats: a.winner ? {
          goals: a.winner.goals, assists: a.winner.assists, cleanSheets: a.winner.cleanSheets,
          ratings_avg: +avg(a.winner.ratings).toFixed(2), games: a.winner.games,
        } : (a.teamWinner ? {
          wins: a.teamWinner.wins, draws: a.teamWinner.draws, losses: a.teamWinner.losses,
          goals_for: a.teamWinner.gf || a.teamWinner.goals_for, goals_against: a.teamWinner.ga || a.teamWinner.goals_against,
        } : {}),
        score: a.winner ? calcScore(a.winner) : 0,
        ai_image_url, ai_narrative,
        team_of_season: a.team_of_season || null,
      };

      const { error: insErr } = await admin.from('season_awards').insert([insertRow]);
      if (insErr) { console.error('insert award err', insErr.message); continue; }
      insertedCount++;

      // Newspaper entry
      const headline = `🏆 ${a.label} — ${subjectName} é eleito(a) na Temporada ${season}`;
      const narrativeText = ai_narrative || `${subjectName} conquistou o prêmio de ${a.label} ao final da Temporada ${season}!`;
      if (insertRow.user_id) {
        await admin.from('newspaper_entries').insert([{
          user_id: insertRow.user_id,
          category: 'awards',
          text: `${headline}\n\n${narrativeText}`,
          is_event: true,
          narration: ai_image_url || null,
        }]).then(() => {}, () => {});
      }
    }

    return json({
      success: true,
      season,
      awards_inserted: insertedCount,
      awards_skipped_existing: skippedCount,
      total_processed: awards.length,
    });
  } catch (e: any) {
    console.error('process-season-awards error', e);
    return json({ error: e?.message || 'Unknown error' }, 500);
  }
});
