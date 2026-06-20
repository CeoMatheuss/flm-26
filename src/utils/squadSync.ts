import { Player } from '@/types/game';
import { YouthProspect } from '@/types/infrastructure';
import { TacticsConfig } from '@/types/tactics';
import { autoLineup } from '@/utils/lineupManager';

const NORMALIZED_POSITIONS: Player['position'][] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

/**
 * Jogador da Base/Juniores NÃO pertence ao elenco profissional.
 * Critério: contractStatus === 'base' OU (isYouth === true E contractStatus !== 'profissional').
 */
export const isBaseOrYouthPlayer = (player: any): boolean => {
  if (!player) return false;
  const cs = String(player.contractStatus ?? '').toLowerCase();
  if (cs === 'base' || cs === 'juniores' || cs === 'youth') return true;
  if (player.isYouth === true && cs !== 'profissional') return true;
  return false;
};

const isAvailableForSquad = (player: Player) => {
  const raw = player as any;
  const status = String(raw.status ?? raw.contractStatus ?? player.squad_status ?? '').toLowerCase();
  if (isBaseOrYouthPlayer(raw)) return false; // ⚠️ Base/Juniores NÃO entram no elenco principal
  // Jogadores emprestados (isLoaned) DEVEM estar disponíveis para aparecerem na aba "Emprestados" do elenco.
  // Eles serão filtrados visualmente nas abas de Titulares/Reservas.
  return !raw.removed && !raw.inactive && !raw.sold && status !== 'sold' && status !== 'removed';
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

export const rebuildClubSquad = (players: Player[], youthProspects: YouthProspect[], formation: TacticsConfig['formation'], infrastructure?: any) => {
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
    } as Player);
  });

  // 2. ⚠️ Jogadores da Base/Juniores (youthProspects) NÃO entram no elenco principal.
  //    Eles vivem exclusivamente na aba "Juniores" (tabela youth_prospects).
  //    Apenas após PROMOÇÃO explícita são adicionados a clubs.players com isYouth=false / contractStatus='profissional'.
  void youthProspects; void infrastructure;

  const all = Array.from(byId.values());
  if (all.length === 0) return [];

  // 3. Assign statuses if missing or inconsistent
  const starters = all.filter(p => p.squad_status === 'starter');
  
  // If we have no starters assigned, use autoLineup logic
  if (starters.length < 11) {
     return autoLineup(all, formation);
  }

  // 4. Rule: Max 11 on Bench. Rest goes to 'Reserve' (Fora).
  // Priority: 1. Starters, 2. Bench, 3. Reserve
  const finalStarters = all.filter(p => p.squad_status === 'starter').sort((a,b) => b.overall - a.overall).slice(0, 11);
  const remaining = all.filter(p => !finalStarters.find(s => s.id === p.id));
  
  // Split remaining into Bench (max 11) and Reserve (Fora)
  const explicitBench = remaining.filter(p => p.squad_status === 'bench').sort((a,b) => b.overall - a.overall);
  const others = remaining.filter(p => p.squad_status !== 'bench').sort((a,b) => b.overall - a.overall);
  
  const combinedRemaining = [...explicitBench, ...others];
  const finalBench = combinedRemaining.slice(0, 11);
  const finalReserves = combinedRemaining.slice(11);

  // Re-assign squad_status to ensure consistency
  finalStarters.forEach(p => p.squad_status = 'starter');
  finalBench.forEach(p => p.squad_status = 'bench');
  finalReserves.forEach(p => p.squad_status = 'reserve');

  return [...finalStarters, ...finalBench, ...finalReserves];
};

export const squadsDiffer = (a: Player[], b: Player[]) => {
  if (!a || !b) return true;
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return true;
    if (a[i].squad_status !== b[i].squad_status) return true;
  }
  return false;
};

export const syncTacticsWithSquad = (tactics: TacticsConfig, players: Player[]): TacticsConfig => {
  const validIds = new Set(players.map((player) => player.id));
  const { lineup: _lineup, startingXI: _startingXI, starting_xi: _starting_xi, ...cleanTactics } = tactics as any;
  
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
