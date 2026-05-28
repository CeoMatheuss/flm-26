import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
Deno.serve(async (_req) => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const all: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data?.users?.length) break;
    all.push(...data.users.map(u => u.email));
    if (data.users.length < 1000) break;
  }
  const matches = all.filter(e => e && /clisland|douglas/i.test(e));
  return new Response(JSON.stringify({ total: all.length, matches }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
