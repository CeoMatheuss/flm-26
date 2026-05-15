
import { createClient } from "@supabase/supabase-js";
import { generateInitialSquad } from "./src/utils/playerGenerator.ts";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetWorld() {
  console.log("Starting full world reset...");

  // 1. Clear match data
  const tablesToClear = [
    'league_player_stats',
    'match_history',
    'match_reports',
    'league_matches',
    'national_cup_matches',
    'national_cup_teams',
    'world_player_stats',
    'world_league_table',
    'world_matches',
    'league_squads',
    'world_players',
    'youth_prospects',
    'transfer_listings',
    'transfer_log',
    'transfer_offers'
  ];

  for (const table of tablesToClear) {
    console.log(`Clearing ${table}...`);
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error(`Error clearing ${table}:`, error);
  }

  // 2. Fetch all clubs
  const { data: clubs, error: clubsErr } = await supabase
    .from('clubs')
    .select('id, user_id, name, reputation');

  if (clubsErr) throw clubsErr;
  console.log(`Found ${clubs.length} clubs.`);

  // 3. Generate and assign squads
  for (const club of clubs) {
    console.log(`Generating squad for ${club.name}...`);
    
    // Determine tier based on reputation
    let tier: 'strong' | 'medium' | 'weak' = 'medium';
    if (club.reputation >= 75) tier = 'strong';
    else if (club.reputation <= 45) tier = 'weak';

    const squad = generateInitialSquad(club.name, tier);
    
    // Update game_saves
    if (club.user_id) {
        const { data: save } = await supabase
          .from('game_saves')
          .select('club_data')
          .eq('user_id', club.user_id)
          .maybeSingle();
          
        const clubData = save?.club_data || {};
        clubData.players = squad;
        clubData.club = { ...clubData.club, name: club.name };
        
        await supabase
          .from('game_saves')
          .upsert({ 
              user_id: club.user_id, 
              club_data: clubData,
              updated_at: new Date().toISOString()
          });
          
        // Also update league_squads if they are in a league
        const { data: member } = await supabase
          .from('league_members')
          .select('league_id')
          .eq('user_id', club.user_id)
          .maybeSingle();
          
        if (member) {
            await supabase
              .from('league_squads')
              .upsert({
                  league_id: member.league_id,
                  user_id: club.user_id,
                  squad_data: { players: squad, tactics: { formation: '4-3-3' } },
                  updated_at: new Date().toISOString()
              });
        }
    }
    
    // Update world_players for stats/rankings
    const playerInserts = squad.map(p => ({
        id: p.id,
        team_id: club.id,
        name: p.name,
        position: p.position,
        overall: p.overall,
        age: p.age
    }));
    
    await supabase.from('world_players').insert(playerInserts);
  }

  console.log("World reset complete!");
}

resetWorld().catch(console.error);
