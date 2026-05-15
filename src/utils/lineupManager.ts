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
 * Checks if a player's position change should trigger an auto-lineup update.
 */
export function shouldUpdateLineup(oldPlayer: Player, newPlayer: Player): boolean {
  return oldPlayer.position !== newPlayer.position || oldPlayer.overall !== newPlayer.overall;
}
