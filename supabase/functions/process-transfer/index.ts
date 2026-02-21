import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { action } = body;

    // ═══════════════════════════════════════════════════════════════
    // ACTION: LIST PLAYER FOR SALE
    // ═══════════════════════════════════════════════════════════════
    if (action === 'list') {
      const { playerData, playerName, playerPosition, playerOverall, playerAge, askingPrice, clubName, leagueId } = body;

      // Validate inputs
      if (!playerName || typeof playerName !== 'string' || playerName.length > 100) {
        return new Response(JSON.stringify({ error: 'Nome do jogador inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!playerData || typeof playerData !== 'object') {
        return new Response(JSON.stringify({ error: 'Dados do jogador inválidos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (typeof askingPrice !== 'number' || askingPrice < 0 || askingPrice > 999999999) {
        return new Response(JSON.stringify({ error: 'Preço inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (typeof playerOverall !== 'number' || playerOverall < 1 || playerOverall > 99) {
        return new Response(JSON.stringify({ error: 'Overall inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check cooldown: same player can't be listed again within 24h
      const { data: recentListings } = await adminClient
        .from('transfer_listings')
        .select('id, cooldown_until')
        .eq('seller_id', userId)
        .eq('player_name', playerName)
        .eq('status', 'sold')
        .order('sold_at', { ascending: false })
        .limit(1);

      if (recentListings && recentListings.length > 0) {
        const cooldown = recentListings[0].cooldown_until;
        if (cooldown && new Date(cooldown) > new Date()) {
          return new Response(JSON.stringify({ error: 'Jogador em período de cooldown. Aguarde antes de listar novamente.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Check max simultaneous listings per user (limit 5)
      const { count: activeCount } = await adminClient
        .from('transfer_listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .eq('status', 'active');

      if ((activeCount ?? 0) >= 5) {
        return new Response(JSON.stringify({ error: 'Limite de 5 jogadores listados simultaneamente.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Count total transfers for this player
      const { count: transferCount } = await adminClient
        .from('transfer_log')
        .select('id', { count: 'exact', head: true })
        .eq('player_name', playerName);

      const { data: listing, error: listError } = await adminClient
        .from('transfer_listings')
        .insert({
          seller_id: userId,
          seller_club_name: (clubName || '').slice(0, 50),
          league_id: leagueId || null,
          player_data: playerData,
          player_name: playerName.slice(0, 100),
          player_position: (playerPosition || 'MEI').slice(0, 3),
          player_overall: Math.min(99, Math.max(1, playerOverall)),
          player_age: Math.min(45, Math.max(15, playerAge)),
          asking_price: askingPrice,
          transfer_count: transferCount ?? 0,
        })
        .select()
        .single();

      if (listError) {
        return new Response(JSON.stringify({ error: 'Erro ao listar jogador: ' + listError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, listing }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: MAKE OFFER
    // ═══════════════════════════════════════════════════════════════
    if (action === 'offer') {
      const { listingId, offeredPrice, offeredSalary, contractYears, bonusGoals, bonusAssists, bonusGames, bonusTitles, signingBonus, clubName } = body;

      if (!listingId || typeof listingId !== 'string') {
        return new Response(JSON.stringify({ error: 'Listing ID inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (typeof offeredPrice !== 'number' || offeredPrice < 0) {
        return new Response(JSON.stringify({ error: 'Preço inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Verify listing exists and is active
      const { data: listing } = await adminClient
        .from('transfer_listings')
        .select('*')
        .eq('id', listingId)
        .eq('status', 'active')
        .single();

      if (!listing) {
        return new Response(JSON.stringify({ error: 'Listagem não encontrada ou já encerrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (listing.seller_id === userId) {
        return new Response(JSON.stringify({ error: 'Você não pode fazer proposta no seu próprio jogador' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check max pending offers per user (limit 10)
      const { count: pendingOffers } = await adminClient
        .from('transfer_offers')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', userId)
        .eq('status', 'pending');

      if ((pendingOffers ?? 0) >= 10) {
        return new Response(JSON.stringify({ error: 'Limite de 10 propostas pendentes atingido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Anti-abuse: check for excessive offers between same users
      const { count: pairCount } = await adminClient
        .from('transfer_log')
        .select('id', { count: 'exact', head: true })
        .or(`and(from_user_id.eq.${userId},to_user_id.eq.${listing.seller_id}),and(from_user_id.eq.${listing.seller_id},to_user_id.eq.${userId})`)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());

      if ((pairCount ?? 0) >= 5) {
        // Generate abuse alert
        await adminClient.from('abuse_alerts').insert({
          user_id: userId,
          alert_type: 'excessive_transfers',
          severity: 'high',
          title: 'Transferências excessivas entre mesmos clubes',
          description: `Usuário ${userId} tem ${pairCount} transferências com ${listing.seller_id} nos últimos 7 dias.`,
          details: { buyer_id: userId, seller_id: listing.seller_id, count: pairCount },
        });

        return new Response(JSON.stringify({ error: 'Muitas negociações com o mesmo clube recentemente. Aguarde alguns dias.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Anti-abuse: check if price is unreasonably high (>5x asking price)
      if (offeredPrice > listing.asking_price * 5) {
        await adminClient.from('abuse_alerts').insert({
          user_id: userId,
          alert_type: 'suspicious_price',
          severity: 'medium',
          title: 'Preço de transferência suspeito',
          description: `Oferta de R$${offeredPrice} é 5x maior que o preço pedido R$${listing.asking_price}.`,
          details: { listing_id: listingId, offered_price: offeredPrice, asking_price: listing.asking_price },
        });
      }

      const { data: offer, error: offerError } = await adminClient
        .from('transfer_offers')
        .insert({
          listing_id: listingId,
          buyer_id: userId,
          buyer_club_name: (clubName || '').slice(0, 50),
          offered_price: Math.max(0, offeredPrice),
          offered_salary: Math.max(0, offeredSalary || 0),
          offered_contract_years: Math.min(5, Math.max(1, contractYears || 2)),
          bonus_goals: Math.max(0, bonusGoals || 0),
          bonus_assists: Math.max(0, bonusAssists || 0),
          bonus_games: Math.max(0, bonusGames || 0),
          bonus_titles: Math.max(0, bonusTitles || 0),
          signing_bonus: Math.max(0, signingBonus || 0),
        })
        .select()
        .single();

      if (offerError) {
        return new Response(JSON.stringify({ error: 'Erro ao enviar proposta: ' + offerError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, offer }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: RESPOND TO OFFER (accept/reject/counter)
    // ═══════════════════════════════════════════════════════════════
    if (action === 'respond') {
      const { offerId, response, rejectionReason } = body;

      if (!offerId || !['accepted', 'rejected'].includes(response)) {
        return new Response(JSON.stringify({ error: 'Parâmetros inválidos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get offer with listing
      const { data: offer } = await adminClient
        .from('transfer_offers')
        .select('*, transfer_listings!inner(*)')
        .eq('id', offerId)
        .single();

      if (!offer) {
        return new Response(JSON.stringify({ error: 'Proposta não encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const listing = (offer as any).transfer_listings;

      // Only seller can respond
      if (listing.seller_id !== userId) {
        return new Response(JSON.stringify({ error: 'Apenas o vendedor pode responder propostas' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (offer.status !== 'pending') {
        return new Response(JSON.stringify({ error: 'Proposta já respondida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (response === 'rejected') {
        await adminClient.from('transfer_offers').update({
          status: 'rejected',
          rejection_reason: (rejectionReason || 'Recusada pelo clube').slice(0, 200),
          responded_at: new Date().toISOString(),
        }).eq('id', offerId);

        return new Response(JSON.stringify({ success: true, message: 'Proposta recusada.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ACCEPT: Player decision based on personality & salary
      const playerData = listing.player_data;
      const currentSalary = playerData?.salary || 500;
      const offeredSalary = offer.offered_salary || 0;
      const signingBonus = offer.signing_bonus || 0;
      const totalBonus = (offer.bonus_goals || 0) + (offer.bonus_assists || 0) + (offer.bonus_games || 0) + (offer.bonus_titles || 0);

      // Player acceptance logic
      let acceptChance = 0.5; // base 50%

      // Salary comparison
      if (offeredSalary >= currentSalary * 1.5) acceptChance += 0.3;
      else if (offeredSalary >= currentSalary) acceptChance += 0.15;
      else if (offeredSalary >= currentSalary * 0.8) acceptChance += 0.0; // neutral
      else acceptChance -= 0.2; // below current salary

      // Signing bonus helps
      if (signingBonus > 0) acceptChance += Math.min(0.15, signingBonus / 1000000 * 0.05);

      // Performance bonuses help
      if (totalBonus > 0) acceptChance += Math.min(0.1, totalBonus / 500000 * 0.02);

      // Personality effects
      const personality = playerData?.personality || 'calmo';
      if (personality === 'ambicioso') acceptChance += (offeredSalary > currentSalary ? 0.1 : -0.15);
      if (personality === 'leal') acceptChance -= 0.15; // harder to leave
      if (personality === 'dedicado') acceptChance += 0.05;

      // Contract length: players prefer 2-3 years
      const years = offer.offered_contract_years || 2;
      if (years >= 2 && years <= 3) acceptChance += 0.05;
      if (years >= 4) acceptChance -= 0.05;

      acceptChance = Math.max(0.1, Math.min(0.95, acceptChance));

      const playerAccepts = Math.random() < acceptChance;

      if (!playerAccepts) {
        // Player rejected - provide reason
        let reason = 'O jogador recusou a proposta.';
        if (offeredSalary < currentSalary) reason = `Jogador recusou: salário oferecido (R$${offeredSalary}) é inferior ao atual (R$${currentSalary}).`;
        else if (personality === 'leal') reason = 'Jogador recusou: é leal ao clube atual e prefere ficar.';
        else if (personality === 'ambicioso' && offeredSalary <= currentSalary) reason = 'Jogador recusou: ambicioso, espera um salário maior.';
        else reason = 'Jogador recusou: não se interessou pela proposta.';

        await adminClient.from('transfer_offers').update({
          status: 'player_rejected',
          rejection_reason: reason,
          responded_at: new Date().toISOString(),
        }).eq('id', offerId);

        return new Response(JSON.stringify({ success: true, playerAccepted: false, reason }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Player accepted! Complete the transfer
      const now = new Date();
      const cooldownUntil = new Date(now.getTime() + 72 * 3600 * 1000); // 72h cooldown

      // Update offer
      await adminClient.from('transfer_offers').update({
        status: 'accepted',
        responded_at: now.toISOString(),
      }).eq('id', offerId);

      // Update listing
      await adminClient.from('transfer_listings').update({
        status: 'sold',
        buyer_id: offer.buyer_id,
        buyer_club_name: offer.buyer_club_name,
        sold_at: now.toISOString(),
        cooldown_until: cooldownUntil.toISOString(),
      }).eq('id', listing.id);

      // Reject all other pending offers
      await adminClient.from('transfer_offers').update({
        status: 'rejected',
        rejection_reason: 'Jogador já foi vendido para outro clube.',
        responded_at: now.toISOString(),
      }).eq('listing_id', listing.id).eq('status', 'pending').neq('id', offerId);

      // Log the transfer
      await adminClient.from('transfer_log').insert({
        player_name: listing.player_name,
        player_overall: listing.player_overall,
        from_user_id: listing.seller_id,
        to_user_id: offer.buyer_id,
        from_club_name: listing.seller_club_name,
        to_club_name: offer.buyer_club_name,
        price: offer.offered_price,
        salary: offer.offered_salary,
        transfer_type: 'sale',
      });

      // Check for fominha behavior: high goal bonus makes player selfish
      const fominhaRisk = (offer.bonus_goals || 0) > 50000 ? 0.3 : (offer.bonus_goals || 0) > 20000 ? 0.15 : 0;

      return new Response(JSON.stringify({
        success: true,
        playerAccepted: true,
        fominhaRisk,
        message: `Transferência concluída! ${listing.player_name} foi vendido para ${offer.buyer_club_name} por R$${offer.offered_price}.`,
        transfer: {
          playerData: listing.player_data,
          playerName: listing.player_name,
          price: offer.offered_price,
          salary: offer.offered_salary,
          contractYears: offer.offered_contract_years,
          bonuses: {
            goals: offer.bonus_goals,
            assists: offer.bonus_assists,
            games: offer.bonus_games,
            titles: offer.bonus_titles,
            signing: offer.signing_bonus,
          },
        },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: DELIST (cancel listing)
    // ═══════════════════════════════════════════════════════════════
    if (action === 'delist') {
      const { listingId } = body;

      const { data: listing } = await adminClient
        .from('transfer_listings')
        .select('seller_id')
        .eq('id', listingId)
        .single();

      if (!listing || listing.seller_id !== userId) {
        return new Response(JSON.stringify({ error: 'Listagem não encontrada ou sem permissão' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Reject all pending offers
      await adminClient.from('transfer_offers').update({
        status: 'rejected',
        rejection_reason: 'Jogador retirado do mercado.',
        responded_at: new Date().toISOString(),
      }).eq('listing_id', listingId).eq('status', 'pending');

      await adminClient.from('transfer_listings').update({
        status: 'cancelled',
      }).eq('id', listingId);

      return new Response(JSON.stringify({ success: true, message: 'Jogador retirado do mercado.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Ação desconhecida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('process-transfer error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
