import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as crypto from "https://deno.land/std@0.177.0/node/crypto.ts"

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

    // 1. Mandatory WEBHOOK_SECRET Validation
    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')
    const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET')

    if (!webhookSecret) {
      console.error('MERCADO_PAGO_WEBHOOK_SECRET is not configured')
      throw new Error('Server configuration error')
    }

    if (!xSignature || !xRequestId) {
      console.error('Missing Mercado Pago signature headers')
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 401, headers: corsHeaders })
    }

    // Capture raw body for signature verification
    const rawBody = await req.text()
    const url = new URL(req.url)
    const dataId = url.searchParams.get('data.id') || url.searchParams.get('id')

    // Mercado Pago Signature Verification V2
    // Manifest: x-signature: ts=...,v1=...
    const parts = xSignature.split(',')
    const tsPart = parts.find(p => p.startsWith('ts='))?.split('=')[1]
    const v1Part = parts.find(p => p.startsWith('v1='))?.split('=')[1]

    if (!tsPart || !v1Part) {
      console.error('Invalid signature format')
      return new Response(JSON.stringify({ error: 'Invalid signature format' }), { status: 401, headers: corsHeaders })
    }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${tsPart};`
    const hmac = crypto.createHmac('sha256', webhookSecret)
    hmac.update(manifest)
    const sha = hmac.digest('hex')

    if (sha !== v1Part) {
      console.error('Signature mismatch')
      return new Response(JSON.stringify({ error: 'Signature mismatch' }), { status: 401, headers: corsHeaders })
    }

    // 2. Process validated webhook
    const body = JSON.parse(rawBody)
    const topic = body.type || body.topic
    const id = body.data?.id || body.id

    console.log(`Validated Webhook received: Topic=${topic}, ID=${id}`)

    // Log the validated webhook
    await supabaseAdmin.from('payment_webhooks_logs').insert({
      topic,
      resource_id: id,
      payload: body
    })

    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')

    if (topic === 'payment') {
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` }
      })
      const paymentData = await mpResponse.json()

      if (paymentData.status === 'approved') {
        const orderId = paymentData.external_reference
        
        // Get order details to get user_id and item name
        const { data: orderData } = await supabaseAdmin
          .from('payment_orders')
          .select('user_id, metadata, item_id')
          .eq('id', orderId)
          .single();

        // Update order status first to ensure we don't process twice if delivery is slow
        await supabaseAdmin.from('payment_orders').update({
          status: 'approved',
          payment_id: id.toString(),
          updated_at: new Date().toISOString()
        }).eq('id', orderId)

        if (orderData) {
          // Notify payment approval
          await supabaseAdmin.from('user_notifications').insert({
            user_id: orderData.user_id,
            type: 'success',
            category: 'Financeiro',
            priority: 'high',
            title: 'Pagamento Confirmado',
            message: `Recebemos seu pagamento para "${orderData.metadata?.item_name || 'Item'}".`,
            icon: '✅',
            data: { order_id: orderId, payment_id: id }
          });
        }

        // Deliver item via RPC
        const { data: deliverData, error: rpcError } = await supabaseAdmin.rpc('deliver_shop_item', { p_order_id: orderId })
        
        if (rpcError) {
          console.error(`Error delivering item for order ${orderId}:`, rpcError)
        } else {
          console.log(`Item delivered successfully for order ${orderId}:`, deliverData)
          if (orderData) {
            // Notify item release
            await supabaseAdmin.from('user_notifications').insert({
              user_id: orderData.user_id,
              type: 'success',
              category: 'Clube',
              priority: 'ultra',
              title: 'Benefícios Liberados!',
              message: `Seu item "${orderData.metadata?.item_name || 'Premium'}" já está ativo no seu clube.`,
              icon: '🚀',
              data: { order_id: orderId, item_id: orderData.item_id }
            });
          }
        }
      } else {
        // Update status for non-approved
        await supabaseAdmin.from('payment_orders').update({
          status: paymentData.status,
          payment_id: id.toString(),
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
