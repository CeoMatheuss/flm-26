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
 * Automatically reorders players to find the best 11 starters for a formation.
 */
export function autoLineup(players: Player[], formation: Formation): Player[] {
  const requirements = formationRequirements[formation];
  if (!requirements) return players;

  const used = new Set<string>();
  const starters: Player[] = [];
  const allPlayers = [...players];

  // 1. First pass: Assign players to their EXACT natural position
  for (const reqPos of requirements) {
    const candidates = allPlayers
      .filter(p => !used.has(p.id) && p.position === reqPos)
      .sort((a, b) => b.overall - a.overall);

    if (candidates.length > 0) {
      const selected = candidates[0];
      starters.push(selected);
      used.add(selected.id);
    } else {
      // Placeholder for now
      starters.push(null as any);
    }
  }

  // 2. Second pass: Fill gaps using secondary positions
  for (let i = 0; i < starters.length; i++) {
    if (starters[i] === null) {
      const reqPos = requirements[i];
      const candidates = allPlayers
        .filter(p => !used.has(p.id) && p.secondaryPosition === reqPos)
        .sort((a, b) => (b.overall - 5) - (a.overall - 5)); // Penalty for secondary

      if (candidates.length > 0) {
        const selected = candidates[0];
        starters[i] = selected;
        used.add(selected.id);
      }
    }
  }

  // 3. Third pass: Fill gaps using highest overall remaining players (compatibility)
  for (let i = 0; i < starters.length; i++) {
    if (starters[i] === null) {
      const candidates = allPlayers
        .filter(p => !used.has(p.id))
        .sort((a, b) => b.overall - a.overall);

      if (candidates.length > 0) {
        const selected = candidates[0];
        starters[i] = selected;
        used.add(selected.id);
      }
    }
  }

  const bench = allPlayers.filter(p => !used.has(p.id)).sort((a, b) => b.overall - a.overall);
  
  // Filter out any remaining nulls just in case (should not happen if enough players)
  const validStarters = starters.filter(p => p !== null);
  
  return [...validStarters, ...bench];
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
