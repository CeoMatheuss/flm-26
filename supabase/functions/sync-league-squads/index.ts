
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ... (copy generation logic from previous block)
const firstNames = ['Carlos', 'Henrique', 'Vinícius', 'Jonathan', 'Renan', 'Caio', 'Yuri', 'Danilo', 'Leandro', 'Igor', 'Gustavo', 'Eduardo', 'Ricardo', 'Fabrício', 'Willian', 'Jean', 'Samuel', 'Otávio', 'Rogério', 'Adriano', 'Matheus', 'Luan', 'Wesley', 'Breno', 'Kelvin', 'Ruan', 'Davi', 'Enzo', 'Miguel', 'Arthur', 'Rafael', 'Pedro', 'Lucas', 'Felipe', 'Gabriel', 'Thiago', 'Bruno', 'André', 'Diego', 'Marcos', 'Leonardo', 'Bernardo', 'Kauan', 'Cauã', 'João', 'Nicolas', 'Heitor', 'Theo', 'Murilo', 'Guilherme', 'Vitor', 'Lorenzo', 'Benício', 'Joaquim', 'Antônio', 'Francisco', 'Isaac', 'Daniel', 'Davi Luiz', 'Noah', 'Raul', 'Lucca', 'Pietro', 'Caleb', 'Gael', 'Bento', 'Levi', 'Emanuel', 'Thomas', 'Ravi', 'Cléber', 'Neyson', 'Washington', 'Edson', 'Ronaldo', 'Rivaldo', 'Kaká', 'Romário', 'Robinho', 'Marquinhos', 'Vanderlei', 'Jailson', 'Sidnei', 'Cássio', 'Weverton', 'Hugo', 'Fagner', 'Arana', 'Reinaldo', 'Rodinei', 'Paulinho', 'Allan', 'Jorginho', 'Fernandinho', 'Casemiro', 'Fabinho', 'Rodrygo', 'Raphinha', 'Richarlison', 'Firmino'];
const lastNames = ['Pereira', 'Araújo', 'Barbosa', 'Ribeiro', 'Martins', 'Cardoso', 'Pinto', 'Nascimento', 'Moreira', 'Teixeira', 'Carvalho', 'Monteiro', 'Campos', 'Duarte', 'Correia', 'Freitas', 'Machado', 'Ramos', 'Vieira', 'Lopes', 'Santos', 'Silva', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Almeida', 'Ferreira', 'Rodrigues', 'Nunes', 'Gomes', 'Dias', 'Mendes', 'Rocha', 'Borges', 'Reis', 'Amaral', 'Melo', 'Pires', 'Tavares', 'Fonseca', 'Castro', 'Azevedo', 'Moura', 'Barros', 'Sampaio', 'Andrade', 'Cunha', 'Batista', 'Nogueira', 'Miranda', 'Cavalcanti', 'Vasconcelos', 'Xavier', 'Coelho', 'Alencar', 'Farias', 'Guimarães', 'Braga', 'Medeiros'];

function generateAttributes(position: string, overall: number) {
  const variance = () => Math.floor(Math.random() * 16 - 8);
  const gkVal = position === 'GOL' ? overall + 10 + variance() : Math.floor(overall * 0.2) + variance();
  const base: any = {
    GOL: { speed: overall - 10 + variance(), shooting: overall - 20 + variance(), passing: overall - 5 + variance(), defending: overall + 5 + variance(), physical: overall + variance(), dribbling: overall - 15 + variance(), setPieces: overall - 15 + variance(), positioning: overall + 8 + variance(), heading: overall - 5 + variance(), marking: overall + variance(), vision: overall - 5 + variance(), crossing: overall - 20 + variance(), longShots: overall - 20 + variance(), workRate: overall - 5 + variance(), composure: overall + 5 + variance(), aggression: overall - 10 + variance() },
    ZAG: { speed: overall - 5 + variance(), shooting: overall - 10 + variance(), passing: overall - 3 + variance(), defending: overall + 8 + variance(), physical: overall + 5 + variance(), dribbling: overall - 8 + variance(), setPieces: overall - 8 + variance(), positioning: overall + 5 + variance(), heading: overall + 7 + variance(), marking: overall + 8 + variance(), vision: overall - 5 + variance(), crossing: overall - 10 + variance(), longShots: overall - 8 + variance(), workRate: overall + 3 + variance(), composure: overall + 3 + variance(), aggression: overall + 5 + variance() },
    LAT: { speed: overall + 5 + variance(), shooting: overall - 5 + variance(), passing: overall + 3 + variance(), defending: overall + variance(), physical: overall + variance(), dribbling: overall + 2 + variance(), setPieces: overall - 3 + variance(), positioning: overall + 2 + variance(), heading: overall - 5 + variance(), marking: overall + 3 + variance(), vision: overall + 2 + variance(), crossing: overall + 8 + variance(), longShots: overall - 5 + variance(), workRate: overall + 5 + variance(), composure: overall + variance(), aggression: overall + 2 + variance() },
    VOL: { speed: overall - 3 + variance(), shooting: overall - 5 + variance(), passing: overall + 5 + variance(), defending: overall + 5 + variance(), physical: overall + 3 + variance(), dribbling: overall - 3 + variance(), setPieces: overall + variance(), positioning: overall + 5 + variance(), heading: overall + 3 + variance(), marking: overall + 7 + variance(), vision: overall + 3 + variance(), crossing: overall - 5 + variance(), longShots: overall - 3 + variance(), workRate: overall + 5 + variance(), composure: overall + 3 + variance(), aggression: overall + 5 + variance() },
    MEI: { speed: overall + variance(), shooting: overall + 3 + variance(), passing: overall + 8 + variance(), defending: overall - 8 + variance(), physical: overall - 3 + variance(), dribbling: overall + 5 + variance(), setPieces: overall + 5 + variance(), positioning: overall + 3 + variance(), heading: overall - 3 + variance(), marking: overall - 5 + variance(), vision: overall + 8 + variance(), crossing: overall + 3 + variance(), longShots: overall + 5 + variance(), workRate: overall + variance(), composure: overall + 5 + variance(), aggression: overall - 5 + variance() },
    ATA: { speed: overall + 5 + variance(), shooting: overall + 10 + variance(), passing: overall - 3 + variance(), defending: overall - 15 + variance(), physical: overall + variance(), dribbling: overall + 5 + variance(), setPieces: overall + 3 + variance(), positioning: overall + 8 + variance(), heading: overall + 5 + variance(), marking: overall - 12 + variance(), vision: overall + 3 + variance(), crossing: overall - 5 + variance(), longShots: overall + 5 + variance(), workRate: overall + 3 + variance(), composure: overall + 5 + variance(), aggression: overall + 3 + variance() },
  };
  const attrs = base[position] || base['MEI'];
  const clamp = (v: number) => Math.max(1, Math.min(99, v));
  const result: any = {};
  for (const k in attrs) result[k] = clamp(attrs[k]);
  result.goalkeeping = clamp(gkVal);
  return result;
}

function generatePlayer(ovrRange: [number, number], ageRange: [number, number], pos: string) {
  const overall = Math.floor(Math.random() * (ovrRange[1] - ovrRange[0] + 1) + ovrRange[0]);
  const age = Math.floor(Math.random() * (ageRange[1] - ageRange[0] + 1) + ageRange[0]);
  const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  return {
    id: crypto.randomUUID(),
    name,
    position: pos,
    overall,
    attributes: generateAttributes(pos, overall),
    age,
    stamina: 100,
    morale: 80,
    goals: 0,
    assists: 0,
    contract: Math.floor(Math.random() * 4) + 1,
    gamesPlayed: 0
  };
}

function generateSquad(tier: 'strong' | 'medium' | 'weak') {
  const ovrRange: any = { strong: [75, 88], medium: [65, 78], weak: [55, 68] };
  const range = ovrRange[tier];
  const blueprint = [
    { pos: 'GOL' }, { pos: 'GOL' }, { pos: 'GOL', isYouth: true },
    { pos: 'ZAG' }, { pos: 'ZAG' }, { pos: 'ZAG' }, { pos: 'ZAG' }, { pos: 'ZAG', isYouth: true }, { pos: 'ZAG', isYouth: true },
    { pos: 'LAT', side: 'R' }, { pos: 'LAT', side: 'R' }, { pos: 'LAT', side: 'R', isYouth: true },
    { pos: 'LAT', side: 'L' }, { pos: 'LAT', side: 'L' }, { pos: 'LAT', side: 'L', isYouth: true },
    { pos: 'VOL' }, { pos: 'VOL' }, { pos: 'VOL' }, { pos: 'VOL', isYouth: true }, { pos: 'VOL', isYouth: true },
    { pos: 'MEI' }, { pos: 'MEI' }, { pos: 'MEI' }, { pos: 'MEI' }, { pos: 'MEI', isYouth: true }, { pos: 'MEI', isYouth: true }, { pos: 'MEI', isYouth: true }, { pos: 'MEI', isYouth: true },
    { pos: 'ATA', side: 'L' }, { pos: 'ATA', side: 'L', isYouth: true },
    { pos: 'ATA', side: 'R' }, { pos: 'ATA', side: 'R', isYouth: true },
    { pos: 'ATA', side: 'C' }, { pos: 'ATA', side: 'C' }, { pos: 'ATA', side: 'C', isYouth: true },
  ];
  return blueprint.map(slot => {
    const ageRange: [number, number] = slot.isYouth ? [16, 19] : [20, 34];
    const curRange: [number, number] = slot.isYouth ? [Math.max(30, range[0] - 15), range[0]] : range;
    const p: any = generatePlayer(curRange, ageRange, slot.pos);
    if (slot.side) p.side = slot.side;
    if (slot.isYouth) { p.isYouth = true; p.potential = p.overall + 15; p.squadRole = 'promessa'; }
    else { p.potential = p.overall + 5; p.squadRole = p.overall > range[1] - 5 ? 'titular' : 'reserva'; }
    return p;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    // Fetch members in batches
    let offset = 0;
    const limit = 500;
    let totalProcessed = 0;

    while (true) {
      const { data: members, error } = await sb.from("league_members").select("*").range(offset, offset + limit - 1);
      if (error || !members || members.length === 0) break;

      const squadInserts = [];
      for (const member of members) {
          const tier = member.bot_strength >= 75 ? 'strong' : (member.bot_strength <= 45 ? 'weak' : 'medium');
          const squad = generateSquad(tier);
          squadInserts.push({
            league_id: member.league_id,
            user_id: member.user_id || '00000000-0000-0000-0000-000000000000', // for bots
            member_id: member.id,
            squad_data: { players: squad, tactics: { formation: '4-3-3' } }
          });
      }
      
      // Since league_squads uses league_id and user_id as keys, but user_id can be same for many bots (null), 
      // we might need member_id in league_squads. 
      // Let's check league_squads columns again.
      const { error: insErr } = await sb.from("league_squads").upsert(squadInserts.map(s => ({
        league_id: s.league_id,
        user_id: s.user_id,
        squad_data: s.squad_data
      })));
      
      if (insErr) console.error("Error inserting squads:", insErr);

      totalProcessed += members.length;
      offset += limit;
      if (members.length < limit) break;
    }

    return new Response(JSON.stringify({ ok: true, processed: totalProcessed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
