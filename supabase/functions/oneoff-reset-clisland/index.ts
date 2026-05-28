// ONE-OFF: resets the password of clislandouglas32@gmail.com to "123456".
// Safe-by-design: only this email + this password. Delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

const TARGET_EMAIL = 'clislandouglas32@gmail.com';
const NEW_PASSWORD = '123456';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw listErr;
    const user = list.users.find(u => u.email?.toLowerCase() === TARGET_EMAIL);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD,
      email_confirm: true,
    });
    if (updErr) throw updErr;
    return new Response(JSON.stringify({ success: true, email: user.email, userId: user.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
