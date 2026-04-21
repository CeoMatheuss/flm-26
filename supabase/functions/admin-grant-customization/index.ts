import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate JWT of caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service-role client for elevated ops
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Confirm caller is an admin
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body?.targetUserId;
    const grant: boolean = body?.grant !== false; // default true

    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.length < 10) {
      return new Response(JSON.stringify({ error: 'targetUserId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load most recent save for the target user
    const { data: saveRow, error: loadErr } = await admin
      .from('game_saves')
      .select('id, club_data')
      .eq('user_id', targetUserId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (loadErr) {
      return new Response(JSON.stringify({ error: loadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!saveRow) {
      return new Response(JSON.stringify({ error: 'Nenhum save encontrado para este usuário' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clubData = (saveRow.club_data || {}) as Record<string, any>;
    const clubProfile = { ...(clubData.clubProfile || {}) };
    clubProfile.customizationUnlocked = !!grant;
    clubData.clubProfile = clubProfile;

    const { error: updErr } = await admin
      .from('game_saves')
      .update({ club_data: clubData, updated_at: new Date().toISOString() })
      .eq('id', saveRow.id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Audit log
    await admin.from('admin_logs').insert([{
      user_id: user.id,
      action: grant ? 'grant_customization' : 'revoke_customization',
      details: { target_user_id: targetUserId },
    }]);

    return new Response(JSON.stringify({
      success: true,
      message: grant
        ? 'Personalização desbloqueada para o usuário'
        : 'Personalização bloqueada para o usuário',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
