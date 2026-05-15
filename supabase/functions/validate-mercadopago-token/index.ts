import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    
    if (!mpAccessToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Test connection by fetching application info
    const response = await fetch('https://api.mercadopago.com/v1/applications/me', {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`
      }
    })

    const data = await response.json()

    if (response.ok) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Conexão estabelecida com sucesso!',
        app_name: data.name,
        user_id: data.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.message || 'Token inválido ou expirado.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
