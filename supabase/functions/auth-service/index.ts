import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getVerificationEmailTemplate } from "../_shared/email-templates/verification.ts"

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
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
      
      console.log(`[send-code] IP Detectado: ${ipAddress}`)

      // Anti-flood: Verificar se já houve um envio recente (últimos 45 segundos)
      const { data: recentCode } = await supabaseAdmin
        .from('auth_verification_codes')
        .select('created_at')
        .eq('email', email)
        .gt('created_at', new Date(Date.now() - 45 * 1000).toISOString())
        .limit(1)

      if (recentCode && recentCode.length > 0) {
        console.warn(`[send-code] Anti-flood atingido para ${email}`)
        return new Response(JSON.stringify({ 
          error: 'Muitas solicitações. Aguarde um momento.',
          cooldown: true 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Invalida códigos anteriores
      await supabaseAdmin
        .from('auth_verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('email', email)
        .is('used_at', null)

      // Salva novo código
      const { data: insertedCode, error: dbError } = await supabaseAdmin
        .from('auth_verification_codes')
        .insert({
          email,
          code: verificationCode,
          expires_at: new Date(Date.now() + 15 * 1000 * 60).toISOString(), // 15 mins
          delivery_status: 'pending'
        })
        .select()
        .single()

      if (dbError) {
        console.error('[send-code] Erro DB:', dbError)
        throw dbError
      }

      const resendKey = Deno.env.get('RESEND_API_KEY')
      // PRIORIDADE: Domínio verificado. Se não houver, usa o domínio atual como fallback (que vai falhar se não verificado)
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'no-reply@footballlifemanager.com.br'
      
      let emailSent = false
      let finalError: any = null
      let apiResponse: any = null

      if (resendKey) {
        // Tenta enviar com o domínio principal
        const sendWithDomain = async (from: string) => {
          console.log(`[send-code] Tentando enviar de: ${from}`)
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: `Football Life Manager <${from}>`,
              to: [email],
              subject: `Código de Acesso: ${verificationCode}`,
              html: getVerificationEmailTemplate({
                userName: email.split('@')[0],
                verificationCode: verificationCode,
                expirationMinutes: 15,
                clubName: 'Manager em Pré-Temporada',
                ipAddress: ipAddress,
                creationDate: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                appUrl: 'https://footballlifemanager26.vercel.app'
              }),
            }),
          })
          const data = await res.json()
          return { ok: res.ok, status: res.status, data }
        }

        const primaryAttempt = await sendWithDomain(fromEmail)
        apiResponse = primaryAttempt.data

        if (primaryAttempt.ok) {
          emailSent = true
          console.log('[send-code] Envio bem-sucedido via domínio principal')
        } else {
          finalError = primaryAttempt.data
          console.error(`[send-code] Erro no domínio principal (${primaryAttempt.status}):`, finalError)

          // Fallback Automático para sandbox se for erro de validação de domínio
          if (primaryAttempt.status === 403 || primaryAttempt.data?.name === 'validation_error') {
            console.warn('[send-code] Domínio não verificado. Tentando fallback para onboarding@resend.dev (Sandbox)...')
            const fallbackAttempt = await sendWithDomain('onboarding@resend.dev')
            if (fallbackAttempt.ok) {
              emailSent = true
              console.log('[send-code] Envio bem-sucedido via Sandbox (Apenas para admin)')
            } else {
              console.error('[send-code] Falha total no envio. Ambos domínios falharam.')
              finalError = fallbackAttempt.data
            }
          }
        }
      } else {
        finalError = 'RESEND_API_KEY_MISSING'
        console.error('[send-code] RESEND_API_KEY não encontrada nas secrets')
      }

      // Atualiza log no banco
      await supabaseAdmin
        .from('auth_verification_codes')
        .update({ 
          delivery_status: emailSent ? 'sent' : 'failed',
          delivery_error: JSON.stringify(finalError)
        })
        .eq('id', insertedCode.id)

      const duration = Date.now() - startTime
      console.log(`[send-code] Finalizado em ${duration}ms. Sucesso: ${emailSent}`)

      return new Response(JSON.stringify({
        success: true,
        emailSent,
        details: {
          duration,
          status: apiResponse?.id ? 'sent' : 'error',
          error: emailSent ? null : (finalError?.message || finalError)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'verify-code') {
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('auth_verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (codeError || !codeData) {
        return new Response(JSON.stringify({ error: 'Código inválido ou expirado' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Marcar como usado
      await supabaseAdmin
        .from('auth_verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codeData.id)

      // Confirmar usuário no Auth do Supabase
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError
      
      const user = users.find(u => u.email === email)
      if (user) {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email_confirm: true
        })
        console.log(`[verify-code] Usuário ${email} confirmado com sucesso.`)
      }

      return new Response(JSON.stringify({ success: true }), {
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
