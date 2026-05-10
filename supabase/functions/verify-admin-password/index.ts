import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    const rawHash = Deno.env.get('ADMIN_PASSWORD_HASH');
    // SECURITY: Use a salt from env vars. Fallback to a hardcoded one if not set (better than no salt).
    const securitySalt = Deno.env.get('SECURITY_SALT') || 'FLM26_INTERNAL_SEC_SALT_v1';
    
    // Use stored hash only if it looks like a valid SHA-256 hex string (64 chars)
    const storedHash = (rawHash && /^[a-f0-9]{64}$/.test(rawHash)) ? rawHash : 'aa0f487585c2def6cf9ed1720603fa983a5a424ebf4018915adde36917a53b3c';

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

    // Rate Limiting using the security_rate_limits table
    const { data: rateLimit } = await adminClient
      .from('security_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', 'admin_login')
      .maybeSingle();

    if (rateLimit) {
      const lastAttempt = new Date(rateLimit.last_attempt).getTime();
      const now = Date.now();
      const cooldownMs = 15 * 60 * 1000; // 15 minutes
      
      if (rateLimit.attempt_count >= 5 && (now - lastAttempt) < cooldownMs) {
        return new Response(JSON.stringify({ 
          error: 'Acesso bloqueado temporariamente por excesso de tentativas. Tente novamente em 15 minutos.',
          blocked: true 
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // If cooldown period passed, reset attempt count
      if ((now - lastAttempt) >= cooldownMs) {
        await adminClient.from('security_rate_limits').update({ attempt_count: 0, last_attempt: new Date().toISOString() }).eq('id', rateLimit.id);
      }
    }

    // Get password from request
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string' || password.length > 50) {
      return new Response(JSON.stringify({ error: 'Senha inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // SECURITY: Salted Hashing
    const encoder = new TextEncoder();
    const saltedData = encoder.encode(password + securitySalt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", saltedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (providedHash !== storedHash) {
      // Log failed attempt / Update rate limit
      if (rateLimit) {
        await adminClient.from('security_rate_limits').update({ 
          attempt_count: rateLimit.attempt_count + 1, 
          last_attempt: new Date().toISOString() 
        }).eq('id', rateLimit.id);
      } else {
        await adminClient.from('security_rate_limits').insert({ 
          user_id: userId, 
          action_type: 'admin_login', 
          attempt_count: 1 
        });
      }

      const failedCount = rateLimit ? rateLimit.attempt_count + 1 : 1;
      const remaining = 5 - failedCount;
      return new Response(JSON.stringify({ 
        error: `Senha incorreta. ${remaining > 0 ? `${remaining} tentativa(s) restante(s).` : 'Próxima tentativa bloqueará o acesso por 15 minutos.'}`,
        success: false 
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Reset rate limit on success
    if (rateLimit) {
      await adminClient.from('security_rate_limits').update({ attempt_count: 0 }).eq('id', rateLimit.id);
    }

    // Generate a simple admin session token (not really used in this stateless func but good for consistency)
    const sessionToken = crypto.randomUUID();

    return new Response(JSON.stringify({ 
      success: true, 
      admin_token: sessionToken,
      message: 'Acesso administrativo liberado!'
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (_err) {
    console.error('[verify-admin-password] Error:', _err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
