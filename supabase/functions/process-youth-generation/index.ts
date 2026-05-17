import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// --- Player Generation Constants ---
const POSITIONS = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
const PERSONALITIES = ['lider', 'festeiro', 'dedicado', 'preguicoso', 'ambicioso', 'leal', 'temperamental', 'calmo', 'competitivo', 'introvertido'];
const DOMINANT_FEET = ['Destro', 'Canhoto', 'Ambidestro'];

const NAMES_BY_COUNTRY: Record<string, string[]> = {
  'Brasil': ['Gabriel', 'Lucas', 'Matheus', 'Vinícius', 'Pedro', 'João', 'Felipe', 'Thiago', 'Bruno', 'Rodrigo', 'Arthur', 'Diego', 'Rafael', 'Vitor', 'Gustavo'],
  'Portugal': ['João', 'Tiago', 'Rui', 'Gonçalo', 'Nuno', 'André', 'Diogo', 'Miguel', 'Francisco', 'Ricardo', 'Bernardo', 'Cristiano', 'Bruno'],
  'Argentina': ['Lionel', 'Angel', 'Lautaro', 'Julian', 'Enzo', 'Paulo', 'Rodrigo', 'Emiliano', 'Alexis', 'Nicolas', 'Lisandro', 'Nahuel'],
};

const SURNAMES_BY_COUNTRY: Record<string, string[]> = {
  'Brasil': ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Lopes'],
  'Portugal': ['Fernandes', 'Pereira', 'Gomes', 'Rodrigues', 'Almeida', 'Mendes', 'Lopes', 'Teixeira', 'Ribeiro', 'Costa', 'Sousa', 'Santos'],
  'Argentina': ['Gonzalez', 'Rodriguez', 'Lopez', 'Martinez', 'Garcia', 'Gomez', 'Perez', 'Sanchez', 'Diaz', 'Fernandez', 'Alvarez'],
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePlayerAttributes(overall: number, position: string) {
  const attrs: any = {
    speed: overall,
    shooting: overall,
    passing: overall,
    defending: overall,
    physical: overall,
    dribbling: overall,
    setPieces: overall,
    positioning: overall,
    heading: overall,
    marking: overall,
    vision: overall,
    crossing: overall,
    longShots: overall,
    workRate: overall,
    composure: overall,
    aggression: overall,
  };

  if (position === 'GOL') {
    attrs.goalkeeping = overall + 5;
    attrs.defending = Math.max(1, overall - 20);
    attrs.shooting = Math.max(1, overall - 30);
  } else if (position === 'ZAG') {
    attrs.defending = Math.min(99, overall + 10);
    attrs.marking = Math.min(99, overall + 10);
    attrs.shooting = Math.max(1, overall - 15);
  } else if (position === 'ATA') {
    attrs.shooting = Math.min(99, overall + 10);
    attrs.speed = Math.min(99, overall + 5);
    attrs.defending = Math.max(1, overall - 20);
  }

  for (const key in attrs) {
    attrs[key] = Math.max(1, Math.min(99, attrs[key] + Math.floor(Math.random() * 11) - 5));
  }

  return attrs;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("User not found");

    let { data: club } = await adminClient
      .from('clubs')
      .select('id, country, last_youth_generation_at')
      .eq('user_id', user.id)
      .maybeSingle();

    // Auto-create club row if missing (using game_saves data)
    if (!club) {
      const { data: saveRow } = await adminClient
        .from('game_saves').select('club_data').eq('user_id', user.id).maybeSingle();
      const cd: any = saveRow?.club_data || {};
      const { data: created, error: createErr } = await adminClient
        .from('clubs')
        .insert({
          user_id: user.id,
          name: cd.name || 'Meu Clube',
          country: cd.country || 'Brasil',
          fans: cd.fans || 1000,
          reputation: cd.reputation || 65,
        })
        .select('id, country, last_youth_generation_at')
        .single();
      if (createErr) throw createErr;
      club = created;
    }

    const now = new Date();

    // Fetch academy info from game_saves
    const { data: save } = await adminClient
      .from('game_saves')
      .select('club_data')
      .eq('user_id', user.id)
      .maybeSingle();

    const clubData = save?.club_data || {};
    const infrastructure = clubData.infrastructure || {};
    const academy = infrastructure.youthAcademy || null;
    const academyLevel = academy?.level || 0;
    const academyActive = !!academy && academyLevel >= 1 && academy.active !== false;
    const investmentAmount = clubData.youthInvestment || 0;

    // GUARD: only clubs with an active youth academy can generate prospects
    if (!academyActive) {
      return new Response(JSON.stringify({
        error: 'Seu clube ainda não possui categoria de base ativa. Construa/ative a Base na Infraestrutura para revelar jovens talentos.',
        noAcademy: true,
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // LIMIT: max prospects in academy depends on level (10 + 2 per level, cap 40)
    const maxProspects = Math.min(40, 10 + academyLevel * 2);
    const { count: currentCount } = await adminClient
      .from('youth_prospects')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', club.id);
    if ((currentCount || 0) >= maxProspects) {
      return new Response(JSON.stringify({
        error: `Sua base já está cheia (${currentCount}/${maxProspects}). Promova ou libere jovens antes de revelar novos.`,
        full: true,
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // CYCLE: better academies reveal talents more often (level 1 = 14d → level 10+ = 3d)
    const cycleDays = Math.max(3, 15 - academyLevel);
    const cycleMs = cycleDays * 24 * 60 * 60 * 1000;
    const lastGen = club.last_youth_generation_at ? new Date(club.last_youth_generation_at) : null;

    if (lastGen && (now.getTime() - lastGen.getTime()) < cycleMs) {
      const remaining = cycleMs - (now.getTime() - lastGen.getTime());
      const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      return new Response(JSON.stringify({ 
        error: `Próximo jogador disponível em ${days}d ${hours}h.`,
        cooldown: true,
        nextGenerationAt: new Date(lastGen.getTime() + cycleMs).toISOString()
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Determine nationality
    const nationality = Math.random() < 0.9 ? (club.country || 'Brasil') : getRandomElement(['Brasil', 'Portugal', 'Argentina']);
    const name = `${getRandomElement(NAMES_BY_COUNTRY[nationality] || NAMES_BY_COUNTRY['Brasil'])} ${getRandomElement(SURNAMES_BY_COUNTRY[nationality] || SURNAMES_BY_COUNTRY['Brasil'])}`;
    
    // Age: 15-17 only
    const age = Math.floor(Math.random() * 3) + 15;
    const position = getRandomElement(POSITIONS);
    
    // OVR based on age (Realism update)
    // 15: 45-58, 16: 48-62, 17: 52-66
    let minOvr = 45;
    let maxOvr = 58;
    if (age === 16) { minOvr = 48; maxOvr = 62; }
    if (age === 17) { minOvr = 52; maxOvr = 66; }

    // Bonus based on academy level (0-10 OVR boost)
    const academyBonus = Math.floor(academyLevel / 3);
    minOvr += academyBonus;
    maxOvr += academyBonus;

    let baseOvr = minOvr + Math.floor(Math.random() * (maxOvr - minOvr + 1));
    
    // Investment bonus (0-5 OVR boost)
    if (investmentAmount >= 2400000) baseOvr += 5;
    else if (investmentAmount >= 1200000) baseOvr += 3;
    else if (investmentAmount >= 600000) baseOvr += 1;

    // Tabela oficial de potencial por nível da Base (1-30)
    const POT_TABLE: Array<{min: number; max: number; rare: number; bMin: number; bMax: number}> = [
      {min:45,max:52,rare:0.005,bMin:4,bMax:8},{min:46,max:53,rare:0.005,bMin:4,bMax:8},{min:47,max:54,rare:0.005,bMin:4,bMax:8},
      {min:48,max:55,rare:0.015,bMin:4,bMax:9},{min:49,max:56,rare:0.015,bMin:4,bMax:9},
      {min:50,max:58,rare:0.025,bMin:5,bMax:9},{min:51,max:59,rare:0.025,bMin:5,bMax:9},
      {min:52,max:60,rare:0.04,bMin:5,bMax:10},{min:53,max:61,rare:0.04,bMin:5,bMax:10},
      {min:56,max:64,rare:0.06,bMin:5,bMax:10},{min:57,max:65,rare:0.06,bMin:5,bMax:10},{min:58,max:66,rare:0.06,bMin:5,bMax:10},
      {min:59,max:67,rare:0.09,bMin:6,bMax:11},{min:60,max:68,rare:0.09,bMin:6,bMax:11},{min:61,max:69,rare:0.09,bMin:6,bMax:11},
      {min:62,max:71,rare:0.12,bMin:6,bMax:11},{min:63,max:72,rare:0.12,bMin:6,bMax:11},
      {min:64,max:73,rare:0.16,bMin:6,bMax:12},{min:65,max:74,rare:0.16,bMin:6,bMax:12},{min:66,max:75,rare:0.16,bMin:6,bMax:12},
      {min:67,max:77,rare:0.20,bMin:7,bMax:12},{min:68,max:78,rare:0.20,bMin:7,bMax:12},
      {min:69,max:79,rare:0.25,bMin:7,bMax:13},{min:70,max:80,rare:0.25,bMin:7,bMax:13},{min:71,max:81,rare:0.25,bMin:7,bMax:13},
      {min:72,max:83,rare:0.32,bMin:8,bMax:14},{min:73,max:84,rare:0.32,bMin:8,bMax:14},{min:74,max:85,rare:0.32,bMin:8,bMax:14},
      {min:75,max:86,rare:0.38,bMin:9,bMax:15},
      {min:76,max:88,rare:0.45,bMin:10,bMax:16},
    ];
    const tier = POT_TABLE[Math.max(0, Math.min(29, academyLevel - 1))];
    const investRareBoost = investmentAmount >= 2400000 ? 0.04
      : investmentAmount >= 1200000 ? 0.02
      : investmentAmount >= 600000 ? 0.01 : 0;
    const isRare = Math.random() < (tier.rare + investRareBoost);

    let potential: number;
    if (isRare) {
      potential = Math.min(99, tier.max + tier.bMin + Math.floor(Math.random() * (tier.bMax - tier.bMin + 1)));
    } else {
      potential = tier.min + Math.floor(Math.random() * (tier.max - tier.min + 1));
    }
    potential = Math.min(99, Math.max(potential, baseOvr + 3));

    const rarity: 'Comum' | 'Bom talento' | 'Promessa' | 'Craque geracional' =
      potential >= 90 ? 'Craque geracional'
      : potential >= 82 ? 'Promessa'
      : potential >= 75 ? 'Bom talento'
      : 'Comum';
    const overall = baseOvr;

    const attributes = generatePlayerAttributes(overall, position);
    const personality = getRandomElement(PERSONALITIES);
    const dominantFoot = Math.random() < 0.7 ? 'Destro' : Math.random() < 0.9 ? 'Canhoto' : 'Ambidestro';
    
    // Generate height and weight based on age and position
    // GOL/ZAG tend to be taller
    let baseHeight = 165 + (age - 15) * 3; // 15y: 165, 17y: 171
    if (position === 'GOL' || position === 'ZAG') baseHeight += 8;
    if (position === 'ATA') baseHeight += 3;
    const height = baseHeight + Math.floor(Math.random() * 15); // Random variation
    const weight = height - 100 - 5 + Math.floor(Math.random() * 15);

    const tactical_iq = Math.floor(Math.random() * 20) + 30 + (overall / 5);
    const interception = position === 'ZAG' || position === 'VOL' ? Math.min(99, overall + 10) : Math.max(10, overall - 15);
    const stamina_stat = overall + Math.floor(Math.random() * 10) - 5;

    // 💰 Valor de mercado realista: OVR + POT + idade + posição + raridade
    const baseV = overall >= 90 ? overall * 220000
      : overall >= 85 ? overall * 135000
      : overall >= 80 ? overall * 76000
      : overall >= 75 ? overall * 46000
      : overall >= 70 ? overall * 28000
      : overall >= 65 ? overall * 18000
      : overall >= 60 ? overall * 11500
      : overall >= 55 ? overall * 7500
      : overall * 4200;
    const ageF = age <= 16 ? 1.22 : age === 17 ? 1.16 : 1.08;
    const potM = potential >= 94 ? 1.62 : potential >= 90 ? 1.42 : potential >= 86 ? 1.28 : potential >= 82 ? 1.18 : potential >= 75 ? 1.08 : potential >= 68 ? 1.0 : 0.88;
    const posM = position === 'ATA' ? 1.08 : position === 'MEI' ? 1.05 : position === 'GOL' ? 1.03 : position === 'ZAG' ? 0.96 : position === 'LAT' ? 0.94 : 1.0;
    const rarityM = rarity === 'Craque geracional' ? 1.35 : rarity === 'Promessa' ? 1.18 : rarity === 'Bom talento' ? 1.08 : 0.92;
    const marketValue = Math.max(35000, Math.min(25000000, Math.floor((baseV * ageF * potM * posM * rarityM) / 5000) * 5000));

    const { data: prospect, error: insertError } = await adminClient
      .from('youth_prospects')
      .insert({
        club_id: club.id,
        name,
        age,
        position,
        overall,
        potential,
        attributes,
        market_value: marketValue,
        personality,
        dominant_foot: dominantFoot,
        rarity,
        nationality,
        morale: 100,
        months_in_academy: 0,
        height,
        weight,
        tactical_iq,
        interception,
        stamina_stat,
        energy: 100,
        fatigue: 0,
        contract_status: 'base',
        evolution_history: JSON.stringify([{
          date: new Date().toISOString(),
          overall: overall,
          attributes: attributes
        }])
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await adminClient
      .from('clubs')
      .update({ last_youth_generation_at: now.toISOString() })
      .eq('id', club.id);

    await adminClient.from('user_notifications').insert([
      { user_id: user.id, icon: '🎓', title: '🌟 Novo jogador adicionado aos juniores.', message: `${name} (${position}, OVR ${overall}, POT ${potential}) chegou à base.`, type: rarity === 'Comum' ? 'info' : 'success' },
      { user_id: user.id, icon: '📋', title: '📋 Banco de reservas atualizado.', message: 'O elenco foi reconstruído automaticamente com os juniores disponíveis.', type: 'info' },
      { user_id: user.id, icon: '💰', title: '💰 Valor de mercado recalculado.', message: `${name} agora vale R$ ${marketValue.toLocaleString('pt-BR')}.`, type: 'info' }
    ]);

    return new Response(JSON.stringify({ success: true, prospect }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Error generating youth player:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
