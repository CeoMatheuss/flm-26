import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { item_id, method, email, full_name, cpf } = await req.json()

    // Get item details
    const { data: item, error: itemError } = await supabaseAdmin
      .from('shop_items')
      .select('*')
      .eq('id', item_id)
      .single()

    if (itemError || !item) throw new Error('Item not found')

    // Create payment order (using admin client to bypass RLS)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('payment_orders')
      .insert({
        user_id: user.id,
        item_id: item.id,
        amount_cents: item.price_cents,
        status: 'pending',
        metadata: { checkout_type: method === 'pix' ? 'pix_native' : 'preference', email: email || user.email, full_name, cpf }
      })
      .select()
      .single()

    if (orderError) throw orderError

    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!mpAccessToken) throw new Error('Mercado Pago API key missing')

    if (method === 'pix') {
      // Generate PIX Payment via Mercado Pago API
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': order.id
        },
        body: JSON.stringify({
          transaction_amount: item.price_cents / 100,
          description: `FLM 26: ${item.name}`,
          payment_method_id: 'pix',
          payer: {
            email: email || user.email,
            first_name: full_name?.split(' ')[0] || user.user_metadata?.display_name?.split(' ')[0] || 'Jogador',
            last_name: full_name?.split(' ').slice(1).join(' ') || user.user_metadata?.display_name?.split(' ').slice(1).join(' ') || 'FLM',
            identification: cpf ? {
              type: 'CPF',
              number: cpf
            } : undefined
          },

          external_reference: order.id,
          notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
        })
      })

      const mpData = await mpResponse.json()
      
      if (!mpResponse.ok) {
        console.error('MP Error:', mpData)
        throw new Error(mpData.message || 'Error generating PIX')
      }

      return new Response(JSON.stringify({ 
        order_id: order.id,
        payment_id: mpData.id,
        pix_qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        pix_qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        status: mpData.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      // Preference (Checkout Pro) for Credit Card
      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            title: item.name,
            quantity: 1,
            unit_price: item.price_cents / 100,
            currency_id: 'BRL'
          }],
          payer: {
            email: email || user.email,
            name: full_name?.split(' ')[0] || 'Jogador',
            surname: full_name?.split(' ').slice(1).join(' ') || 'FLM',
            identification: cpf ? {
              type: 'CPF',
              number: cpf
            } : undefined
          },

          payment_methods: {
            excluded_payment_methods: [{ id: "pix" }], // Pix is handled natively
            excluded_payment_types: [{ id: "ticket" }], // No boleto
            installments: 12
          },
          external_reference: order.id,
          notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
          back_urls: {
            success: `https://flm26.lovable.app`,
            failure: `https://flm26.lovable.app`,
            pending: `https://flm26.lovable.app`
          },
          auto_return: 'approved'

        })
      })

      const mpData = await mpResponse.json()
      return new Response(JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id, order_id: order.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
