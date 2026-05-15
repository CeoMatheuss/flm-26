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

    const { data: club, error: clubError } = await adminClient
      .from('clubs')
      .select('id, country, last_youth_generation_at')
      .eq('user_id', user.id)
      .single();

    if (clubError || !club) throw new Error("Club not found");

    const now = new Date();
    const lastGen = club.last_youth_generation_at ? new Date(club.last_youth_generation_at) : null;
    const cycleMs = 7 * 24 * 60 * 60 * 1000;

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

    const nationality = Math.random() < 0.9 ? (club.country || 'Brasil') : getRandomElement(['Brasil', 'Portugal', 'Argentina']);
    const name = `${getRandomElement(NAMES_BY_COUNTRY[nationality] || NAMES_BY_COUNTRY['Brasil'])} ${getRandomElement(SURNAMES_BY_COUNTRY[nationality] || SURNAMES_BY_COUNTRY['Brasil'])}`;
    const age = Math.floor(Math.random() * 3) + 15;
    const position = getRandomElement(POSITIONS);
    
    const rand = Math.random();
    let rarity: 'Comum' | 'Bom talento' | 'Promessa' | 'Craque geracional' = 'Comum';
    let baseOvr = 45 + Math.floor(Math.random() * 10);
    let potential = baseOvr + 15 + Math.floor(Math.random() * 10);

    if (rand < 0.01) {
      rarity = 'Craque geracional';
      baseOvr += 15;
      potential = 95 + Math.floor(Math.random() * 5);
    } else if (rand < 0.05) {
      rarity = 'Promessa';
      baseOvr += 10;
      potential = 88 + Math.floor(Math.random() * 7);
    } else if (rand < 0.20) {
      rarity = 'Bom talento';
      baseOvr += 5;
      potential = 80 + Math.floor(Math.random() * 8);
    }

    potential = Math.min(99, potential);
    const overall = Math.min(potential - 5, baseOvr);

    const attributes = generatePlayerAttributes(overall, position);
    const personality = getRandomElement(PERSONALITIES);
    const dominantFoot = Math.random() < 0.7 ? 'Destro' : Math.random() < 0.9 ? 'Canhoto' : 'Ambidestro';
    
    const marketValue = (overall * overall * 1000) + (potential * potential * 2000);

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
        months_in_academy: 0
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await adminClient
      .from('clubs')
      .update({ last_youth_generation_at: now.toISOString() })
      .eq('id', club.id);

    await adminClient.from('user_notifications').insert({
      user_id: user.id,
      icon: '🎓',
      title: rarity === 'Comum' ? 'Novo Junior!' : `⭐ Nova ${rarity}!`,
      message: `${name} (${position}, OVR ${overall}) acaba de chegar na base do clube.`,
      type: rarity === 'Comum' ? 'info' : 'success'
    });

    return new Response(JSON.stringify({ success: true, prospect }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Error generating youth player:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
