import { Player, PlayerAttributes } from '@/types/game';
import { calculateOverall } from './playerGenerator';

/**
 * Categorias de adaptação do jogador à posição
 */
export type AdaptationLevel = 'Natural' | 'Adaptado' | 'Improvisado' | 'Fora de Posição';

/**
 * Mapeia as posições compatíveis e os multiplicadores de overall
 */
export const positionCompatibility: Record<Player['position'], Record<string, number>> = {
  GOL: { GOL: 1.0, ZAG: 0.2, LAT: 0.2, VOL: 0.2, MEI: 0.2, ATA: 0.2 },
  ZAG: { ZAG: 1.0, VOL: 0.85, LAT: 0.8, MEI: 0.5, ATA: 0.4, GOL: 0.2 },
  LAT: { LAT: 1.0, ZAG: 0.85, VOL: 0.8, MEI: 0.75, ATA: 0.7, GOL: 0.2 },
  VOL: { VOL: 1.0, ZAG: 0.9, MEI: 0.85, LAT: 0.8, ATA: 0.6, GOL: 0.2 },
  MEI: { MEI: 1.0, VOL: 0.85, ATA: 0.8, LAT: 0.7, ZAG: 0.5, GOL: 0.2 },
  ATA: { ATA: 1.0, MEI: 0.8, VOL: 0.5, LAT: 0.5, ZAG: 0.3, GOL: 0.2 },
};

/**
 * Retorna o nível de adaptação baseado na compatibilidade
 */
export function getAdaptationLevel(compatibility: number): AdaptationLevel {
  if (compatibility >= 1.0) return 'Natural';
  if (compatibility >= 0.85) return 'Adaptado';
  if (compatibility >= 0.7) return 'Improvisado';
  return 'Fora de Posição';
}

/**
 * Retorna a cor associada ao nível de adaptação
 */
export function getAdaptationColor(level: AdaptationLevel): string {
  switch (level) {
    case 'Natural': return 'text-emerald-400';
    case 'Adaptado': return 'text-yellow-400';
    case 'Improvisado': return 'text-orange-400';
    case 'Fora de Posição': return 'text-red-400';
  }
}

/**
 * Calcula o overall dinâmico do jogador para uma posição alvo
 */
export function getDynamicOverall(player: Player, targetPosition: Player['position']): number {
  const baseCompatibility = positionCompatibility[player.position]?.[targetPosition] || 0.3;
  
  // Se for a posição secundária, a compatibilidade é melhor (mínimo 0.9 ou 1.0 se já for natural)
  let finalCompatibility = baseCompatibility;
  if (player.secondaryPosition === targetPosition) {
    finalCompatibility = Math.max(0.9, baseCompatibility);
  }

  // Calcula o overall real para a posição alvo baseada nos atributos
  const positionBasedOverall = calculateOverall(player.attributes, targetPosition);
  
  return Math.round(positionBasedOverall * finalCompatibility);
}
