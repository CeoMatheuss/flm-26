// One-off admin endpoint. Requires the ADMIN_PASSWORD_HASH secondary password
// (SHA-256 hex of the secret) in the `x-admin-secret` header.
// Used to administratively reset a user's password by email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
};

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { email, password, adminSecret } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email e password obrigatórios' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const provided = req.headers.get('x-admin-secret') || adminSecret || '';
    const storedHash = Deno.env.get('ADMIN_PASSWORD_HASH') || '';
    const providedHash = await sha256Hex(provided);
    if (!storedHash || providedHash !== storedHash) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw listErr;
    const user = list.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase());
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { password });
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true, userId: user.id, email: user.email }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
