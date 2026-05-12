import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PREMIUM_EMAIL_TEMPLATE = (code: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      background-color: #0a0a0c;
      color: #ffffff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(180deg, #151518 0%, #0a0a0c 100%);
      border: 1px solid #1f1f23;
      border-top: 4px solid #00f2ff;
    }
    .header {
      padding: 40px 20px;
      text-align: center;
      background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800');
      background-size: cover;
      background-position: center;
    }
    .logo {
      font-size: 32px;
      font-weight: 900;
      font-style: italic;
      text-transform: uppercase;
      letter-spacing: -1px;
      margin-bottom: 10px;
    }
    .logo span { color: #00f2ff; text-shadow: 0 0 10px rgba(0,242,255,0.5); }
    .content {
      padding: 40px;
      text-align: center;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 20px;
      letter-spacing: 1px;
    }
    .subtitle {
      color: #a0a0a8;
      font-size: 16px;
      margin-bottom: 40px;
    }
    .code-container {
      background: rgba(0, 242, 255, 0.05);
      border: 1px solid rgba(0, 242, 255, 0.2);
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
      position: relative;
      overflow: hidden;
    }
    .code {
      font-size: 48px;
      font-weight: 900;
      color: #00f2ff;
      letter-spacing: 10px;
      text-shadow: 0 0 20px rgba(0,242,255,0.3);
    }
    .footer {
      padding: 30px;
      font-size: 12px;
      color: #505058;
      text-align: center;
      border-top: 1px solid #1f1f23;
    }
    .btn {
      display: inline-block;
      padding: 15px 30px;
      background: #00f2ff;
      color: #000000;
      text-decoration: none;
      font-weight: 900;
      text-transform: uppercase;
      border-radius: 4px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FLM <span>26</span></div>
      <div style="font-size: 14px; opacity: 0.8; font-weight: bold;">FOOTBALL LEGEND MANAGER</div>
    </div>
    <div class="content">
      <div class="title">Bem-vindo ao Campo, Manager</div>
      <div class="subtitle">Sua carreira começa agora. Digite o código abaixo para validar sua conta e assumir o comando.</div>
      
      <div class="code-container">
        <div class="code">${code}</div>
      </div>
      
      <p style="font-size: 13px; color: #a0a0a8;">Este código expira em 10 minutos por motivos de segurança.</p>
    </div>
    <div class="footer">
      © 2026 FLM 26 - Football Legend Manager. Todos os direitos reservados.<br>
      Este é um e-mail automático, por favor não responda.
    </div>
  </div>
</body>
</html>
`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, email, code } = await req.json()
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'send-code') {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      
      const { error: dbError } = await supabaseAdmin
        .from('auth_verification_codes')
        .insert({
          email,
          code: verificationCode,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })
      
      if (dbError) throw dbError

      // Here we would integrate Resend or other SMTP
      // For now we use a mock/console log, but if RESEND_API_KEY is present, we could use it
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'FLM 26 <noreply@flm26.com.br>',
            to: [email],
            subject: `Código de Verificação: ${verificationCode}`,
            html: PREMIUM_EMAIL_TEMPLATE(verificationCode),
          }),
        })
      }

      console.log(`[AUTH] Sent code ${verificationCode} to ${email}`)

      return new Response(JSON.stringify({ success: true, message: 'Código enviado com sucesso' }), {
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
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (codeError || !codeData) {
        return new Response(JSON.stringify({ error: 'Código inválido ou expirado' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Mark as used
      await supabaseAdmin
        .from('auth_verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codeData.id)

      // Confirm user
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError
      
      const user = users.find(u => u.email === email)
      if (user) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email_confirm: true
        })
        if (updateError) throw updateError
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
