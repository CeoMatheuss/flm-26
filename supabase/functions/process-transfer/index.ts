import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================
// Manchetes variadas + importância para o Diário do Futebol
// ============================================================
function fmtMoney(v?: number) {
  if (!v || v <= 0) return '';
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v}`;
}
function pickOne<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function newsImportance(opts: { overall?: number; value?: number; isInternational?: boolean }) {
  let level = 1;
  if ((opts.overall ?? 0) >= 78 || (opts.value ?? 0) >= 5_000_000) level = 2;
  if ((opts.overall ?? 0) >= 85 || (opts.value ?? 0) >= 20_000_000) level = 3;
  if (opts.isInternational) level = Math.min(3, level + 1);
  return level;
}
function buyNowHeadlines(p: { player: string; ovr?: number; from: string; to: string; money: string }) {
  return pickOne([
    `⚡ COMPRA IMEDIATA! ${p.to} fatura ${p.player} (OVR ${p.ovr}) junto ao ${p.from} por ${p.money}`,
    `⚡ Sem rodeios: ${p.to} ativa cláusula e leva ${p.player} (OVR ${p.ovr}) do ${p.from} por ${p.money}`,
    `⚡ ${p.player} é do ${p.to}! Operação relâmpago tira o jogador do ${p.from} por ${p.money}`,
    `⚡ ${p.from} aceita ${p.money} e libera ${p.player} para o ${p.to} em compra imediata`,
  ]);
}
function saleHeadlines(p: { player: string; pos?: string; ovr?: number; from: string; to: string; money: string }) {
  return pickOne([
    `✅ CONFIRMADO! ${p.player} (${p.pos}, OVR ${p.ovr}) é vendido pelo ${p.from} ao ${p.to} por ${p.money}`,
    `✍️ ${p.to} anuncia a contratação de ${p.player} (OVR ${p.ovr}) por ${p.money}`,
    `🤝 Negócio fechado: ${p.player} troca o ${p.from} pelo ${p.to} (${p.money})`,
    `🔥 ${p.player} deixa o ${p.from} rumo ao ${p.to} em acordo de ${p.money}`,
  ]);
}
function negotiationAcceptHeadlines(p: { player: string; ovr?: number; from: string; to: string; money: string }) {
  return pickOne([
    `🤝 ${p.from} aceitou proposta de ${p.money} do ${p.to} por ${p.player} (OVR ${p.ovr}). Jogador tem 7h para decidir.`,
    `📝 Mesa de negociação: ${p.from} dá sinal verde para ${p.money} do ${p.to} por ${p.player}. Faltam só palavras finais do atleta.`,
  ]);
}
function rejectionHeadlines(p: { player: string; ovr?: number; to: string }) {
  return pickOne([
    `❌ ${p.player} (OVR ${p.ovr}) recusou proposta do ${p.to}. Negociação frustrada.`,
    `🚫 Empresário travou: ${p.player} diz não ao ${p.to} e segue no clube atual.`,
  ]);
}

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
    // LIVE MATCH GUARD: bloqueia ações sensíveis durante partida ao vivo
    // ═══════════════════════════════════════════════════════════════
    const SENSITIVE_ACTIONS = new Set(['list', 'offer', 'accept', 'respond', 'buy', 'buy-now', 'cancel-listing', 'loan-list', 'loan-accept', 'loan-offer-create', 'loan-offer-accept']);
    if (SENSITIVE_ACTIONS.has(action)) {
      const { data: liveMatch } = await adminClient
        .from('live_matches')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'live')
        .lt('current_minute', 90)
        .maybeSingle();
      if (liveMatch) {
        return new Response(
          JSON.stringify({ error: '🔒 Ação indisponível durante a partida. Aguarde o fim do jogo.' }),
          { status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: LIST PLAYER FOR SALE
    // ═══════════════════════════════════════════════════════════════
    if (action === 'list') {
      const { playerData, playerName, playerPosition, playerOverall, playerAge, askingPrice, clubName, leagueId, sellerShield } = body;

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

      // Check if this specific player is already listed (active)
      const { data: existingPlayerListing } = await adminClient
        .from('transfer_listings')
        .select('id')
        .eq('seller_id', userId)
        .eq('status', 'active')
        .contains('player_data', { id: playerData.id })
        .maybeSingle();

      if (existingPlayerListing) {
        return new Response(JSON.stringify({ error: 'Este jogador já está anunciado no mercado.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
          seller_shield: sellerShield || null,
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
        console.error('list error:', listError.message);
        return new Response(JSON.stringify({ error: 'Erro ao listar jogador. Tente novamente.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
        console.error('offer error:', offerError.message);
        return new Response(JSON.stringify({ error: 'Erro ao enviar proposta. Tente novamente.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Notify the seller about the new offer
      await adminClient.from('user_notifications').insert({
        user_id: listing.seller_id,
        icon: '📩',
        title: `Nova proposta por ${listing.player_name}!`,
        message: `${(clubName || 'Um clube').slice(0, 50)} ofereceu R$${(Math.max(0, offeredPrice) / 1000).toFixed(0)}k por ${listing.player_name} (OVR ${listing.player_overall}). Salário: R$${Math.max(0, offeredSalary || 0)}/mês • Contrato: ${Math.min(5, Math.max(1, contractYears || 2))} anos. Confira na aba Propostas do Mercado!`,
        type: 'warning',
      });

      return new Response(JSON.stringify({ success: true, offer }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: BUY NOW — compra automática de jogador anunciado
    // ═══════════════════════════════════════════════════════════════
    if (action === 'buy-now') {
      const { listingId, clubName: buyerClubName } = body;
      if (!listingId || typeof listingId !== 'string') {
        return new Response(JSON.stringify({ error: 'Listing ID inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 1) Carrega listing (sem lock ainda) só para validar dono e existência
      const { data: preListing } = await adminClient
        .from('transfer_listings')
        .select('*')
        .eq('id', listingId)
        .maybeSingle();

      if (!preListing) {
        return new Response(JSON.stringify({ error: 'Anúncio não encontrado.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (preListing.status !== 'active') {
        return new Response(JSON.stringify({ error: 'Este jogador já foi vendido.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (preListing.seller_id === userId) {
        return new Response(JSON.stringify({ error: 'Você não pode comprar seu próprio jogador.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const price = Number(preListing.asking_price || 0);
      const playerData = preListing.player_data || {};
      const playerSalary = Number(playerData?.salary || 500);

      // 2) Valida verba do comprador (transferência + salário)
      const { data: buyerSave } = await adminClient
        .from('game_saves')
        .select('club_data')
        .eq('user_id', userId)
        .maybeSingle();

      if (!buyerSave?.club_data) {
        return new Response(JSON.stringify({ error: 'Save do comprador não encontrado.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const buyerData: any = buyerSave.club_data;
      const buyerBudget = Number(buyerData?.club?.budget || 0);
      if (buyerBudget < price) {
        return new Response(JSON.stringify({ error: `Verba insuficiente. Disponível: R$${(buyerBudget / 1000).toFixed(0)}k, necessário: R$${(price / 1000).toFixed(0)}k.` }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 3) LOCK ATÔMICO — só uma compra vence a corrida
      const { data: claimed, error: claimErr } = await adminClient
        .from('transfer_listings')
        .update({
          status: 'sold',
          buyer_id: userId,
          buyer_club_name: (buyerClubName || '').slice(0, 50),
          sold_at: new Date().toISOString(),
          cooldown_until: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        })
        .eq('id', listingId)
        .eq('status', 'active')
        .select();

      if (claimErr || !claimed || claimed.length === 0) {
        return new Response(JSON.stringify({ error: 'Este jogador acabou de ser comprado por outro clube.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const listing = claimed[0];

      const now = new Date();
      const contractYears = 3;

      // 4) Registra oferta sintética já aceita (para histórico/auditoria)
      const { data: syntheticOffer } = await adminClient
        .from('transfer_offers')
        .insert({
          listing_id: listing.id,
          buyer_id: userId,
          buyer_club_name: (buyerClubName || '').slice(0, 50),
          offered_price: price,
          offered_salary: playerSalary,
          offered_contract_years: contractYears,
          status: 'accepted',
          decision_status: 'player_accepted',
          responded_at: now.toISOString(),
        })
        .select()
        .single();

      // 5) Rejeita demais propostas pendentes do mesmo anúncio
      await adminClient.from('transfer_offers').update({
        status: 'rejected',
        rejection_reason: 'Jogador comprado via Compra Imediata por outro clube.',
        responded_at: now.toISOString(),
      }).eq('listing_id', listing.id).eq('status', 'pending').neq('id', syntheticOffer?.id || '00000000-0000-0000-0000-000000000000');

      // 6) Transfer log
      await adminClient.from('transfer_log').insert({
        player_name: listing.player_name,
        player_overall: listing.player_overall,
        from_user_id: listing.seller_id,
        to_user_id: userId,
        from_club_name: listing.seller_club_name,
        to_club_name: (buyerClubName || '').slice(0, 50),
        price,
        salary: playerSalary,
        transfer_type: 'sale',
      });

      // 7) Atualiza save do comprador (adiciona jogador + debita verba)
      const newPlayer = {
        ...playerData,
        salary: playerSalary,
        contract: contractYears,
        squad_status: 'reserve',
        squadRole: 'reserva',
        onTransferList: false,
        isLoaned: false,
      };
      if (!buyerData.club.players.some((p: any) => p.id === newPlayer.id)) {
        buyerData.club.players.push(newPlayer);
        buyerData.club.budget = buyerBudget - price;
        await adminClient.from('game_saves').update({ club_data: buyerData }).eq('user_id', userId);
      }

      // 8) Atualiza save do vendedor (remove jogador + credita verba)
      const { data: sellerSave } = await adminClient
        .from('game_saves').select('club_data').eq('user_id', listing.seller_id).maybeSingle();
      if (sellerSave?.club_data) {
        const sellerData: any = sellerSave.club_data;
        sellerData.club.players = (sellerData.club.players || []).filter((p: any) => p.id !== playerData.id);
        sellerData.club.budget = Number(sellerData.club.budget || 0) + price;
        await adminClient.from('game_saves').update({ club_data: sellerData }).eq('user_id', listing.seller_id);
      }

      // 9) Notificações
      const priceStr = price >= 1000000 ? `R$${(price / 1000000).toFixed(1)}M` : `R$${(price / 1000).toFixed(0)}k`;
      await adminClient.from('user_notifications').insert([
        {
          user_id: userId,
          icon: '⚡',
          title: `Compra Imediata concluída!`,
          message: `${listing.player_name} (OVR ${listing.player_overall}) agora faz parte do seu clube por ${priceStr}.`,
          type: 'success',
        },
        {
          user_id: listing.seller_id,
          icon: '💰',
          title: `${listing.player_name} foi comprado!`,
          message: `${(buyerClubName || 'Um clube')} adquiriu ${listing.player_name} via Compra Imediata por ${priceStr}.`,
          type: 'success',
        },
      ]);

      // 10) Jornal — manchete variada + importância (DESTAQUE)
      {
        const buyNowMeta = {
          kind: 'buy_now',
          player_name: listing.player_name,
          player_position: listing.player_position,
          player_overall: listing.player_overall,
          from_club: listing.seller_club_name,
          to_club: buyerClubName || 'novo clube',
          value: price,
        };
        const buyNowImportance = newsImportance({ overall: listing.player_overall, value: price });
        const headline = buyNowHeadlines({
          player: listing.player_name,
          ovr: listing.player_overall,
          from: listing.seller_club_name,
          to: buyerClubName || 'novo clube',
          money: priceStr,
        });
        // Notícia pro vendedor e pro comprador (cada um vê no próprio feed)
        await adminClient.from('newspaper_entries').insert([
          { user_id: listing.seller_id, category: 'TRANSFERÊNCIA', text: headline, is_event: true, importance: buyNowImportance, metadata: buyNowMeta },
          { user_id: userId,            category: 'TRANSFERÊNCIA', text: headline, is_event: true, importance: buyNowImportance, metadata: buyNowMeta },
        ]);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${listing.player_name} comprado com sucesso!`,
        listing,
        price,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

      // ACCEPT: Set 7h decision deadline instead of instant decision
      const now = new Date();
      const deadline = new Date(now.getTime() + 7 * 3600 * 1000); // 7 hours

      await adminClient.from('transfer_offers').update({
        status: 'awaiting_decision',
        decision_status: 'awaiting_decision',
        decision_deadline: deadline.toISOString(),
        responded_at: now.toISOString(),
      }).eq('id', offerId);

      // Notify the buyer that the club accepted and player is deciding
      await adminClient.from('user_notifications').insert({
        user_id: offer.buyer_id,
        icon: '⏳',
        title: `${listing.player_name} está decidindo!`,
        message: `O ${listing.seller_club_name} aceitou sua proposta por ${listing.player_name}! O jogador tem 7 horas para decidir. Resultado até ${deadline.toLocaleString('pt-BR')}.`,
        type: 'info',
      });

      // Create newspaper entry about the negotiation
      await adminClient.from('newspaper_entries').insert({
        user_id: listing.seller_id,
        category: 'MERCADO',
        text: `🤝 ${listing.seller_club_name} aceitou proposta de R$${(offer.offered_price / 1000).toFixed(0)}k do ${offer.buyer_club_name} por ${listing.player_name} (OVR ${listing.player_overall}). Jogador tem 7h para decidir.`,
        is_event: true,
      });

      return new Response(JSON.stringify({
        success: true,
        message: `Proposta aceita! ${listing.player_name} tem 7 horas para decidir.`,
        awaitingDecision: true,
        deadline: deadline.toISOString(),
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: RESOLVE PENDING DECISIONS (called on market load)
    // ═══════════════════════════════════════════════════════════════
    if (action === 'resolve-decisions') {
      const now = new Date();
      
      // Find all offers awaiting decision whose deadline has passed
      const { data: pendingOffers } = await adminClient
        .from('transfer_offers')
        .select('*, transfer_listings!inner(*)')
        .eq('decision_status', 'awaiting_decision')
        .lte('decision_deadline', now.toISOString());

      if (!pendingOffers || pendingOffers.length === 0) {
        return new Response(JSON.stringify({ success: true, resolved: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let resolved = 0;
      for (const offer of pendingOffers) {
        const listing = (offer as any).transfer_listings;
        const playerData = listing.player_data;
        const currentSalary = playerData?.salary || 500;
        const offeredSalary = offer.offered_salary || 0;
        const signingBonus = offer.signing_bonus || 0;
        const totalBonus = (offer.bonus_goals || 0) + (offer.bonus_assists || 0) + (offer.bonus_games || 0) + (offer.bonus_titles || 0);

        // Player acceptance logic (same as before)
        let acceptChance = 0.5;
        if (offeredSalary >= currentSalary * 1.5) acceptChance += 0.3;
        else if (offeredSalary >= currentSalary) acceptChance += 0.15;
        else if (offeredSalary >= currentSalary * 0.8) acceptChance += 0.0;
        else acceptChance -= 0.2;
        if (signingBonus > 0) acceptChance += Math.min(0.15, signingBonus / 1000000 * 0.05);
        if (totalBonus > 0) acceptChance += Math.min(0.1, totalBonus / 500000 * 0.02);
        const personality = playerData?.personality || 'calmo';
        if (personality === 'ambicioso') acceptChance += (offeredSalary > currentSalary ? 0.1 : -0.15);
        if (personality === 'leal') acceptChance -= 0.15;
        if (personality === 'dedicado') acceptChance += 0.05;
        const years = offer.offered_contract_years || 2;
        if (years >= 2 && years <= 3) acceptChance += 0.05;
        if (years >= 4) acceptChance -= 0.05;
        acceptChance = Math.max(0.1, Math.min(0.95, acceptChance));

        const playerAccepts = Math.random() < acceptChance;

        if (!playerAccepts) {
          let reason = 'O jogador recusou a proposta.';
          if (offeredSalary < currentSalary) reason = `Jogador recusou: salário oferecido (R$${offeredSalary}) é inferior ao atual (R$${currentSalary}).`;
          else if (personality === 'leal') reason = 'Jogador recusou: é leal ao clube atual e prefere ficar.';
          else if (personality === 'ambicioso' && offeredSalary <= currentSalary) reason = 'Jogador recusou: ambicioso, espera um salário maior.';

          const suggestedSalary = Math.round(currentSalary * 1.25);
          const agentMessage = `Aqui é o empresário de ${listing.player_name}. ${reason} Para fecharmos negócio, sugerimos: salário de R$${suggestedSalary}/mês, contrato de 3+ anos e bônus de assinatura.`;

          await adminClient.from('transfer_offers').update({
            status: 'player_rejected',
            decision_status: 'player_rejected',
            rejection_reason: agentMessage,
          }).eq('id', offer.id);

          await adminClient.from('user_notifications').insert({
            user_id: offer.buyer_id,
            icon: '🤵',
            title: `Empresário de ${listing.player_name} respondeu`,
            message: agentMessage,
            type: 'warning',
          });

          // Newspaper: player rejected
          await adminClient.from('newspaper_entries').insert({
            user_id: offer.buyer_id,
            category: 'MERCADO',
            text: `❌ ${listing.player_name} (OVR ${listing.player_overall}) recusou proposta do ${offer.buyer_club_name}. Negociação frustrada.`,
            is_event: true,
          });
        } else {
          // Player accepted! Complete transfer
          const cooldownUntil = new Date(now.getTime() + 72 * 3600 * 1000);

          await adminClient.from('transfer_offers').update({
            status: 'accepted',
            decision_status: 'player_accepted',
          }).eq('id', offer.id);

          await adminClient.from('transfer_listings').update({
            status: 'sold',
            buyer_id: offer.buyer_id,
            buyer_club_name: offer.buyer_club_name,
            sold_at: now.toISOString(),
            cooldown_until: cooldownUntil.toISOString(),
          }).eq('id', listing.id);

          // Reject other pending offers
          await adminClient.from('transfer_offers').update({
            status: 'rejected',
            rejection_reason: 'Jogador já foi vendido para outro clube.',
            responded_at: now.toISOString(),
          }).eq('listing_id', listing.id).eq('status', 'pending').neq('id', offer.id);

          // Log transfer
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

          // 🔄 Sincronização definitiva: Adicionar jogador ao elenco do comprador no game_saves
          const { data: save } = await adminClient.from('game_saves').select('club_data').eq('user_id', offer.buyer_id).maybeSingle();
          if (save?.club_data) {
            const clubData = save.club_data as any;
            const newPlayer = {
              ...playerData,
              salary: offer.offered_salary,
              contract: offer.offered_contract_years,
              squad_status: 'reserve',
              squadRole: 'reserva',
              onTransferList: false,
              isLoaned: false
            };
            
            // Anti-duplicação no save
            if (!clubData.club.players.some((p: any) => p.id === newPlayer.id)) {
              clubData.club.players.push(newPlayer);
              clubData.club.budget = (clubData.club.budget || 0) - offer.offered_price;
              await adminClient.from('game_saves').update({ club_data: clubData }).eq('user_id', offer.buyer_id);
            }
          }

          // 🔄 Remover jogador do elenco do vendedor no game_saves
          const { data: sellerSave } = await adminClient.from('game_saves').select('club_data').eq('user_id', listing.seller_id).maybeSingle();
          if (sellerSave?.club_data) {
            const sellerData = sellerSave.club_data as any;
            sellerData.club.players = sellerData.club.players.filter((p: any) => p.id !== playerData.id);
            sellerData.club.budget = (sellerData.club.budget || 0) + offer.offered_price;
            await adminClient.from('game_saves').update({ club_data: sellerData }).eq('user_id', listing.seller_id);
          }

          // Notify both
          await adminClient.from('user_notifications').insert({
            user_id: offer.buyer_id,
            icon: '✅',
            title: `${listing.player_name} aceitou!`,
            message: `${listing.player_name} aceitou sua proposta e agora faz parte do ${offer.buyer_club_name}! Salário: R$${offer.offered_salary}/mês, contrato de ${offer.offered_contract_years} ano(s).`,
            type: 'success',
          });

          await adminClient.from('user_notifications').insert({
            user_id: listing.seller_id,
            icon: '💰',
            title: `${listing.player_name} vendido!`,
            message: `${listing.player_name} aceitou a proposta do ${offer.buyer_club_name} por R$${(offer.offered_price / 1000).toFixed(0)}k.`,
            type: 'success',
          });

          // Newspaper: transfer completed
          const priceStr = offer.offered_price >= 1000000 ? `R$${(offer.offered_price / 1000000).toFixed(1)}M` : `R$${(offer.offered_price / 1000).toFixed(0)}k`;
          await adminClient.from('newspaper_entries').insert({
            user_id: listing.seller_id,
            category: 'TRANSFERÊNCIA',
            text: `✅ CONFIRMADO! ${listing.player_name} (${listing.player_position}, OVR ${listing.player_overall}) foi vendido pelo ${listing.seller_club_name} para o ${offer.buyer_club_name} por ${priceStr}.`,
            is_event: true,
          });

          const fominhaRisk = (offer.bonus_goals || 0) > 50000 ? 0.3 : (offer.bonus_goals || 0) > 20000 ? 0.15 : 0;
        }
        resolved++;
      }

      return new Response(JSON.stringify({ success: true, resolved }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // ═══════════════════════════════════════════════════════════════
    // ACTION: LIST PLAYER FOR LOAN
    // ═══════════════════════════════════════════════════════════════
    if (action === 'loan-list') {
      const { playerData, playerName, playerPosition, playerOverall, playerAge, salary, clubName, sellerShield, salaryPayer, salarySplitPct, loanFee, openToOffers } = body;

      if (!playerName || typeof playerName !== 'string' || playerName.length > 100) {
        return new Response(JSON.stringify({ error: 'Nome do jogador inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!playerData || typeof playerData !== 'object') {
        return new Response(JSON.stringify({ error: 'Dados do jogador inválidos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const validPayer = ['seller', 'buyer', 'split'].includes(salaryPayer) ? salaryPayer : 'buyer';
      const split = Math.min(100, Math.max(0, Number(salarySplitPct) || 0));
      const fee = Math.max(0, Number(loanFee) || 0);

      // Check max simultaneous loan listings per user (limit 3)
      const { count: activeCount } = await adminClient
        .from('loan_listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .eq('status', 'active');

      if ((activeCount ?? 0) >= 3) {
        return new Response(JSON.stringify({ error: 'Limite de 3 jogadores para empréstimo.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: listing, error: listError } = await adminClient
        .from('loan_listings')
        .insert({
          seller_id: userId,
          seller_club_name: (clubName || '').slice(0, 50),
          seller_shield: sellerShield || null,
          player_data: playerData,
          player_name: playerName.slice(0, 100),
          player_position: (playerPosition || 'MEI').slice(0, 3),
          player_overall: Math.min(99, Math.max(1, playerOverall)),
          player_age: Math.min(45, Math.max(15, playerAge)),
          salary: Math.max(0, salary || 0),
          salary_payer: validPayer,
          salary_split_pct: validPayer === 'split' ? split : 0,
          loan_fee: fee,
          open_to_offers: openToOffers !== false,
          loan_terms: body.loanTerms || null,
        })
        .select()
        .single();

      if (listError) {
        console.error('loan-list error:', listError.message);
        return new Response(JSON.stringify({ error: 'Erro ao listar jogador para empréstimo.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, listing }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: ACCEPT LOAN (another user takes the loaned player)
    // ═══════════════════════════════════════════════════════════════
    if (action === 'loan-accept') {
      const { listingId, clubName } = body;

      if (!listingId || typeof listingId !== 'string') {
        return new Response(JSON.stringify({ error: 'Listing ID inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: listing } = await adminClient
        .from('loan_listings')
        .select('*')
        .eq('id', listingId)
        .eq('status', 'active')
        .single();

      if (!listing) {
        return new Response(JSON.stringify({ error: 'Empréstimo não encontrado ou já encerrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (listing.seller_id === userId) {
        return new Response(JSON.stringify({ error: 'Você não pode aceitar seu próprio empréstimo' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check max loans in for buyer (limit 3)
      const { count: loansIn } = await adminClient
        .from('loan_listings')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', userId)
        .eq('status', 'accepted');

      if ((loansIn ?? 0) >= 3) {
        return new Response(JSON.stringify({ error: 'Limite de 3 empréstimos recebidos atingido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const now = new Date();

      await adminClient.from('loan_listings').update({
        status: 'accepted',
        buyer_id: userId,
        buyer_club_name: (clubName || '').slice(0, 50),
        accepted_at: now.toISOString(),
      }).eq('id', listingId);

      // Create journal entry
      await adminClient.from('journal_updates').insert({
        user_id: listing.seller_id,
        title: `📰 ${listing.player_name} emprestado!`,
        content: `🔄 EMPRÉSTIMO CONFIRMADO!\n\n${listing.player_name} (${listing.player_position}, ${listing.player_age}a, OVR ${listing.player_overall}) foi emprestado pelo ${listing.seller_club_name} para o ${clubName || 'Clube'} por 1 temporada.\n\nO clube receptor arcará com o salário de R$${((listing.salary || 0) / 1000).toFixed(0)}k/mês.`,
      });

      return new Response(JSON.stringify({
        success: true,
        message: `Empréstimo aceito! ${listing.player_name} foi emprestado.`,
        playerData: listing.player_data,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: CANCEL LOAN LISTING
    // ═══════════════════════════════════════════════════════════════
    if (action === 'loan-delist') {
      const { listingId } = body;

      const { data: listing } = await adminClient
        .from('loan_listings')
        .select('seller_id, player_name')
        .eq('id', listingId)
        .single();

      if (!listing || listing.seller_id !== userId) {
        return new Response(JSON.stringify({ error: 'Empréstimo não encontrado ou sem permissão' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await adminClient.from('loan_listings').update({
        status: 'cancelled',
      }).eq('id', listingId);

      return new Response(JSON.stringify({ success: true, message: `${listing.player_name} retirado do mercado de empréstimos.` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // LOAN OFFERS — counter-proposals with AI evaluation
    // ═══════════════════════════════════════════════════════════════

    // Helper: AI evaluates an offer for the seller's perspective
    // Returns { decision: 'accept'|'counter'|'reject', counter?: {...}, reason: string }
    function evaluateLoanOffer(listing: any, offer: { salary_payer: string; salary_split_pct: number; loan_fee: number }) {
      const baseSalary = Number(listing.salary || 0);
      // Estimated cost the seller pays per month under each payer scheme
      const costForSeller = (payer: string, split: number) => {
        if (payer === 'seller') return baseSalary;
        if (payer === 'split') return Math.round(baseSalary * (split / 100));
        return 0;
      };
      const sellerCostListed = costForSeller(listing.salary_payer, listing.salary_split_pct || 0);
      const sellerCostOffer = costForSeller(offer.salary_payer, offer.salary_split_pct || 0);

      // Effective revenue for seller (loan fee minus extra salary cost taken on)
      const expected = Number(listing.loan_fee || 0) - sellerCostListed;
      const offered = Number(offer.loan_fee || 0) - sellerCostOffer;

      // Player desirability — better players = seller more demanding
      const ovr = Number(listing.player_overall || 60);
      const demandFactor = 1 + Math.max(0, (ovr - 70)) * 0.05; // OVR 80 = 1.5x demanding

      const acceptThreshold = expected; // must match or beat listed terms (in seller's favor)
      const counterFloor = expected - Math.max(50_000, baseSalary * 2) * demandFactor;

      if (offered >= acceptThreshold) {
        return { decision: 'accept' as const, reason: 'Termos iguais ou melhores que o anunciado.' };
      }
      if (offered < counterFloor) {
        return { decision: 'reject' as const, reason: 'Proposta muito abaixo do esperado.' };
      }
      // Counter — meet halfway, prefer buyer paying full salary
      const midFee = Math.max(
        Number(listing.loan_fee || 0),
        Math.round(((Number(offer.loan_fee || 0) + Number(listing.loan_fee || 0)) / 2) * demandFactor),
      );
      return {
        decision: 'counter' as const,
        counter: {
          salary_payer: 'buyer',
          salary_split_pct: 0,
          loan_fee: midFee,
        },
        reason: 'O clube quer mais favorável: salário com o receptor e taxa próxima do anúncio.',
      };
    }

    // ── ACTION: BUYER CREATES A LOAN OFFER ─────────────────────────
    if (action === 'loan-offer-create') {
      const { listingId, clubName, offeredSalaryPayer, offeredSalarySplitPct, offeredLoanFee, message } = body;

      if (!listingId || typeof listingId !== 'string') {
        return new Response(JSON.stringify({ error: 'Listing ID inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: listing } = await adminClient
        .from('loan_listings').select('*').eq('id', listingId).eq('status', 'active').single();
      if (!listing) {
        return new Response(JSON.stringify({ error: 'Empréstimo indisponível' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (listing.seller_id === userId) {
        return new Response(JSON.stringify({ error: 'Você não pode propor no seu próprio empréstimo' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (listing.open_to_offers === false) {
        return new Response(JSON.stringify({ error: 'Este clube não aceita contrapropostas. Use os termos anunciados.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Cooldown: max 1 pending offer per buyer per listing
      const { count: existing } = await adminClient
        .from('loan_offers')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', listingId)
        .eq('buyer_id', userId)
        .eq('status', 'pending');
      if ((existing ?? 0) > 0) {
        return new Response(JSON.stringify({ error: 'Você já tem uma proposta pendente para este jogador.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const validPayer = ['seller', 'buyer', 'split'].includes(offeredSalaryPayer) ? offeredSalaryPayer : 'buyer';
      const split = Math.min(100, Math.max(0, Number(offeredSalarySplitPct) || 0));
      const fee = Math.max(0, Number(offeredLoanFee) || 0);

      const { data: offer, error: offerErr } = await adminClient
        .from('loan_offers')
        .insert({
          listing_id: listingId,
          seller_id: listing.seller_id,
          buyer_id: userId,
          buyer_club_name: (clubName || '').slice(0, 50),
          
          offered_salary_payer: validPayer,
          offered_salary_split_pct: validPayer === 'split' ? split : 0,
          offered_loan_fee: fee,
          message: (message || '').slice(0, 300),
        })
        .select()
        .single();

      if (offerErr) {
        console.error('loan-offer-create error:', offerErr.message);
        return new Response(JSON.stringify({ error: 'Erro ao criar proposta.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // AI advisory + notify seller
      const advice = evaluateLoanOffer(listing, { salary_payer: validPayer, salary_split_pct: split, loan_fee: fee });
      await adminClient.from('user_notifications').insert({
        user_id: listing.seller_id,
        type: 'loan_offer_received',
        title: '🔄 Proposta de empréstimo',
        message: `${(clubName || 'Um clube').slice(0, 40)} quer ${listing.player_name}. Recomendação do agente: ${advice.decision === 'accept' ? 'aceitar' : advice.decision === 'counter' ? 'contrapropor' : 'recusar'}.`,
        icon: '🔄',
        data: { offer_id: offer.id, listing_id: listingId, advice },
      });

      return new Response(JSON.stringify({ success: true, offer, advice }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ACTION: SELLER COUNTER ─────────────────────────────────────
    if (action === 'loan-offer-counter') {
      const { offerId, counterSalaryPayer, counterSalarySplitPct, counterLoanFee, counterMessage } = body;

      const { data: offer } = await adminClient
        .from('loan_offers').select('*').eq('id', offerId).single();
      if (!offer || offer.seller_id !== userId) {
        return new Response(JSON.stringify({ error: 'Proposta não encontrada ou sem permissão' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (offer.status !== 'pending') {
        return new Response(JSON.stringify({ error: 'Proposta já resolvida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const validPayer = ['seller', 'buyer', 'split'].includes(counterSalaryPayer) ? counterSalaryPayer : 'buyer';
      const split = Math.min(100, Math.max(0, Number(counterSalarySplitPct) || 0));
      const fee = Math.max(0, Number(counterLoanFee) || 0);

      await adminClient.from('loan_offers').update({
        status: 'countered',
        
        counter_salary_payer: validPayer,
        counter_salary_split_pct: validPayer === 'split' ? split : 0,
        counter_loan_fee: fee,
        counter_message: (counterMessage || '').slice(0, 300),
      }).eq('id', offerId);

      await adminClient.from('user_notifications').insert({
        user_id: offer.buyer_id,
        type: 'loan_offer_countered',
        title: '↩️ Contraproposta recebida',
        message: `O clube fez uma contraproposta no empréstimo. Taxa: R$${(fee / 1000).toFixed(0)}k.`,
        icon: '↩️',
        data: { offer_id: offerId },
      });

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ACTION: SELLER REJECTS ─────────────────────────────────────
    if (action === 'loan-offer-reject') {
      const { offerId, reason } = body;
      const { data: offer } = await adminClient
        .from('loan_offers').select('*').eq('id', offerId).single();
      if (!offer || offer.seller_id !== userId) {
        return new Response(JSON.stringify({ error: 'Sem permissão' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (offer.status !== 'pending' && offer.status !== 'countered') {
        return new Response(JSON.stringify({ error: 'Proposta já resolvida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await adminClient.from('loan_offers').update({
        status: 'rejected', resolved_at: new Date().toISOString(),
      }).eq('id', offerId);

      await adminClient.from('user_notifications').insert({
        user_id: offer.buyer_id,
        type: 'loan_offer_rejected',
        title: '❌ Proposta recusada',
        message: `Sua proposta de empréstimo foi recusada.${reason ? ' Motivo: ' + String(reason).slice(0, 100) : ''}`,
        icon: '❌',
        data: { offer_id: offerId },
      });

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ACTION: BUYER OR SELLER ACCEPTS (closes deal) ──────────────
    if (action === 'loan-offer-accept') {
      const { offerId, clubName } = body;
      const { data: offer } = await adminClient
        .from('loan_offers').select('*').eq('id', offerId).single();
      if (!offer) {
        return new Response(JSON.stringify({ error: 'Proposta não encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Buyer can accept seller's counter; seller can accept buyer's offer
      const isBuyer = offer.buyer_id === userId;
      const isSeller = offer.seller_id === userId;
      if (!isBuyer && !isSeller) {
        return new Response(JSON.stringify({ error: 'Sem permissão' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (offer.status === 'countered' && !isBuyer) {
        return new Response(JSON.stringify({ error: 'Aguardando o comprador aceitar a contraproposta' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (offer.status === 'pending' && !isSeller) {
        return new Response(JSON.stringify({ error: 'Aguardando o vendedor decidir' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: listing } = await adminClient
        .from('loan_listings').select('*').eq('id', offer.listing_id).single();
      if (!listing || listing.status !== 'active') {
        return new Response(JSON.stringify({ error: 'Empréstimo já encerrado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Determine final terms: counter takes priority if set
      const hasCounter = offer.counter_loan_fee !== null && offer.counter_loan_fee !== undefined;
      const finalPayer = hasCounter ? (offer.counter_salary_payer || 'buyer') : (offer.offered_salary_payer || 'buyer');
      const finalSplit = hasCounter ? (offer.counter_salary_split_pct || 0) : (offer.offered_salary_split_pct || 0);
      const finalFee = hasCounter ? Number(offer.counter_loan_fee || 0) : Number(offer.offered_loan_fee || 0);

      // Limit 3 loans-in for buyer
      const { count: loansIn } = await adminClient
        .from('loan_listings')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', offer.buyer_id)
        .eq('status', 'accepted');
      if ((loansIn ?? 0) >= 3) {
        return new Response(JSON.stringify({ error: 'Limite de 3 empréstimos recebidos atingido para o comprador.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const now = new Date();

      // Lock listing with negotiated terms
      await adminClient.from('loan_listings').update({
        status: 'accepted',
        buyer_id: offer.buyer_id,
        buyer_club_name: (offer.buyer_club_name || clubName || '').slice(0, 50),
        accepted_at: now.toISOString(),
        salary_payer: finalPayer,
        salary_split_pct: finalPayer === 'split' ? finalSplit : 0,
        loan_fee: finalFee,
      }).eq('id', listing.id);

      // Mark offer accepted; auto-reject other pending offers on same listing
      await adminClient.from('loan_offers').update({
        status: 'accepted', resolved_at: now.toISOString(),
      }).eq('id', offerId);
      await adminClient.from('loan_offers').update({
        status: 'expired', resolved_at: now.toISOString(),
      }).eq('listing_id', listing.id).in('status', ['pending', 'countered']).neq('id', offerId);

      await adminClient.from('user_notifications').insert([
        {
          user_id: offer.buyer_id,
          type: 'loan_offer_accepted',
          title: '✅ Empréstimo fechado',
          message: `${listing.player_name} chegará por empréstimo. Taxa: R$${(Number(finalFee) / 1000).toFixed(0)}k. Divisão salarial: ${finalSplit}% pago por você.`,
          icon: '✅',
          data: { listing_id: listing.id, player: listing.player_data },
        },
        {
          user_id: offer.seller_id,
          type: 'loan_offer_accepted',
          title: '🤝 Empréstimo confirmado',
          message: `${listing.player_name} foi emprestado para ${offer.buyer_club_name || 'outro clube'}.`,
          icon: '🤝',
          data: { listing_id: listing.id },
        },
      ]);

      return new Response(JSON.stringify({
        success: true,
        playerData: listing.player_data,
        terms: { salary_payer: finalPayer, salary_split_pct: finalSplit, loan_fee: finalFee },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ACTION: BUYER CANCELS THEIR PENDING OFFER ──────────────────
    if (action === 'loan-offer-cancel') {
      const { offerId } = body;
      const { data: offer } = await adminClient
        .from('loan_offers').select('*').eq('id', offerId).single();
      if (!offer || offer.buyer_id !== userId) {
        return new Response(JSON.stringify({ error: 'Sem permissão' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!['pending', 'countered'].includes(offer.status)) {
        return new Response(JSON.stringify({ error: 'Proposta já resolvida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await adminClient.from('loan_offers').update({
        status: 'cancelled', resolved_at: new Date().toISOString(),
      }).eq('id', offerId);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Ação desconhecida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('process-transfer error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
