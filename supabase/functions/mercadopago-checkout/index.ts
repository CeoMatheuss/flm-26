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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { item_id } = await req.json()

    // Get item details
    const { data: item, error: itemError } = await supabaseClient
      .from('shop_items')
      .select('*')
      .eq('id', item_id)
      .single()

    if (itemError || !item) throw new Error('Item not found')

    // Create payment order
    const { data: order, error: orderError } = await supabaseClient
      .from('payment_orders')
      .insert({
        user_id: user.id,
        item_id: item.id,
        amount_cents: item.price_cents,
        status: 'pending',
        metadata: { checkout_type: 'pix_native' }
      })
      .select()
      .single()

    if (orderError) throw orderError

    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!mpAccessToken) throw new Error('Mercado Pago API key missing')

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
          email: user.email,
          first_name: user.user_metadata?.display_name?.split(' ')[0] || 'Jogador',
          last_name: user.user_metadata?.display_name?.split(' ').slice(1).join(' ') || 'FLM'
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

    // Return the PIX data to the frontend
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

  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
