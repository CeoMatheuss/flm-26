import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { itemId, paymentMethod } = await req.json()
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (!user) throw new Error('Unauthorized')

    // Get item details
    const { data: item } = await supabaseClient
      .from('shop_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (!item) throw new Error('Item not found')

    const external_reference = crypto.randomUUID()

    // Create order in DB
    await supabaseClient.from('payment_orders').insert({
      user_id: user.id,
      external_reference,
      amount_cents: item.price_cents,
      item_id: itemId,
      status: 'pending',
      payment_method: paymentMethod
    })

    const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    
    // Create Preference or Payment depending on Transparent/Pro
    // For Checkout Transparente (API), we usually call /v1/payments directly from front or back
    // Here we'll return the necessary data for the frontend to initialize the payment
    
    return new Response(
      JSON.stringify({ 
        external_reference, 
        publicKey: Deno.env.get('MERCADO_PAGO_PUBLIC_KEY'),
        amount: item.price_cents / 100,
        itemName: item.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
