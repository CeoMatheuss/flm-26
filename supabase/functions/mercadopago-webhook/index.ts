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

      if (paymentData.status === 'approved' || paymentData.status === 'paid') {
        const orderId = paymentData.external_reference
        
        console.log(`[PAGAMENTO CONFIRMADO] Payment ID: ${id}, Order ID: ${orderId}`)

        // 1. Get order details and ensure it exists
        const { data: orderData, error: orderFetchError } = await supabaseAdmin
          .from('payment_orders')
          .select('user_id, metadata, item_id, delivered, status')
          .eq('id', orderId)
          .single();

        if (orderFetchError || !orderData) {
          console.error(`Order ${orderId} not found for payment ${id}`);
          throw new Error(`Order ${orderId} not found`);
        }

        // 2. Anti-duplication check: if already delivered, just stop
        if (orderData.delivered) {
          console.log(`[DUPLICIDADE EVITADA] Order ${orderId} already delivered.`);
          return new Response(JSON.stringify({ received: true, already_processed: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        // 3. Update order status to 'approved' if not already
        if (orderData.status !== 'approved' && orderData.status !== 'paid') {
          await supabaseAdmin.from('payment_orders').update({
            status: 'approved',
            payment_id: id.toString(),
            updated_at: new Date().toISOString()
          }).eq('id', orderId);
        }

        // 4. Deliver product via database RPC (ConfirmPaymentAndReleaseProduct Logic)
        console.log(`[LIBERANDO PRODUTO] Order ID: ${orderId}`);
        const { data: deliverResult, error: rpcError } = await supabaseAdmin.rpc('deliver_shop_item', { 
          p_order_id: orderId 
        });
        
        if (rpcError) {
          console.error(`[FALHA NA LIBERAÇÃO] Error for order ${orderId}:`, rpcError);
          // Don't throw here so we can still notify about payment if needed
        } else {
          console.log(`[PRODUTO LIBERADO] Result for order ${orderId}:`, deliverResult);

          // 4.5 ATIVAR/RENOVAR PREMIUM: qualquer compra aprovada concede 30 dias (reset)
          try {
            const { error: premiumError } = await supabaseAdmin
              .from('premium_users')
              .upsert({
                user_id: orderData.user_id,
                activated_at: new Date().toISOString(),
                status: 'active',
                pix_transaction_id: id.toString(),
              }, { onConflict: 'user_id' });
            if (premiumError) {
              console.error('[PREMIUM] Falha ao ativar/renovar:', premiumError);
            } else {
              console.log(`[PREMIUM ATIVADO] user_id=${orderData.user_id} reset 30 dias`);
              await supabaseAdmin.from('user_notifications').insert({
                user_id: orderData.user_id,
                type: 'success',
                category: 'Premium',
                priority: 'ultra',
                title: 'Premium Ativado!',
                message: 'Sua conta Premium foi ativada/renovada por 30 dias. Aproveite todos os benefícios!',
                icon: '👑',
                data: { source: 'auto_purchase', order_id: orderId }
              });
            }
          } catch (e) {
            console.error('[PREMIUM] Exceção ao ativar:', e);
          }

          // 4.6 DESBLOQUEIO DE UNIFORMES: se o item comprado é de uniforme, liberar uniformsUnlocked
          try {
            const itemName = (orderData.metadata?.item_name || '').toString().toLowerCase();
            const itemId = (orderData.item_id || '').toString().toLowerCase();
            const isUniformItem = itemName.includes('uniform') || itemId.includes('uniform');
            if (isUniformItem) {
              const { data: saveRow } = await supabaseAdmin
                .from('game_saves')
                .select('id, club_data')
                .eq('user_id', orderData.user_id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (saveRow) {
                const clubData = (saveRow.club_data || {}) as Record<string, any>;
                const clubProfile = { ...(clubData.clubProfile || {}) };
                clubProfile.uniformsUnlocked = true;
                clubData.clubProfile = clubProfile;
                await supabaseAdmin
                  .from('game_saves')
                  .update({ club_data: clubData, updated_at: new Date().toISOString() })
                  .eq('id', saveRow.id);
                console.log(`[UNIFORMS] Desbloqueado para user_id=${orderData.user_id}`);
              }
            }
          } catch (e) {
            console.error('[UNIFORMS] Exceção ao desbloquear:', e);
          }

          // 5. Notify user about payment and release in Real-Time
          if (orderData) {
            // First notification: Payment received
            await supabaseAdmin.from('user_notifications').insert({
              user_id: orderData.user_id,
              type: 'success',
              category: 'Financeiro',
              priority: 'high',
              title: 'Pagamento Confirmado',
              message: `Recebemos seu pagamento para "${orderData.metadata?.item_name || 'Item'}".`,
              icon: '✅',
              data: { order_id: orderId, payment_id: id, status: 'PAID' }
            });

            // Second notification: Product delivered
            await supabaseAdmin.from('user_notifications').insert({
              user_id: orderData.user_id,
              type: 'success',
              category: 'Clube',
              priority: 'ultra',
              title: 'Acesso Liberado!',
              message: `Seu item "${orderData.metadata?.item_name || 'Premium'}" foi liberado automaticamente.`,
              icon: '🚀',
              data: { order_id: orderId, item_id: orderData.item_id, delivered: true }
            });
          }
        }
      } else {
        // Update status for non-approved payments (pending, rejected, etc)
        console.log(`[STATUS ATUALIZADO] Payment ${id} status: ${paymentData.status}`);
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
