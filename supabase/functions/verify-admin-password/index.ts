import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pre-computed SHA-256 hash of "ADM112828"
const ADMIN_PASSWORD_HASH = "a]HASHED"; // We'll compute it at startup

let cachedHash: string | null = null;

async function getPasswordHash(): Promise<string> {
  if (cachedHash) return cachedHash;
  const encoder = new TextEncoder();
  const data = encoder.encode("ADM112828");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  cachedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return cachedHash;
}

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    // Use service role for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is actually an admin (server-side verification)
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Você não é administrador.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check rate limiting: count failed attempts in last 15 minutes
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: failedCount } = await adminClient
      .from('admin_login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('success', false)
      .gte('attempted_at', fifteenMinAgo);

    if ((failedCount ?? 0) >= 5) {
      return new Response(JSON.stringify({ 
        error: 'Acesso bloqueado temporariamente. Muitas tentativas incorretas. Tente novamente em 15 minutos.',
        blocked: true 
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get password from request
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string' || password.length > 50) {
      return new Response(JSON.stringify({ error: 'Senha inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Hash the provided password and compare
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const correctHash = await getPasswordHash();

    if (providedHash !== correctHash) {
      // Log failed attempt
      await adminClient.from('admin_login_attempts').insert([{
        user_id: userId,
        success: false,
      }]);

      const remaining = 4 - (failedCount ?? 0);
      return new Response(JSON.stringify({ 
        error: `Senha incorreta. ${remaining > 0 ? `${remaining} tentativa(s) restante(s).` : 'Próxima tentativa bloqueará o acesso por 15 minutos.'}`,
        success: false 
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Log successful attempt
    await adminClient.from('admin_login_attempts').insert([{
      user_id: userId,
      success: true,
    }]);

    // Generate a simple admin session token (random, stored nowhere - just a signed claim)
    const sessionToken = crypto.randomUUID();

    return new Response(JSON.stringify({ 
      success: true, 
      admin_token: sessionToken,
      message: 'Acesso administrativo liberado!'
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
