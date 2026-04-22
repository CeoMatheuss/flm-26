import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONTINENTS = ['Europa', 'América do Sul', 'América do Norte', 'África', 'Ásia', 'Oceania'];

const CUP_NAMES: Record<string, { principal: string; secundaria: string }> = {
  'Europa': { principal: 'UEFA Champions League', secundaria: 'UEFA Europa League' },
  'América do Sul': { principal: 'Copa Libertadores da América', secundaria: 'Copa Sul-Americana' },
  'América do Norte': { principal: 'CONCACAF Champions Cup', secundaria: 'CONCACAF Liga' },
  'África': { principal: 'CAF Champions League', secundaria: 'CAF Confederation Cup' },
  'Ásia': { principal: 'AFC Champions League', secundaria: 'AFC Cup' },
  'Oceania': { principal: 'OFC Champions League', secundaria: 'OFC President Cup' },
};

const BOT_NAME_POOL = [
  'FC Aurora', 'United City', 'Real Estrela', 'Atlético Solar', 'Sporting Norte',
  'Olympic FC', 'Independiente', 'Lobos FC', 'Tigres Brancos', 'Águia Negra',
  'Dragões SC', 'Real Vitória', 'Atlético Sul', 'Liga Verde', 'Vermelho Total',
  'Azul Profundo', 'Champion FC', 'Galaxy FC', 'Phoenix Rising', 'Thunder FC',
  'Bravos FC', 'Esperança SC', 'Liberdade FC', 'Glória FC', 'Triunfo Atlético',
  'Vanguard FC', 'Stallions', 'Wolves United', 'Hawks FC', 'Lions Athletic',
  'Sun City', 'Star FC',
];

function fillToTarget(teams: any[], target: number, continent: string): any[] {
  const filled = [...teams];
  let i = 0;
  while (filled.length < target) {
    filled.push({
      user_id: null,
      club_name: `${BOT_NAME_POOL[i % BOT_NAME_POOL.length]} ${i + 1}`,
      club_logo: '⚽',
      country: continent,
      source: 'bot_filler',
      is_bot: true,
    });
    i++;
  }
  return filled.slice(0, target);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check (admin OR internal cron call)
    const authHeader = req.headers.get('Authorization');
    const isInternalCron = req.headers.get('x-internal-cron') === 'true';
    let adminUserId: string | null = null;

    if (!isInternalCron) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!roles) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      adminUserId = user.id;
    }

    const seasonYear = new Date().getFullYear();
    const created: any[] = [];
    const skipped: any[] = [];

    for (const continent of CONTINENTS) {
      // Idempotency: skip if active cups already exist for this continent+year
      const { data: existing } = await supabase
        .from('cup_competitions')
        .select('id, tier, status')
        .eq('continent', continent)
        .eq('season_year', seasonYear)
        .eq('cup_type', 'continental')
        .neq('status', 'finished');

      if (existing && existing.length >= 2) {
        skipped.push({ continent, reason: 'already_active', count: existing.length });
        continue;
      }

      // Get qualified teams via RPC
      const { data: qualResult, error: qErr } = await supabase
        .rpc('qualify_international_teams', { _continent: continent, _season_year: seasonYear });

      if (qErr) {
        console.error(`[${continent}] qualify error:`, qErr);
        skipped.push({ continent, reason: 'qualify_failed', error: qErr.message });
        continue;
      }

      const principalTeams = fillToTarget((qualResult?.principal as any[]) || [], 32, continent);
      const secundariaTeams = fillToTarget((qualResult?.secundaria as any[]) || [], 32, continent);

      const cupsToCreate = [
        { tier: 'principal', name: CUP_NAMES[continent].principal, teams: principalTeams },
        { tier: 'secundaria', name: CUP_NAMES[continent].secundaria, teams: secundariaTeams },
      ];

      for (const cupSpec of cupsToCreate) {
        // Create cup row
        const { data: cup, error: cupErr } = await supabase
          .from('cup_competitions')
          .insert({
            name: cupSpec.name,
            cup_type: 'continental',
            tier: cupSpec.tier,
            continent,
            season_year: seasonYear,
            status: 'pending',
            current_round: 0,
            total_rounds: 7, // groups + R16 + QF + SF + F
            format: 'groups_then_knockout',
          })
          .select('id')
          .single();

        if (cupErr || !cup) {
          console.error(`[${continent}/${cupSpec.tier}] cup insert error:`, cupErr);
          continue;
        }

        // Insert teams (anti-dup by composite key check)
        const seenKeys = new Set<string>();
        const teamsToInsert = shuffle(cupSpec.teams).map((t, idx) => {
          const key = t.user_id ? `u:${t.user_id}` : `c:${t.club_name}`;
          if (seenKeys.has(key)) return null;
          seenKeys.add(key);
          return {
            cup_id: cup.id,
            user_id: t.user_id || null,
            club_name: t.club_name,
            club_logo: t.club_logo || '⚽',
            is_bot: !t.user_id,
            bot_name: !t.user_id ? t.club_name : null,
            bot_strength: !t.user_id ? 65 + Math.floor(Math.random() * 15) : null,
            seed: idx + 1,
            eliminated: false,
          };
        }).filter(Boolean);

        const { error: teamsErr } = await supabase.from('cup_teams').insert(teamsToInsert as any);
        if (teamsErr) {
          console.error(`[${continent}/${cupSpec.tier}] teams insert error:`, teamsErr);
        }

        created.push({
          continent, tier: cupSpec.tier, name: cupSpec.name,
          cup_id: cup.id, teams: teamsToInsert.length,
        });
      }
    }

    // Log admin action
    if (adminUserId) {
      await supabase.from('admin_logs').insert({
        user_id: adminUserId,
        action: 'international_cups_generated',
        details: { season_year: seasonYear, created, skipped },
      });
    }

    return new Response(JSON.stringify({
      success: true, season_year: seasonYear, created, skipped,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('generate-international-cups error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
