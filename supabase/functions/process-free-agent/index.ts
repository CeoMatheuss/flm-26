import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function calcPlayerSalaryFloor(player: any): number {
  // Heurística: salário mínimo aceitável = OVR² × fator idade
  const ovr = Math.max(40, Math.min(99, player.overall || 60));
  const ageFactor = player.age <= 23 ? 1.2 : player.age <= 28 ? 1.0 : player.age <= 32 ? 0.8 : 0.6;
  return Math.floor((ovr * ovr) * 0.6 * ageFactor);
}

function buildVisibleStats(player: any) {
  const ratings: number[] = player.seasonRatings || [];
  const avgRating = ratings.length > 0 ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : null;
  return {
    name: player.name,
    age: player.age,
    position: player.position,
    goals: player.goals || 0,
    assists: player.assists || 0,
    gamesPlayed: player.gamesPlayed || 0,
    avgRating,
    overall: player.overall,
    potential: player.potential,
    rarity: player.rarity || 'Normal'
  };
}

// First/last name pools to seed pool
const firstNames = ['Carlos','Henrique','Vinícius','Jonathan','Renan','Caio','Yuri','Danilo','Leandro','Igor','Gustavo','Eduardo','Ricardo','Fabrício','Willian','Jean','Samuel','Otávio','Rogério','Adriano','Matheus','Luan','Wesley','Breno','Kelvin','Ruan','Davi','Enzo','Miguel','Arthur','Rafael','Pedro','Lucas','Felipe','Gabriel','Thiago','Bruno','André','Diego','Marcos'];
const lastNames = ['Pereira','Araújo','Barbosa','Ribeiro','Martins','Cardoso','Pinto','Nascimento','Moreira','Teixeira','Carvalho','Monteiro','Campos','Duarte','Correia','Freitas','Machado','Ramos','Vieira','Lopes','Santos','Silva','Oliveira','Souza','Lima','Costa','Almeida','Ferreira','Rodrigues','Nunes'];
const positions = ['GOL','ZAG','LAT','VOL','MEI','ATA'];
const personalities = ['lider','festeiro','dedicado','preguicoso','ambicioso','leal','temperamental','calmo','competitivo','introvertido'];

function rndId() { return Math.random().toString(36).substr(2, 9); }
function rndName() { return `${firstNames[Math.floor(Math.random()*firstNames.length)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`; }
function rndAttr(base: number) {
  const v = base + Math.floor(Math.random() * 16 - 8);
  return Math.max(1, Math.min(99, v));
}

function generateFreeAgentPlayer() {
  const position = positions[Math.floor(Math.random() * positions.length)];
  const age = Math.floor(Math.random() * (34 - 16 + 1)) + 16; // 16–34
  
  // Rarity logic: 5% chance of rare (66-75), otherwise normal (50-65)
  const isRare = Math.random() < 0.05;
  const overall = isRare 
    ? Math.floor(Math.random() * (75 - 66 + 1)) + 66
    : Math.floor(Math.random() * (65 - 50 + 1)) + 50;
  
  const rarity = isRare ? 'Raro' : 'Normal';
  
  // Potential logic: chance for high potential
  const isPromising = Math.random() < 0.1;
  const potential = isPromising
    ? Math.max(overall + 5, Math.floor(Math.random() * (95 - 75 + 1)) + 75)
    : Math.max(overall, Math.floor(Math.random() * (overall + 10)));

  const personality = personalities[Math.floor(Math.random() * personalities.length)];
  const games = age > 20 ? Math.floor(Math.random() * 80) : Math.floor(Math.random() * 20);
  const goals = position === 'ATA' ? Math.floor(Math.random() * games * 0.5) : Math.floor(Math.random() * games * 0.15);
  const assists = Math.floor(Math.random() * games * 0.2);
  const ratings: number[] = [];
  const baseRat = 5.5 + Math.random() * 2.5;
  for (let i = 0; i < Math.min(games, 10); i++) ratings.push(+(baseRat + (Math.random() * 1.5 - 0.75)).toFixed(1));

  return {
    id: rndId(),
    name: rndName(),
    position,
    overall,
    potential,
    rarity,
    age,
    salary: calcPlayerSalaryFloor({ overall, age }),
    stamina: 100,
    morale: 70,
    goals,
    assists,
    gamesPlayed: games,
    contract: 0,
    seasonRatings: ratings,
    personality,
    attributes: {
      speed: rndAttr(overall),
      shooting: rndAttr(overall),
      passing: rndAttr(overall),
      defending: rndAttr(overall),
      physical: rndAttr(overall),
      dribbling: rndAttr(overall),
      setPieces: rndAttr(overall - 5),
      positioning: rndAttr(overall),
      heading: rndAttr(overall),
      marking: rndAttr(overall),
      vision: rndAttr(overall),
      crossing: rndAttr(overall),
      longShots: rndAttr(overall),
      workRate: rndAttr(overall),
      composure: rndAttr(overall),
      aggression: rndAttr(overall),
      goalkeeping: position === 'GOL' ? rndAttr(overall + 10) : rndAttr(overall * 0.2),
    },
    history: [],
  };
}


function calculateFreeAgentAcceptChance(params: {
  offeredSalary: number;
  currentSalary: number;
  reputation: number;
  age: number;
  contractYears: number;
  signingBonus: number;
  personality: string;
}) {
  const { offeredSalary, currentSalary, reputation, age, contractYears, signingBonus, personality } = params;
  let chance = 0.5;

  const salaryRatio = offeredSalary / Math.max(1, currentSalary);
  if (salaryRatio >= 1.4) chance += 0.35;
  else if (salaryRatio >= 1.1) chance += 0.20;
  else if (salaryRatio >= 0.95) chance += 0.10;
  else if (salaryRatio >= 0.8) chance -= 0.15;
  else chance -= 0.40;

  if (reputation >= 70) chance += 0.15;
  if (age >= 32 && contractYears >= 3) chance += 0.15;
  if (signingBonus > currentSalary * 2) chance += 0.10;

  if (personality === 'ambicioso') chance += (salaryRatio > 1.2 ? 0.1 : -0.2);
  
  return Math.max(0.05, Math.min(0.99, chance));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    // ═══════════════════════════════════════════
    // LIVE MATCH GUARD (user-scoped actions)
    // ═══════════════════════════════════════════
    const USER_ACTIONS = new Set(['make-offer', 'accept-counter', 'complete-signing', 'rescind-player']);
    if (USER_ACTIONS.has(action)) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const userClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const token = authHeader.replace('Bearer ', '');
          const { data: claimsData } = await userClient.auth.getClaims(token);
          const reqUserId = claimsData?.claims?.sub as string | undefined;
          if (reqUserId) {
            const { data: liveMatch } = await adminClient
              .from('live_matches')
              .select('id')
              .eq('user_id', reqUserId)
              .eq('status', 'live')
              .lt('current_minute', 90)
              .maybeSingle();
            if (liveMatch) {
              return json({ error: '🔒 Ação indisponível durante a partida. Aguarde o fim do jogo.' }, 423);
            }
          }
        } catch { /* fall-through */ }
      }
    }

    // ═══════════════════════════════════════════
    // PUBLIC: SEED POOL (cron-safe; idempotent)
    // ═══════════════════════════════════════════
    if (action === 'seed-pool') {
      // First, process expired auctions into free agents
      await adminClient.rpc('handle_expired_auction_to_free_agent');

      // Expire old agents (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await adminClient.from('free_agents_market').delete().lt('created_at', thirtyDaysAgo.toISOString());

      const { count } = await adminClient
        .from('free_agents_market')
        .select('id', { count: 'exact', head: true });

      // If we have fewer than 100 players, add more (up to 10 at a time)
      const target = 100;
      const currentCount = count ?? 0;
      const toAdd = Math.min(10, Math.max(0, target - currentCount));
      
      if (toAdd === 0) return json({ success: true, added: 0, total: currentCount });

      const rows: any[] = [];
      const newspaperEntries: any[] = [];

      for (let i = 0; i < toAdd; i++) {
        const p = generateFreeAgentPlayer();
        rows.push({
          player_data: p,
          player_name: p.name,
          player_position: p.position,
          player_age: p.age,
          player_overall: p.overall,
          player_potential: p.potential,
          visible_stats: buildVisibleStats(p),
          origin: 'generated',
        });

        if (p.rarity === 'Raro') {
          newspaperEntries.push({
            category: 'MERCADO',
            text: `⭐ DESTAQUE: O promissor ${p.name} (${p.position}, OVR ${p.overall}) acaba de ficar livre no mercado!`,
            is_event: true,
          });
        }
      }

      const { error } = await adminClient.from('free_agents_market').insert(rows);
      if (error) {
        console.error('seed error:', error.message);
        return json({ error: 'Erro ao popular pool' }, 500);
      }

      // Add newspaper entries if any
      if (newspaperEntries.length > 0) {
        await adminClient.from('newspaper_entries').insert(newspaperEntries);
      }

      return json({ success: true, added: toAdd, total: currentCount + toAdd });
    }

    // ─── auth required for other actions ───
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    // ═══════════════════════════════════════════
    // ACTION: MAKE OFFER
    // ═══════════════════════════════════════════
    if (action === 'make-offer') {
      const { agentId, offeredSalary, contractYears, signingBonus, clubName, transferBudgetAvailable } = body;

      if (!agentId || typeof agentId !== 'string') return json({ error: 'agentId inválido' }, 400);
      if (typeof offeredSalary !== 'number' || offeredSalary < 0) return json({ error: 'Salário inválido' }, 400);

      // Verify agent exists & not on cooldown
      const { data: agent } = await adminClient.from('free_agents_market').select('*').eq('id', agentId).single();
      if (!agent) return json({ error: 'Jogador não encontrado no Mercado Livre' }, 404);
      if (new Date(agent.available_from) > new Date()) {
        return json({ error: `Jogador disponível para ofertas em ${new Date(agent.available_from).toLocaleString('pt-BR')}` }, 429);
      }

      // Anti-spam: max 5 pending offers per user
      const { count: pendingOffers } = await adminClient
        .from('free_agent_offers')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', userId)
        .eq('status', 'pending');
      if ((pendingOffers ?? 0) >= 10) {
        return json({ error: 'Limite de 10 propostas pendentes no Mercado Livre.' }, 429);
      }

      // Anti-duplicate: only one pending offer per (buyer, agent)
      const { data: existing } = await adminClient
        .from('free_agent_offers')
        .select('id')
        .eq('buyer_id', userId)
        .eq('agent_id', agentId)
        .eq('status', 'pending')
        .maybeSingle();
      if (existing) return json({ error: 'Você já tem uma proposta pendente para este jogador' }, 409);

      // Trava 40/40: signing bonus precisa caber no transferBudget reportado pelo cliente
      const luvas = Math.max(0, signingBonus || 0);
      if (transferBudgetAvailable != null && luvas > transferBudgetAvailable) {
        return json({ error: `Luvas (R$${(luvas/1000).toFixed(0)}k) excedem sua verba de transferências (R$${(transferBudgetAvailable/1000).toFixed(0)}k disponível).` }, 400);
      }

      const { data: offer, error: offerError } = await adminClient
        .from('free_agent_offers')
        .insert({
          agent_id: agentId,
          buyer_id: userId,
          buyer_club_name: (clubName || 'Clube').slice(0, 50),
          offered_salary: Math.max(0, offeredSalary),
          offered_contract_years: Math.min(5, Math.max(1, contractYears || 2)),
          signing_bonus: luvas,
        })
        .select()
        .single();

      if (offerError) {
        console.error('offer error:', offerError.message);
        return json({ error: 'Erro ao enviar proposta' }, 500);
      }

      return json({ success: true, offer });
    }

    // ═══════════════════════════════════════════
    // ACTION: RESOLVE PENDING DECISIONS
    // ═══════════════════════════════════════════
    if (action === 'resolve-decisions') {
      const now = new Date();
      const { data: pending } = await adminClient
        .from('free_agent_offers')
        .select('*, free_agents_market!inner(*)')
        .eq('status', 'pending')
        .lte('decision_deadline', now.toISOString())
        .limit(50);

      if (!pending || pending.length === 0) return json({ success: true, resolved: 0 });

      let resolved = 0;
      for (const offer of pending) {
        const agent = (offer as any).free_agents_market;
        const player = agent.player_data;
        const salaryFloor = calcPlayerSalaryFloor(player);

        const ratio = (offer.offered_salary || 0) / Math.max(1, salaryFloor);
        let outcome: 'accepted' | 'rejected' | 'counter_salary' = 'rejected';
        let counterSalary: number | null = null;
        let reason: string | null = null;

        if (ratio >= 1.0) {
          outcome = 'accepted';
        } else if (ratio >= 0.7) {
          outcome = 'counter_salary';
          counterSalary = Math.floor(salaryFloor * 1.05);
          reason = `Empresário pede R$${counterSalary}/mês para fechar.`;
        } else {
          outcome = 'rejected';
          reason = `Salário oferecido (R$${offer.offered_salary}) muito abaixo do mínimo aceitável (R$${salaryFloor}).`;
        }

        if (outcome === 'accepted') {
          // Mark offer accepted; hand off to client to move player to roster (via accept-counter or auto)
          await adminClient.from('free_agent_offers').update({
            status: 'accepted',
            resolved_at: now.toISOString(),
          }).eq('id', offer.id);

          await adminClient.from('user_notifications').insert({
            user_id: offer.buyer_id,
            icon: '✅',
            title: `${player.name} aceitou!`,
            message: `${player.name} (${player.position}, ${player.age}a) aceitou sua proposta no Mercado Livre. Acesse o mercado para finalizar a contratação.`,
            type: 'success',
          });
        } else if (outcome === 'counter_salary') {
          await adminClient.from('free_agent_offers').update({
            status: 'counter_salary',
            counter_salary: counterSalary,
            rejection_reason: reason,
            resolved_at: now.toISOString(),
          }).eq('id', offer.id);

          await adminClient.from('user_notifications').insert({
            user_id: offer.buyer_id,
            icon: '🤵',
            title: `Empresário de ${player.name} respondeu`,
            message: reason || '',
            type: 'warning',
          });
        } else {
          await adminClient.from('free_agent_offers').update({
            status: 'rejected',
            rejection_reason: reason,
            resolved_at: now.toISOString(),
          }).eq('id', offer.id);

          await adminClient.from('user_notifications').insert({
            user_id: offer.buyer_id,
            icon: '❌',
            title: `${player.name} recusou`,
            message: reason || '',
            type: 'error',
          });
        }
        resolved++;
      }

      return json({ success: true, resolved });
    }

    // ═══════════════════════════════════════════
    // ACTION: ACCEPT COUNTER (buyer accepts agent's counter)
    // ═══════════════════════════════════════════
    if (action === 'accept-counter') {
      const { offerId, transferBudgetAvailable } = body;
      const { data: offer } = await adminClient
        .from('free_agent_offers')
        .select('*, free_agents_market!inner(*)')
        .eq('id', offerId)
        .single();
      if (!offer) return json({ error: 'Proposta não encontrada' }, 404);
      if (offer.buyer_id !== userId) return json({ error: 'Sem permissão' }, 403);
      if (offer.status !== 'counter_salary' || !offer.counter_salary) {
        return json({ error: 'Proposta não tem contraproposta válida' }, 400);
      }

      // Trava 40/40 reaplicada
      const luvas = offer.signing_bonus || 0;
      if (transferBudgetAvailable != null && luvas > transferBudgetAvailable) {
        return json({ error: 'Luvas excedem sua verba de transferências.' }, 400);
      }

      await adminClient.from('free_agent_offers').update({
        status: 'accepted',
        offered_salary: offer.counter_salary,
        resolved_at: new Date().toISOString(),
      }).eq('id', offerId);

      return json({ success: true, message: 'Contraproposta aceita! Acesse o mercado para finalizar.' });
    }

    // ═══════════════════════════════════════════
    // ACTION: COMPLETE SIGNING (buyer finalizes after acceptance)
    // ═══════════════════════════════════════════
    if (action === 'complete-signing') {
      const { offerId } = body;
      const { data: offer } = await adminClient
        .from('free_agent_offers')
        .select('*, free_agents_market!inner(*)')
        .eq('id', offerId)
        .single();
      if (!offer) return json({ error: 'Proposta não encontrada' }, 404);
      if (offer.buyer_id !== userId) return json({ error: 'Sem permissão' }, 403);
      if (offer.status !== 'accepted') return json({ error: 'Proposta não está aceita' }, 400);

      const agent = (offer as any).free_agents_market;
      const player = {
        ...agent.player_data,
        salary: offer.offered_salary,
        contract: offer.offered_contract_years,
      };

      // 🔄 Finalização robusta via RPC (atômico)
      const { data: rpcResult, error: rpcError } = await adminClient.rpc('finalize_free_agent_signing', {
        p_offer_id: offerId,
        p_buyer_id: userId
      });

      if (rpcError || !rpcResult?.success) {
        console.error('RPC Error (complete-signing):', rpcError || rpcResult?.error);
        return json({ error: 'Erro crítico ao finalizar contratação. Tente novamente.' }, 500);
      }

      const finalizedPlayer = rpcResult.player;

      return json({ 
        success: true, 
        player: finalizedPlayer, 
        salary: offer.offered_salary, 
        contractYears: offer.offered_contract_years, 
        signingBonus: offer.signing_bonus || 0 
      });

    }

    // ═══════════════════════════════════════════
    // ACTION: RESCIND PLAYER (move club player → free agents pool)
    // ═══════════════════════════════════════════
    if (action === 'rescind-player') {
      const { player, clubName } = body;
      if (!player || !player.id) return json({ error: 'Jogador inválido' }, 400);

      const visibleStats = buildVisibleStats(player);
      const { error: insErr } = await adminClient.from('free_agents_market').insert({
        player_data: { ...player, contract: 0 },
        player_name: player.name,
        player_position: player.position,
        player_age: player.age,
        player_overall: player.overall,
        visible_stats: visibleStats,
        origin: 'rescinded',
        origin_club_name: (clubName || '').slice(0, 50),
        // 24h cooldown before offers can resolve
        available_from: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      if (insErr) {
        console.error('rescind insert error:', insErr.message);
        return json({ error: 'Erro ao registrar rescisão' }, 500);
      }

      // Newspaper entry
      await adminClient.from('newspaper_entries').insert({
        user_id: userId,
        category: 'MERCADO',
        text: `💔 ${clubName || 'O clube'} rescindiu contrato de ${player.name} (${player.position}, OVR ${player.overall}). Disponível no Mercado Livre em 24h.`,
        is_event: true,
      });

      return json({ success: true });
    }

    return json({ error: 'Ação desconhecida' }, 400);
  } catch (err) {
    console.error('process-free-agent error:', err);
    return json({ error: 'Erro interno' }, 500);
  }
});
