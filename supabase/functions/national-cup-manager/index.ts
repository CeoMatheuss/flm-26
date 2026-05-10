import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COUNTRY_CODES = [
  'BR', 'AR', 'UY', 'PY', 'CL', 'CO', 'PE', 'EC', 'BO', 'VE',
  'EN', 'ES', 'DE', 'IT', 'FR', 'PT', 'NL', 'BE', 'TR', 'SC',
  'US', 'MX', 'CA', 'CR', 'HN', 'PA',
  'EG', 'MA', 'TN', 'NG', 'SN', 'ZA', 'GH', 'CM',
  'JP', 'KR', 'CN', 'SA', 'QA', 'IR', 'AU', 'AE'
];

function getCupName(code: string) {
  const names: Record<string, string> = {
    'BR': 'Copa do Brasil', 'AR': 'Copa Argentina', 'UY': 'Copa Uruguay',
    'EN': 'FA Cup', 'ES': 'Copa del Rey', 'DE': 'DFB Pokal',
    'IT': 'Coppa Italia', 'FR': 'Coupe de France', 'PT': 'Taça de Portugal'
  };
  return names[code] || `Copa Nacional (${code})`;
}

function getPhaseName(remainingTeams: number) {
  if (remainingTeams <= 2) return 'Final';
  if (remainingTeams <= 4) return 'Semifinal';
  if (remainingTeams <= 8) return 'Quartas de Final';
  if (remainingTeams <= 16) return 'Oitavas de Final';
  if (remainingTeams <= 32) return '3ª Fase';
  if (remainingTeams <= 64) return '2ª Fase';
  return '1ª Fase';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'generate_all';
    const seasonYear = body.seasonYear || new Date().getFullYear();

    if (action === 'generate_all') {
      const results = [];
      for (const country of COUNTRY_CODES) {
        // 1. Get clubs for this country
        const { data: saves } = await supabase
          .from('game_saves')
          .select('user_id, club_data, game_state')
          .eq('country', country);

        const realClubs = (saves || []).map(s => ({
          user_id: s.user_id,
          club_name: s.game_state?.club?.name || s.club_data?.name || 'Clube',
          club_logo: s.game_state?.club?.logo || s.club_data?.logo || '⚽',
          strength: s.game_state?.club?.strength || 60
        }));

        // 2. Create Cup
        const cupName = getCupName(country);
        const { data: cup, error: cupErr } = await supabase
          .from('cup_competitions')
          .insert({
            name: cupName,
            country: country,
            cup_type: 'national',
            is_national_cup: true,
            status: 'registration',
            season_year: seasonYear,
            current_round: 1,
            total_rounds: 5, // Default
            prize_pool: 10000000
          })
          .select()
          .single();

        if (cupErr) {
          results.push({ country, error: cupErr.message });
          continue;
        }

        // 3. Enroll Clubs
        const teamsToEnroll = [];
        // Add all real clubs
        for (const club of realClubs) {
          teamsToEnroll.push({
            cup_id: cup.id,
            user_id: club.user_id,
            club_name: club.club_name,
            club_logo: club.club_logo,
            is_bot: false,
            bot_strength: club.strength
          });
        }

        // Fill with Bots if needed (minimum 16 for a decent cup)
        const minTeams = 16;
        if (teamsToEnroll.length < minTeams) {
          const needed = minTeams - teamsToEnroll.length;
          for (let i = 0; i < needed; i++) {
            teamsToEnroll.push({
              cup_id: cup.id,
              is_bot: true,
              bot_name: `Bot ${country} ${i + 1}`,
              bot_strength: 50 + Math.floor(Math.random() * 30),
              club_name: `Bot ${country} ${i + 1}`,
              club_logo: '🤖'
            });
          }
        }

        await supabase.from('cup_teams').insert(teamsToEnroll);
        results.push({ country, cupId: cup.id, teams: teamsToEnroll.length });
      }
      return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'draw_round') {
      const cupId = body.cupId;
      if (!cupId) throw new Error('cupId required');

      // 1. Get eligible teams (not eliminated)
      const { data: teams } = await supabase
        .from('cup_teams')
        .select('*')
        .eq('cup_id', cupId)
        .eq('eliminated', false);

      if (!teams || teams.length < 2) {
        return new Response(JSON.stringify({ error: 'Not enough teams' }), { status: 400, headers: corsHeaders });
      }

      // 2. Shuffle and pair
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      const matches = [];
      const phase = getPhaseName(shuffled.length);
      
      const { data: cup } = await supabase.from('cup_competitions').select('current_round').eq('id', cupId).single();
      const round = (cup?.current_round || 0) + 1;

      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          // Scheduled for "Day 11" logic would go here, but for now we use a generic date
          // The prompt says "Day 10 DRAW, Day 11 START"
          const date = new Date();
          date.setDate(11); // Simplified for this run
          date.setHours(12, 0, 0, 0);

          matches.push({
            cup_id: cupId,
            round: round,
            home_team_id: shuffled[i].id,
            away_team_id: shuffled[i + 1].id,
            status: 'scheduled',
            scheduled_at: date.toISOString(),
            round_name: phase
          });
        }
      }

      await supabase.from('cup_matches').insert(matches);
      await supabase.from('cup_competitions').update({ status: 'in_progress', current_round: round, current_phase: phase }).eq('id', cupId);

      return new Response(JSON.stringify({ success: true, matches: matches.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});