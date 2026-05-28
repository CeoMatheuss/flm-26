import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id } = await req.json()
    if (!user_id) throw new Error('user_id is required')

    // 1. Fetch current save
    const { data: save, error: saveError } = await supabase
      .from('game_saves')
      .select('club_data')
      .eq('user_id', user_id)
      .maybeSingle()

    if (saveError) throw saveError
    if (!save) return new Response(JSON.stringify({ message: 'No save found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const clubData = save.club_data as any

    // 2. Migrate Club
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .upsert({
        user_id,
        name: clubData.club.name,
        budget: clubData.club.budget,
        reputation: clubData.club.reputation,
        fans: clubData.club.fans,
        stadium_name: clubData.club.stadiumName,
        primary_color: clubData.club.primaryColor,
        secondary_color: clubData.club.secondaryColor,
        logo_url: clubData.club.logo_url,
        shield_config: clubData.club.shield_config
      })
      .select()
      .single()

    if (clubError) throw clubError

    // 3. Migrate Players
    if (clubData.club.players && Array.isArray(clubData.club.players)) {
      const playersToInsert = clubData.club.players.map((p: any) => ({
        club_id: club.id,
        name: p.name,
        position: p.position,
        overall: p.overall,
        attributes: p.attributes,
        age: p.age,
        salary: p.salary,
        stamina: p.stamina,
        morale: p.morale,
        goals: p.goals || 0,
        assists: p.assists || 0,
        contract: p.contract || 2,
        market_value: p.value || 0
      }))

      const { error: playersError } = await supabase
        .from('players')
        .insert(playersToInsert)
      
      if (playersError) console.error('Error inserting players:', playersError)
    }

    // 4. Migrate Finances
    if (clubData.finances && Array.isArray(clubData.finances)) {
      const financesToInsert = clubData.finances.map((f: any) => ({
        club_id: club.id,
        type: f.type,
        category: f.category,
        amount: f.amount,
        description: f.description,
        date: f.timestamp ? new Date(f.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }))

      const { error: finError } = await supabase
        .from('finances')
        .insert(financesToInsert)
      
      if (finError) console.error('Error inserting finances:', finError)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Migration completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
