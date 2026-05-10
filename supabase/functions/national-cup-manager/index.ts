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

function getPhaseName(round: number, totalRounds: number) {
  const remaining = totalRounds - round + 1;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semifinal';
  if (remaining === 3) return 'Quartas de Final';
  if (remaining === 4) return 'Oitavas de Final';
  return `Fase ${round}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'auto_process'; // New default action
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // action: generate_all_cups (Usually run on Day 10)
    if (action === 'generate_all' || (action === 'auto_process' && currentDay === 10)) {
      const results = [];
      
      // Cleanup old national cups for this month if they exist to avoid duplicates
      await supabase.from('cup_competitions')
        .delete()
        .eq('is_national_cup', true)
        .eq('season_month', currentMonth)
        .eq('season_year', currentYear);

      for (const country of COUNTRY_CODES) {
        // 1. Fetch Clubs with Online/Activity Priority
        const { data: saves, error: fetchErr } = await supabase
          .from('game_saves')
          .select(`
            user_id, 
            game_state, 
            updated_at,
            user_presence:user_id (is_online, last_seen)
          `)
          .eq('country', country);

        if (fetchErr) continue;

        // Sort: Online > Activity Date
        const sortedClubs = (saves || []).map(s => {
          const presence = Array.isArray(s.user_presence) ? s.user_presence[0] : s.user_presence;
          return {
            user_id: s.user_id,
            club_name: s.game_state?.club?.name || 'Clube',
            club_logo: s.game_state?.club?.logo || '⚽',
            strength: s.game_state?.club?.strength || 60,
            is_online: !!presence?.is_online,
            last_activity: s.updated_at
          };
        }).sort((a, b) => {
          if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
          return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
        });

        // 2. Determine Cup Size (16, 32, 64, or 128)
        // Let's aim for 64 teams to match "Fase 1, 2, 3, Oitavas, Quartas, Semi, Final" (7 rounds is 128, 6 rounds is 64)
        // If human clubs < 10, maybe smaller cup? No, let's keep a standard 64.
        const cupSize = 64; 
        const totalRounds = 6; // 64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1

        const cupName = getCupName(country);
        const { data: cup, error: cupErr } = await supabase
          .from('cup_competitions')
          .insert({
            name: cupName,
            country: country,
            cup_type: 'national',
            is_national_cup: true,
            status: 'registration',
            season_month: currentMonth,
            season_year: currentYear,
            current_round: 1,
            total_rounds: totalRounds,
            prize_pool: 15000000,
            current_phase: 'Fase 1'
          })
          .select()
          .single();

        if (cupErr) {
          results.push({ country, error: cupErr.message });
          continue;
        }

        // 3. Enroll Teams
        const teamsToEnroll = [];
        
        // Add humans first
        for (let i = 0; i < Math.min(sortedClubs.length, cupSize); i++) {
          const club = sortedClubs[i];
          teamsToEnroll.push({
            cup_id: cup.id,
            user_id: club.user_id,
            club_name: club.club_name,
            club_logo: club.club_logo,
            is_bot: false,
            bot_strength: club.strength,
            seed: i + 1
          });
        }

        // Fill with Bots
        const needed = cupSize - teamsToEnroll.length;
        if (needed > 0) {
          for (let i = 0; i < needed; i++) {
            teamsToEnroll.push({
              cup_id: cup.id,
              is_bot: true,
              bot_name: `Bot ${country} ${i + 1}`,
              bot_strength: 55 + Math.floor(Math.random() * 25),
              club_name: `Bot ${country} ${i + 1}`,
              club_logo: '🤖',
              seed: teamsToEnroll.length + 1
            });
          }
        }

        await supabase.from('cup_teams').insert(teamsToEnroll);
        
        // 4. Initial Draw (Fase 1) - Day 11
        // We use a deterministic but shuffled approach
        const enrolled = await supabase.from('cup_teams').select('id').eq('cup_id', cup.id);
        const shuffledIds = enrolled.data?.map(t => t.id).sort(() => Math.random() - 0.5) || [];
        
        const matches = [];
        const kickoff = new Date();
        kickoff.setDate(11); // Start on Day 11
        kickoff.setHours(12, 0, 0, 0);

        for (let i = 0; i < shuffledIds.length; i += 2) {
          matches.push({
            cup_id: cup.id,
            round: 1,
            home_team_id: shuffledIds[i],
            away_team_id: shuffledIds[i+1],
            status: 'scheduled',
            scheduled_at: kickoff.toISOString(),
            round_name: 'Fase 1'
          });
        }

        await supabase.from('cup_matches').insert(matches);
        await supabase.from('cup_competitions').update({ status: 'in_progress' }).eq('id', cup.id);

        results.push({ country, cupId: cup.id, teams: teamsToEnroll.length, matches: matches.length });
      }

      return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // action: advance_cups (Daily check to advance rounds)
    // Run this daily at 13:00 or triggered manually
    if (action === 'advance_rounds' || (action === 'auto_process' && currentDay > 11)) {
      // 1. Find all active national cups
      const { data: cups } = await supabase
        .from('cup_competitions')
        .select('*')
        .eq('is_national_cup', true)
        .eq('status', 'in_progress');

      if (!cups || cups.length === 0) {
        return new Response(JSON.stringify({ message: 'No cups to advance' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const advances = [];

      for (const cup of cups) {
        // Check if current round matches are all finished
        const { data: pendingMatches } = await supabase
          .from('cup_matches')
          .select('id')
          .eq('cup_id', cup.id)
          .eq('round', cup.current_round)
          .neq('status', 'finished');

        if (pendingMatches && pendingMatches.length > 0) continue; // Still games to play

        // All finished! Generate next round
        const { data: winners } = await supabase
          .from('cup_teams')
          .select('id')
          .eq('cup_id', cup.id)
          .eq('eliminated', false);

        if (!winners || winners.length < 2) {
          // Cup finished!
          const winner = winners?.[0];
          await supabase.from('cup_competitions').update({ 
            status: 'finished', 
            winner_id: winner?.id 
          }).eq('id', cup.id);
          advances.push({ cupId: cup.id, status: 'finished', winner: winner?.id });
          continue;
        }

        const nextRound = cup.current_round + 1;
        const phaseName = getPhaseName(nextRound, cup.total_rounds);
        const shuffledWinners = winners.map(w => w.id).sort(() => Math.random() - 0.5);
        
        const kickoff = new Date();
        kickoff.setHours(12, 0, 0, 0);
        // If matches finished today, next round is tomorrow
        kickoff.setDate(kickoff.getDate() + 1);

        const newMatches = [];
        for (let i = 0; i < shuffledWinners.length; i += 2) {
          newMatches.push({
            cup_id: cup.id,
            round: nextRound,
            home_team_id: shuffledWinners[i],
            away_team_id: shuffledWinners[i+1],
            status: 'scheduled',
            scheduled_at: kickoff.toISOString(),
            round_name: phaseName
          });
        }

        await supabase.from('cup_matches').insert(newMatches);
        await supabase.from('cup_competitions').update({ 
          current_round: nextRound, 
          current_phase: phaseName 
        }).eq('id', cup.id);

        advances.push({ cupId: cup.id, nextRound, phaseName, matches: newMatches.length });
      }

      return new Response(JSON.stringify({ success: true, advances }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action or invalid day' }), { status: 400, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
