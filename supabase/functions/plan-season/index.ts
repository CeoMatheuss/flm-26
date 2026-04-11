import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tier hierarchy
const TIERS = ['varzea', 'pre_regional', 'regional', 'nacional'] as const;
type Tier = typeof TIERS[number];

const TIER_MAX_LEVELS: Record<Tier, number> = {
  varzea: 1,
  pre_regional: 8,
  regional: 5,
  nacional: 4,
};

const TIER_NAMES: Record<Tier, string> = {
  varzea: 'Várzea',
  pre_regional: 'Pré-Regional',
  regional: 'Regional',
  nacional: 'Nacional',
};

const TEAMS_PER_LEAGUE = 20;
const PROMO_RELEGATION_COUNT = 3;

// League match times distributed across the day
const MATCH_TIMES = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

// Bot name generator
const BOT_PREFIXES = [
  'FC', 'SC', 'AC', 'EC', 'Clube', 'Atlético', 'Esporte', 'Sport', 'União',
  'Real', 'Inter', 'Nacional', 'Sporting', 'Racing', 'Olimpia', 'Estrela',
];
const BOT_SUFFIXES = [
  'Nova Esperança', 'Sol Nascente', 'Vila Rica', 'Monte Azul', 'Rio Claro',
  'Campo Grande', 'Serra Alta', 'Vale Verde', 'Pedra Branca', 'Lagoa Santa',
  'Porto Alegre', 'Bela Vista', 'Cruz Alta', 'Santo Amaro', 'Jardim',
  'São Miguel', 'Boa Vista', 'Alto da Serra', 'Morro Alto', 'Ponta Grossa',
];
const BOT_LOGOS = ['⚽', '🏟️', '🦅', '🐺', '🦁', '🐂', '🔴', '🔵', '🟢', '🟡', '⚫', '⚪', '🟣', '🟠'];

function generateBotName(index: number): string {
  const prefix = BOT_PREFIXES[index % BOT_PREFIXES.length];
  const suffix = BOT_SUFFIXES[index % BOT_SUFFIXES.length];
  return `${prefix} ${suffix}`;
}

function generateBotSquad(strength: number): any[] {
  const positions = ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA',
    'GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA', 'MEI', 'ZAG'];
  const firstNames = ['João', 'Pedro', 'Carlos', 'André', 'Felipe', 'Lucas', 'Rafael', 'Bruno',
    'Diego', 'Marcelo', 'Thiago', 'Leandro', 'Gustavo', 'Matheus', 'Gabriel', 'Daniel', 'Rodrigo', 'Victor', 'Alex'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Costa', 'Lima', 'Pereira', 'Souza', 'Ferreira',
    'Almeida', 'Rodrigues', 'Araújo', 'Barbosa', 'Ribeiro', 'Martins', 'Cardoso', 'Nascimento', 'Monteiro', 'Campos', 'Duarte'];

  return positions.map((pos, i) => {
    const variation = Math.floor(Math.random() * 15) - 7;
    const ovr = Math.max(40, Math.min(95, strength + variation));
    return {
      id: `bot-player-${i}-${Date.now()}`,
      name: `${firstNames[i]} ${lastNames[i]}`,
      position: pos,
      overall: ovr,
      age: 18 + Math.floor(Math.random() * 17),
    };
  });
}

// Round-robin generator for N teams producing N-1 rounds
function generateRoundRobin(teamIds: string[]): { round: number; home: string; away: string }[] {
  const ids = [...teamIds];
  if (ids.length % 2 !== 0) ids.push('BYE');
  const n = ids.length;
  const rounds: { round: number; home: string; away: string }[] = [];

  for (let r = 0; r < n - 1; r++) {
    const rotated = [ids[0], ...ids.slice(1)];
    for (let rot = 0; rot < r; rot++) {
      const last = rotated.pop()!;
      rotated.splice(1, 0, last);
    }
    for (let i = 0; i < n / 2; i++) {
      const home = rotated[i];
      const away = rotated[n - 1 - i];
      if (home === 'BYE' || away === 'BYE') continue;
      rounds.push({ round: r + 1, home, away });
    }
  }
  return rounds;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const targetMonth = now.getMonth() + 1; // next month for planning (1-12)
    const targetYear = now.getFullYear();
    // If called at end of month, plan for next month
    const seasonMonth = targetMonth > 12 ? 1 : targetMonth;
    const seasonYear = targetMonth > 12 ? targetYear + 1 : targetYear;

    // Get all countries with players
    const { data: allMembers } = await supabase
      .from('league_members')
      .select('user_id, league_id');

    // Get all leagues
    const { data: allLeagues } = await supabase
      .from('multiplayer_leagues')
      .select('*')
      .eq('auto_created', true);

    // Count real players per country
    const { data: memberLeagues } = await supabase
      .from('league_members')
      .select('user_id, league_id');

    const leagueMap = new Map((allLeagues || []).map(l => [l.id, l]));
    const countryPlayers: Record<string, Set<string>> = {};

    for (const m of (memberLeagues || [])) {
      const league = leagueMap.get(m.league_id);
      if (league) {
        if (!countryPlayers[league.country]) countryPlayers[league.country] = new Set();
        countryPlayers[league.country].add(m.user_id);
      }
    }

    // All known countries
    const ALL_COUNTRIES = [
      'BR', 'AR', 'UY', 'PY', 'CL', 'CO', 'PE', 'EC', 'BO', 'VE',
      'EN', 'ES', 'DE', 'IT', 'FR', 'PT', 'NL', 'BE', 'TR', 'SC',
      'US', 'MX', 'CA', 'CR', 'HN', 'PA',
      'EG', 'MA', 'TN', 'NG', 'SN', 'ZA', 'GH', 'CM',
      'JP', 'KR', 'CN', 'SA', 'QA', 'IR', 'AU', 'AE',
    ];

    const results: any[] = [];

    for (const country of ALL_COUNTRIES) {
      const playerCount = countryPlayers[country]?.size || 0;

      // Determine pyramid depth based on player count
      let tiers: { tier: Tier; levels: number }[] = [];
      if (playerCount < 20) {
        tiers = [{ tier: 'varzea', levels: 1 }];
      } else if (playerCount < 80) {
        tiers = [
          { tier: 'varzea', levels: 1 },
          { tier: 'pre_regional', levels: Math.min(Math.ceil((playerCount - 20) / 20), 8) },
        ];
      } else if (playerCount < 260) {
        tiers = [
          { tier: 'varzea', levels: 1 },
          { tier: 'pre_regional', levels: Math.min(8, Math.ceil((playerCount - 100) / 20)) },
          { tier: 'regional', levels: Math.min(5, Math.ceil((playerCount - 80) / 20)) },
        ];
      } else {
        tiers = [
          { tier: 'varzea', levels: 1 },
          { tier: 'pre_regional', levels: 8 },
          { tier: 'regional', levels: 5 },
          { tier: 'nacional', levels: 4 },
        ];
      }

      // Always ensure at least 1 Várzea league exists
      let leaguesCreated = 0;
      let timeIndex = 0;

      for (const { tier, levels } of tiers) {
        for (let level = 1; level <= levels; level++) {
          // Check if league already exists for this tier/level
          const existing = (allLeagues || []).find(
            l => l.country === country && l.tier === tier && l.tier_level === level
          );

          if (existing) {
            // League exists — ensure it has 20 members (fill with bots if needed)
            const { data: currentMembers } = await supabase
              .from('league_members')
              .select('user_id')
              .eq('league_id', existing.id);

            const currentCount = currentMembers?.length || 0;
            const botsNeeded = TEAMS_PER_LEAGUE - currentCount;

            if (botsNeeded > 0) {
              // Create bot members
              for (let b = 0; b < botsNeeded; b++) {
                const botIdx = currentCount + b;
                const botStrength = tier === 'nacional' ? 65 + Math.floor(Math.random() * 25) :
                  tier === 'regional' ? 55 + Math.floor(Math.random() * 20) :
                  tier === 'pre_regional' ? 45 + Math.floor(Math.random() * 20) :
                  40 + Math.floor(Math.random() * 20);

                await supabase.from('league_members').insert({
                  league_id: existing.id,
                  user_id: crypto.randomUUID(), // bot UUID
                  club_name: generateBotName(botIdx + leaguesCreated * 20),
                  club_logo: BOT_LOGOS[botIdx % BOT_LOGOS.length],
                  budget: 1000000,
                });
              }
            }

            // Update match time
            await supabase.from('multiplayer_leagues').update({
              match_time: MATCH_TIMES[timeIndex % MATCH_TIMES.length],
              season_month: seasonMonth,
              season_year: seasonYear,
            }).eq('id', existing.id);

          } else {
            // Create new league
            const leagueName = tier === 'varzea'
              ? `${country} Várzea`
              : `${country} ${TIER_NAMES[tier]} Div ${level}`;

            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const matchTime = MATCH_TIMES[timeIndex % MATCH_TIMES.length];

            const { data: newLeague } = await supabase.from('multiplayer_leagues').insert({
              name: leagueName,
              code,
              owner_id: crypto.randomUUID(), // system owner
              country,
              auto_created: true,
              max_members: TEAMS_PER_LEAGUE,
              status: 'waiting',
              league_type: 'main',
              total_rounds: TEAMS_PER_LEAGUE - 1, // 19 rounds for 20 teams
              season_status: 'registration',
              tier,
              tier_level: level,
              division: tier === 'nacional' ? level : null,
              match_time: matchTime,
              season_month: seasonMonth,
              season_year: seasonYear,
            }).select().single();

            if (newLeague) {
              // Fill entirely with bots
              for (let b = 0; b < TEAMS_PER_LEAGUE; b++) {
                const botStrength = tier === 'nacional' ? 65 + Math.floor(Math.random() * 25) :
                  tier === 'regional' ? 55 + Math.floor(Math.random() * 20) :
                  tier === 'pre_regional' ? 45 + Math.floor(Math.random() * 20) :
                  40 + Math.floor(Math.random() * 20);

                await supabase.from('league_members').insert({
                  league_id: newLeague.id,
                  user_id: crypto.randomUUID(),
                  club_name: generateBotName(b + leaguesCreated * 20),
                  club_logo: BOT_LOGOS[b % BOT_LOGOS.length],
                  budget: 1000000,
                });
              }
              leaguesCreated++;
            }
          }
          timeIndex++;
        }
      }

      // Update country status
      await supabase.from('country_status').upsert({
        country,
        total_players: playerCount,
        is_locked: playerCount >= 400,
        bonus_budget: playerCount < 10 ? 500000 : 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'country' });

      results.push({
        country,
        players: playerCount,
        tiers: tiers.map(t => `${t.tier}×${t.levels}`),
        leaguesCreated,
      });
    }

    // Create cups for countries with Nacional tiers
    for (const country of ALL_COUNTRIES) {
      const playerCount = countryPlayers[country]?.size || 0;
      if (playerCount < 260) continue; // Only countries with Nacional tier

      // Copa Nacional
      const { data: existingCup } = await supabase
        .from('cup_competitions')
        .select('id')
        .eq('country', country)
        .eq('cup_type', 'national')
        .eq('season_month', seasonMonth)
        .eq('season_year', seasonYear)
        .maybeSingle();

      if (!existingCup) {
        await supabase.from('cup_competitions').insert({
          name: `Copa Nacional ${country}`,
          cup_type: 'national',
          country,
          season_month: seasonMonth,
          season_year: seasonYear,
          format: 'knockout',
          status: 'pending',
        });
      }

      // Copa Regional
      const { data: existingRegCup } = await supabase
        .from('cup_competitions')
        .select('id')
        .eq('country', country)
        .eq('cup_type', 'regional')
        .eq('season_month', seasonMonth)
        .eq('season_year', seasonYear)
        .maybeSingle();

      if (!existingRegCup) {
        await supabase.from('cup_competitions').insert({
          name: `Copa Regional ${country}`,
          cup_type: 'regional',
          country,
          season_month: seasonMonth,
          season_year: seasonYear,
          format: 'knockout',
          status: 'pending',
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      seasonMonth,
      seasonYear,
      countries: results.length,
      details: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Plan season error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
