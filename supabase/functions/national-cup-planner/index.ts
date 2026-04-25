// National Cup Planner — orchestrates start_national_cup() across all countries
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COUNTRIES = [
  'Brasil','Argentina','Uruguai','Chile','Colômbia','Peru','Equador','Paraguai','Bolívia','Venezuela',
  'Espanha','Inglaterra','Itália','Alemanha','França','Portugal','Holanda','Bélgica','Turquia','Rússia',
  'Suécia','Noruega','Dinamarca','Suíça','Áustria',
  'México','Estados Unidos','Canadá',
  'Egito','Marrocos','Nigéria','África do Sul',
  'Japão','Coreia do Sul','Arábia Saudita','China','Índia',
  'Austrália','Nova Zelândia',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const seasonYear = new Date().getFullYear()
  const results: any[] = []

  for (const country of COUNTRIES) {
    try {
      const { data, error } = await supa.rpc('start_national_cup', {
        _country: country,
        _season_year: seasonYear,
      })
      results.push({ country, cup_id: data, error: error?.message })
    } catch (e) {
      results.push({ country, error: String(e) })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
