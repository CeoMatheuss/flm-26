import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PREMIUM_EMAIL_TEMPLATE = (title: string, subtitle: string, mainContent: string, footerText: string = '', bannerUrl: string = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200') => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background-color: #050507;
      color: #ffffff;
      font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #0a0a0c;
      border: 1px solid #1f1f23;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .banner {
      height: 240px;
      background: linear-gradient(to bottom, rgba(5,5,7,0.2), rgba(10,10,12,1)), url('${bannerUrl}');
      background-size: cover;
      background-position: center;
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 20px;
    }
    .logo-container {
      text-align: center;
      padding: 30px 20px 10px;
    }
    .logo {
      font-size: 38px;
      font-weight: 900;
      font-style: italic;
      text-transform: uppercase;
      letter-spacing: -2px;
      margin: 0;
      color: #ffffff;
    }
    .logo span { 
      color: #00f2ff; 
      text-shadow: 0 0 15px rgba(0,242,255,0.6); 
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 5px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      margin-top: 5px;
    }
    .content {
      padding: 40px;
      text-align: center;
    }
    .title {
      font-size: 28px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 15px;
      letter-spacing: 1px;
      color: #ffffff;
      font-style: italic;
    }
    .subtitle {
      color: #a0a0a8;
      font-size: 16px;
      margin-bottom: 35px;
      line-height: 1.6;
      font-weight: 400;
    }
    .code-box {
      background: linear-gradient(135deg, rgba(0, 242, 255, 0.1) 0%, rgba(123, 31, 162, 0.1) 100%);
      border: 1px solid rgba(0, 242, 255, 0.3);
      border-radius: 20px;
      padding: 40px 20px;
      margin: 30px 0;
      box-shadow: 0 0 30px rgba(0,242,255,0.1);
      position: relative;
    }
    .code-label {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #00f2ff;
      margin-bottom: 15px;
    }
    .code-value {
      font-size: 56px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 12px;
      text-shadow: 0 0 20px rgba(0,242,255,0.4);
      margin: 0;
    }
    .button-container {
      margin-top: 40px;
    }
    .btn {
      display: inline-block;
      padding: 18px 45px;
      background: #00f2ff;
      color: #000000 !important;
      text-decoration: none;
      font-weight: 900;
      text-transform: uppercase;
      border-radius: 8px;
      font-size: 14px;
      letter-spacing: 1px;
      box-shadow: 0 0 25px rgba(0,242,255,0.4);
      transition: all 0.3s ease;
    }
    .footer {
      padding: 40px;
      background: #050507;
      text-align: center;
      border-top: 1px solid #1f1f23;
    }
    .social-links {
      margin-bottom: 25px;
    }
    .social-links a {
      color: #ffffff;
      text-decoration: none;
      margin: 0 15px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.6;
    }
    .footer-text {
      font-size: 11px;
      color: #505058;
      line-height: 1.8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .neon-line {
      height: 2px;
      background: linear-gradient(90deg, transparent, #00f2ff, transparent);
      width: 100%;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="banner"></div>
    <div class="logo-container">
      <h1 class="logo">FLM <span>26</span></h1>
      <div class="brand-subtitle">Football Legend Manager</div>
    </div>
    
    <div class="content">
      <h2 class="title">${title}</h2>
      <p class="subtitle">${subtitle}</p>
      
      <div class="code-box">
        <div class="code-label">Código de Acesso Premium</div>
        <div class="code-value">${mainContent}</div>
      </div>
      
      <div class="button-container">
        <a href="https://flm26.com.br" class="btn">Confirmar Conta</a>
      </div>
      
      <p style="margin-top: 40px; font-size: 12px; color: #505058; font-style: italic;">
        ${footerText}
      </p>
    </div>
    
    <div class="footer">
      <div class="social-links">
        <a href="#">Instagram</a>
        <a href="#">Discord</a>
        <a href="#">Suporte</a>
      </div>
      <div class="neon-line"></div>
      <p class="footer-text">
        © 2026 Football Legend Manager. Todos os direitos reservados.<br>
        Este é um e-mail automático do sistema AAA do FLM.
      </p>
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
            html: PREMIUM_EMAIL_TEMPLATE(
              'Bem-vindo ao Campo, Manager',
              'Sua carreira começa agora. Digite o código abaixo para validar sua conta e assumir o comando.',
              verificationCode,
              'Este código expira em 10 minutos por motivos de segurança.'
            ),
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

    if (action === 'broadcast-test') {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError

      const gmailUsers = users.filter(u => u.email?.toLowerCase() === 'fcmsistemas7@gmail.com')
      const resendKey = Deno.env.get('RESEND_API_KEY')
      
      if (!resendKey) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY não configurada no Supabase',
          emails: gmailUsers.map(u => u.email)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const results = await Promise.all(gmailUsers.map(async (user) => {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: 'FLM 26 <onboarding@resend.dev>',
              to: [user.email],
              subject: 'BEM-VINDO AO CAMPO, MANAGER | FLM 26',
              html: PREMIUM_EMAIL_TEMPLATE(
                'Bem-vindo ao Football Legend Manager',
                'Sua carreira como treinador começa agora. Monte seu elenco, dispute títulos e construa sua história no futebol.',
                '483921',
                'Digite este código dentro do FLM para confirmar sua conta e assumir o comando técnico.',
                'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200'
              ),
            }),
          })
          return { email: user.email, status: res.status }
        } catch (e) {
          return { email: user.email, error: e.message }
        }
      }))

      return new Response(JSON.stringify({ success: true, results }), {
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
