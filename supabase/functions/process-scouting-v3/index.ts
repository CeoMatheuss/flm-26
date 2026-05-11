import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar missões concluídas que ainda não foram processadas
    const { data: missions, error: mError } = await supabaseClient
      .from('scout_missions')
      .select('*, scouts(*)')
      .eq('status', 'em_andamento')
      .lte('ends_at', new Date().toISOString())

    if (mError) throw mError

    for (const mission of (missions || [])) {
      // 1. Gerar jogadores baseados no tipo de missão e nível do olheiro
      const scout = mission.scouts
      const numPlayers = scout.level === 'elite' ? 5 : scout.level === 'alto' ? 3 : 2
      
      const reports = []
      for (let i = 0; i < numPlayers; i++) {
        const player = generateScoutedPlayer(mission.type, scout.level, scout.specialization)
        reports.push({
          user_id: mission.user_id,
          mission_id: mission.id,
          player_data: player,
          accuracy: calculateAccuracy(scout.level),
          status: 'novo'
        })
      }

      // 2. Salvar relatórios
      await supabaseClient.from('scout_reports').insert(reports)

      // 3. Finalizar missão
      await supabaseClient
        .from('scout_missions')
        .update({ status: 'concluída' })
        .eq('id', mission.id)
    }

    return new Response(JSON.stringify({ processed: missions?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function generateScoutedPlayer(type: string, level: string, spec: string) {
  const positions = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA']
  const names = ['Cauã', 'Enzo', 'Gael', 'Arthur', 'Miguel', 'Heitor', 'Theo', 'Davi', 'Gabriel', 'Bernardo']
  const surnames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes']
  
  const baseOvr = level === 'elite' ? 75 : level === 'alto' ? 70 : level === 'médio' ? 65 : 60
  const randomBonus = Math.floor(Math.random() * 15)
  
  let pos = positions[Math.floor(Math.random() * positions.length)]
  if (spec !== 'geral' && spec !== 'jovens') {
    const specMap: any = { 'ataque': 'ATA', 'defesa': 'ZAG', 'meio': 'MEI' }
    if (Math.random() > 0.3) pos = specMap[spec] || pos
  }

  return {
    name: `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`,
    age: type === 'promessas' ? 16 + Math.floor(Math.random() * 4) : 18 + Math.floor(Math.random() * 12),
    position: pos,
    overall: baseOvr + randomBonus,
    potential: baseOvr + randomBonus + Math.floor(Math.random() * 15),
    market_value: (baseOvr + randomBonus) * 100000,
    nationality: 'Brasil'
  }
}

function calculateAccuracy(level: string) {
  if (level === 'elite') return 95
  if (level === 'alto') return 85
  if (level === 'médio') return 70
  return 50
}
