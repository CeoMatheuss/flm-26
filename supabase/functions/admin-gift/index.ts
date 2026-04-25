import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FOUNDER_EMAIL = 'fcmsistemas7@gmail.com';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Use stored hash from secrets
async function getBanPasswordHash(): Promise<string> {
  const stored = Deno.env.get('BAN_PASSWORD_HASH');
  if (stored && /^[a-f0-9]{64}$/.test(stored)) return stored;
  // Fallback: hash a default (should be replaced via secrets)
  return hashPassword('CHANGE_ME_NOW');
}
const BAN_PASSWORD_HASH_PROMISE = getBanPasswordHash();

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

    // Verify admin role
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Acesso negado.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { giftType, targetUserId, banPassword, banReason, banMonths, playerOverall, playerPosition, playerDestination, playerMinPrice, playerAge: requestedAge } = body;

    // ========== GAME BAN ==========
    if (giftType === 'game_ban') {
      if (!banPassword || typeof banPassword !== 'string') {
        return new Response(JSON.stringify({ error: 'Senha de banimento obrigatória' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Verify ban password
      const providedHash = await hashPassword(banPassword);
      const expectedHash = await BAN_PASSWORD_HASH_PROMISE;

      if (providedHash !== expectedHash) {
        return new Response(JSON.stringify({ error: 'Senha de banimento incorreta!' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.length > 100) {
        return new Response(JSON.stringify({ error: 'ID do usuário inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const months = Math.max(1, Math.min(120, Number(banMonths) || 1));
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);

      // Check if already banned
      const { data: existingBan } = await adminClient
        .from('game_bans')
        .select('id')
        .eq('user_id', targetUserId)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingBan) {
        return new Response(JSON.stringify({ error: 'Usuário já está banido do jogo!' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error } = await adminClient.from('game_bans').insert({
        user_id: targetUserId,
        banned_by: userId,
        reason: (banReason || 'Sem motivo').slice(0, 500),
        duration_months: months,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: `Jogador banido por ${months} mês(es) até ${expiresAt.toLocaleDateString('pt-BR')}!` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== GENERATE PLAYER ==========
    if (giftType === 'generate_player') {
      // Verify founder
      const { data: userData } = await adminClient.auth.admin.getUserById(userId);
      if (!userData?.user || userData.user.email !== FOUNDER_EMAIL) {
        return new Response(JSON.stringify({ error: 'Somente o Fundador pode gerar jogadores.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const ovr = Math.max(40, Math.min(99, Number(playerOverall) || 60));
      const positions = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
      const pos = positions.includes(playerPosition) ? playerPosition : positions[Math.floor(Math.random() * positions.length)];
      const dest = ['market', 'auction'].includes(playerDestination) ? playerDestination : 'market';

      // Generate player data server-side
      const firstNames = ['Carlos', 'Henrique', 'Vinícius', 'Jonathan', 'Renan', 'Caio', 'Yuri', 'Danilo', 'Leandro', 'Igor', 'Gustavo', 'Eduardo', 'Ricardo', 'Fabrício', 'Willian', 'Matheus', 'Luan', 'Wesley', 'Rafael', 'Pedro', 'Lucas', 'Felipe', 'Gabriel', 'Thiago', 'Bruno'];
      const lastNames = ['Pereira', 'Araújo', 'Barbosa', 'Ribeiro', 'Martins', 'Cardoso', 'Santos', 'Silva', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Almeida', 'Ferreira', 'Rodrigues', 'Nunes', 'Gomes', 'Dias', 'Mendes', 'Rocha'];
      
      const playerName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
      const playerAge = (requestedAge && typeof requestedAge === 'number' && requestedAge >= 16 && requestedAge <= 38) ? requestedAge : Math.floor(Math.random() * 13 + 18); // 18-30

      // Simple attribute generation
      const variance = () => Math.floor(Math.random() * 16 - 8);
      const clamp = (v: number) => Math.max(1, Math.min(99, v));
      const attrs: Record<string, number> = {};
      const attrNames = ['speed', 'shooting', 'passing', 'defending', 'physical', 'dribbling', 'setPieces', 'positioning', 'heading', 'marking', 'vision', 'crossing', 'longShots', 'workRate', 'composure', 'aggression', 'goalkeeping'];
      for (const a of attrNames) {
        if (a === 'goalkeeping') {
          attrs[a] = clamp(pos === 'GOL' ? ovr + 10 + variance() : Math.floor(ovr * 0.2) + variance());
        } else {
          attrs[a] = clamp(ovr + variance());
        }
      }

      const playerData = {
        id: crypto.randomUUID().replace(/-/g, '').slice(0, 9),
        name: playerName,
        position: pos,
        overall: ovr,
        attributes: attrs,
        age: playerAge,
        salary: Math.floor(ovr * 100),
        stamina: 85,
        morale: 75,
        goals: 0,
        assists: 0,
        contract: 3,
        gamesPlayed: 0,
        trainingProgress: 0,
        history: [],
        personality: 'dedicado',
      };

      // Calculate price based on OVR + age (same logic as getPlayerBaseValue)
      const getBaseValue = (o: number) => {
        if (o >= 85) return o * 80000;
        if (o >= 75) return o * 40000;
        if (o >= 65) return o * 20000;
        if (o >= 55) return o * 10000;
        return o * 5000;
      };
      const getAgeMultiplier = (a: number) => {
        if (a <= 20) return 1.5;
        if (a <= 22) return 1.4;
        if (a <= 24) return 1.3;
        if (a <= 27) return 1.2;
        if (a <= 29) return 1.0;
        if (a <= 31) return 0.7;
        if (a <= 33) return 0.4;
        return 0.2;
      };
      const minPrice = Math.floor(getBaseValue(ovr) * getAgeMultiplier(playerAge));

      if (dest === 'market') {
        const { error } = await adminClient.from('transfer_listings').insert({
          seller_id: userId,
          seller_club_name: '⚡ ADM',
          player_name: playerName,
          player_age: playerAge,
          player_overall: ovr,
          player_position: pos,
          player_data: playerData,
          asking_price: minPrice,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: `${playerName} (${pos} OVR ${ovr}) listado no mercado por R$${minPrice.toLocaleString()}!` }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Compute next Sunday 17:00 (America/Sao_Paulo) – simple UTC approximation: SP=UTC-3
        const now = new Date();
        const spOffsetMs = -3 * 60 * 60 * 1000;
        const spNow = new Date(now.getTime() + spOffsetMs);
        const dow = spNow.getUTCDay(); // 0=Sun
        const daysUntilSun = (7 - dow) % 7;
        const sundaySpDate = new Date(Date.UTC(spNow.getUTCFullYear(), spNow.getUTCMonth(), spNow.getUTCDate() + daysUntilSun, 17 + 3, 0, 0));
        if (sundaySpDate.getTime() <= now.getTime()) {
          sundaySpDate.setUTCDate(sundaySpDate.getUTCDate() + 7);
        }
        const expiresAt = sundaySpDate;
        const { error } = await adminClient.from('player_auctions').insert({
          seller_id: userId,
          seller_club_name: '⚡ ADM',
          player_name: playerName,
          player_age: playerAge,
          player_overall: ovr,
          player_data: playerData,
          min_price: minPrice,
          current_bid: minPrice,
          is_system: true,
          expires_at: expiresAt.toISOString(),
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: `${playerName} (${pos} OVR ${ovr}) colocado em leilão com lance mínimo R$${minPrice.toLocaleString()}!` }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ========== EXISTING GIFT OPERATIONS (Founder only) ==========
    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.length > 100) {
      return new Response(JSON.stringify({ error: 'ID do usuário inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify founder for gift operations
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
    if (userError || !userData?.user || userData.user.email !== FOUNDER_EMAIL) {
      return new Response(JSON.stringify({ error: 'Somente o Fundador pode realizar esta ação.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!['premium', 'sticker', 'unban'].includes(giftType)) {
      return new Response(JSON.stringify({ error: 'Tipo de presente inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify target user exists
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (giftType === 'premium') {
      const { error } = await adminClient.from('premium_users').insert({
        user_id: targetUserId,
        status: 'active',
        pix_transaction_id: 'GIFT_BY_FOUNDER',
      });
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          return new Response(JSON.stringify({ error: 'Usuário já é premium!' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        throw error;
      }
      return new Response(JSON.stringify({ success: true, message: 'Premium presenteado com sucesso!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (giftType === 'sticker') {
      // Gift sticker pack - store in journal as a special update
      await adminClient.from('journal_updates').insert({
        user_id: userId,
        title: '🎁 Figurinha Presenteada',
        content: `O Fundador presenteou o jogador ${targetUserId.slice(0, 8)}... com um pacote de figurinhas especial!`,
      });
      return new Response(JSON.stringify({ success: true, message: 'Figurinha presenteada com sucesso!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (giftType === 'unban') {
      // Remove both chat bans and game bans
      const { data: chatBanData } = await adminClient.from('chat_bans').select('id').eq('user_id', targetUserId);
      const { data: gameBanData } = await adminClient.from('game_bans').select('id').eq('user_id', targetUserId);
      
      if ((!chatBanData || chatBanData.length === 0) && (!gameBanData || gameBanData.length === 0)) {
        return new Response(JSON.stringify({ error: 'Usuário não está banido.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await adminClient.from('chat_bans').delete().eq('user_id', targetUserId);
      await adminClient.from('game_bans').delete().eq('user_id', targetUserId);
      return new Response(JSON.stringify({ success: true, message: 'Usuário desbanido de tudo!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Operação desconhecida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('admin-gift error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
