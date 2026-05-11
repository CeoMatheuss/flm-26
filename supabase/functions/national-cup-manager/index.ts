import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, password } = await req.json()
    const adminPassword = "ADM112828"
    const requiresAdmin = ['generate_all_national_cups', 'advance_phase', 'reset_cups', 'generate_continental_cup'].includes(action)
    
    if (requiresAdmin && password !== adminPassword && req.headers.get('x-internal-call') !== 'true') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (action === 'generate_all_national_cups') {
      const { data: leagues } = await supabase.from('world_leagues').select('country').eq('active', true);
      const uniqueCountries = [...new Set(leagues?.map(c => c.country))];

      const cupNamesMap: Record<string, string> = {
        'Brasil': 'Copa do Brasil',
        'Espanha': 'Copa del Rey',
        'Inglaterra': 'FA Cup',
        'Alemanha': 'DFB-Pokal',
        'Itália': 'Coppa Italia',
        'França': 'Coupe de France',
        'Portugal': 'Taça de Portugal',
        'Argentina': 'Copa Argentina'
      };

      for (const country of uniqueCountries) {
        const name = cupNamesMap[country] || `Copa de ${country}`;
        const { data: cup } = await supabase.from('national_cups').upsert({
          name, country_code: country, season: 1, status: 'scheduled', current_round: 1
        }, { onConflict: 'country_code, season' }).select().single();

        if (!cup) continue;

        const { data: teams } = await supabase.from('world_teams').select('*').eq('country', country);
        if (!teams || teams.length < 2) continue;

        // Round to nearest power of 2 for a clean bracket
        const participantsCount = Math.pow(2, Math.floor(Math.log2(Math.min(teams.length, 128))));
        const selectedTeams = teams.sort(() => Math.random() - 0.5).slice(0, participantsCount);

        const cupTeams = selectedTeams.map((t, idx) => ({
          cup_id: cup.id, club_id: t.id, club_name: t.name, club_logo: t.logo,
          user_id: t.user_id, strength: t.strength, is_bot: !t.user_id, seed: idx
        }));

        await supabase.from('national_cup_teams').delete().eq('cup_id', cup.id);
        await supabase.from('national_cup_teams').insert(cupTeams);
        await supabase.from('national_cups').update({ 
          total_teams: participantsCount, total_rounds: Math.log2(participantsCount) 
        }).eq('id', cup.id);
        
        await drawNextRound(supabase, cup.id, 1);
        await createCupNews(supabase, cup.id, `Sorteio Realizado!`, `A ${name} começou! ${participantsCount} times disputam o título.`);
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === 'advance_phase') {
      const { data: activeCups } = await supabase.from('national_cups').select('*').eq('status', 'in_progress');
      if (!activeCups) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

      for (const cup of activeCups) {
        const { data: matches } = await supabase.from('national_cup_matches')
          .select('*, home:national_cup_teams!home_team_id(*), away:national_cup_teams!away_team_id(*)')
          .eq('cup_id', cup.id).eq('round', cup.current_round).eq('status', 'scheduled');

        if (!matches || matches.length === 0) {
          // Check if all finished
          const { count: pending } = await supabase.from('national_cup_matches')
            .select('*', { count: 'exact', head: true })
            .eq('cup_id', cup.id).eq('round', cup.current_round).neq('status', 'finished');

          if (pending === 0) {
            if (cup.current_round < cup.total_rounds) {
              await drawNextRound(supabase, cup.id, cup.current_round + 1);
              await createCupNews(supabase, cup.id, `Fase Concluída!`, `Os confrontos da próxima fase foram gerados automaticamente.`);
            } else {
              await supabase.from('national_cups').update({ status: 'finished' }).eq('id', cup.id);
              const { data: winner } = await supabase.from('national_cup_matches')
                .select('winner_team_id').eq('cup_id', cup.id).eq('round', cup.total_rounds).single();
              if (winner) {
                await supabase.from('national_cups').update({ winner_team_id: winner.winner_team_id }).eq('id', cup.id);
                await createCupNews(supabase, cup.id, `🏆 Grande Campeão!`, `Parabéns ao vencedor da ${cup.name}!`);
                // Final prize for winner
                await grantPrize(supabase, winner.winner_team_id, 25000000, "Campeão da Copa", cup.id);
              }
            }
          }
          continue;
        }

        for (const match of matches) {
          const result = simulateMatch(match.home.strength, match.away.strength);
          await supabase.from('national_cup_matches').update({
            home_score: result.homeGoals, away_score: result.awayGoals,
            home_penalties: result.homePen, away_penalties: result.awayPen,
            status: 'finished', winner_team_id: result.winnerId === 'home' ? match.home_team_id : match.away_team_id,
            match_data: { simulated: true, date: new Date().toISOString() }
          }).eq('id', match.id);

          const winnerId = result.winnerId === 'home' ? match.home_team_id : match.away_team_id;
          const loserId = result.winnerId === 'home' ? match.away_team_id : match.home_team_id;
          await supabase.from('national_cup_teams').update({ eliminated: true }).eq('id', loserId);
          
          const prize = getPrizeForRound(match.round, cup.total_rounds);
          await grantPrize(supabase, winnerId, prize, `Prêmio Fase ${match.round}`, cup.id);
        }
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})

function simulateMatch(homeS: number, awayS: number) {
  const prob = homeS / (homeS + awayS);
  let homeGoals = Math.floor(Math.random() * 4);
  let awayGoals = Math.floor(Math.random() * 4);
  if (Math.random() < prob) homeGoals += 1; else awayGoals += 1;

  let winnerId: 'home' | 'away' = homeGoals > awayGoals ? 'home' : 'away';
  let homePen = null, awayPen = null;

  if (homeGoals === awayGoals) {
    homePen = Math.floor(Math.random() * 5) + 3;
    awayPen = Math.floor(Math.random() * 5) + 3;
    while (homePen === awayPen) {
      if (Math.random() > 0.5) homePen++; else awayPen++;
    }
    winnerId = homePen > awayPen ? 'home' : 'away';
  }
  return { homeGoals, awayGoals, homePen, awayPen, winnerId };
}

async function drawNextRound(supabase: any, cupId: string, round: number) {
  const { data: teams } = await supabase.from('national_cup_teams').select('*').eq('cup_id', cupId).eq('eliminated', false);
  if (!teams || teams.length < 2) return;

  const shuffled = teams.sort(() => Math.random() - 0.5);
  const matches = [];
  const phaseName = getPhaseName(round, Math.log2(teams.length + (teams.length % 2 === 0 ? 0 : 1)) + round - 1); // Approximation

  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      matches.push({
        cup_id: cupId, round, bracket_pos: i / 2,
        home_team_id: shuffled[i].id, away_team_id: shuffled[i+1].id,
        status: 'scheduled', phase_name: phaseName,
        scheduled_at: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      });
    }
  }
  if (matches.length) {
    await supabase.from('national_cup_matches').insert(matches);
    await supabase.from('national_cups').update({ current_round: round, status: 'in_progress' }).eq('id', cupId);
  }
}

function getPhaseName(round: number, total: number) {
  const remaining = total - round;
  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semifinal";
  if (remaining === 2) return "Quartas de Final";
  if (remaining === 3) return "Oitavas de Final";
  return `Fase ${round}`;
}

function getPrizeForRound(round: number, total: number) {
  const remaining = total - round;
  if (remaining === 0) return 10000000; // Vice gets 10M, winner handled separately
  if (remaining === 1) return 5000000;
  if (remaining === 2) return 2000000;
  if (remaining === 3) return 1000000;
  if (round === 3) return 500000;
  if (round === 2) return 250000;
  return 100000;
}

async function grantPrize(supabase: any, teamId: string, amount: number, desc: string, cupId: string) {
  const { data: team } = await supabase.from('national_cup_teams').select('user_id, club_id').eq('id', teamId).single();
  if (!team) return;

  await supabase.from('national_cup_prizes').insert({
    cup_id: cupId, team_id: teamId, amount, description: desc
  });

  if (team.user_id) {
    const { data: save } = await supabase.from('game_saves').select('club_data').eq('user_id', team.user_id).single();
    if (save?.club_data) {
      save.club_data.club.budget = (save.club_data.club.budget || 0) + amount;
      await supabase.from('game_saves').update({ club_data: save.club_data }).eq('user_id', team.user_id);
    }
    await supabase.from('user_notifications').insert({
      user_id: team.user_id, title: '🏆 Prêmio da Copa!',
      message: `${desc}: R$ ${amount.toLocaleString()} creditados.`, type: 'success'
    });
  }
}

async function createCupNews(supabase: any, cupId: string, title: string, content: string) {
  await supabase.from('cup_news').insert({ cup_id: cupId, title, content });
  // Also add to global news
  await supabase.from('newspaper_entries').insert({
    title, content, category: 'competitions', priority: 1, 
    published_at: new Date().toISOString()
  });
}
