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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const topic = url.searchParams.get('topic') || url.searchParams.get('type')
    const id = url.searchParams.get('id') || url.searchParams.get('data.id')

    console.log(`Webhook received: Topic=${topic}, ID=${id}`)

    // Log the raw webhook
    const body = await req.json()
    await supabaseAdmin.from('payment_webhooks_logs').insert({
      topic,
      external_id: id,
      raw_data: body
    })

    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')

    if (topic === 'payment' || body.type === 'payment') {
      const paymentId = id || body.data?.id
      
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` }
      })
      const paymentData = await mpResponse.json()

      if (paymentData.status === 'approved') {
        const orderId = paymentData.external_reference
        
        // Update order
        await supabaseAdmin.from('payment_orders').update({
          status: 'approved',
          payment_id: paymentId.toString(),
          updated_at: new Date().toISOString()
        }).eq('id', orderId)

        // Deliver item via RPC
        const { data, error: rpcError } = await supabaseAdmin.rpc('deliver_shop_item', { p_order_id: orderId })
        
        if (rpcError) {
          console.error(`Error delivering item for order ${orderId}:`, rpcError)
        } else {
          console.log(`Item delivered successfully for order ${orderId}:`, data)
        }
      } else {
        // Update status for non-approved
        await supabaseAdmin.from('payment_orders').update({
          status: paymentData.status,
          payment_id: paymentId.toString(),
          updated_at: new Date().toISOString()
        }).eq('id', paymentData.external_reference)
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
