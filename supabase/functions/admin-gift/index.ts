import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FOUNDER_EMAIL = 'fcmsistemas7@gmail.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify admin role server-side
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Você não é administrador.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify founder email server-side using auth.admin
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Erro ao verificar identidade' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (userData.user.email !== FOUNDER_EMAIL) {
      return new Response(JSON.stringify({ error: 'Somente o Fundador pode realizar esta ação.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse and validate request
    const body = await req.json();
    const { giftType, targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.length > 100) {
      return new Response(JSON.stringify({ error: 'ID do usuário inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!['premium', 'moderator', 'unban'].includes(giftType)) {
      return new Response(JSON.stringify({ error: 'Tipo de presente inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify target user exists
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Execute gift operation
    if (giftType === 'premium') {
      const { error } = await adminClient.from('premium_users').insert({
        user_id: targetUserId,
        status: 'active',
        pix_transaction_id: 'GIFT_BY_FOUNDER',
      });
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          return new Response(JSON.stringify({ error: 'Usuário já é premium!' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        throw error;
      }
      return new Response(JSON.stringify({ success: true, message: 'Premium presenteado com sucesso!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (giftType === 'moderator') {
      const { error } = await adminClient.from('user_roles').insert({
        user_id: targetUserId,
        role: 'moderator',
      });
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          return new Response(JSON.stringify({ error: 'Usuário já é moderador!' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        throw error;
      }
      return new Response(JSON.stringify({ success: true, message: 'Moderador concedido!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (giftType === 'unban') {
      const { data: banData } = await adminClient.from('chat_bans').select('id').eq('user_id', targetUserId);
      if (!banData || banData.length === 0) {
        return new Response(JSON.stringify({ error: 'Usuário não está banido.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await adminClient.from('chat_bans').delete().eq('user_id', targetUserId);
      return new Response(JSON.stringify({ success: true, message: 'Usuário desbanido!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Operação desconhecida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('admin-gift error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
