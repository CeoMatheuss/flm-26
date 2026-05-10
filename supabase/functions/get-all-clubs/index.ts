import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type SaveRow = {
  user_id: string;
  club_data: Record<string, unknown> | null;
  updated_at: string | null;
};

const normalizeCountry = (raw: unknown): string => {
  if (typeof raw !== 'string' || !raw.trim()) return 'Brasil';

  const value = raw.trim().toLowerCase();
  const aliases: Record<string, string> = {
    br: 'Brasil',
    brasil: 'Brasil',
    brazil: 'Brasil',
    ar: 'Argentina',
    argentina: 'Argentina',
    es: 'Espanha',
    espanha: 'Espanha',
    espana: 'Espanha',
    spain: 'Espanha',
    uk: 'Inglaterra',
    gb: 'Inglaterra',
    england: 'Inglaterra',
    inglaterra: 'Inglaterra',
    de: 'Alemanha',
    germany: 'Alemanha',
    alemanha: 'Alemanha',
    it: 'Itália',
    italy: 'Itália',
    italia: 'Itália',
    fr: 'França',
    france: 'França',
    franca: 'França',
    pt: 'Portugal',
    portugal: 'Portugal',
  };

  return aliases[value] ?? raw.trim();
};

const extractClub = (save: SaveRow) => {
  const root = (save.club_data && typeof save.club_data === 'object') ? save.club_data : {};
  const club = (root.club && typeof root.club === 'object') ? root.club as Record<string, unknown> : {};

  const clubNameCandidates = [club.name, root.club_name, root.name, club.clubName];
  const clubName = clubNameCandidates.find((name) => typeof name === 'string' && name.trim().length > 0) as string | undefined;

  if (!clubName) return null;

  const logoCandidates = [club.logo, club.logoUrl, root.logo, root.club_logo, '⚽'];
  const clubLogo = logoCandidates.find((logo) => typeof logo === 'string' && logo.trim().length > 0) as string;

  const clubCountry = normalizeCountry(club.country ?? root.country ?? root.club_country ?? 'Brasil');

  return {
    user_id: save.user_id,
    club_name: clubName.trim(),
    club_logo: clubLogo,
    club_country: clubCountry,
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const scope = typeof body.scope === 'string' ? body.scope : 'Mundial';
    const normalizedScope = normalizeCountry(scope);

    const saves: SaveRow[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await adminClient
        .from('game_saves')
        .select('user_id, club_data, updated_at')
        .order('updated_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to load clubs' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rows = (data ?? []) as SaveRow[];
      saves.push(...rows);

      if (rows.length < pageSize) break;
      from += pageSize;

      if (from > 10000) break;
    }

    const clubs: Array<{ user_id: string; club_name: string; club_logo: string }> = [];
    const seenUsers = new Set<string>();

    for (const save of saves) {
      if (seenUsers.has(save.user_id)) continue;

      const extracted = extractClub(save);
      if (!extracted) continue;

      if (scope !== 'Mundial' && extracted.club_country !== normalizedScope) continue;

      seenUsers.add(save.user_id);
      clubs.push({
        user_id: extracted.user_id,
        club_name: extracted.club_name,
        club_logo: extracted.club_logo,
        updated_at: save.updated_at,
      });
    }

    return new Response(JSON.stringify({ clubs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
