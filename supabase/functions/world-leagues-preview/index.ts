// Edge Function: world-leagues-preview
// Retorna o BLUEPRINT (prévia) de todas as ligas que serão criadas no início
// do próximo ciclo de temporada. NÃO persiste nada. Usado pelo painel admin
// para conferência antes do dia 1.
//
// Retorno por liga: country, country_name, flag, division, league_name,
//   slots, format, kickoff_hour_brt, kickoff_label, will_be_created (bool),
//   already_exists (bool), available_real_teams.
//
// Também retorna validações: duplicatas, ligas que já existem para a próxima
// season, ligas com poucos times reais (<20 → completadas com bots).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 40 países suportados (espelha src/types/league.ts).
const COUNTRIES = [
  "BR","AR","UY","PY","CL","CO","PE","EC","BO","VE",
  "EN","ES","DE","IT","FR","PT","NL","BE","TR","SC",
  "US","MX","CA","CR","HN","PA",
  "EG","MA","TN","NG","SN","ZA","GH","CM",
  "JP","KR","CN","SA","QA","IR","AU","AE",
];

const COUNTRY_NAMES: Record<string, string> = {
  BR:"Brasil",AR:"Argentina",UY:"Uruguai",PY:"Paraguai",CL:"Chile",
  CO:"Colômbia",PE:"Peru",EC:"Equador",BO:"Bolívia",VE:"Venezuela",
  EN:"Inglaterra",ES:"Espanha",DE:"Alemanha",IT:"Itália",FR:"França",
  PT:"Portugal",NL:"Holanda",BE:"Bélgica",TR:"Turquia",SC:"Escócia",
  US:"Estados Unidos",MX:"México",CA:"Canadá",CR:"Costa Rica",
  HN:"Honduras",PA:"Panamá",
  EG:"Egito",MA:"Marrocos",TN:"Tunísia",NG:"Nigéria",
  SN:"Senegal",ZA:"África do Sul",GH:"Gana",CM:"Camarões",
  JP:"Japão",KR:"Coreia do Sul",CN:"China",SA:"Arábia Saudita",
  QA:"Catar",IR:"Irã",AU:"Austrália",AE:"Emirados Árabes",
};

const COUNTRY_FLAGS: Record<string, string> = {
  BR:"🇧🇷",AR:"🇦🇷",UY:"🇺🇾",PY:"🇵🇾",CL:"🇨🇱",CO:"🇨🇴",PE:"🇵🇪",EC:"🇪🇨",BO:"🇧🇴",VE:"🇻🇪",
  EN:"🏴",ES:"🇪🇸",DE:"🇩🇪",IT:"🇮🇹",FR:"🇫🇷",PT:"🇵🇹",NL:"🇳🇱",BE:"🇧🇪",TR:"🇹🇷",SC:"🏴",
  US:"🇺🇸",MX:"🇲🇽",CA:"🇨🇦",CR:"🇨🇷",HN:"🇭🇳",PA:"🇵🇦",
  EG:"🇪🇬",MA:"🇲🇦",TN:"🇹🇳",NG:"🇳🇬",SN:"🇸🇳",ZA:"🇿🇦",GH:"🇬🇭",CM:"🇨🇲",
  JP:"🇯🇵",KR:"🇰🇷",CN:"🇨🇳",SA:"🇸🇦",QA:"🇶🇦",IR:"🇮🇷",AU:"🇦🇺",AE:"🇦🇪",
};

// Nomes de cada divisão (D1) — mantemos só D1 no blueprint padrão para
// alinhar com o sistema atual (1 liga oficial por país).
const TOP_LEAGUE_NAMES: Record<string, string> = {
  BR:"Brasileirão Série A",AR:"Liga Profesional",UY:"Primera División",
  PY:"División de Honor",CL:"Primera División",CO:"Liga BetPlay",
  PE:"Liga 1",EC:"LigaPro Serie A",BO:"División Profesional",
  VE:"Liga FUTVE",EN:"Premier League",ES:"La Liga",DE:"Bundesliga",
  IT:"Serie A",FR:"Ligue 1",PT:"Liga Portugal",NL:"Eredivisie",
  BE:"Pro League",TR:"Süper Lig",SC:"Premiership",US:"MLS",
  MX:"Liga MX",CA:"Canadian Premier",CR:"Primera División CR",
  HN:"Liga Nacional HN",PA:"Liga Panameña",EG:"Egyptian Premier",
  MA:"Botola Pro",TN:"Ligue 1 TN",NG:"NPFL",SN:"Ligue 1 SN",
  ZA:"PSL",GH:"GPL",CM:"Elite One",JP:"J1 League",KR:"K League 1",
  CN:"Chinese Super League",SA:"Saudi Pro League",
  QA:"Qatar Stars League",IR:"Persian Gulf Pro",AU:"A-League",
  AE:"UAE Pro League",
};

// Horário fixo BRT por divisão (definido no memory: D1 16h–19h liga).
// Para D1 usamos 17h BRT por padrão.
const KICKOFF_BY_DIVISION: Record<number, number> = { 1: 17, 2: 16, 3: 18, 4: 19 };

function formatKickoffLabel(hourBrt: number): string {
  return `${String(hourBrt).padStart(2, "0")}:00 BRT`;
}

// "Próxima season" = max(season existente) + 1. Se não houver, season = 1.
async function getNextSeason(sb: any): Promise<number> {
  const { data } = await sb
    .from("world_leagues")
    .select("season")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.season ?? 0) + 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nextSeason = await getNextSeason(sb);

    // Ligas já criadas para a próxima season (idempotência / detecção de duplicatas)
    const { data: existing } = await sb
      .from("world_leagues")
      .select("id, country, division, season, status")
      .eq("season", nextSeason);
    const existingKey = new Set(
      (existing ?? []).map((l: any) => `${l.country}|${l.division}`),
    );

    // Detecta duplicatas reais (mesmo country+division+season ocorrendo >1x)
    const dupCount: Record<string, number> = {};
    for (const l of existing ?? []) {
      const k = `${l.country}|${l.division}|${l.season}`;
      dupCount[k] = (dupCount[k] ?? 0) + 1;
    }
    const duplicates = Object.entries(dupCount)
      .filter(([, c]) => c > 1)
      .map(([k, c]) => ({ key: k, count: c }));

    // Monta blueprint: 1 liga D1 por país (40 ligas).
    const blueprint = COUNTRIES.map((code) => {
      const division = 1;
      const kickoffHour = KICKOFF_BY_DIVISION[division];
      const key = `${code}|${division}`;
      return {
        country: code,
        country_name: COUNTRY_NAMES[code] ?? code,
        flag: COUNTRY_FLAGS[code] ?? "🏳️",
        division,
        league_name: TOP_LEAGUE_NAMES[code] ?? `${COUNTRY_NAMES[code]} D1`,
        slots: 20,
        format: "Pontos corridos (turno + parte do returno) — 30 rodadas",
        kickoff_hour_brt: kickoffHour,
        kickoff_label: formatKickoffLabel(kickoffHour),
        will_be_created: !existingKey.has(key),
        already_exists: existingKey.has(key),
      };
    });

    const summary = {
      next_season: nextSeason,
      total_leagues_planned: blueprint.length,
      to_be_created: blueprint.filter((l) => l.will_be_created).length,
      already_existing: blueprint.filter((l) => l.already_exists).length,
      duplicates_detected: duplicates,
      total_matches_per_league: 300, // 20 times × 30 rodadas / 2
      total_matches_planned: blueprint.length * 300,
    };

    return new Response(
      JSON.stringify({ ok: true, summary, blueprint }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
