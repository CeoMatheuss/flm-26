/**
 * TrainingEventGenerator — Gera eventos dinâmicos durante as sessões de treino
 * 
 * Eventos: avanço técnico, susto de lesão, dedicação especial, sobrecarga, química de equipe, bônus de staff
 * Completamente separado do sistema de partidas.
 */

import type { Player } from '@/types/game';
import type { TrainingEvent, TrainingFocusKey, TrainingIntensity } from './TrainingTypes';

const generateId = () => Math.random().toString(36).slice(2, 11);

export class TrainingEventGenerator {
  /**
   * Gera eventos aleatórios baseados nos jogadores e na semana de treino.
   * Retorna array (pode ser vazio).
   */
  generate(
    players: Player[],
    focus: Record<string, TrainingFocusKey>,
    intensity: TrainingIntensity,
    week: number,
    trainingCenterLevel: number
  ): TrainingEvent[] {
    const events: TrainingEvent[] = [];
    const chanceScale = trainingCenterLevel / 10;

    // ── Evento: Química de equipe (semanal, ~15%) ──────────────────────
    if (Math.random() < 0.15 * chanceScale + 0.05) {
      const messages = [
        'O grupo treinou com muita energia hoje. A química está ótima!',
        'Veteranos passando experiência para os mais jovens durante a semana.',
        'Sessão animada no CT — vestiário unido eleva o time!',
        'Treino descontraído que fortaleceu os laços do grupo.',
      ];
      events.push({
        id: generateId(),
        type: 'team_chemistry',
        title: '🤝 QUÍMICA EM ALTA!',
        description: messages[Math.floor(Math.random() * messages.length)],
        icon: '💚',
        impact: 'morale_all:+3',
      });
    }

    // ── Evento: Avanço técnico individual (~10%) ───────────────────────
    const eligible = players.filter(p => !p.injury && p.age <= 33 && focus[p.id] && focus[p.id] !== 'none');
    if (eligible.length > 0 && Math.random() < 0.10 + chanceScale * 0.05) {
      const player = eligible[Math.floor(Math.random() * eligible.length)];
      const focusKey = focus[player.id];
      events.push({
        id: generateId(),
        type: 'breakthrough',
        title: `💡 AVANÇO TÉCNICO — ${player.name.toUpperCase()}!`,
        description: `${player.name} teve um momento de eureka durante o treino de ${focusKey}! Progresso acelerado nesta semana.`,
        icon: '🌟',
        playerId: player.id,
        impact: `training_boost:${player.id}`,
      });
    }

    // ── Evento: Dedicação especial (jogador 'dedicado') ───────────────
    const dedicated = players.find(p => p.personality === 'dedicado' && !p.injury);
    if (dedicated && Math.random() < 0.20) {
      events.push({
        id: generateId(),
        type: 'dedication',
        title: `📚 ${dedicated.name.split(' ')[0].toUpperCase()} NO LIMITE!`,
        description: `${dedicated.name} ficou mais de 1 hora após o treino trabalhando a técnica. Dedicação exemplar!`,
        icon: '💪',
        playerId: dedicated.id,
        impact: `training_boost:${dedicated.id}`,
      });
    }

    // ── Evento: Sobrecarga de treino pesado ───────────────────────────
    if (intensity === 'pesado' && Math.random() < 0.20) {
      const tired = players.filter(p => p.stamina < 50 && !p.injury);
      if (tired.length > 0) {
        const player = tired[Math.floor(Math.random() * tired.length)];
        events.push({
          id: generateId(),
          type: 'fatigue',
          title: `😓 SOBRECARGA — ${player.name.split(' ')[0].toUpperCase()}!`,
          description: `${player.name} está no limite físico. Treino pesado com stamina baixa é arriscado!`,
          icon: '⚠️',
          playerId: player.id,
          impact: `stamina:${player.id}:-5`,
        });
      }
    }

    // ── Evento: Bônus de staff técnico (~8%) ──────────────────────────
    if (Math.random() < 0.08) {
      const bonusMsgs = [
        'O preparador físico implementou nova rotina de aquecimento. Todos os atletas se beneficiaram!',
        'Análise de vídeo do treinador revelou ajustes táticos que otimizaram o treino.',
        'Staff médico preveniu micro-lesões com tratamento proativo após a sessão.',
        'Nutricionista ajustou dieta dos atletas. Melhora geral no rendimento do treino!',
      ];
      events.push({
        id: generateId(),
        type: 'staff_bonus',
        title: '👨‍⚕️ STAFF EM AÇÃO!',
        description: bonusMsgs[Math.floor(Math.random() * bonusMsgs.length)],
        icon: '🏥',
        impact: 'morale_all:+2',
      });
    }

    console.log(`[TrainingEvents] Week ${week}: generated ${events.length} events`);
    return events;
  }
}
