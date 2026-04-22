// Re-simulate the remaining minutes of a live match with new tactics.
// Lightweight Poisson model — keeps existing events <= from_minute, replaces the rest.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchupEntry { homeAtk: number; homeDef: number; }

const STYLE_MULT: Record<string, { atk: number; def: number }> = {
  'retranca-total':  { atk: 0.65, def: 1.45 },
  'defensivo':       { atk: 0.80, def: 1.25 },
  'equilibrado':     { atk: 1.00, def: 1.00 },
  'ofensivo':        { atk: 1.30, def: 0.78 },
  'contra-ataque':   { atk: 1.05, def: 1.10 },
  'pressao-alta':    { atk: 1.18, def: 0.90 },
  'gegenpressing':   { atk: 1.18, def: 0.90 },
  'posse':           { atk: 1.05, def: 1.05 },
  'tiki-taka':       { atk: 1.10, def: 1.05 },
  'parking-bus':     { atk: 0.55, def: 1.55 },
  'fluido':          { atk: 1.10, def: 0.95 },
};

const MATCHUP: Record<string, Record<string, MatchupEntry>> = {
  'ofensivo':       { 'contra-ataque': { homeAtk: 1.05, homeDef: 0.85 }, 'retranca-total': { homeAtk: 0.85, homeDef: 1.05 }, 'defensivo': { homeAtk: 0.90, homeDef: 1.00 } },
  'retranca-total': { 'ofensivo': { homeAtk: 0.85, homeDef: 1.20 }, 'pressao-alta': { homeAtk: 0.80, homeDef: 1.10 } },
  'defensivo':      { 'contra-ataque': { homeAtk: 0.85, homeDef: 1.10 } },
  'pressao-alta':   { 'posse': { homeAtk: 1.15, homeDef: 0.95 }, 'retranca-total': { homeAtk: 1.10, homeDef: 0.95 } },
  'contra-ataque':  { 'ofensivo': { homeAtk: 1.10, homeDef: 0.95 }, 'posse': { homeAtk: 1.05, homeDef: 1.05 } },
};

function getMatchup(my: string, opp: string): MatchupEntry {
  return MATCHUP[my]?.[opp] || { homeAtk: 1.0, homeDef: 1.0 };
}

function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function pickPlayer(players: any[]): any | null {
  if (!players || players.length === 0) return null;
  const onPitch = players.filter(p => p.isOnPitch !== false);
  return (onPitch[Math.floor(Math.random() * onPitch.length)]) || players[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { live_match_id, from_minute, new_tactics } = body || {};
    if (!live_match_id || typeof from_minute !== 'number' || !new_tactics) {
      return new Response(JSON.stringify({ error: 'live_match_id, from_minute, new_tactics required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fromMin = Math.max(0, Math.min(89, Math.floor(from_minute)));
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: match, error: loadErr } = await admin
      .from('live_matches')
      .select('*')
      .eq('id', live_match_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (loadErr || !match) {
      return new Response(JSON.stringify({ error: 'Match not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (match.status !== 'live') {
      return new Response(JSON.stringify({ error: 'Match is not live' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tactics = (match.tactics as any) || {};
    const lastChanged = typeof tactics.lastChangedAt === 'number' ? tactics.lastChangedAt : -999;
    if (fromMin - lastChanged < 15) {
      return new Response(JSON.stringify({ error: `Cooldown ativo. Aguarde até o minuto ${lastChanged + 15}'.` }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const events: any[] = Array.isArray(match.events) ? (match.events as any[]) : [];
    const keptEvents = events.filter(e => (e.minute ?? 0) <= fromMin);

    const myStyle: string = (new_tactics.playStyle || 'equilibrado');
    const oppStyle: string = (tactics.away?.playStyle || 'equilibrado');
    const myMod = STYLE_MULT[myStyle] || STYLE_MULT['equilibrado'];
    const oppMod = STYLE_MULT[oppStyle] || STYLE_MULT['equilibrado'];
    const homeMU = getMatchup(myStyle, oppStyle);
    const awayMU = getMatchup(oppStyle, myStyle);

    const isHome = !!match.is_home;
    const myStrength = isHome ? Number(match.home_strength) : Number(match.away_strength);
    const oppStrength = isHome ? Number(match.away_strength) : Number(match.home_strength);

    const homeGoalsSoFar = keptEvents.filter(e => e.type === 'goal' && e.team === 'home').length;
    const awayGoalsSoFar = keptEvents.filter(e => e.type === 'goal' && e.team === 'away').length;

    const remaining = 90 - fromMin;
    const baseMy = (myStrength / 60) * 1.4 * myMod.atk * (1 / Math.max(0.6, oppMod.def));
    const baseOpp = (oppStrength / 60) * 1.4 * oppMod.atk * (1 / Math.max(0.6, myMod.def));
    const myExpected  = Math.max(0.05, baseMy  * (remaining / 90) * (isHome ? homeMU.homeAtk : awayMU.homeAtk) / Math.max(0.6, isHome ? awayMU.homeDef : homeMU.homeDef));
    const oppExpected = Math.max(0.05, baseOpp * (remaining / 90) * (isHome ? awayMU.homeAtk : homeMU.homeAtk) / Math.max(0.6, isHome ? homeMU.homeDef : awayMU.homeDef));

    const myNewGoals  = poisson(Math.min(4, myExpected));
    const oppNewGoals = poisson(Math.min(4, oppExpected));

    const homePlayers: any[] = Array.isArray(match.home_players) ? (match.home_players as any[]) : [];

    const newEvents: any[] = [];
    const baseNarr: any = {
      type: 'narration',
      team: 'neutral',
      minute: fromMin,
      text: `🔄 Tática ajustada: ${myStyle.replace('-', ' ')} — efeito a partir do minuto ${fromMin}'`,
    };
    newEvents.push(baseNarr);

    const goalMinutes: { team: 'home' | 'away'; minute: number }[] = [];
    for (let i = 0; i < myNewGoals; i++) goalMinutes.push({ team: isHome ? 'home' : 'away', minute: fromMin + 1 + Math.floor(Math.random() * (remaining - 1)) });
    for (let i = 0; i < oppNewGoals; i++) goalMinutes.push({ team: isHome ? 'away' : 'home', minute: fromMin + 1 + Math.floor(Math.random() * (remaining - 1)) });
    goalMinutes.sort((a, b) => a.minute - b.minute);

    for (const g of goalMinutes) {
      const scorer = g.team === 'home' && isHome ? pickPlayer(homePlayers.filter(p => ['ATA','SA','PE','PD','MEI'].includes(p.position))) : null;
      const name = scorer?.name?.split(' ').pop() || (g.team === 'home' ? match.home_team : match.away_team);
      newEvents.push({
        type: 'goal',
        team: g.team,
        minute: g.minute,
        player: name,
        playerId: scorer?.id,
        text: `⚽ GOOOL! ${name} marca para ${g.team === 'home' ? match.home_team : match.away_team}!`,
      });
    }

    const flavorCount = Math.min(6, Math.max(2, Math.floor(remaining / 12)));
    for (let i = 0; i < flavorCount; i++) {
      const min = fromMin + 2 + Math.floor((remaining - 2) * (i / flavorCount));
      const isMine = Math.random() < 0.55;
      newEvents.push({
        type: 'narration',
        team: isMine ? (isHome ? 'home' : 'away') : (isHome ? 'away' : 'home'),
        minute: min,
        text: isMine ? '⚡ Boa pressão na frente, jogada perigosa.' : '🛡️ Boa marcação defensiva interrompe o ataque.',
      });
    }

    newEvents.push({ type: 'narration', team: 'neutral', minute: 90, text: '🏁 Apito final.' });

    newEvents.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
    const allEvents = [...keptEvents, ...newEvents];

    const finalHomeGoals = homeGoalsSoFar + (isHome ? myNewGoals : oppNewGoals);
    const finalAwayGoals = awayGoalsSoFar + (isHome ? oppNewGoals : myNewGoals);

    const updatedTactics = {
      ...tactics,
      ...new_tactics,
      lastChangedAt: fromMin,
      changeHistory: [
        ...(Array.isArray(tactics.changeHistory) ? tactics.changeHistory : []),
        { atMinute: fromMin, playStyle: myStyle, formation: new_tactics.formation || tactics.formation },
      ],
    };

    const { error: updErr } = await admin.from('live_matches').update({
      events: allEvents,
      tactics: updatedTactics,
      home_goals: finalHomeGoals,
      away_goals: finalAwayGoals,
    }).eq('id', live_match_id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      from_minute: fromMin,
      new_events_count: newEvents.length,
      remaining_minutes: remaining,
      projected_home_goals: finalHomeGoals,
      projected_away_goals: finalAwayGoals,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
