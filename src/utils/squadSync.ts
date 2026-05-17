import { Player } from '@/types/game';
import { YouthProspect } from '@/types/infrastructure';
import { TacticsConfig } from '@/types/tactics';
import { autoLineup } from '@/utils/lineupManager';

const NORMALIZED_POSITIONS: Player['position'][] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

const isAvailableForSquad = (player: Player) => {
  const raw = player as any;
  const status = String(raw.status ?? raw.contractStatus ?? '').toLowerCase();
  return !raw.isLoaned && !raw.loanedOut && !raw.removed && !raw.inactive && !raw.sold && status !== 'sold' && status !== 'removed';
};

const isAvailableForMatch = (player: Player) => {
  const raw = player as any;
  return isAvailableForSquad(player) && !player.injury && !raw.isInjured && !raw.isSuspended && !raw.suspended;
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
  const activeYouthIds = new Set(youthProspects.map((prospect) => prospect.id));
  [...players, ...youthProspects.map(youthProspectToPlayer)].forEach((player) => {
    if (!player?.id || !isAvailableForSquad(player)) return;
    if ((player as any).isYouth && (player as any).contractStatus === 'base' && !activeYouthIds.has(player.id)) return;
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
  if (rebuilt.length === 0) return rebuilt;

  const starters = rebuilt.slice(0, 11);
  const bench = rebuilt.slice(11, 18);
  const starterIssue = starters.length < Math.min(11, rebuilt.length) || starters.some((player) => !isAvailableForMatch(player));
  const benchNeedsBalance = rebuilt.length > 11 && (
    bench.length === 0 ||
    !bench.some((player) => isAvailableForMatch(player) && player.position === 'GOL') ||
    !bench.some((player) => isAvailableForMatch(player) && ['ZAG', 'LAT'].includes(player.position)) ||
    !bench.some((player) => isAvailableForMatch(player) && ['VOL', 'MEI'].includes(player.position)) ||
    !bench.some((player) => isAvailableForMatch(player) && player.position === 'ATA')
  );

  const ordered = (starterIssue || benchNeedsBalance) ? autoLineup(rebuilt, formation) : rebuilt;
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