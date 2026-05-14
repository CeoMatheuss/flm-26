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

    const body = await req.json()
    console.log('Webhook received:', body)

    // Log webhook
    await supabaseClient.from('payment_webhooks_logs').insert({
      payload: body,
      topic: body.type || body.topic,
      resource_id: body.data?.id || body.resource
    })

    // Process payment
    if (body.type === 'payment' || body.topic === 'payment') {
      const paymentId = body.data?.id || body.resource
      
      const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
      })
      const paymentData = await response.json()

      if (paymentData.status === 'approved') {
        const external_reference = paymentData.external_reference
        
        // Find order
        const { data: order } = await supabaseClient
          .from('payment_orders')
          .select('*')
          .eq('external_reference', external_reference)
          .eq('status', 'pending')
          .single()

        if (order) {
          // Update order
          await supabaseClient.from('payment_orders').update({
            status: 'approved',
            payment_id: paymentId,
            updated_at: new Date().toISOString()
          }).eq('id', order.id)

          // Deliver item
          const { data: item } = await supabaseClient
            .from('shop_items')
            .select('*')
            .eq('id', order.item_id)
            .single()

          if (item) {
            // Check for existing inventory
            const { data: existing } = await supabaseClient
              .from('shop_inventory')
              .select('*')
              .eq('user_id', order.user_id)
              .eq('item_id', item.id)
              .maybeSingle()

            if (existing) {
              await supabaseClient.from('shop_inventory').update({
                quantity: existing.quantity + 1,
                updated_at: new Date().toISOString()
              }).eq('id', existing.id)
            } else {
              await supabaseClient.from('shop_inventory').insert({
                user_id: order.user_id,
                item_id: item.id,
                quantity: 1
              })
            }

            // Apply immediate bonuses (like coins)
            if (item.bonus_data?.coins) {
               const { data: club } = await supabaseClient.from('clubs').select('budget').eq('user_id', order.user_id).single()
               if (club) {
                 await supabaseClient.from('clubs').update({ budget: Number(club.budget) + Number(item.bonus_data.coins) }).eq('user_id', order.user_id)
               }
            }

            // Notify user
            await supabaseClient.from('user_notifications').insert({
              user_id: order.user_id,
              icon: '🎁',
              title: 'Compra Aprovada!',
              message: `Seu item ${item.name} já está disponível no seu inventário.`,
              type: 'success'
            })
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
