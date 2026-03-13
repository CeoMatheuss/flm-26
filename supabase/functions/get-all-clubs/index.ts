import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller is authenticated
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify caller is admin
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { scope } = await req.json();

    // Use service role to read ALL game_saves
    const { data: saves, error: savesErr } = await adminClient
      .from('game_saves')
      .select('user_id, club_data')
      .limit(500);

    if (savesErr) {
      return new Response(JSON.stringify({ error: savesErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const clubs: Array<{ user_id: string; club_name: string; club_logo: string }> = [];
    const seenUsers = new Set<string>();

    for (const save of (saves || [])) {
      if (seenUsers.has(save.user_id)) continue;
      try {
        const clubData = save.club_data as any;
        if (!clubData || !clubData.name) continue;
        const clubCountry = clubData.country || 'Brasil';
        if (scope !== 'Mundial' && clubCountry !== scope) continue;
        seenUsers.add(save.user_id);
        clubs.push({
          user_id: save.user_id,
          club_name: clubData.name,
          club_logo: clubData.logo || '⚽',
        });
      } catch { /* skip */ }
    }

    return new Response(JSON.stringify({ clubs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
