/**
 * Youth Dynamic Events — Base V2
 * Random events that happen every cycle (~25% chance) affecting the academy.
 */
import { YouthProspect, getYouthMaxOverall } from '@/types/infrastructure';
import { generateYouthProspect } from './playerGenerator';

export type YouthEventType = 'novo_talento' | 'evolucao_rapida' | 'estagnacao' | 'lesao';

export interface YouthEvent {
  type: YouthEventType;
  emoji: string;
  title: string;
  description: string;
  affectedPlayerName?: string;
}

export function rollYouthEvent(
  prospects: YouthProspect[],
  academyLevel: number
): { event: YouthEvent | null; updatedProspects: YouthProspect[] } {
  // 25% chance per cycle
  if (Math.random() > 0.25) return { event: null, updatedProspects: prospects };

  const eligibleEvents: YouthEventType[] = ['novo_talento'];
  if (prospects.length > 0) eligibleEvents.push('evolucao_rapida', 'estagnacao', 'lesao');

  const type = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];

  switch (type) {
    case 'novo_talento': {
      // Generate one extra prospect above average
      const extra = generateYouthProspect(Math.min(30, academyLevel + 3));
      const boostedOvr = Math.min(getYouthMaxOverall(academyLevel) + 5, extra.overall + 4);
      const newProspect: YouthProspect = { ...extra, overall: boostedOvr };
      return {
        event: {
          type, emoji: '🌟', title: 'Novo talento surgiu!',
          description: `${newProspect.name} (${newProspect.position}, OVR ${newProspect.overall}) chegou à base.`,
          affectedPlayerName: newProspect.name,
        },
        updatedProspects: [...prospects, newProspect],
      };
    }
    case 'evolucao_rapida': {
      const idx = Math.floor(Math.random() * prospects.length);
      const target = prospects[idx];
      const boost = Math.min(10, target.potential - target.overall);
      if (boost <= 0) {
        return { event: null, updatedProspects: prospects };
      }
      const updated = [...prospects];
      updated[idx] = { ...target, overall: target.overall + boost, trainingProgress: 0 };
      return {
        event: {
          type, emoji: '🚀', title: 'Jogador evoluindo rápido!',
          description: `${target.name} subiu ${boost} pontos de OVR (agora ${target.overall + boost}).`,
          affectedPlayerName: target.name,
        },
        updatedProspects: updated,
      };
    }
    case 'estagnacao': {
      const idx = Math.floor(Math.random() * prospects.length);
      const target = prospects[idx];
      const updated = [...prospects];
      updated[idx] = { ...target, stagnationCycles: 2 };
      return {
        event: {
          type, emoji: '😴', title: 'Promessa estagnou',
          description: `${target.name} parou de evoluir por 2 ciclos.`,
          affectedPlayerName: target.name,
        },
        updatedProspects: updated,
      };
    }
    case 'lesao': {
      const idx = Math.floor(Math.random() * prospects.length);
      const target = prospects[idx];
      const updated = [...prospects];
      updated[idx] = { ...target, injuredCycles: 1 };
      return {
        event: {
          type, emoji: '🏥', title: 'Lesão na base',
          description: `${target.name} ficou indisponível por 1 ciclo.`,
          affectedPlayerName: target.name,
        },
        updatedProspects: updated,
      };
    }
  }
}
