import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COUNTRIES = [
  "BR","AR","UY","PY","CL","CO","PE","EC","BO","VE",
  "EN","ES","DE","IT","FR","PT","NL","BE","TR","SC",
  "US","MX","CA","CR","HN","PA",
  "EG","MA","TN","NG","SN","ZA","GH","CM",
  "JP","KR","CN","SA","QA","IR","AU","AE",
];

const COUNTRY_FLAGS: Record<string, string> = {
  BR:"🇧🇷",AR:"🇦🇷",UY:"🇺🇾",PY:"🇵🇾",CL:"🇨🇱",CO:"🇨🇴",PE:"🇵🇪",EC:"🇪🇨",BO:"🇧🇴",VE:"🇻🇪",
  EN:"🏴",ES:"🇪🇸",DE:"🇩🇪",IT:"🇮🇹",FR:"🇫🇷",PT:"🇵🇹",NL:"🇳🇱",BE:"🇧🇪",TR:"🇹🇷",SC:"🏴",
  US:"🇺🇸",MX:"🇲🇽",CA:"🇨🇦",CR:"🇨🇷",HN:"🇭🇳",PA:"🇵🇦",
  EG:"🇪🇬",MA:"🇲🇦",TN:"🇹🇳",NG:"🇳🇬",SN:"🇸🇳",ZA:"🇿🇦",GH:"🇬🇭",CM:"🇨🇲",
  JP:"🇯🇵",KR:"🇰🇷",CN:"🇨🇳",SA:"🇸🇦",QA:"🇶🇦",IR:"🇮🇷",AU:"🇦🇺",AE:"🇦🇪",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    // 1. Get next season
    const { data: lastSeasonData } = await sb.from("world_leagues").select("season").order("season", { ascending: false }).limit(1).maybeSingle();
    const nextSeason = (lastSeasonData?.season ?? 0) + 1;

    // 2. Load division configurations
    const { data: configs } = await sb.from("world_league_config").select("*");
    
    // 3. Count human players per country to decide tiers
    const { data: humanClubs } = await sb.from("clubs").select("id, country");
    const clubsByCountry: Record<string, string[]> = {};
    humanClubs?.forEach(c => {
      if (!clubsByCountry[c.country]) clubsByCountry[c.country] = [];
      clubsByCountry[c.country].push(c.id);
    });

    const results = [];

    for (const countryCode of COUNTRIES) {
      const countryName = getCountryName(countryCode); // Helper needed or use map
      const humanCount = clubsByCountry[countryName]?.length || 0;
      
      // Minimum: Tier 1 (always)
      // Tier 2: if humanCount > 10
      // Tier 3: if humanCount > 30
      // Tier 4: if humanCount > 60
      // Tier 5: if humanCount > 100
      let maxTier = 1;
      if (humanCount > 10) maxTier = 2;
      if (humanCount > 30) maxTier = 3;
      if (humanCount > 60) maxTier = 4;
      if (humanCount > 100) maxTier = 5;

      for (let tier = 1; tier <= maxTier; tier++) {
        const config = configs?.find(c => c.country === countryName && c.tier_level === tier);
        if (!config && tier > 1) continue; // Only D1 is guaranteed without config

        const leagueName = config?.division_name || `${countryName} Divisão ${tier}`;
        const matchTime = config?.match_time || "20:00:00";

        // Create league
        const { data: league, error: lErr } = await sb.from("world_leagues").insert({
          country: countryName,
          league_name: leagueName,
          division: tier,
          tier_level: tier,
          season: nextSeason,
          status: "in_progress",
          total_matchdays: 30,
          total_slots: 16,
          flag_emoji: COUNTRY_FLAGS[countryCode] || "🏳️",
          kickoff_hour: parseInt(matchTime.split(":")[0]),
          kickoff_minute: parseInt(matchTime.split(":")[1]),
        }).select().single();

        if (lErr) {
          console.error(`Error creating league ${leagueName}:`, lErr);
          continue;
        }

        // Fill with bots for now (Promotion/Relegation would reorder this)
        const botTeams = generateBotTeams(countryName, 16);
        const teamRows = botTeams.map(t => ({
          league_id: league.id,
          club_name: t.name,
          club_logo: COUNTRY_FLAGS[countryCode] || "⚽",
          is_bot: true,
          bot_strength: 70 - (tier * 5),
        }));

        await sb.from("world_league_teams").insert(teamRows);
        
        // Generate calendar
        await sb.rpc("generate_world_league_calendar", {
          p_league_id: league.id,
          p_start_date: new Date().toISOString(),
          p_match_time: matchTime
        });

        results.push({ league: leagueName, country: countryName, tier });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function getCountryName(code: string): string {
  const map: Record<string, string> = {
    BR: "Brasil", AR: "Argentina", EN: "Inglaterra", ES: "Espanha", IT: "Itália",
    DE: "Alemanha", FR: "França", PT: "Portugal", NL: "Holanda", BE: "Bélgica",
    TR: "Turquia", MX: "México", US: "Estados Unidos", JP: "Japão", KR: "Coreia do Sul",
    CN: "China", SA: "Arábia Saudita", RU: "Rússia", UA: "Ucrânia", SC: "Escócia",
    CH: "Suíça", AT: "Áustria", DK: "Dinamarca", SE: "Suécia", NO: "Noruega",
    GR: "Grécia", HR: "Croácia", RS: "Sérvia", UY: "Uruguai", CO: "Colômbia",
    CL: "Chile", PY: "Paraguai"
  };
  return map[code] || code;
}

function generateBotTeams(country: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `${country} Bot FC ${i + 1}`,
  }));
}
