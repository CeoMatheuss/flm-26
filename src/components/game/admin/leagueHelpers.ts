// Utilities for admin league panel: validation + dry-run season simulation

export interface LeagueRow {
  id: string;
  name: string;
  country: string;
  tier: string | null;
  tier_level: number | null;
  division: number | null;
  league_type: string;
  season_status: string;
  current_round: number;
  total_rounds: number;
  max_members: number;
  season: number;
  season_start: string | null;
  season_end: string | null;
  auto_created: boolean;
  created_at: string;
}

export interface MemberRow {
  id: string;
  league_id: string;
  user_id: string;
  club_name: string;
  club_logo: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  played: number;
  reputation: number;
}

export interface PromotionMove {
  memberId: string;
  userId: string;
  clubName: string;
  position: number;
  fromLeagueId: string;
  fromLeagueName: string;
  toLeagueName: string;
  type: 'promotion' | 'relegation' | 'special_varzea' | 'internal';
  points: number;
  goalDiff: number;
}

export interface ValidationResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: Array<{ id: string; label: string; info?: string }>;
}

export const tierLabels: Record<string, string> = {
  varzea: 'Várzea',
  pre_regional: 'Pré-Regional',
  regional: 'Regional',
  national: 'Nacional',
};

export const tierColors: Record<string, string> = {
  varzea: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  pre_regional: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  regional: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  national: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
};

export const statusColors: Record<string, string> = {
  registration: 'text-blue-400 border-blue-500/30',
  waiting: 'text-amber-400 border-amber-500/30',
  in_progress: 'text-green-400 border-green-500/30',
  finished: 'text-muted-foreground border-border',
};

export const statusLabels: Record<string, string> = {
  registration: 'Inscrições',
  waiting: 'Aguardando',
  in_progress: 'Em andamento',
  finished: 'Finalizada',
};

function sortMembers(members: MemberRow[]): MemberRow[] {
  return [...members].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const sgA = a.goals_for - a.goals_against;
    const sgB = b.goals_for - b.goals_against;
    if (sgB !== sgA) return sgB - sgA;
    return b.goals_for - a.goals_for;
  });
}

/** Dry-run simulation of season-end promotions/relegations for one country. */
export function simulateSeasonEnd(
  leagues: LeagueRow[],
  members: MemberRow[]
): { promotions: PromotionMove[]; relegations: PromotionMove[]; specialMoves: PromotionMove[] } {
  const promotions: PromotionMove[] = [];
  const relegations: PromotionMove[] = [];
  const specialMoves: PromotionMove[] = [];

  // Group members by league
  const byLeague = new Map<string, MemberRow[]>();
  for (const m of members) {
    if (!byLeague.has(m.league_id)) byLeague.set(m.league_id, []);
    byLeague.get(m.league_id)!.push(m);
  }

  // Sort leagues by tier hierarchy: national(1) > regional > pre_regional > varzea
  const tierOrder: Record<string, number> = { national: 4, regional: 3, pre_regional: 2, varzea: 1 };

  for (const league of leagues) {
    const leagueMembers = sortMembers(byLeague.get(league.id) || []);
    if (leagueMembers.length === 0) continue;

    const tier = league.tier || 'varzea';

    if (tier === 'varzea') {
      // 1st → promoted to Pré-Regional, 2nd-4th → internal move
      leagueMembers.forEach((m, idx) => {
        const pos = idx + 1;
        if (pos === 1) {
          specialMoves.push({
            memberId: m.id,
            userId: m.user_id,
            clubName: m.club_name,
            position: pos,
            fromLeagueId: league.id,
            fromLeagueName: league.name,
            toLeagueName: 'Pré-Regional (próxima divisão)',
            type: 'special_varzea',
            points: m.points,
            goalDiff: m.goals_for - m.goals_against,
          });
        } else if (pos >= 2 && pos <= 4) {
          specialMoves.push({
            memberId: m.id,
            userId: m.user_id,
            clubName: m.club_name,
            position: pos,
            fromLeagueId: league.id,
            fromLeagueName: league.name,
            toLeagueName: 'Outra Várzea (maior reputação)',
            type: 'internal',
            points: m.points,
            goalDiff: m.goals_for - m.goals_against,
          });
        }
      });
    } else {
      // Standard 3 up / 3 down
      const total = leagueMembers.length;
      leagueMembers.forEach((m, idx) => {
        const pos = idx + 1;
        if (pos <= 3) {
          promotions.push({
            memberId: m.id,
            userId: m.user_id,
            clubName: m.club_name,
            position: pos,
            fromLeagueId: league.id,
            fromLeagueName: league.name,
            toLeagueName: `${tierLabels[tier] || tier} (divisão acima)`,
            type: 'promotion',
            points: m.points,
            goalDiff: m.goals_for - m.goals_against,
          });
        } else if (pos > total - 3) {
          relegations.push({
            memberId: m.id,
            userId: m.user_id,
            clubName: m.club_name,
            position: pos,
            fromLeagueId: league.id,
            fromLeagueName: league.name,
            toLeagueName: tier === 'pre_regional' ? 'Várzea' : `${tierLabels[tier] || tier} (divisão abaixo)`,
            type: 'relegation',
            points: m.points,
            goalDiff: m.goals_for - m.goals_against,
          });
        }
      });
    }
  }

  return { promotions, relegations, specialMoves };
}

/** Run validation checks across all leagues + members. */
export function runValidations(
  leagues: LeagueRow[],
  members: MemberRow[],
  countryStatus: Array<{ country: string; total_players: number; max_capacity: number; is_locked: boolean }>
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Group members by league
  const byLeague = new Map<string, MemberRow[]>();
  for (const m of members) {
    if (!byLeague.has(m.league_id)) byLeague.set(m.league_id, []);
    byLeague.get(m.league_id)!.push(m);
  }

  // Check 1: every auto-created league has exactly max_members
  const broken: Array<{ id: string; label: string; info?: string }> = [];
  for (const l of leagues) {
    if (!l.auto_created) continue;
    const count = (byLeague.get(l.id) || []).length;
    if (count !== l.max_members) {
      broken.push({
        id: l.id,
        label: `${l.name}`,
        info: `${count}/${l.max_members} clubes (esperado ${l.max_members})`,
      });
    }
  }
  results.push({
    check: 'Todas as ligas com lotação correta',
    status: broken.length === 0 ? 'pass' : 'fail',
    message: broken.length === 0
      ? 'Todas as ligas auto-criadas estão com o número correto de clubes.'
      : `${broken.length} liga(s) com número incorreto de clubes.`,
    details: broken,
  });

  // Check 2: no player in 2 leagues of same country
  const playerCountryMap = new Map<string, Map<string, string[]>>(); // userId → country → leagueIds
  for (const m of members) {
    const league = leagues.find(l => l.id === m.league_id);
    if (!league) continue;
    if (!playerCountryMap.has(m.user_id)) playerCountryMap.set(m.user_id, new Map());
    const cmap = playerCountryMap.get(m.user_id)!;
    if (!cmap.has(league.country)) cmap.set(league.country, []);
    cmap.get(league.country)!.push(league.id);
  }
  const duplicates: Array<{ id: string; label: string; info?: string }> = [];
  for (const [uid, cmap] of playerCountryMap) {
    for (const [country, lids] of cmap) {
      if (lids.length > 1) {
        duplicates.push({
          id: uid,
          label: `User ${uid.slice(0, 8)}`,
          info: `Em ${lids.length} ligas de ${country}`,
        });
      }
    }
  }
  results.push({
    check: 'Nenhum jogador em 2 ligas do mesmo país',
    status: duplicates.length === 0 ? 'pass' : 'fail',
    message: duplicates.length === 0
      ? 'Nenhum jogador duplicado entre ligas do mesmo país.'
      : `${duplicates.length} jogador(es) duplicado(s).`,
    details: duplicates,
  });

  // Check 3: countries at capacity should be locked
  const unlockedFull: Array<{ id: string; label: string; info?: string }> = [];
  for (const cs of countryStatus) {
    if (cs.total_players >= cs.max_capacity && !cs.is_locked) {
      unlockedFull.push({
        id: cs.country,
        label: cs.country,
        info: `${cs.total_players}/${cs.max_capacity} jogadores, mas país NÃO travado`,
      });
    }
  }
  results.push({
    check: 'Países lotados estão travados',
    status: unlockedFull.length === 0 ? 'pass' : 'warn',
    message: unlockedFull.length === 0
      ? 'Países lotados estão devidamente travados.'
      : `${unlockedFull.length} país(es) lotado(s) sem trava.`,
    details: unlockedFull,
  });

  // Check 4: tier_level continuity per country (no gaps)
  const tiersByCountry = new Map<string, Set<number>>();
  for (const l of leagues) {
    if (!l.auto_created || !l.tier_level) continue;
    if (!tiersByCountry.has(l.country)) tiersByCountry.set(l.country, new Set());
    tiersByCountry.get(l.country)!.add(l.tier_level);
  }
  const gaps: Array<{ id: string; label: string; info?: string }> = [];
  for (const [country, tset] of tiersByCountry) {
    const sorted = [...tset].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > 1) {
        gaps.push({
          id: country,
          label: country,
          info: `Pulo de tier ${sorted[i - 1]} para ${sorted[i]}`,
        });
        break;
      }
    }
  }
  results.push({
    check: 'Sem pulos na sequência de tiers',
    status: gaps.length === 0 ? 'pass' : 'warn',
    message: gaps.length === 0
      ? 'Nenhuma divisão pulada na pirâmide.'
      : `${gaps.length} país(es) com pulos de tier.`,
    details: gaps,
  });

  // Check 5: bots filling vacancies (informational)
  const botHeavy: Array<{ id: string; label: string; info?: string }> = [];
  for (const l of leagues) {
    const m = byLeague.get(l.id) || [];
    const botPct = m.length === 0 ? 0 : (l.max_members - m.length) / l.max_members;
    if (botPct > 0.5) {
      botHeavy.push({
        id: l.id,
        label: l.name,
        info: `${Math.round(botPct * 100)}% das vagas são bots`,
      });
    }
  }
  results.push({
    check: 'Bots não dominam ligas (>50%)',
    status: botHeavy.length === 0 ? 'pass' : 'warn',
    message: botHeavy.length === 0
      ? 'Distribuição saudável entre humanos e bots.'
      : `${botHeavy.length} liga(s) com mais de 50% de bots.`,
    details: botHeavy,
  });

  return results;
}

export interface CupRowMin {
  id: string;
  name: string;
  cup_type: string;
  tier?: string | null;
  continent?: string | null;
  season_year?: number | null;
  status?: string | null;
}

export interface CupTeamMin {
  cup_id: string;
  user_id: string | null;
  club_name: string;
}

/**
 * Validates international (continental) cups: each continent must have
 * one principal + one secundaria for the current year, and no club may
 * appear in more than one international cup at once.
 */
export function validateInternationalCups(
  cups: CupRowMin[],
  cupTeams: CupTeamMin[],
  expectedContinents: string[],
  currentYear: number
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const intl = cups.filter(c => c.cup_type === 'continental' && c.season_year === currentYear);

  // Check 1: each continent has principal + secundaria
  const missing: Array<{ id: string; label: string; info?: string }> = [];
  for (const cont of expectedContinents) {
    const has = intl.filter(c => c.continent === cont);
    const principal = has.find(c => c.tier === 'principal');
    const secundaria = has.find(c => c.tier === 'secundaria');
    if (!principal || !secundaria) {
      missing.push({
        id: cont,
        label: cont,
        info: `Faltando: ${!principal ? 'Principal' : ''}${!principal && !secundaria ? ' + ' : ''}${!secundaria ? 'Secundária' : ''}`,
      });
    }
  }
  results.push({
    check: 'Cada continente tem 2 copas internacionais ativas',
    status: missing.length === 0 ? 'pass' : 'fail',
    message: missing.length === 0
      ? `Todos os ${expectedContinents.length} continentes possuem suas copas Principal + Secundária.`
      : `${missing.length} continente(s) sem copas internacionais ativas.`,
    details: missing,
  });

  // Check 2: no club duplicated across international cups
  const intlCupIds = new Set(intl.map(c => c.id));
  const intlTeams = cupTeams.filter(t => intlCupIds.has(t.cup_id));
  const seen = new Map<string, string[]>(); // key -> cupIds
  for (const t of intlTeams) {
    const key = t.user_id ? `u:${t.user_id}` : `c:${t.club_name}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(t.cup_id);
  }
  const dups: Array<{ id: string; label: string; info?: string }> = [];
  for (const [key, cids] of seen) {
    if (cids.length > 1) {
      const team = intlTeams.find(t => (t.user_id ? `u:${t.user_id}` : `c:${t.club_name}`) === key);
      dups.push({
        id: key,
        label: team?.club_name || key,
        info: `Em ${cids.length} copas internacionais simultaneamente`,
      });
    }
  }
  results.push({
    check: 'Nenhum clube duplicado em copas internacionais',
    status: dups.length === 0 ? 'pass' : 'fail',
    message: dups.length === 0
      ? 'Nenhum clube aparece em mais de uma copa internacional.'
      : `${dups.length} clube(s) duplicado(s) entre copas internacionais.`,
    details: dups,
  });

  return results;
}
