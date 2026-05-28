import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { users } = await req.json()
    if (!users || !Array.isArray(users)) throw new Error('Array of users is required')

    const results = []

    for (const user of users) {
      // Import into auth.users using service_role
      // Note: We can't import the hash directly via auth.admin.createUser if it's from another system (like MD5 or custom Bcrypt)
      // unless we use the internal schema access or migrate hashes to public.legacy_user_migrations first.
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password || Math.random().toString(36).slice(-10), // temporary password if not provided
        email_confirm: true,
        user_metadata: user.metadata || {}
      })

      if (error) {
        results.push({ email: user.email, status: 'error', message: error.message })
      } else {
        results.push({ email: user.email, status: 'success', id: data.user.id })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
