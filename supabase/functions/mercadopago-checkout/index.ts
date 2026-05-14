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

    const { item_id, payment_method_id, token, installments, issuer_id, email } = await req.json()

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
        metadata: { checkout_type: token ? 'transparent' : 'preference' }
      })
      .select()
      .single()

    if (orderError) throw orderError

    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!mpAccessToken) throw new Error('Mercado Pago API key missing')

    if (token) {
      // Transparent Checkout (Checkout API)
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': order.id
        },
        body: JSON.stringify({
          transaction_amount: item.price_cents / 100,
          token,
          description: item.name,
          installments: Number(installments),
          payment_method_id,
          issuer_id,
          payer: {
            email: email || user.email,
          },
          external_reference: order.id,
          notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
        })
      })

      const mpData = await mpResponse.json()
      
      if (mpData.status === 'approved') {
        // Update order status
        await supabaseClient.from('payment_orders').update({ 
          status: 'approved',
          payment_id: mpData.id.toString() 
        }).eq('id', order.id)
        
        // Deliver item
        await supabaseClient.rpc('deliver_shop_item', { p_order_id: order.id })
      } else {
        await supabaseClient.from('payment_orders').update({ 
          status: mpData.status || 'rejected',
          payment_id: mpData.id?.toString()
        }).eq('id', order.id)
      }

      return new Response(JSON.stringify(mpData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else {
      // Preference (Checkout Pro)
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
          external_reference: order.id,
          notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
          back_urls: {
            success: `${req.headers.get('origin')}/shop?status=success`,
            failure: `${req.headers.get('origin')}/shop?status=failure`,
            pending: `${req.headers.get('origin')}/shop?status=pending`
          },
          auto_return: 'approved'
        })
      })

      const mpData = await mpResponse.json()
      return new Response(JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
