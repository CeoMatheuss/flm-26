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

const isAvailableForMatch = (player: Player) => {
  const raw = player as any;
  const isSuspended = player.squad_status === 'suspended' || !!player.disciplinary?.isSuspended || !!raw.isSuspended || !!raw.suspended;
  const isInjured = player.squad_status === 'injured' || !!player.injury || !!raw.isInjured;
  return isAvailableForSquad(player) && !isInjured && !isSuspended;
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
  const byId = new Map<string, Player>();
  
  // Merge players and youth prospects
  [...players, ...youthProspects.map(youthProspectToPlayer)].forEach((player) => {
    if (!player?.id || !isAvailableForSquad(player)) return;
    const previous = byId.get(player.id);
    byId.set(player.id, {
      ...previous,
      ...player,
      position: safePosition(player.position),
      stamina: Number(player.stamina ?? 100),
      morale: Number(player.morale ?? 100),
      attributes: player.attributes ?? previous?.attributes,
      squad_status: player.squad_status || previous?.squad_status || 'reserve'
    } as Player);
  });

  const rebuilt = Array.from(byId.values());
  if (rebuilt.length === 0) return rebuilt;

  // If no explicit squad_status, we need to assign them based on current order or best overall
  const hasExplicitStatuses = rebuilt.some(p => p.squad_status === 'starter' || p.squad_status === 'bench');
  
  if (!hasExplicitStatuses) {
    // Sort by overall to pick best ones
    const sorted = [...rebuilt].sort((a, b) => b.overall - a.overall);
    sorted.forEach((p, idx) => {
      if (idx < 11) p.squad_status = 'starter';
      else if (idx < 18) p.squad_status = 'bench';
      else p.squad_status = 'reserve';
    });
  }

  // Ensure minimum squad size for BOTs or during reload
  // (In practice, ensure_full_rosters in DB handles this, but here we protect the local state)
  
  // Re-order rebuilt array to have starters first, then bench, then others
  const starters = rebuilt.filter(p => p.squad_status === 'starter');
  const bench = rebuilt.filter(p => p.squad_status === 'bench');
  const others = rebuilt.filter(p => p.squad_status !== 'starter' && p.squad_status !== 'bench');

  const ordered = [...starters, ...bench, ...others];

  return ordered.map((player, index) => {
    const raw = player as any;
    const isBaseYouth = raw.isYouth && raw.contractStatus !== 'profissional';
    return {
      ...player,
      squadRole: index < 11 ? 'titular' : index < 18 ? (isBaseYouth ? 'promessa' : 'reserva') : (isBaseYouth ? 'promessa' : 'rotacao'),
    } as Player;
  });
};

export const squadsDiffer = (a: Player[], b: Player[]) => {
  if (a.length !== b.length) return true;
  return a.some((player, index) => {
    const next = b[index];
    return !next || player.id !== next.id || player.overall !== next.overall || player.stamina !== next.stamina || player.position !== next.position || player.squadRole !== next.squadRole || !!player.injury !== !!next.injury;
  });
};

export const syncTacticsWithSquad = (tactics: TacticsConfig, players: Player[]): TacticsConfig => {
  const validIds = new Set(players.map((player) => player.id));
  const { lineup: _lineup, startingXI: _startingXI, starting_xi: _starting_xi, ...cleanTactics } = tactics as any;
  return {
    ...cleanTactics,
    playerInstructions: (cleanTactics.playerInstructions ?? []).filter((instruction: any) => validIds.has(instruction.playerId)),
    captainId: cleanTactics.captainId && validIds.has(cleanTactics.captainId) ? cleanTactics.captainId : players[0]?.id,
    freeKickTakerId: cleanTactics.freeKickTakerId && validIds.has(cleanTactics.freeKickTakerId) ? cleanTactics.freeKickTakerId : players.find(p => p.position === 'MEI')?.id ?? players[0]?.id,
    penaltyTakerId: cleanTactics.penaltyTakerId && validIds.has(cleanTactics.penaltyTakerId) ? cleanTactics.penaltyTakerId : players.find(p => p.position === 'ATA')?.id ?? players[0]?.id,
    cornerTakerId: cleanTactics.cornerTakerId && validIds.has(cleanTactics.cornerTakerId) ? cleanTactics.cornerTakerId : players.find(p => p.position === 'MEI')?.id ?? players[0]?.id,
  };
};