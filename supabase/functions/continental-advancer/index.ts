// continental-advancer
// Processa as competições continentais (Principal/Secundária) dos jogadores humanos:
// - Simula partidas de grupo já vencidas
// - Quando todos os jogos de grupos estão completos, gera mata-mata (oitavas/quartas/semi/final)
// - Calendário: dia 21 oitavas, 22 quartas, 23 semi, 24 final (20h BRT)
// Pode ser chamado por cron ou manualmente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function brtTimestamp(date: Date, hour: number): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  // BRT = UTC-3 → para H BRT, hora UTC = H + 3
  const utcHour = hour + 3;
  const dt = utcHour >= 24
    ? new Date(Date.UTC(y, m, d + 1, utcHour - 24, 0, 0))
    : new Date(Date.UTC(y, m, d, utcHour, 0, 0));
  return dt.toISOString();
}

function poisson(lambda: number): number {
  let L = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulateMatch(homeStrength: number, awayStrength: number, isKnockout = false) {
  const homeAdv = 1.08;
  const homeStr = homeStrength * homeAdv;
  const totalStr = homeStr + awayStrength;
  const homeChance = homeStr / totalStr;
  const avgGoals = 2.6;
  const homeExp = avgGoals * homeChance;
  const awayExp = avgGoals * (1 - homeChance);
  let homeGoals = poisson(homeExp);
  let awayGoals = poisson(awayExp);
  let homePen: number | null = null, awayPen: number | null = null;

  if (isKnockout && homeGoals === awayGoals) {
    // pênaltis decisivos
    homePen = 3 + Math.floor(Math.random() * 3);
    awayPen = 3 + Math.floor(Math.random() * 3);
    while (homePen === awayPen) {
      homePen = 3 + Math.floor(Math.random() * 3);
      awayPen = 3 + Math.floor(Math.random() * 3);
    }
  }

  return { homeGoals, awayGoals, homePen, awayPen };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { competitionId?: string; force?: boolean } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const results: any[] = [];
  const now = new Date();

  // Pega competições in_progress
  let q = supabase.from("continental_competitions").select("*").eq("status", "in_progress");
  if (body.competitionId) q = q.eq("id", body.competitionId);
  const { data: comps, error: compsErr } = await q;
  if (compsErr) {
    return new Response(JSON.stringify({ error: compsErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const comp of comps ?? []) {
    const compResult: any = { id: comp.id, continent: comp.continent, tier: comp.tier, simulated: 0, advanced: null };

    // 1) Simula partidas vencidas e ainda 'scheduled'
    const { data: pendingMatches } = await supabase
      .from("continental_matches")
      .select("*")
      .eq("competition_id", comp.id)
      .eq("status", "scheduled")
      .lte("scheduled_at", now.toISOString());

    for (const m of pendingMatches ?? []) {
      const [{ data: home }, { data: away }] = await Promise.all([
        supabase.from("continental_teams").select("*").eq("id", m.home_team_id).single(),
        supabase.from("continental_teams").select("*").eq("id", m.away_team_id).single(),
      ]);
      if (!home || !away) continue;

      const isKO = m.stage !== "group";
      const { homeGoals, awayGoals, homePen, awayPen } = simulateMatch(
        home.bot_strength ?? 70,
        away.bot_strength ?? 70,
        isKO,
      );

      await supabase.from("continental_matches").update({
        home_goals: homeGoals, away_goals: awayGoals,
        home_goals_pen: homePen, away_goals_pen: awayPen,
        status: "played", played_at: new Date().toISOString(),
      }).eq("id", m.id);

      // Atualiza stats do grupo
      if (m.stage === "group") {
        const homePts = homeGoals > awayGoals ? 3 : homeGoals === awayGoals ? 1 : 0;
        const awayPts = awayGoals > homeGoals ? 3 : awayGoals === homeGoals ? 1 : 0;

        await supabase.from("continental_teams").update({
          group_points: home.group_points + homePts,
          group_wins: home.group_wins + (homePts === 3 ? 1 : 0),
          group_draws: home.group_draws + (homePts === 1 ? 1 : 0),
          group_losses: home.group_losses + (homePts === 0 ? 1 : 0),
          group_goals_for: home.group_goals_for + homeGoals,
          group_goals_against: home.group_goals_against + awayGoals,
        }).eq("id", home.id);

        await supabase.from("continental_teams").update({
          group_points: away.group_points + awayPts,
          group_wins: away.group_wins + (awayPts === 3 ? 1 : 0),
          group_draws: away.group_draws + (awayPts === 1 ? 1 : 0),
          group_losses: away.group_losses + (awayPts === 0 ? 1 : 0),
          group_goals_for: away.group_goals_for + awayGoals,
          group_goals_against: away.group_goals_against + homeGoals,
        }).eq("id", away.id);
      }
      compResult.simulated++;
    }

    // 2) Verifica se todos os jogos de grupo terminaram → gera mata-mata
    const { count: pendingGroup } = await supabase
      .from("continental_matches")
      .select("*", { count: "exact", head: true })
      .eq("competition_id", comp.id)
      .eq("stage", "group")
      .neq("status", "played");

    const { count: hasKO } = await supabase
      .from("continental_matches")
      .select("*", { count: "exact", head: true })
      .eq("competition_id", comp.id)
      .neq("stage", "group");

    if ((pendingGroup ?? 0) === 0 && (hasKO ?? 0) === 0) {
      // Pega top 2 de cada grupo
      const { data: groups } = await supabase
        .from("continental_teams")
        .select("*")
        .eq("competition_id", comp.id)
        .order("group_label", { ascending: true })
        .order("group_points", { ascending: false });

      const groupMap: Record<string, any[]> = {};
      for (const t of groups ?? []) {
        const g = t.group_label || "?";
        groupMap[g] = groupMap[g] || [];
        groupMap[g].push(t);
      }
      // Ordena dentro do grupo: pts, saldo, gols pró
      for (const g in groupMap) {
        groupMap[g].sort((a, b) => 
          b.group_points - a.group_points ||
          (b.group_goals_for - b.group_goals_against) - (a.group_goals_for - a.group_goals_against) ||
          b.group_goals_for - a.group_goals_for
        );
      }
      const advancers: any[] = [];
      for (const g in groupMap) {
        advancers.push(groupMap[g][0]); // 1º
        advancers.push(groupMap[g][1]); // 2º
      }

      // Marca eliminados (3º e 4º)
      for (const g in groupMap) {
        for (let i = 2; i < groupMap[g].length; i++) {
          await supabase.from("continental_teams").update({ 
            eliminated: true, eliminated_in_stage: 'group' 
          }).eq("id", groupMap[g][i].id);
        }
      }

      // Calendário do mata-mata
      const startDate = comp.start_date ? new Date(comp.start_date + "T00:00:00Z") : new Date();
      const day = (offset: number) => {
        const d = new Date(startDate);
        d.setUTCDate(d.getUTCDate() + offset);
        return d;
      };

      // Determina próxima fase baseada no número de advancers (top 2 por grupo)
      // 16 advancers (8 grupos)  → round_of_16
      // 8 advancers  (4 grupos)  → quarter_finals
      // 4 advancers  (2 grupos)  → semi_finals
      const matchesToInsert: any[] = [];

      // Sorteia advancers (Fisher-Yates)
      const shuffled = [...advancers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let firstStage: string;
      let firstOffset: number;
      if (shuffled.length >= 16) {
        firstStage = "round_of_16"; firstOffset = 6;
      } else if (shuffled.length >= 8) {
        firstStage = "quarter_finals"; firstOffset = 7;
      } else if (shuffled.length >= 4) {
        firstStage = "semi_finals"; firstOffset = 8;
      } else {
        firstStage = "final"; firstOffset = 9;
      }

      const numMatches = Math.floor(shuffled.length / 2);
      for (let i = 0; i < numMatches; i++) {
        matchesToInsert.push({
          competition_id: comp.id, stage: firstStage, round: 1,
          home_team_id: shuffled[i * 2].id, away_team_id: shuffled[i * 2 + 1].id,
          scheduled_at: brtTimestamp(day(firstOffset), 20), status: "scheduled",
        });
      }

      if (matchesToInsert.length > 0) {
        await supabase.from("continental_matches").insert(matchesToInsert);
        await supabase.from("continental_competitions").update({
          current_stage: firstStage, current_round: 1,
        }).eq("id", comp.id);
        compResult.advanced = firstStage;
      }
    }

    // 3) Avança fases eliminatórias subsequentes
    const stageOrder = ["round_of_16", "quarter_finals", "semi_finals", "final"];
    const dayMap: Record<string, number> = { 
      round_of_16: 6, quarter_finals: 7, semi_finals: 8, final: 9 
    };

    for (let si = 0; si < stageOrder.length - 1; si++) {
      const curStage = stageOrder[si];
      const nextStage = stageOrder[si + 1];
      
      const { count: pendingCur } = await supabase
        .from("continental_matches")
        .select("*", { count: "exact", head: true })
        .eq("competition_id", comp.id)
        .eq("stage", curStage)
        .neq("status", "played");
      
      const { count: hasNext } = await supabase
        .from("continental_matches")
        .select("*", { count: "exact", head: true })
        .eq("competition_id", comp.id)
        .eq("stage", nextStage);

      if ((pendingCur ?? 0) === 0 && (hasNext ?? 0) === 0) {
        const { data: curMatches } = await supabase
          .from("continental_matches")
          .select("*")
          .eq("competition_id", comp.id)
          .eq("stage", curStage)
          .order("created_at", { ascending: true });
        
        if (!curMatches || curMatches.length === 0) continue;
        
        const winners: string[] = [];
        for (const m of curMatches) {
          // Marca perdedor como eliminado
          let winner = m.home_team_id, loser = m.away_team_id;
          if ((m.away_goals ?? 0) > (m.home_goals ?? 0) || 
              ((m.away_goals_pen ?? 0) > (m.home_goals_pen ?? 0))) {
            winner = m.away_team_id; loser = m.home_team_id;
          }
          await supabase.from("continental_teams").update({ 
            eliminated: true, eliminated_in_stage: curStage 
          }).eq("id", loser);
          winners.push(winner);
        }

        // Cria próxima fase
        const startDate = comp.start_date ? new Date(comp.start_date + "T00:00:00Z") : new Date();
        const offset = dayMap[nextStage];
        const day = new Date(startDate);
        day.setUTCDate(day.getUTCDate() + offset);
        
        const nextMatches: any[] = [];
        for (let i = 0; i < winners.length; i += 2) {
          if (i + 1 >= winners.length) break;
          nextMatches.push({
            competition_id: comp.id, stage: nextStage, round: 1,
            home_team_id: winners[i], away_team_id: winners[i + 1],
            scheduled_at: brtTimestamp(day, 20), status: "scheduled",
          });
        }
        
        if (nextMatches.length > 0) {
          await supabase.from("continental_matches").insert(nextMatches);
          await supabase.from("continental_competitions").update({
            current_stage: nextStage, current_round: 1,
          }).eq("id", comp.id);
        }
      }
    }

    // 4) Verifica se a final terminou → marca campeão
    const { data: finalMatch } = await supabase
      .from("continental_matches")
      .select("*")
      .eq("competition_id", comp.id)
      .eq("stage", "final")
      .eq("status", "played")
      .maybeSingle();
    
    if (finalMatch) {
      let champion = finalMatch.home_team_id, runnerUp = finalMatch.away_team_id;
      if ((finalMatch.away_goals ?? 0) > (finalMatch.home_goals ?? 0) || 
          ((finalMatch.away_goals_pen ?? 0) > (finalMatch.home_goals_pen ?? 0))) {
        champion = finalMatch.away_team_id; runnerUp = finalMatch.home_team_id;
      }
      await supabase.from("continental_competitions").update({
        status: "finished", champion_team_id: champion, runner_up_team_id: runnerUp,
        current_stage: "finished", end_date: new Date().toISOString().slice(0, 10),
      }).eq("id", comp.id);
      compResult.champion = champion;
    }

    results.push(compResult);
  }

  return new Response(
    JSON.stringify({ ok: true, processed: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
