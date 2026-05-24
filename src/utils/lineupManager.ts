import { Player } from '@/types/game';
import { Formation } from '@/types/tactics';

/**
 * Positional requirements for each formation.
 * Maps a position index (0-10) to the required base position.
 */
export const formationRequirements: Record<Formation, string[]> = {
  '4-4-2': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA'],
  '4-3-3': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'],
  '4-2-3-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA'],
  '3-5-2': ['GOL', 'ZAG', 'ZAG', 'ZAG', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
  '5-3-2': ['GOL', 'LAT', 'ZAG', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA'],
  '4-1-4-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA'],
  '4-4-1-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA'],
  '3-4-3': ['GOL', 'ZAG', 'ZAG', 'ZAG', 'VOL', 'MEI', 'MEI', 'VOL', 'ATA', 'ATA', 'ATA'],
  '5-4-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'ATA'],
  '4-5-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA'],
  '4-3-2-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'VOL', 'MEI', 'MEI', 'ATA'],
  '4-2-4-0': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'MEI'],
  '3-4-1-2': ['GOL', 'ZAG', 'ZAG', 'ZAG', 'VOL', 'MEI', 'MEI', 'VOL', 'MEI', 'ATA', 'ATA'],
  '4-1-2-1-2': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
};

/**
 * Intelligent Lineup System
 * Automatically reorders players to find the best 11 starters and exactly 11 balanced reserves.
 */
export function autoLineup(players: Player[], formation: Formation): Player[] {
  const requirements = formationRequirements[formation];
  if (!requirements) return players;

  // Garantir que a formação sempre comece com GOL
  const safeRequirements = [...requirements];
  if (safeRequirements[0] !== 'GOL') {
    safeRequirements[0] = 'GOL';
  }

  const canPlayMatch = (player: Player) => {
    const raw = player as any;
    if (player.injury || player.disciplinary?.isSuspended || raw.squad_status === 'injured' || raw.squad_status === 'suspended') return false;
    if (raw.isLoaned || raw.loanedOut || raw.inactive || raw.removed) return false;
    return true;
  };

  // 1. Separate players by availability
  const availablePlayers = [...players].filter(canPlayMatch).sort((a, b) => b.overall - a.overall);
  const unavailablePlayers = [...players].filter(p => !canPlayMatch(p));

  const used = new Set<string>();
  const starters: (Player | null)[] = new Array(11).fill(null);

  const getPlayerScoreForPos = (player: Player, targetPos: Player['position']) => {
    let score = player.overall;
    if (player.position === targetPos) score += 20;
    else if (player.secondaryPosition === targetPos) score += 12; 
    else {
      const penalties: Record<string, Record<string, number>> = {
        GOL: { ZAG: -60, LAT: -60, VOL: -60, MEI: -60, ATA: -60 },
        ZAG: { GOL: -80, LAT: -5, VOL: -10, MEI: -30, ATA: -40 },
        LAT: { GOL: -80, ZAG: -5, VOL: -15, MEI: -20, ATA: -25 },
        VOL: { GOL: -80, ZAG: -10, LAT: -15, MEI: -10, ATA: -30 },
        MEI: { GOL: -80, ZAG: -40, LAT: -30, VOL: -10, ATA: -15 },
        ATA: { GOL: -80, ZAG: -50, LAT: -40, VOL: -40, MEI: -15 }
      };
      score += (penalties[player.position]?.[targetPos] || -30);
    }
    score += (player.stamina / 5); // Aumentado peso da stamina para rodízio extremo (era /10)
    score += (player.morale / 20);
    return score;
  };

  // 1. Assign Goalkeeper
  const bestGK = availablePlayers
    .filter(p => p.position === 'GOL')
    .sort((a, b) => getPlayerScoreForPos(b, 'GOL') - getPlayerScoreForPos(a, 'GOL'))[0];
  
  if (bestGK) {
    starters[0] = bestGK;
    used.add(bestGK.id);
  }

  // 2. Assign other starters based on formation requirements
  for (let i = 1; i < safeRequirements.length; i++) {
    const reqPos = safeRequirements[i] as Player['position'];
    const bestPlayer = availablePlayers
      .filter(p => !used.has(p.id) && p.position !== 'GOL') // Proibir GOL nas outras posições de linha
      .sort((a, b) => getPlayerScoreForPos(b, reqPos) - getPlayerScoreForPos(a, reqPos))[0];
    
    if (bestPlayer) {
      starters[i] = bestPlayer;
      used.add(bestPlayer.id);
    }
  }

  // Fill empty starter slots if needed (fallback to highest OVR)
  for (let i = 0; i < starters.length; i++) {
    if (!starters[i]) {
      const fallback = availablePlayers
        .filter(p => !used.has(p.id) && (i === 0 ? p.position === 'GOL' : p.position !== 'GOL'))
        .sort((a, b) => b.overall - a.overall)[0];
      if (fallback) {
        starters[i] = fallback;
        used.add(fallback.id);
      }
    }
  }

  const finalStarters = starters.filter((p): p is Player => !!p).map(p => ({
    ...p,
    squad_status: 'starter' as const,
    squadRole: 'titular' as const
  }));

  // 3. Intelligent Balanced Reserves (max 7 usually in FLM, but keeping logic flexible)
  const BENCH_LIMIT = 7;
  const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  
  const poolForReserves = availablePlayers
    .filter(p => !used.has(p.id))
    .sort((a, b) => {
      const posA = posOrder.indexOf(a.position);
      const posB = posOrder.indexOf(b.position);
      if (posA !== posB) return posA - posB;
      return b.overall - a.overall;
    });

  const reserves = poolForReserves.slice(0, BENCH_LIMIT).map(p => ({
    ...p,
    squad_status: 'bench' as const,
    squadRole: 'reserva' as const
  }));

  reserves.forEach(p => used.add(p.id));

  // 4. Out/Reserves (Not called)
  const otherPlayers = availablePlayers.filter(p => !used.has(p.id)).map(p => ({
    ...p,
    squad_status: 'reserve' as const,
    squadRole: 'reserva' as const,
  }));

  // 5. Unavailable (Injured/Suspended)
  const finalUnavailable = unavailablePlayers.map(p => ({
    ...p,
    squad_status: p.injury ? ('injured' as const) : ('suspended' as const),
    squadRole: 'reserva' as const
  }));

  return [
    ...finalStarters,
    ...reserves,
    ...otherPlayers,
    ...finalUnavailable
  ];
}

export function detectActualFormation(players: Player[]): Formation {
  const starters = players.slice(0, 11);
  if (starters.length < 11) return '4-4-2';

  const counts: Record<string, number> = { ZAG: 0, LAT: 0, VOL: 0, MEI: 0, ATA: 0 };
  starters.forEach(p => {
    if (counts[p.position] !== undefined) counts[p.position]++;
  });

  const def = counts.ZAG + counts.LAT;
  const mid = counts.VOL + counts.MEI;
  const atk = counts.ATA;

  // Se não houver atacantes, tentamos ser precisos com a nomenclatura
  if (atk === 0) return '4-2-4-0'; // Especial para formações sem atacantes

  const key = `${def}-${mid}-${atk}` as Formation;
  
  // Mapeamento de formações baseadas na ocupação real
  const map: Record<string, Formation> = {
    '4-4-2': '4-4-2', '4-3-3': '4-3-3', '3-5-2': '3-5-2', '5-3-2': '5-3-2',
    '3-4-3': '3-4-3', '5-4-1': '5-4-1', '4-5-1': '4-5-1',
  };

  return map[key] || '4-4-2';
}

/**
 * Intelligent Position Protection Rules
 */

export function canChangePosition(player: Player | null | undefined, players: Player[] | null | undefined): { allowed: boolean; message?: string } {
  if (!player || !Array.isArray(players)) return { allowed: true };
  const isStarter = players.findIndex(p => p && p.id === player.id) < 11 && players.findIndex(p => p && p.id === player.id) >= 0;
  
  if (isStarter) {
    return { 
      allowed: false, 
      message: "Remova o jogador dos titulares antes de alterar sua posição." 
    };
  }
  
  return { allowed: true };
}

export function validateLineup(players: Player[] | null | undefined): { valid: boolean; message?: string; autoFix?: Player[] } {
  if (!Array.isArray(players) || players.length === 0) return { valid: true };
  
  const safePlayers = players.filter((p): p is Player => !!p && typeof p === 'object' && !!p.position);
  
  // Lógica de Autocorreção: Se houver mais de 1 goleiro titular, o segundo vai para o banco
  const starters = safePlayers.slice(0, 11);
  const goalkeepersInStarters = starters.filter(p => p.position === 'GOL');
  
  if (goalkeepersInStarters.length > 1) {
     // Trigger auto-lineup to fix it
     const formation = detectActualFormation(players as Player[]);
     const fixed = autoLineup(players as Player[], formation);
     return {
       valid: false,
       message: "Escalação inválida: apenas 1 goleiro pode iniciar. Corrigindo automaticamente...",
       autoFix: fixed
     };
  }

  const bench = safePlayers.filter(p => p.squad_status === 'bench');
  const goalkeepers = starters.filter(p => p.position === 'GOL');
  
  // Rule: Suspended players cannot be in starters or bench
  const suspendedInRoster = [...starters, ...bench].filter(p => p.disciplinary?.isSuspended || p.squad_status === 'suspended');

  if (suspendedInRoster.length > 0) {
    return {
      valid: false,
      message: `O jogador ${suspendedInRoster[0].name} está SUSPENSO e não pode ser escalado.`
    };
  }

  // Rule: Injured players cannot be in starters or bench
  const injuredInRoster = [...starters, ...bench].filter(p => p.injury || p.squad_status === 'injured');
  if (injuredInRoster.length > 0) {
    return {
      valid: false,
      message: `O jogador ${injuredInRoster[0].name} está lesionado e não pode ser escalado.`
    };
  }

  if (goalkeepers.length > 1) {
    return { 
      valid: false, 
      message: "Não é permitido possuir mais de 1 goleiro titular."
    };
  }

  if (starters.length >= 11 && goalkeepers.length === 0) {
    return {
      valid: false,
      message: "O time titular precisa de pelo menos 1 goleiro."
    };
  }

  return { valid: true };
}

/**
 * Checks if a player's position change should trigger an auto-lineup update.
 */
export function shouldUpdateLineup(oldPlayer: Player, newPlayer: Player): boolean {
  return oldPlayer.position !== newPlayer.position || oldPlayer.overall !== newPlayer.overall;
}
