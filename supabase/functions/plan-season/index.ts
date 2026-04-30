import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Fisher-Yates shuffle (uniforme + entropia crypto) ─────────────────
// Substitui o vício do `[...a].sort(() => Math.random() - 0.5)`, que em V8
// produz padrões repetitivos (mesmos confrontos saindo várias temporadas
// seguidas). Cada chamada usa entropia fresca do WebCrypto.
function secureRandomInt(max: number): number {
  if (max <= 1) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xFFFFFFFF / max) * max;
  for (let i = 0; i < 16; i++) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
  crypto.getRandomValues(buf);
  return buf[0] % max;
}
function secureShuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    if (j !== i) { const t = out[i]; out[i] = out[j]; out[j] = t; }
  }
  return out;
}


const TIERS = ['varzea', 'pre_regional', 'regional', 'nacional'] as const;
type Tier = typeof TIERS[number];

const TIER_NAMES: Record<Tier, string> = {
  varzea: 'Várzea',
  pre_regional: 'Pré-Regional',
  regional: 'Regional',
  nacional: 'Nacional',
};

// Nome real da divisão nacional (D1-D4) por código de país.
// Usado para batizar ligas auto-criadas com nomes reais em vez de "BR Nacional Div 1".
const COUNTRY_DIVISION_NAMES: Record<string, [string, string, string, string]> = {
  BR: ['Brasileirão Série A', 'Brasileirão Série B', 'Brasileirão Série C', 'Brasileirão Série D'],
  AR: ['Liga Profesional', 'Primera Nacional', 'Primera B Metropolitana', 'Primera C'],
  UY: ['Primera División', 'Segunda División Profesional', 'Segunda División Amateur', 'Tercera División'],
  PY: ['División de Honor', 'División Intermedia', 'Primera División B', 'Primera División C'],
  CL: ['Primera División', 'Primera B', 'Segunda División Profesional', 'Tercera División A'],
  CO: ['Liga BetPlay', 'Torneo BetPlay', 'Primera C Colombia', 'Segunda C Colombia'],
  PE: ['Liga 1', 'Liga 2', 'Copa Perú', 'Liga Distrital'],
  EC: ['LigaPro Serie A', 'LigaPro Serie B', 'Segunda Categoría', 'Provincial'],
  BO: ['División Profesional', 'Primera A', 'Primera B', 'Copa Simón Bolívar'],
  VE: ['Liga FUTVE', 'Segunda División', 'Tercera División', 'Cuarta División'],
  EN: ['Premier League', 'EFL Championship', 'EFL League One', 'EFL League Two'],
  ES: ['La Liga', 'La Liga 2', 'Primera Federación', 'Segunda Federación'],
  DE: ['Bundesliga', '2. Bundesliga', '3. Liga', 'Regionalliga'],
  IT: ['Serie A', 'Serie B', 'Serie C', 'Serie D'],
  FR: ['Ligue 1', 'Ligue 2', 'Championnat National', 'National 2'],
  PT: ['Primeira Liga', 'Liga Portugal 2', 'Liga 3', 'Campeonato de Portugal'],
  NL: ['Eredivisie', 'Eerste Divisie', 'Tweede Divisie', 'Derde Divisie'],
  BE: ['Jupiler Pro League', 'Challenger Pro League', 'National Division 1', 'Belgian Division 2'],
  TR: ['Süper Lig', '1. Lig', '2. Lig', '3. Lig'],
  SC: ['Premiership', 'Championship', 'League One', 'League Two'],
  US: ['MLS', 'USL Championship', 'USL League One', 'USL League Two'],
  MX: ['Liga MX', 'Liga de Expansión MX', 'Liga Premier', 'Liga TDP'],
  CA: ['Canadian Premier League', 'League1 Canada', 'PLSQ', 'BCSPL'],
  CR: ['Primera División CR', 'Liga de Ascenso', 'Segunda División', 'Tercera División'],
  HN: ['Liga Nacional HN', 'Liga de Ascenso', 'Segunda División', 'Liga Mayor'],
  PA: ['Liga Panameña', 'Liga Prom', 'Liga Distritales', 'Liga Provincial'],
  EG: ['Egyptian Premier League', 'Egyptian Second Division A', 'Egyptian Second Division B', 'Egyptian Third Division'],
  MA: ['Botola Pro 1', 'Botola Pro 2', 'Botola Amateur 1', 'Botola Amateur 2'],
  TN: ['Ligue 1 Tunisienne', 'Ligue 2', 'Ligue 3', 'Ligue 4'],
  NG: ['Nigeria Premier Football League', 'Nigeria National League', 'Nigeria Nationwide League One', 'Nigeria Amateur League'],
  SN: ['Ligue 1 Sénégal', 'Ligue 2', 'National 1', 'National 2'],
  ZA: ['Premier Soccer League', 'National First Division', 'ABC Motsepe League', 'SAFA Regional League'],
  GH: ['Ghana Premier League', 'Division One League', 'Division Two', 'Division Three'],
  CM: ['Elite One', 'Elite Two', 'MTN Elite Three', 'Regional League'],
  JP: ['J1 League', 'J2 League', 'J3 League', 'JFL'],
  KR: ['K League 1', 'K League 2', 'K3 League', 'K4 League'],
  CN: ['Chinese Super League', 'China League One', 'China League Two', 'China Champions League'],
  SA: ['Saudi Pro League', 'Saudi First Division League', 'Saudi Second Division League', 'Saudi Third Division League'],
  QA: ['Qatar Stars League', 'Qatari Second Division', 'Qatari Third Division', 'Qatari Fourth Division'],
  IR: ['Persian Gulf Pro League', 'Azadegan League', 'League 2', 'League 3'],
  AU: ['A-League Men', 'NPL Australia', 'NPL State League 1', 'NPL State League 2'],
  AE: ['UAE Pro League', 'UAE First Division', 'UAE Second Division', 'UAE Third Division'],
};

function nationalDivisionName(country: string, level: number): string {
  const names = COUNTRY_DIVISION_NAMES[country.toUpperCase()];
  if (names && names[level - 1]) return names[level - 1];
  return `${country} Nacional Div ${level}`;
}

const TEAMS_PER_LEAGUE = 20;

const MATCH_TIMES = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

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
  // Sufixo numérico garante unicidade global mesmo entre ligas diferentes
  // (evita choque de nomes "FC Nova Esperança" em D1 e D2 do mesmo país).
  const tag = Math.floor(index / (BOT_PREFIXES.length * BOT_SUFFIXES.length)) + 1;
  return tag === 1 ? `${prefix} ${suffix}` : `${prefix} ${suffix} ${tag}`;
}

// Força média do bot baseada no nível competitivo da liga.
// Garante que bots de D1 sejam fortes e os de várzea sejam fracos —
// essencial para subidas/descidas fazerem sentido.
function botStrengthFor(tier: Tier, level: number): number {
  const ranges: Record<Tier, [number, number]> = {
    nacional: level === 1 ? [75, 90] : level === 2 ? [65, 80] : level === 3 ? [55, 70] : [45, 60],
    regional: [50, 70],
    pre_regional: [42, 62],
    varzea: [35, 55],
  };
  const [lo, hi] = ranges[tier];
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// Continent mapping
const CONTINENT_MAP: Record<string, string> = {
  BR: 'south_america', AR: 'south_america', UY: 'south_america', PY: 'south_america',
  CL: 'south_america', CO: 'south_america', PE: 'south_america', EC: 'south_america',
  BO: 'south_america', VE: 'south_america',
  EN: 'europe', ES: 'europe', DE: 'europe', IT: 'europe', FR: 'europe',
  PT: 'europe', NL: 'europe', BE: 'europe', TR: 'europe', SC: 'europe',
  US: 'north_america', MX: 'north_america', CA: 'north_america',
  CR: 'north_america', HN: 'north_america', PA: 'north_america',
  EG: 'africa', MA: 'africa', TN: 'africa', NG: 'africa',
  SN: 'africa', ZA: 'africa', GH: 'africa', CM: 'africa',
  JP: 'asia', KR: 'asia', CN: 'asia', SA: 'asia',
  QA: 'asia', IR: 'asia', AU: 'asia', AE: 'asia',
};

const CONTINENT_NAMES: Record<string, string> = {
  south_america: 'América do Sul',
  europe: 'Europa',
  north_america: 'América do Norte',
  africa: 'África',
  asia: 'Ásia',
};

const ALL_COUNTRIES = Object.keys(CONTINENT_MAP);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const targetMonth = now.getMonth() + 1;
    const targetYear = now.getFullYear();
    const seasonMonth = targetMonth > 12 ? 1 : targetMonth;
    const seasonYear = targetMonth > 12 ? targetYear + 1 : targetYear;

    // Get existing data
    const { data: allLeagues } = await supabase
      .from('multiplayer_leagues')
      .select('*')
      .eq('auto_created', true);

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

    const results: any[] = [];

    // ── PHASE 1: Create/update leagues per country ──
    // REGRA CRÍTICA: a estrutura nacional completa (D1-D4) é SEMPRE criada,
    // independente de quantos jogadores estão online — bots preenchem 100%
    // das vagas vazias. Tiers regionais escalam com a base de jogadores.
    for (const country of ALL_COUNTRIES) {
      const playerCount = countryPlayers[country]?.size || 0;

      // Estrutura mínima garantida: SEMPRE 4 divisões nacionais + 1 várzea.
      // Tiers regionais aparecem apenas quando há massa crítica de jogadores.
      const tiers: { tier: Tier; levels: number }[] = [
        { tier: 'varzea', levels: 1 },
        { tier: 'nacional', levels: 4 },
      ];
      if (playerCount >= 80) {
        tiers.splice(1, 0, {
          tier: 'pre_regional',
          levels: Math.min(8, Math.max(1, Math.ceil((playerCount - 20) / 20))),
        });
      }
      if (playerCount >= 260) {
        tiers.splice(2, 0, {
          tier: 'regional',
          levels: Math.min(5, Math.max(1, Math.ceil((playerCount - 80) / 20))),
        });
      }

      let leaguesCreated = 0;
      let timeIndex = 0;

      for (const { tier, levels } of tiers) {
        for (let level = 1; level <= levels; level++) {
          const existing = (allLeagues || []).find(
            l => l.country === country && l.tier === tier && l.tier_level === level
          );

          if (existing) {
            const { data: currentMembers } = await supabase
              .from('league_members')
              .select('user_id')
              .eq('league_id', existing.id);

            const currentCount = currentMembers?.length || 0;
            const botsNeeded = TEAMS_PER_LEAGUE - currentCount;

            if (botsNeeded > 0) {
              for (let b = 0; b < botsNeeded; b++) {
                const botIdx = currentCount + b;
                await supabase.from('league_members').insert({
                  league_id: existing.id,
                  user_id: crypto.randomUUID(),
                  club_name: generateBotName(botIdx + leaguesCreated * 20),
                  club_logo: BOT_LOGOS[botIdx % BOT_LOGOS.length],
                  budget: 1000000,
                });
              }
            }

            await supabase.from('multiplayer_leagues').update({
              match_time: MATCH_TIMES[timeIndex % MATCH_TIMES.length],
              season_month: seasonMonth,
              season_year: seasonYear,
            }).eq('id', existing.id);
          } else {
            // Nomes reais para o tier 'nacional' (D1-D4); demais tiers seguem padrão regional/várzea.
            const leagueName = tier === 'varzea'
              ? `${country} Várzea`
              : tier === 'nacional'
                ? nationalDivisionName(country, level)
                : `${country} ${TIER_NAMES[tier]} Div ${level}`;

            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const matchTime = MATCH_TIMES[timeIndex % MATCH_TIMES.length];

            const { data: newLeague } = await supabase.from('multiplayer_leagues').insert({
              name: leagueName,
              code,
              owner_id: crypto.randomUUID(),
              country,
              auto_created: true,
              max_members: TEAMS_PER_LEAGUE,
              status: 'waiting',
              league_type: 'main',
              total_rounds: TEAMS_PER_LEAGUE - 1,
              season_status: 'registration',
              tier,
              tier_level: level,
              division: tier === 'nacional' ? level : null,
              match_time: matchTime,
              season_month: seasonMonth,
              season_year: seasonYear,
            }).select().single();

            if (newLeague) {
              for (let b = 0; b < TEAMS_PER_LEAGUE; b++) {
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

    // ── PHASE 2: National & Regional Cups ──
    for (const country of ALL_COUNTRIES) {
      const playerCount = countryPlayers[country]?.size || 0;

      // Copa Nacional: countries with Nacional tier (260+ players)
      if (playerCount >= 260) {
        const { data: existingCup } = await supabase
          .from('cup_competitions')
          .select('id')
          .eq('country', country)
          .eq('cup_type', 'national')
          .eq('season_month', seasonMonth)
          .eq('season_year', seasonYear)
          .maybeSingle();

        if (!existingCup) {
          const { data: newCup } = await supabase.from('cup_competitions').insert({
            name: `Copa Nacional ${country}`,
            cup_type: 'national',
            country,
            season_month: seasonMonth,
            season_year: seasonYear,
            format: 'knockout',
            status: 'pending',
            current_round: 1,
            total_rounds: 4,
          }).select().single();

          // Seed teams from Nacional divisions
          if (newCup) {
            const { data: nacLeagues } = await supabase
              .from('multiplayer_leagues')
              .select('id')
              .eq('country', country)
              .eq('tier', 'nacional')
              .eq('auto_created', true);

            if (nacLeagues) {
              const nacLeagueIds = nacLeagues.map(l => l.id);
              const { data: nacMembers } = await supabase
                .from('league_members')
                .select('user_id, club_name, club_logo')
                .in('league_id', nacLeagueIds)
                .order('points', { ascending: false })
                .limit(32);

              const cupTeams = (nacMembers || []).map((m, idx) => ({
                cup_id: newCup.id,
                user_id: m.user_id,
                club_name: m.club_name,
                club_logo: m.club_logo,
                is_bot: false,
                seed: idx + 1,
              }));

              // Fill to 32 with bots
              while (cupTeams.length < 32) {
                cupTeams.push({
                  cup_id: newCup.id,
                  user_id: null,
                  club_name: generateBotName(cupTeams.length),
                  club_logo: BOT_LOGOS[cupTeams.length % BOT_LOGOS.length],
                  is_bot: true,
                  seed: cupTeams.length + 1,
                });
              }

              const { data: insertedTeams } = await supabase.from('cup_teams').insert(cupTeams).select();

              // Create round 1 matches (16 matches)
              if (insertedTeams && insertedTeams.length >= 32) {
                const shuffled = secureShuffle(insertedTeams);
                const matches = [];
                const baseDate = new Date(now.getTime() + 7 * 24 * 3600000); // start in 7 days

                for (let i = 0; i < 16; i++) {
                  matches.push({
                    cup_id: newCup.id,
                    home_team_id: shuffled[i * 2].id,
                    away_team_id: shuffled[i * 2 + 1].id,
                    round: 1,
                    leg: 1,
                    scheduled_at: new Date(baseDate.getTime() + i * 3600000).toISOString(),
                    status: 'scheduled',
                  });
                }
                await supabase.from('cup_matches').insert(matches);
              }
            }
          }
        }
      }

      // Copa Regional: countries with Regional tier (80+ players)
      if (playerCount >= 80) {
        const { data: existingRegCup } = await supabase
          .from('cup_competitions')
          .select('id')
          .eq('country', country)
          .eq('cup_type', 'regional')
          .eq('season_month', seasonMonth)
          .eq('season_year', seasonYear)
          .maybeSingle();

        if (!existingRegCup) {
          const { data: newCup } = await supabase.from('cup_competitions').insert({
            name: `Copa Regional ${country}`,
            cup_type: 'regional',
            country,
            season_month: seasonMonth,
            season_year: seasonYear,
            format: 'knockout',
            status: 'pending',
            current_round: 1,
            total_rounds: 3,
          }).select().single();

          if (newCup) {
            const { data: regLeagues } = await supabase
              .from('multiplayer_leagues')
              .select('id')
              .eq('country', country)
              .eq('tier', 'regional')
              .eq('auto_created', true);

            if (regLeagues) {
              const regLeagueIds = regLeagues.map(l => l.id);
              const { data: regMembers } = await supabase
                .from('league_members')
                .select('user_id, club_name, club_logo')
                .in('league_id', regLeagueIds)
                .order('points', { ascending: false })
                .limit(16);

              const cupTeams = (regMembers || []).map((m, idx) => ({
                cup_id: newCup.id,
                user_id: m.user_id,
                club_name: m.club_name,
                club_logo: m.club_logo,
                is_bot: false,
                seed: idx + 1,
              }));

              while (cupTeams.length < 16) {
                cupTeams.push({
                  cup_id: newCup.id,
                  user_id: null,
                  club_name: generateBotName(cupTeams.length + 50),
                  club_logo: BOT_LOGOS[cupTeams.length % BOT_LOGOS.length],
                  is_bot: true,
                  seed: cupTeams.length + 1,
                });
              }

              const { data: insertedTeams } = await supabase.from('cup_teams').insert(cupTeams).select();

              if (insertedTeams && insertedTeams.length >= 16) {
                const shuffled = secureShuffle(insertedTeams);
                const matches = [];
                const baseDate = new Date(now.getTime() + 5 * 24 * 3600000);

                for (let i = 0; i < 8; i++) {
                  matches.push({
                    cup_id: newCup.id,
                    home_team_id: shuffled[i * 2].id,
                    away_team_id: shuffled[i * 2 + 1].id,
                    round: 1,
                    leg: 1,
                    scheduled_at: new Date(baseDate.getTime() + i * 3600000).toISOString(),
                    status: 'scheduled',
                  });
                }
                await supabase.from('cup_matches').insert(matches);
              }
            }
          }
        }
      }
    }

    // ── PHASE 3: Continental Cups ──
    const continents = [...new Set(Object.values(CONTINENT_MAP))];

    for (const continent of continents) {
      const continentCountries = ALL_COUNTRIES.filter(c => CONTINENT_MAP[c] === continent);
      const totalPlayers = continentCountries.reduce((sum, c) => sum + (countryPlayers[c]?.size || 0), 0);

      // Only create continental cup if there are enough players
      if (totalPlayers < 40) continue;

      const { data: existingContCup } = await supabase
        .from('cup_competitions')
        .select('id')
        .eq('continent', continent)
        .eq('cup_type', 'continental')
        .eq('season_month', seasonMonth)
        .eq('season_year', seasonYear)
        .maybeSingle();

      if (!existingContCup) {
        const { data: newCup } = await supabase.from('cup_competitions').insert({
          name: `Copa Intercontinental ${CONTINENT_NAMES[continent]}`,
          cup_type: 'continental',
          continent,
          season_month: seasonMonth,
          season_year: seasonYear,
          format: 'knockout',
          status: 'pending',
          current_round: 1,
          total_rounds: 4,
        }).select().single();

        if (newCup) {
          // Get top 8 teams from each country in this continent
          const cupTeams: any[] = [];

          for (const ctry of continentCountries) {
            const { data: ctryLeagues } = await supabase
              .from('multiplayer_leagues')
              .select('id')
              .eq('country', ctry)
              .eq('auto_created', true);

            if (!ctryLeagues || ctryLeagues.length === 0) continue;

            const ctryLeagueIds = ctryLeagues.map(l => l.id);
            const { data: topMembers } = await supabase
              .from('league_members')
              .select('user_id, club_name, club_logo')
              .in('league_id', ctryLeagueIds)
              .order('points', { ascending: false })
              .limit(8);

            for (const m of (topMembers || [])) {
              cupTeams.push({
                cup_id: newCup.id,
                user_id: m.user_id,
                club_name: m.club_name,
                club_logo: m.club_logo,
                is_bot: false,
                seed: cupTeams.length + 1,
              });
            }
          }

          // Pad to nearest power of 2 (16 or 32)
          const targetSize = cupTeams.length <= 16 ? 16 : 32;
          while (cupTeams.length < targetSize) {
            cupTeams.push({
              cup_id: newCup.id,
              user_id: null,
              club_name: generateBotName(cupTeams.length + 100),
              club_logo: BOT_LOGOS[cupTeams.length % BOT_LOGOS.length],
              is_bot: true,
              seed: cupTeams.length + 1,
            });
          }

          const { data: insertedTeams } = await supabase.from('cup_teams').insert(cupTeams).select();

          if (insertedTeams && insertedTeams.length >= targetSize) {
            const shuffled = secureShuffle(insertedTeams);
            const matches = [];
            const baseDate = new Date(now.getTime() + 10 * 24 * 3600000);

            for (let i = 0; i < targetSize / 2; i++) {
              matches.push({
                cup_id: newCup.id,
                home_team_id: shuffled[i * 2].id,
                away_team_id: shuffled[i * 2 + 1].id,
                round: 1,
                leg: 1,
                scheduled_at: new Date(baseDate.getTime() + i * 3600000).toISOString(),
                status: 'scheduled',
              });
            }
            await supabase.from('cup_matches').insert(matches);
          }
        }
      }
    }

    // ── PHASE 4: World Club Cup (season 2+) ──
    // Check if any league has season >= 2
    const { data: seasoned } = await supabase
      .from('multiplayer_leagues')
      .select('season')
      .eq('auto_created', true)
      .gte('season', 2)
      .limit(1);

    if (seasoned && seasoned.length > 0) {
      const { data: existingWorld } = await supabase
        .from('cup_competitions')
        .select('id')
        .eq('cup_type', 'world')
        .eq('season_month', seasonMonth)
        .eq('season_year', seasonYear)
        .maybeSingle();

      if (!existingWorld) {
        const { data: newCup } = await supabase.from('cup_competitions').insert({
          name: 'Mundial de Clubes',
          cup_type: 'world',
          season_month: seasonMonth,
          season_year: seasonYear,
          format: 'knockout',
          status: 'pending',
          current_round: 1,
          total_rounds: 5,
        }).select().single();

        if (newCup) {
          // Get champion (1st place) from each country's top league
          const cupTeams: any[] = [];

          for (const country of ALL_COUNTRIES) {
            const { data: topLeague } = await supabase
              .from('multiplayer_leagues')
              .select('id')
              .eq('country', country)
              .eq('auto_created', true)
              .eq('tier', 'nacional')
              .eq('tier_level', 1)
              .maybeSingle();

            if (!topLeague) continue;

            const { data: champion } = await supabase
              .from('league_members')
              .select('user_id, club_name, club_logo')
              .eq('league_id', topLeague.id)
              .order('points', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (champion) {
              cupTeams.push({
                cup_id: newCup.id,
                user_id: champion.user_id,
                club_name: champion.club_name,
                club_logo: champion.club_logo,
                is_bot: false,
                seed: cupTeams.length + 1,
              });
            }
          }

          // Pad to 32
          while (cupTeams.length < 32) {
            cupTeams.push({
              cup_id: newCup.id,
              user_id: null,
              club_name: generateBotName(cupTeams.length + 200),
              club_logo: BOT_LOGOS[cupTeams.length % BOT_LOGOS.length],
              is_bot: true,
              seed: cupTeams.length + 1,
            });
          }

          const { data: insertedTeams } = await supabase.from('cup_teams').insert(cupTeams).select();

          if (insertedTeams && insertedTeams.length >= 32) {
            const shuffled = secureShuffle(insertedTeams);
            const matches = [];
            const baseDate = new Date(now.getTime() + 14 * 24 * 3600000);

            for (let i = 0; i < 16; i++) {
              matches.push({
                cup_id: newCup.id,
                home_team_id: shuffled[i * 2].id,
                away_team_id: shuffled[i * 2 + 1].id,
                round: 1,
                leg: 1,
                scheduled_at: new Date(baseDate.getTime() + i * 3600000).toISOString(),
                status: 'scheduled',
              });
            }
            await supabase.from('cup_matches').insert(matches);
          }
        }
      }
    }

    // ── PHASE 5: International Cups (Champions/Libertadores + Europa/Sul-Americana) ──
    try {
      const intlRes = await fetch(`${supabaseUrl}/functions/v1/generate-international-cups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-cron': 'true',
          'Authorization': `Bearer ${serviceKey}`,
        },
      });
      const intlJson = await intlRes.json();
      console.log('[plan-season] international cups:', intlJson);
    } catch (e) {
      console.error('[plan-season] international cups error:', e);
    }

    // ── PHASE 6: Process Season Awards (Bola de Ouro, Artilheiros, etc) ──
    // Compute the season just ENDED (current season - 1, or previous month)
    try {
      const closingSeason = seasonMonth === 1 ? seasonYear - 1 : seasonYear;
      const awardsRes = await fetch(`${supabaseUrl}/functions/v1/process-season-awards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ season: closingSeason }),
      });
      const awardsJson = await awardsRes.json();
      console.log('[plan-season] season awards:', awardsJson);
    } catch (e) {
      console.error('[plan-season] season awards error:', e);
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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
