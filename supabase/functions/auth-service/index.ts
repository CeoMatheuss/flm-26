import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let actionLog = 'unknown'
  let targetEmail = 'unknown'

  try {
    const { action, email, code } = await req.json()
    actionLog = action
    targetEmail = email
    
    console.log(`[${action}] Iniciando processo para: ${email} às ${new Date().toISOString()}`)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'send-code') {
      console.log(`[send-code] Verificação por e-mail desativada temporariamente para: ${email}`)
      return new Response(JSON.stringify({
        success: true,
        emailSent: false,
        bypassed: true,
        message: 'Validação por e-mail temporariamente desativada.',
        details: {
          duration: Date.now() - startTime,
          status: 'bypassed',
          error: null
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'verify-code') {
      console.log(`[verify-code] Bypass temporário ativo para: ${email}`)

      await supabaseAdmin
        .from('auth_verification_codes')
        .update({ used_at: new Date().toISOString(), delivery_status: 'bypassed' })
        .eq('email', email)
        .is('used_at', null)

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError
      
      const user = users.find(u => u.email === email)
      if (user) {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email_confirm: true
        })
        console.log(`[verify-code] Usuário ${email} confirmado por bypass temporário.`)
      }

      return new Response(JSON.stringify({ success: true, bypassed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Ação inválida')

  } catch (err: any) {
    const duration = Date.now() - startTime
    console.error(`[${actionLog}] Erro crítico (${duration}ms):`, err.message)
    
    return new Response(JSON.stringify({ 
      error: err.message,
      success: false,
      details: { duration }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
