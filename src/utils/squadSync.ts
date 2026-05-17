import { Player } from '@/types/game';
import { YouthProspect } from '@/types/infrastructure';
import { TacticsConfig } from '@/types/tactics';
import { autoLineup } from '@/utils/lineupManager';

const NORMALIZED_POSITIONS: Player['position'][] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

const isAvailableForSquad = (player: Player) => {
  const raw = player as any;
  return !raw.isLoaned && !raw.loanedOut && !raw.removed && !raw.inactive;
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
});

export const rebuildClubSquad = (players: Player[], youthProspects: YouthProspect[], formation: TacticsConfig['formation']) => {
  const byId = new Map<string, Player>();
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
    } as Player);
  });

  const rebuilt = Array.from(byId.values());
  const hasReserve = rebuilt.slice(11).some((player) => isAvailableForSquad(player) && !player.injury);
  const hasStarterIssue = rebuilt.slice(0, Math.min(11, rebuilt.length)).some((player) => !isAvailableForSquad(player) || !!player.injury);
  return rebuilt.length > 0 && (!hasReserve || hasStarterIssue || rebuilt.length <= 18) ? autoLineup(rebuilt, formation) : rebuilt;
};

export const squadsDiffer = (a: Player[], b: Player[]) => {
  if (a.length !== b.length) return true;
  return a.some((player, index) => {
    const next = b[index];
    return !next || player.id !== next.id || player.overall !== next.overall || player.stamina !== next.stamina;
  });
};

export const syncTacticsWithSquad = (tactics: TacticsConfig, players: Player[]): TacticsConfig => {
  const validIds = new Set(players.map((player) => player.id));
  return {
    ...tactics,
    playerInstructions: (tactics.playerInstructions ?? []).filter((instruction) => validIds.has(instruction.playerId)),
    captainId: tactics.captainId && validIds.has(tactics.captainId) ? tactics.captainId : players[0]?.id,
    freeKickTakerId: tactics.freeKickTakerId && validIds.has(tactics.freeKickTakerId) ? tactics.freeKickTakerId : players.find(p => p.position === 'MEI')?.id ?? players[0]?.id,
    penaltyTakerId: tactics.penaltyTakerId && validIds.has(tactics.penaltyTakerId) ? tactics.penaltyTakerId : players.find(p => p.position === 'ATA')?.id ?? players[0]?.id,
    cornerTakerId: tactics.cornerTakerId && validIds.has(tactics.cornerTakerId) ? tactics.cornerTakerId : players.find(p => p.position === 'MEI')?.id ?? players[0]?.id,
  };
};