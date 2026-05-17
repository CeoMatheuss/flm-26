import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOBBY_WAIT_MS = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const matchType = body.match_type as 'friendly' | 'league';
    const matchId = body.match_id as string;
    if (!matchType || !matchId || !['friendly', 'league'].includes(matchType)) {
      return new Response(JSON.stringify({ error: 'Invalid match_type or match_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Service role for atomic lobby state writes
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const table = matchType === 'friendly' ? 'friendly_invites' : 'league_matches';
    const { data: row, error: rowErr } = await admin.from(table).select('*').eq('id', matchId).maybeSingle();
    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: 'Match not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Determine which side this user is on
    let homeUserId: string | null = null;
    let awayUserId: string | null = null;
    if (matchType === 'friendly') {
      const r: any = row;
      homeUserId = r.home_team_id === r.sender_id ? r.sender_id : r.receiver_id;
      awayUserId = r.home_team_id === r.sender_id ? r.receiver_id : r.sender_id;
    } else {
      homeUserId = (row as any).home_user_id;
      awayUserId = (row as any).away_user_id;
    }

    const isHome = userId === homeUserId;
    const isAway = userId === awayUserId;
    if (!isHome && !isAway) {
      return new Response(JSON.stringify({ error: 'You are not part of this match' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const now = Date.now();
    const update: Record<string, any> = {};
    if (isHome) update.home_joined = true;
    if (isAway) update.away_joined = true;

    // Horário oficial da partida (kickoff). Diferente do "lobby_opened_at" (instante do primeiro join).
    const r0: any = row;
    const kickoffIso: string | null = r0.match_date || r0.scheduled_at || r0.kickoff_at || null;
    const kickoffMs = kickoffIso ? new Date(kickoffIso).getTime() : null;
    // O auto-sim só dispara 5min APÓS o horário oficial. Se for setado relativo ao join,
    // um jogador entrando 10min depois "reiniciaria" o timer — errado.
    const baseMs = kickoffMs && kickoffMs > 0 ? kickoffMs : now;
    if (!r0.auto_sim_at) {
      update.auto_sim_at = new Date(baseMs + LOBBY_WAIT_MS).toISOString();
    }
    if (!r0.lobby_opened_at) {
      update.lobby_opened_at = new Date(now).toISOString();
    }

    const { data: updated, error: updErr } = await admin.from(table).update(update).eq('id', matchId).select('*').maybeSingle();
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const r2: any = updated || { ...row, ...update };
    const referenceMs = baseMs;
    const remainingMs = Math.max(0, (referenceMs + LOBBY_WAIT_MS) - now);
    const atLeastOneJoined = !!(r2.home_joined || r2.away_joined);

    // Estados:
    //  - both_ready: ambos prontos → começa imediatamente
    //  - one_ready: ao menos 1 entrou → pode iniciar contra IA do ausente (sem auto-sim)
    //  - waiting_other: ninguém entrou ainda mas dentro da janela
    //  - start_with_ai: janela expirou; se ninguém entrou → será auto-simulado pelo cron
    let state: 'waiting_other' | 'one_ready' | 'both_ready' | 'start_with_ai';
    if (r2.home_joined && r2.away_joined) {
      state = 'both_ready';
    } else if (atLeastOneJoined) {
      state = 'one_ready';
    } else if (remainingMs === 0) {
      state = 'start_with_ai';
    } else {
      state = 'waiting_other';
    }

    return new Response(JSON.stringify({
      state,
      remaining_ms: remainingMs,
      home_joined: !!r2.home_joined,
      away_joined: !!r2.away_joined,
      at_least_one_joined: atLeastOneJoined,
      home_user_id: homeUserId,
      away_user_id: awayUserId,
      auto_sim_at: r2.auto_sim_at,
      kickoff_at: kickoffIso,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[match-lobby-join] Error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
