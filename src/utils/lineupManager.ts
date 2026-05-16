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
 * Automatically reorders players to find the best 11 starters and 7 balanced reserves.
 */
export function autoLineup(players: Player[], formation: Formation): Player[] {
  const requirements = formationRequirements[formation];
  if (!requirements) return players;

  const allPlayers = [...players].sort((a, b) => {
    // Basic sorting: Not injured, high overall
    if (!!a.injury !== !!b.injury) return a.injury ? 1 : -1;
    return b.overall - a.overall;
  });

  const used = new Set<string>();
  const starters: (Player | null)[] = new Array(11).fill(null);

  const getPlayerScoreForPos = (player: Player, targetPos: string) => {
    if (player.injury) return -1000;
    let score = player.overall;
    if (player.position === targetPos) score += 20;
    else if (player.secondaryPosition === targetPos) score += 10;
    else score -= 15;

    // Favor balanced physical state
    score += (player.stamina / 10);
    score += (player.morale / 20);
    
    // Favor form
    if (player.matchRating) score += (player.matchRating * 2);
    
    return score;
  };

  // 1. Assign Goalkeeper
  const bestGK = allPlayers
    .filter(p => !p.injury && p.position === 'GOL')
    .sort((a, b) => getPlayerScoreForPos(b, 'GOL') - getPlayerScoreForPos(a, 'GOL'))[0];
  
  if (bestGK) {
    starters[0] = bestGK;
    used.add(bestGK.id);
  }

  // 2. Assign other starters based on formation requirements
  for (let i = 1; i < requirements.length; i++) {
    const reqPos = requirements[i];
    const bestPlayer = allPlayers
      .filter(p => !used.has(p.id) && !p.injury)
      .sort((a, b) => getPlayerScoreForPos(b, reqPos) - getPlayerScoreForPos(a, reqPos))[0];
    
    if (bestPlayer) {
      starters[i] = bestPlayer;
      used.add(bestPlayer.id);
    }
  }

  // Fill empty starter slots if needed (fallback to highest OVR)
  for (let i = 0; i < starters.length; i++) {
    if (!starters[i]) {
      const fallback = allPlayers
        .filter(p => !used.has(p.id) && !p.injury)
        .sort((a, b) => b.overall - a.overall)[0];
      if (fallback) {
        starters[i] = fallback;
        used.add(fallback.id);
      }
    }
  }

  const finalStarters = starters.filter((p): p is Player => !!p);

  // 3. Intelligent Balanced Reserves (7 slots)
  const reserves: Player[] = [];
  const remainingPlayers = allPlayers.filter(p => !used.has(p.id) && !p.injury);

  // Reserve GK (Mandatory if available)
  const resGK = remainingPlayers.find(p => p.position === 'GOL');
  if (resGK) {
    reserves.push(resGK);
    used.add(resGK.id);
  }

  // Balanced logic: 2 Def, 2 Mid, 2 Atk or similar based on availability
  const slots = [
    { pos: ['ZAG', 'LAT'], count: 2 },
    { pos: ['VOL', 'MEI'], count: 2 },
    { pos: ['ATA'], count: 2 }
  ];

  slots.forEach(slot => {
    const candidates = allPlayers
      .filter(p => !used.has(p.id) && !p.injury && slot.pos.includes(p.position))
      .sort((a, b) => b.overall - a.overall);
    
    for (let i = 0; i < slot.count && candidates.length > 0; i++) {
      const p = candidates.shift()!;
      reserves.push(p);
      used.add(p.id);
    }
  });

  // Fill remaining reserve slots (up to 7) with best remaining
  const leftForReserves = allPlayers
    .filter(p => !used.has(p.id) && !p.injury)
    .sort((a, b) => b.overall - a.overall);
  
  while (reserves.length < 7 && leftForReserves.length > 0) {
    const p = leftForReserves.shift()!;
    reserves.push(p);
    used.add(p.id);
  }

  const otherPlayers = allPlayers.filter(p => !used.has(p.id));
  
  return [...finalStarters, ...reserves, ...otherPlayers];
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
  const starters = safePlayers.slice(0, 11);
  const goalkeepers = starters.filter(p => p.position === 'GOL');
  
  if (goalkeepers.length > 1) {
    const keepers = [...goalkeepers].sort((a, b) => (b.overall || 0) - (a.overall || 0));
    const others = keepers.slice(1);
    
    let newOrder = [...safePlayers];
    others.forEach(k => {
      const idx = newOrder.findIndex(p => p.id === k.id);
      if (idx !== -1) {
        const [removed] = newOrder.splice(idx, 1);
        newOrder.push(removed);
      }
    });

    return { 
      valid: false, 
      message: "Não é permitido possuir 2 goleiros no time titular.",
      autoFix: newOrder
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
