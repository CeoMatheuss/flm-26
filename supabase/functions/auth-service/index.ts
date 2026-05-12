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
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;700;900&display=swap');
    
    body {
      background-color: #050507;
      color: #ffffff;
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #0a0a0c;
      border: 1px solid #1f1f23;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 30px 60px rgba(0,0,0,0.8);
    }
    .header-banner {
      height: 320px;
      background: linear-gradient(to bottom, rgba(5,5,7,0.1) 0%, rgba(10,10,12,1) 100%), url('${bannerUrl}');
      background-size: cover;
      background-position: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 20px;
      border-bottom: 2px solid #1f1f23;
    }
    .logo-link {
      text-decoration: none;
      transition: transform 0.3s ease;
      display: block;
    }
    .logo-link:hover {
      transform: scale(1.05);
    }
    .logo-container {
      padding: 20px;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 1px solid rgba(0,242,255,0.3);
      box-shadow: 0 0 30px rgba(0,242,255,0.2);
    }
    .logo-text {
      font-family: 'Orbitron', sans-serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 6px;
      color: #ffffff;
      text-transform: uppercase;
      margin-bottom: 5px;
      opacity: 0.8;
    }
    .logo-main {
      font-family: 'Orbitron', sans-serif;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -1px;
      color: #ffffff;
      text-transform: uppercase;
      margin: 0;
    }
    .logo-main span {
      color: #00f2ff;
      text-shadow: 0 0 20px rgba(0,242,255,0.8);
    }
    .content {
      padding: 50px 40px;
      text-align: center;
      background: linear-gradient(180deg, #0a0a0c 0%, #050507 100%);
    }
    .main-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 24px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 15px;
      letter-spacing: 1px;
      color: #ffffff;
    }
    .description {
      font-size: 15px;
      color: #8a8a90;
      line-height: 1.6;
      margin-bottom: 45px;
      max-width: 450px;
      margin-left: auto;
      margin-right: auto;
    }
    .code-display {
      background: #0f0f13;
      border: 2px solid #1f1f23;
      border-radius: 24px;
      padding: 60px 20px;
      margin: 40px 0;
      position: relative;
      overflow: hidden;
    }
    .code-accent {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, #00f2ff, #7b1fa2);
      box-shadow: 0 0 15px rgba(0,242,255,0.5);
    }
    .code-text {
      font-family: 'Orbitron', sans-serif;
      font-size: 72px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 18px;
      margin: 0;
      text-shadow: 0 0 30px rgba(0,242,255,0.4);
    }
    .call-to-action {
      font-size: 13px;
      color: #00f2ff;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 25px;
      text-shadow: 0 0 10px rgba(0,242,255,0.3);
    }
    .footer {
      background: #050507;
      padding: 50px 20px;
      text-align: center;
      border-top: 1px solid #1a1a20;
    }
    .social-btn {
      display: inline-block;
      padding: 10px 20px;
      background: #0f0f13;
      border: 1px solid #1f1f23;
      color: #ffffff;
      text-decoration: none;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      margin: 0 8px;
      border-radius: 8px;
      letter-spacing: 1px;
      transition: all 0.3s;
    }
    .neon-glow-line {
      height: 1px;
      background: linear-gradient(90deg, transparent, #1f1f23, #00f2ff, #1f1f23, transparent);
      width: 100%;
      margin: 30px 0;
    }
    .copyright {
      font-size: 10px;
      color: #404045;
      text-transform: uppercase;
      letter-spacing: 2px;
      line-height: 2;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-banner">
      <a href="https://www.instagram.com/footballlifemanager26/" class="logo-link">
        <div class="logo-container">
          <div class="logo-text">FOOTBALL</div>
          <div class="logo-main">LIFE <span>MANAGER</span></div>
        </div>
      </a>
    </div>
    
    <div class="content">
      <h1 class="main-title">${title}</h1>
      <p class="description">${subtitle}</p>
      
      <div class="code-display">
        <div class="code-accent"></div>
        <p class="code-text">${mainContent}</p>
        <div class="call-to-action">CÓDIGO DE ACESSO EXCLUSIVO</div>
      </div>
      
      <p style="font-size: 14px; color: #ffffff; font-weight: 400; opacity: 0.8; margin-top: 40px;">
        Digite este código dentro do Football Life Manager para acessar sua conta.
      </p>
      
      <p style="margin-top: 30px; font-size: 11px; color: #505058; line-height: 1.6; font-style: italic;">
        ${footerText}
      </p>
    </div>
    
    <div class="footer">
      <div class="socials">
        <a href="https://www.instagram.com/footballlifemanager26/" class="social-btn">Instagram</a>
        <a href="#" class="social-btn">Discord</a>
        <a href="#" class="social-btn">Suporte</a>
      </div>
      <div class="neon-glow-line"></div>
      <p class="copyright">
        © 2026 FOOTBALL LIFE MANAGER. TODOS OS DIREITOS RESERVADOS.<br>
        SISTEMA DE SEGURANÇA AVANÇADO FLM.
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

      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'Football Life Manager <onboarding@resend.dev>',
            to: [email],
            subject: `CÓDIGO DE ACESSO: ${verificationCode} | FLM`,
            html: PREMIUM_EMAIL_TEMPLATE(
              'Bem-vindo ao Football Life Manager',
              'Sua jornada no futebol começa agora. Monte seu elenco, dispute títulos e construa sua história.',
              verificationCode,
              'Este código expira em 10 minutos por motivos de segurança.'
            ),
          }),
        })
      }

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
              from: 'Football Life Manager <onboarding@resend.dev>',
              to: [user.email],
              subject: 'BEM-VINDO AO CAMPO, MANAGER | FOOTBALL LIFE MANAGER',
              html: PREMIUM_EMAIL_TEMPLATE(
                'Bem-vindo ao Football Life Manager',
                'Sua jornada no futebol começa agora. Monte seu elenco, dispute títulos e construa sua história.',
                Math.floor(100000 + Math.random() * 900000).toString(),
                'Digite este código dentro do Football Life Manager para acessar sua conta.',
                'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200'
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
