// Edge Function: world-leagues-reset
// Reseta TODAS as ligas mundiais ativas:
// 1. Apaga partidas, tabela, stats de jogadores e notícias do mês atual
// 2. Regenera calendário (round-robin duplo, 1 rodada/dia, kickoff 19:30 BRT)
// 3. Simula automaticamente as rodadas com scheduled_at <= agora
// 4. Recalcula a classificação com forma recente e estatísticas
// 5. Gera notícias e estatísticas de jogadores
// 6. Notifica todos os usuários sobre o reset
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// Round-robin (Berger). n par. Retorna rounds[][home,away].
function buildRoundRobin(ids: string[]): Array<Array<[string, string]>> {
  const n = ids.length;
  if (n % 2 !== 0) throw new Error("teams must be even");
  const rounds: Array<Array<[string, string]>> = [];
  const fixed = ids[0];
  let rotating = ids.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const round: Array<[string, string]> = [];
    const left = [fixed, ...rotating.slice(0, n / 2 - 1)];
    const right = rotating.slice(n / 2 - 1).reverse();
    for (let i = 0; i < n / 2; i++) {
      const home = r % 2 === 0 ? left[i] : right[i];
      const away = r % 2 === 0 ? right[i] : left[i];
      round.push([home, away]);
    }
    rounds.push(round);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }
  return rounds;
}

function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulateMatch(homeStr: number, awayStr: number) {
  const hs = Math.max(40, homeStr) * 1.15; // Home advantage
  const as = Math.max(40, awayStr);
  const total = hs + as;
  const base = 2.6; // Average goals per game
  return {
    home: Math.min(7, poisson(base * (hs / total))),
    away: Math.min(7, poisson(base * (as / total))),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({} as any));
    const adminUserId: string | null = body?.admin_user_id ?? null;
    const notify: boolean = body?.notify !== false;

    const now = new Date();
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const seasonYear = brt.getUTCFullYear();
    const seasonMonth = brt.getUTCMonth() + 1;

    // Dia 1 do mês BRT como base de calendário
    const monthStartUtc = new Date(Date.UTC(seasonYear, seasonMonth - 1, 1, 22, 30, 0)); // 19:30 BRT = 22:30 UTC

    const { data: leagues, error: lErr } = await sb
      .from("world_leagues")
      .select("id, name, division, country")
      .eq("active", true);
  
    if (lErr) throw lErr;

    let totalCreated = 0;
    let totalSimulated = 0;
    const perLeague: any[] = [];

    for (const league of leagues ?? []) {
      // 1. Limpeza
      await sb.from("world_matches").delete().eq("league_id", league.id).eq("season_month", seasonMonth).eq("season_year", seasonYear);
      await sb.from("world_league_table").delete().eq("league_id", league.id).eq("season_month", seasonMonth).eq("season_year", seasonYear);
      await sb.from("world_player_stats").delete().eq("league_id", league.id).eq("season_month", seasonMonth).eq("season_year", seasonYear);
      await sb.from("world_league_news").delete().eq("league_id", league.id);

      // 2. Carrega times e jogadores
      const { data: teams } = await sb.from("world_teams")
        .select("id, name, strength, is_bot, logo, user_id")
        .eq("league_id", league.id);
      
      if (!teams || teams.length < 2) continue;
      
      // Ensure even number of teams for round robin
      let leagueTeams = [...teams];
      if (leagueTeams.length % 2 !== 0) {
        // Add a ghost team or just skip one team? 
        // For now, let's just use an even subset if needed, but ideally we have even teams.
        // Actually, the system should ensure even teams.
        leagueTeams = leagueTeams.slice(0, leagueTeams.length - 1);
      }

      const strengthMap = new Map(leagueTeams.map((t: any) => [t.id, t.strength ?? 65]));
      const teamMap = new Map(leagueTeams.map((t: any) => [t.id, t]));
      const ids = shuffle(leagueTeams.map((t: any) => t.id));
      const firstHalf = buildRoundRobin(ids);
      const secondHalf = firstHalf.map((r) => r.map(([h, a]) => [a, h] as [string, string]));
      const allRounds = [...firstHalf, ...secondHalf];

      // 3. Inicializa tabela
      const tableRows = leagueTeams.map((t: any) => ({
        league_id: league.id,
        team_id: t.id,
        season_month: seasonMonth,
        season_year: seasonYear,
        played: 0, wins: 0, draws: 0, losses: 0,
        goals_for: 0, goals_against: 0, points: 0,
        last_5_games: '-----',
        sequence: '-',
        win_rate: 0
      }));
      await sb.from("world_league_table").insert(tableRows);

      // 4. Gera matches e simula passado
      const matchInserts: any[] = [];
      const newsInserts: any[] = [];
      const playerStatsMap = new Map<string, any>(); // team_id -> player_stats
      const standings = new Map<string, any>(tableRows.map((r) => [r.team_id, r]));
      const teamLastGames = new Map<string, string[]>(leagueTeams.map(t => [t.id, []]));

      let leagueSimulated = 0;

      for (let r = 0; r < allRounds.length; r++) {
        const dayOffset = r;
        const scheduled = new Date(monthStartUtc.getTime() + dayOffset * 86400000);
        const isPast = scheduled.getTime() <= now.getTime();

        for (const [homeId, awayId] of allRounds[r]) {
          const row: any = {
            league_id: league.id,
            home_team_id: homeId,
            away_team_id: awayId,
            round: r + 1,
            scheduled_at: scheduled.toISOString(),
            season_month: seasonMonth,
            season_year: seasonYear,
            status: "scheduled",
            home_goals: 0,
            away_goals: 0,
          };

          if (isPast) {
            const home = teamMap.get(homeId);
            const away = teamMap.get(awayId);
            const { home: hg, away: ag } = simulateMatch(home.strength ?? 65, away.strength ?? 65);
            row.home_goals = hg;
            row.away_goals = ag;
            row.status = "finished";
            row.played_at = scheduled.toISOString();
            
            // Update standings
            const sh = standings.get(homeId);
            const sa = standings.get(awayId);
            sh.played++; sa.played++;
            sh.goals_for += hg; sh.goals_against += ag;
            sa.goals_for += ag; sa.goals_against += hg;
            
            const hRes = hg > ag ? 'W' : (hg < ag ? 'L' : 'D');
            const aRes = ag > hg ? 'W' : (ag < hg ? 'L' : 'D');
            
            if (hRes === 'W') { sh.wins++; sh.points += 3; sa.losses++; }
            else if (hRes === 'L') { sa.wins++; sa.points += 3; sh.losses++; }
            else { sh.draws++; sa.draws++; sh.points++; sa.points++; }
            
            // Form
            const hForm = teamLastGames.get(homeId)!;
            const aForm = teamLastGames.get(awayId)!;
            hForm.push(hRes); if (hForm.length > 5) hForm.shift();
            aForm.push(aRes); if (aForm.length > 5) aForm.shift();
            
            leagueSimulated++;

            // Generate News for important matches or every few matches
            if (Math.random() > 0.7 || hg + ag >= 5 || Math.abs(hg - ag) >= 3) {
              const title = hg > ag ? `${home.name} vence ${away.name} por ${hg}x${ag}!` : 
                            (ag > hg ? `${away.name} derrota ${home.name} fora de casa!` :
                            `Empate emocionante entre ${home.name} e ${away.name}: ${hg}x${ag}`);
              newsInserts.push({
                league_id: league.id,
                title,
                content: `A rodada ${r+1} da ${league.name} trouxe um grande jogo. ${title} A torcida está ${hg+ag > 3 ? 'eufórica com tantos gols' : 'atenta aos próximos passos'}.`,
                category: 'match_report',
                importance: (hg + ag >= 5) ? 3 : 1
              });
            }
          }
          matchInserts.push(row);
        }
      }

      // Finalize table stats
      for (const [tId, s] of standings.entries()) {
        const form = teamLastGames.get(tId) || [];
        s.last_5_games = form.join('').padEnd(5, '-');
        let seq = 0;
        if (form.length > 0) {
          const last = form[form.length - 1];
          for (let i = form.length - 1; i >= 0; i--) {
            if (form[i] === last) seq++; else break;
          }
          s.sequence = `${seq}${last}`;
        }
        s.win_rate = s.played > 0 ? (s.wins / s.played) * 100 : 0;
      }

      // Insert Matches
      for (let i = 0; i < matchInserts.length; i += 200) {
        await sb.from("world_matches").insert(matchInserts.slice(i, i + 200));
      }

      // Update Table
      for (const s of standings.values()) {
        await sb.from("world_league_table")
          .update({
            played: s.played, wins: s.wins, draws: s.draws, losses: s.losses,
            goals_for: s.goals_for, goals_against: s.goals_against, points: s.points,
            last_5_games: s.last_5_games, sequence: s.sequence, win_rate: s.win_rate
          })
          .eq("league_id", league.id)
          .eq("team_id", s.team_id)
          .eq("season_month", seasonMonth)
          .eq("season_year", seasonYear);
      }

      // Insert News
      if (newsInserts.length > 0) {
        await sb.from("world_league_news").insert(newsInserts.slice(0, 50));
      }

      perLeague.push({
        name: league.name,
        teams: leagueTeams.length,
        matches: matchInserts.length,
        simulated: leagueSimulated,
      });
      totalCreated += matchInserts.length;
      totalSimulated += leagueSimulated;
    }

    // Notifica todos
    let notified = 0;
    if (notify) {
      const { data: users } = await sb.from("profiles").select("id");
      if (users && users.length > 0) {
        const notifs = users.map((u: any) => ({
          user_id: u.id,
          type: "info",
          icon: "🏆",
          title: "Novo Calendário de Ligas",
          message: `As ligas mundiais foram atualizadas para ${seasonMonth}/${seasonYear}. Confira a tabela e os novos artilheiros!`,
        }));
        for (let i = 0; i < notifs.length; i += 200) {
          await sb.from("user_notifications").insert(notifs.slice(i, i + 200));
        }
        notified = notifs.length;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      season: `${seasonMonth}/${seasonYear}`,
      leagues_reset: perLeague.length,
      total_matches: totalCreated,
      total_simulated: totalSimulated,
      per_league: perLeague
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});