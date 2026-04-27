/**
 * TrainingManager — Orquestrador central do sistema de treinos FLM 26
 * 
 * Coordena:
 * - PlayerDevelopmentEngine: evolução de atributos
 * - FatigueSystem: fadiga e recuperação
 * - InjuryRiskSystem: risco de lesão em treinos
 * - TrainingEventGenerator: eventos dinâmicos
 * 
 * ISOLAMENTO: Este módulo NÃO interfere com MatchManager, SimulationEngine
 * ou qualquer componente de partida. Apenas modifica jogadores via retorno.
 */

import type { Player } from '@/types/game';
import type { TacticsConfig } from '@/types/tactics';
import type {
  TrainingFocusKey, TrainingIntensity, PlayerTrainingConfig,
  WeeklyTrainingResult, TrainingEvent
} from './TrainingTypes';
import { tacticsToFocus, intensityConfig } from './TrainingTypes';
import { PlayerDevelopmentEngine, type StaffConfig, defaultStaff } from './PlayerDevelopmentEngine';
import { FatigueSystem } from './FatigueSystem';
import { InjuryRiskSystem } from './InjuryRiskSystem';
import { TrainingEventGenerator } from './TrainingEventGenerator';
import { toast } from 'sonner';

export { type StaffConfig, defaultStaff };

export class TrainingManager {
  private devEngine = new PlayerDevelopmentEngine();
  private fatigueSystem = new FatigueSystem();
  private injuryRisk = new InjuryRiskSystem();
  private eventGen = new TrainingEventGenerator();

  /** Ativa/desativa o bônus Premium (+30% dev points). Idempotente. */
  setPremiumBoost(enabled: boolean): void {
    this.devEngine.premiumBoost = enabled;
  }

  /** Define investimento mensal global em treino (R$). Afeta a chance de evolução. */
  setMonthlyTrainingInvestment(value: number): void {
    this.devEngine.setMonthlyInvestment(value);
  }

  /**
   * Processa uma semana de treinos para todo o elenco.
   * Retorna os jogadores atualizados e o resultado detalhado.
   * 
   * @param players - Elenco atual
   * @param trainingConfigs - Mapa playerId → { focus, intensity }
   * @param trainingCenterLevel - Nível do CT (1-10)
   * @param physiotherapyLevel - Nível da fisioterapia (1-10)
   * @param staff - Configuração do staff técnico
   * @param tactics - Táticas atuais (usadas para sugestão de foco)
   * @param week - Semana atual da temporada
   */
  processWeek(
    players: Player[],
    trainingConfigs: Record<string, PlayerTrainingConfig>,
    trainingCenterLevel: number,
    physiotherapyLevel: number,
    staff: StaffConfig,
    tactics: TacticsConfig,
    week: number
  ): { players: Player[]; result: WeeklyTrainingResult } {
    console.log(`[TrainingManager] processWeek | week=${week} | players=${players.length} | CT=${trainingCenterLevel}`);

    const result: WeeklyTrainingResult = {
      week,
      sessions: [],
      developmentLogs: [],
      events: [],
      fatigueApplied: {},
      injuryRisks: {},
    };

    let updatedPlayers = [...players];

    // ── 1. Processar cada jogador ──────────────────────────────────────
    for (let i = 0; i < updatedPlayers.length; i++) {
      const player = updatedPlayers[i];
      const config = trainingConfigs[player.id] ?? {
        focus: 'none' as TrainingFocusKey,
        intensity: 'moderado' as TrainingIntensity,
      };

      result.sessions.push({ playerId: player.id, focus: config.focus, intensity: config.intensity, week });

      // Lesionados: apenas recuperação
      if (player.injury) {
        const { player: recovered } = this.fatigueSystem.applyWeeklyRecovery(player, physiotherapyLevel, staff.fitnessCoach);
        // Recuperação da lesão (reduz semanas restantes)
        let updatedInjury = recovered.injury
          ? { ...recovered.injury, weeksRemaining: recovered.injury.weeksRemaining - 1 }
          : undefined;
        if (updatedInjury && updatedInjury.weeksRemaining <= 0) {
          updatedInjury = undefined;
          toast.success(`🏥 ${player.name} se recuperou da lesão!`);
        }
        updatedPlayers[i] = { ...recovered, injury: updatedInjury };
        continue;
      }

      // ── 1a. Risco de lesão em treino ───────────────────────────────
      const injuryResult = this.injuryRisk.evaluate(player, config.intensity, staff.medicalStaff);
      result.injuryRisks[player.id] = injuryResult.riskPercent;

      if (injuryResult.injured && injuryResult.injury) {
        updatedPlayers[i] = { ...player, injury: injuryResult.injury };
        toast.warning(`🚨 ${player.name} se lesionou no treino! (${injuryResult.injury.type})`);
        result.events.push({
          id: Math.random().toString(36).slice(2),
          type: 'injury_scare',
          title: `🚨 LESÃO NO TREINO — ${player.name.toUpperCase()}!`,
          description: `${player.name} sofreu ${injuryResult.injury.type} durante o treino ${intensityConfig[config.intensity].label.toLowerCase()}.`,
          icon: '🏥',
          playerId: player.id,
          impact: `injury:${player.id}`,
        });
        continue;
      }

      // ── 1b. Fadiga do treino ───────────────────────────────────────
      const { player: fatiguedPlayer, result: fatigueResult } = this.fatigueSystem.applyTrainingFatigue(
        player, config.intensity, staff.fitnessCoach
      );
      result.fatigueApplied[player.id] = fatigueResult.lost;
      updatedPlayers[i] = fatiguedPlayer;

      // ── 1c. Evolução de atributo ───────────────────────────────────
      const { player: developedPlayer, log } = this.devEngine.processWeek(
        updatedPlayers[i], config, trainingCenterLevel, staff, week
      );
      updatedPlayers[i] = developedPlayer;
      if (log) {
        result.developmentLogs.push(log);
        toast.success(`📈 ${log.playerName} evoluiu ${log.attribute}! (${log.oldValue} → ${log.newValue})`);
      }

      // ── 1d. Moral baseado na intensidade ──────────────────────────
      const moraleDelta = intensityConfig[config.intensity].moraleDelta;
      if (moraleDelta !== 0) {
        updatedPlayers[i] = {
          ...updatedPlayers[i],
          morale: Math.min(100, Math.max(20, updatedPlayers[i].morale + moraleDelta)),
        };
      }
    }

    // ── 2. Recuperação semanal para todos ──────────────────────────────
    updatedPlayers = updatedPlayers.map(p => {
      if (p.injury) return p;
      const { player } = this.fatigueSystem.applyWeeklyRecovery(p, physiotherapyLevel, staff.fitnessCoach);
      return player;
    });

    // ── 3. Declínio por idade ──────────────────────────────────────────
    updatedPlayers = updatedPlayers.map(p => this.devEngine.applyAgingDecline(p));

    // ── 4. Eventos dinâmicos ───────────────────────────────────────────
    const focusMap: Record<string, TrainingFocusKey> = {};
    for (const [id, cfg] of Object.entries(trainingConfigs)) {
      focusMap[id] = cfg.focus;
    }
    const dynamicEvents = this.eventGen.generate(
      updatedPlayers,
      focusMap,
      // Usa a intensidade mais comum do squad
      this._dominantIntensity(trainingConfigs),
      week,
      trainingCenterLevel
    );
    result.events.push(...dynamicEvents);

    // Aplica impactos dos eventos dinâmicos
    updatedPlayers = this._applyEventImpacts(updatedPlayers, dynamicEvents);

    console.log(`[TrainingManager] Week ${week} done. Dev logs: ${result.developmentLogs.length}, Events: ${result.events.length}`);
    return { players: updatedPlayers, result };
  }

  /**
   * Sugestão de foco baseada nas táticas atuais.
   */
  suggestFocusFromTactics(tactics: TacticsConfig): TrainingFocusKey {
    return tacticsToFocus[tactics.playStyle] ?? 'physical';
  }

  /**
   * Retorna a intensidade dominante no squad.
   */
  private _dominantIntensity(configs: Record<string, PlayerTrainingConfig>): TrainingIntensity {
    const counts: Record<TrainingIntensity, number> = { leve: 0, moderado: 0, pesado: 0 };
    for (const cfg of Object.values(configs)) {
      counts[cfg.intensity]++;
    }
    return (Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'moderado') as TrainingIntensity;
  }

  /**
   * Aplica impactos dos eventos dinâmicos nos jogadores.
   */
  private _applyEventImpacts(players: Player[], events: TrainingEvent[]): Player[] {
    let updated = [...players];
    for (const ev of events) {
      if (ev.impact === 'morale_all:+3' || ev.impact === 'morale_all:+2') {
        const delta = ev.impact.includes('+3') ? 3 : 2;
        updated = updated.map(p => ({ ...p, morale: Math.min(100, p.morale + delta) }));
      }
      if (ev.impact.startsWith('stamina:') && ev.playerId) {
        const parts = ev.impact.split(':');
        const delta = parseInt(parts[2] || '0');
        updated = updated.map(p =>
          p.id === ev.playerId ? { ...p, stamina: Math.max(10, p.stamina + delta) } : p
        );
      }
    }
    return updated;
  }
}

// Singleton
let _instance: TrainingManager | null = null;
export function getTrainingManager(): TrainingManager {
  if (!_instance) _instance = new TrainingManager();
  return _instance;
}
