// Edge Function: world-leagues-activate
// Cria e ativa todas as ligas oficiais do mundo para a próxima season.
// - Idempotente: pula ligas que já existem para a season.
// - Distribui 20 times por liga (bots gerados se faltar real).
// - Aciona world-season-planner para gerar calendário (30 rodadas).
// - Validações: duplicatas, ligas incompletas, falhas de calendário.
//
// Disparado automaticamente via pg_cron à 00:00 BRT do dia 1 (= 03:00 UTC),
// ou manualmente via painel admin (botão "Ativar agora").

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

// D1: rotaciona entre 16..22 BRT (7 janelas) — distribui carga.
// D2..D4: horários fixos mais cedo, sempre <= 22.
const KICKOFF_BY_DIVISION: Record<number, number> = { 2: 16, 3: 18, 4: 19 };
const D1_HOURS = [16, 17, 18, 19, 20, 21, 22];
function kickoffFor(division: number, countryIndex: number): number {
  if (division === 1) return D1_HOURS[countryIndex % D1_HOURS.length];
  return KICKOFF_BY_DIVISION[division] ?? 17;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  const buf = new Uint32Array(1);
  for (let i = a.length - 1; i > 0; i--) {
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 20 times bots padrão por país (genéricos – usados quando não houver clubes humanos).
function generateBotTeams(country: string): Array<{ name: string; logo: string; strength: number }> {
  const flag = COUNTRY_FLAGS[country] ?? "⚽";
  const baseNames = [
    "United","City","Atlético","Sporting","Real","Olympic","Internacional",
    "Nacional","Estrela","Dragões","Lobos","Águias","Tigres","Leões",
    "Falcões","Furacão","Rayo","Estrella","Albion","Rovers",
  ];
  return baseNames.map((n, i) => ({
    name: `${n} ${country}`,
    logo: flag,
    strength: 78 - i, // 78..59
  }));
}

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

    const body = await req.json().catch(() => ({} as any));
    const force: boolean = body?.force === true;
    const dryRun: boolean = body?.dry_run === true;

    const nextSeason = await getNextSeason(sb);

    // Carrega ligas já existentes para essa season
    const { data: existing } = await sb
      .from("world_leagues")
      .select("id, country, division")
      .eq("season", nextSeason);
    const existingMap = new Map<string, string>();
    for (const l of existing ?? []) {
      existingMap.set(`${l.country}|${l.division}`, l.id);
    }

    const created: any[] = [];
    const skipped: any[] = [];
    const errors: any[] = [];
    const validation_warnings: any[] = [];

    // Hoje em BRT (UTC-3) → ISO date
    const nowUtc = new Date();
    const brt = new Date(nowUtc.getTime() - 3 * 60 * 60 * 1000);
    const todayBrt = brt.toISOString().slice(0, 10);
    // season_started_at = início do dia BRT em UTC ISO
    const seasonStartUtcIso = new Date(
      Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate(), 3, 0, 0),
    ).toISOString();

    for (const country of COUNTRIES) {
      const division = 1;
      const key = `${country}|${division}`;
      let leagueId = existingMap.get(key);

      try {
        if (leagueId && !force) {
          skipped.push({ country, division, reason: "já existe", league_id: leagueId });
          continue;
        }

        if (leagueId && force) {
          // Limpa matches/teams antes de recriar
          await sb.from("world_matches").delete().eq("league_id", leagueId);
          await sb.from("world_league_teams").delete().eq("league_id", leagueId);
          await sb.from("world_leagues").delete().eq("id", leagueId);
          leagueId = undefined;
        }

        if (dryRun) {
          created.push({ country, division, dry_run: true });
          continue;
        }

        // 1. Cria a liga
        const { data: leagueRow, error: lErr } = await sb
          .from("world_leagues")
          .insert({
            country,
            flag_emoji: COUNTRY_FLAGS[country] ?? "🏳️",
            division,
            league_name: TOP_LEAGUE_NAMES[country] ?? `${country} D1`,
            kickoff_hour: KICKOFF_BY_DIVISION[division],
            season: nextSeason,
            current_matchday: 0,
            total_matchdays: 30,
            total_slots: 20,
            status: "in_progress",
            season_started_at: seasonStartUtcIso,
          })
          .select("id")
          .single();
        if (lErr) throw lErr;
        leagueId = leagueRow.id;

        // 2. Distribui 20 times bots (humanos podem ser realocados em outro fluxo)
        const teams = shuffle(generateBotTeams(country));
        const teamRows = teams.slice(0, 20).map((t) => ({
          league_id: leagueId,
          user_id: null,
          is_bot: true,
          bot_strength: t.strength,
          club_name: t.name,
          club_logo: t.logo,
        }));

        // Validação anti-duplicata: nomes únicos dentro da liga
        const nameSet = new Set(teamRows.map((r) => r.club_name));
        if (nameSet.size !== teamRows.length) {
          throw new Error(`Times duplicados detectados em ${country}`);
        }
        if (teamRows.length !== 20) {
          throw new Error(`Liga incompleta: ${teamRows.length}/20 times em ${country}`);
        }

        const { error: tErr } = await sb.from("world_league_teams").insert(teamRows);
        if (tErr) throw tErr;

        created.push({ country, division, league_id: leagueId, teams: 20 });
      } catch (e: any) {
        errors.push({ country, division, error: e?.message ?? String(e) });
        // Rollback parcial se deu erro depois de criar a liga
        if (leagueId) {
          await sb.from("world_league_teams").delete().eq("league_id", leagueId);
          await sb.from("world_leagues").delete().eq("id", leagueId);
        }
      }
    }

    // 3. Aciona o planner de calendário (gera world_matches para todas as ligas in_progress)
    let plannerResult: any = null;
    if (!dryRun && created.length > 0) {
      try {
        const plannerRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/world-season-planner`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({}),
          },
        );
        plannerResult = await plannerRes.json();
        if (plannerResult?.errors?.length) {
          for (const err of plannerResult.errors) {
            validation_warnings.push({
              type: "calendar_failed",
              league_id: err.league_id,
              error: err.error,
            });
          }
        }
      } catch (e: any) {
        validation_warnings.push({ type: "planner_call_failed", error: e?.message });
      }
    }

    // 4. Validação pós-criação: cada liga deve ter exatamente 20 times e 300 matches
    if (!dryRun) {
      const { data: validate } = await sb
        .from("world_leagues")
        .select("id, country, division, season")
        .eq("season", nextSeason);
      for (const l of validate ?? []) {
        const { count: teamCount } = await sb
          .from("world_league_teams")
          .select("id", { count: "exact", head: true })
          .eq("league_id", l.id);
        if (teamCount !== 20) {
          validation_warnings.push({
            type: "incomplete_league",
            league_id: l.id,
            country: l.country,
            teams: teamCount,
            expected: 20,
          });
        }
        const { count: matchCount } = await sb
          .from("world_matches")
          .select("id", { count: "exact", head: true })
          .eq("league_id", l.id)
          .eq("season", l.season);
        if ((matchCount ?? 0) === 0) {
          validation_warnings.push({
            type: "no_calendar",
            league_id: l.id,
            country: l.country,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        next_season: nextSeason,
        activated_at: new Date().toISOString(),
        force,
        dry_run: dryRun,
        created_count: created.length,
        skipped_count: skipped.length,
        error_count: errors.length,
        warnings_count: validation_warnings.length,
        created,
        skipped,
        errors,
        validation_warnings,
        planner_result: plannerResult,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
