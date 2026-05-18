import { Player } from '@/types/game';
import { YouthProspect } from '@/types/infrastructure';
import { TacticsConfig } from '@/types/tactics';
import { autoLineup } from '@/utils/lineupManager';

const NORMALIZED_POSITIONS: Player['position'][] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

const isAvailableForSquad = (player: Player) => {
  const raw = player as any;
  const status = String(raw.status ?? raw.contractStatus ?? player.squad_status ?? '').toLowerCase();
  return !raw.isLoaned && !raw.loanedOut && !raw.removed && !raw.inactive && !raw.sold && status !== 'sold' && status !== 'removed';
};

const safePosition = (position: unknown): Player['position'] => (
  NORMALIZED_POSITIONS.includes(position as Player['position']) ? position as Player['position'] : 'MEI'
);

export const youthProspectToPlayer = (prospect: YouthProspect): Player => ({
  id: prospect.id,
  name: prospect.name,
  position: safePosition(prospect.position),
  overall: Number(prospect.overall ?? 45),
  attributes: prospect.attributes as any,
  age: Number(prospect.age ?? 16),
  salary: Number(prospect.salary ?? 500),
  stamina: Number(prospect.stamina ?? prospect.energy ?? 100),
  morale: Number(prospect.morale ?? 100),
  goals: Number(prospect.goals ?? 0),
  assists: Number(prospect.assists ?? 0),
  contract: Number(prospect.contract ?? 3),
  gamesPlayed: Number(prospect.gamesPlayed ?? 0),
  trainingProgress: Number(prospect.trainingProgress ?? 0),
  personality: prospect.personality as any,
  potential: Number(prospect.potential ?? Math.max(50, Number(prospect.overall ?? 45) + 3)),
  isYouth: true,
  squadRole: 'promessa',
  marketValue: Number(prospect.marketValue ?? 0),
  promotionReady: !!prospect.promotionReady,
  contractStatus: prospect.contractStatus ?? 'base',
} as Player & { contractStatus: string });

export const rebuildClubSquad = (players: Player[], youthProspects: YouthProspect[], formation: TacticsConfig['formation']) => {
  if (!players || !Array.isArray(players)) return [];
  
  const byId = new Map<string, Player>();
  
  // 1. Process regular players first
  players.forEach((player) => {
    if (!player?.id || !isAvailableForSquad(player)) return;
    byId.set(player.id, {
      ...player,
      position: safePosition(player.position),
      stamina: Number(player.stamina ?? 100),
      morale: Number(player.morale ?? 100),
      // Preserve squad_status if it exists, otherwise it will be assigned later
    } as Player);
  });

  // 2. Process youth prospects (only if not already in players by ID)
  if (youthProspects && Array.isArray(youthProspects)) {
    youthProspects.forEach(prospect => {
      if (byId.has(prospect.id)) return;
      const player = youthProspectToPlayer(prospect);
      byId.set(player.id, player);
    });
  }

  const all = Array.from(byId.values());
  if (all.length === 0) return [];

  // 3. Assign statuses if missing or inconsistent
  const startersCount = all.filter(p => p.squad_status === 'starter').length;
  
  // If we have less than 11 starters, or no explicit statuses, trigger a full re-lineup
  if (startersCount < 11) {
     return autoLineup(all, formation);
  }

  // 4. Final ordering: Starters (0-10), then Bench, then Reserves
  const starters = all.filter(p => p.squad_status === 'starter').sort((a,b) => b.overall - a.overall).slice(0, 11);
  const others = all.filter(p => !starters.some(s => s.id === p.id));
  const bench = others.filter(p => p.squad_status === 'bench').sort((a,b) => b.overall - a.overall);
  const reserves = others.filter(p => p.squad_status !== 'bench').sort((a,b) => b.overall - a.overall);

  return [...starters, ...bench, ...reserves];
};

export const squadsDiffer = (a: Player[], b: Player[]) => {
  if (!a || !b) return true;
  if (a.length !== b.length) return true;
  // Deep check for identity and critical roles
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return true;
    if (a[i].squad_status !== b[i].squad_status) return true;
  }
  return false;
};

export const syncTacticsWithSquad = (tactics: TacticsConfig, players: Player[]): TacticsConfig => {
  const validIds = new Set(players.map((player) => player.id));
  const { lineup: _lineup, startingXI: _startingXI, starting_xi: _starting_xi, ...cleanTactics } = tactics as any;
  
  // Ensure captain and set piece takers are valid
  const captainId = cleanTactics.captainId && validIds.has(cleanTactics.captainId) ? cleanTactics.captainId : players[0]?.id;
  
  return {
    ...cleanTactics,
    playerInstructions: (cleanTactics.playerInstructions ?? []).filter((instruction: any) => validIds.has(instruction.playerId)),
    captainId,
    freeKickTakerId: cleanTactics.freeKickTakerId && validIds.has(cleanTactics.freeKickTakerId) ? cleanTactics.freeKickTakerId : players.find(p => p.position === 'MEI')?.id ?? captainId,
    penaltyTakerId: cleanTactics.penaltyTakerId && validIds.has(cleanTactics.penaltyTakerId) ? cleanTactics.penaltyTakerId : players.find(p => p.position === 'ATA')?.id ?? captainId,
    cornerTakerId: cleanTactics.cornerTakerId && validIds.has(cleanTactics.cornerTakerId) ? cleanTactics.cornerTakerId : players.find(p => p.position === 'MEI')?.id ?? captainId,
  };
};
