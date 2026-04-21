/**
 * Youth Match Simulator — Base V2
 * Simulates a fictional youth match against a rival academy every cycle.
 * Generates a textual report and updates prospects (gamesPlayed, trainingProgress, highlightStreak).
 */
import { YouthProspect } from '@/types/infrastructure';

const rivalAcademies = [
  'Academia Cruzeiro Sub-20',
  'Base do Santos FC',
  'Formação Palmeiras',
  'Castelão Jovem',
  'CT do São Paulo',
  'Toca da Raposa Jr.',
  'Vila Belmiro Sub-20',
  'Granja Comary B',
  'Academia Flamengo',
  'CT Alvinegro',
];

export interface YouthMatchReport {
  rival: string;
  homeGoals: number;
  awayGoals: number;
  result: 'V' | 'E' | 'D';
  highlights: string[];
  ratingsByPlayerId: Record<string, number>;
}

export function simulateYouthMatch(prospects: YouthProspect[]): {
  report: YouthMatchReport;
  updatedProspects: YouthProspect[];
} {
  if (prospects.length === 0) {
    return {
      report: {
        rival: rivalAcademies[Math.floor(Math.random() * rivalAcademies.length)],
        homeGoals: 0, awayGoals: 0, result: 'E',
        highlights: ['Sem jogadores na base para escalar.'],
        ratingsByPlayerId: {},
      },
      updatedProspects: prospects,
    };
  }

  const rival = rivalAcademies[Math.floor(Math.random() * rivalAcademies.length)];
  const ourAvg = prospects.reduce((s, p) => s + p.overall, 0) / prospects.length;
  const rivalAvg = 45 + Math.random() * 25;

  // Poisson-like score generation based on strength diff
  const diff = ourAvg - rivalAvg;
  const ourExpected = Math.max(0.3, 1.5 + diff * 0.05);
  const rivalExpected = Math.max(0.3, 1.5 - diff * 0.05);
  const homeGoals = Math.min(7, Math.max(0, Math.round(ourExpected + (Math.random() - 0.5) * 1.5)));
  const awayGoals = Math.min(7, Math.max(0, Math.round(rivalExpected + (Math.random() - 0.5) * 1.5)));
  const result: 'V' | 'E' | 'D' = homeGoals > awayGoals ? 'V' : homeGoals < awayGoals ? 'D' : 'E';

  const highlights: string[] = [];
  const ratingsByPlayerId: Record<string, number> = {};

  // Each prospect gets a rating 4-10 based on OVR + randomness
  const updatedProspects = prospects.map(p => {
    if ((p.injuredCycles ?? 0) > 0) {
      ratingsByPlayerId[p.id] = 0;
      return { ...p, injuredCycles: Math.max(0, (p.injuredCycles ?? 0) - 1) };
    }
    const baseRating = 4 + ((p.overall - 30) / 70) * 5;
    const variance = (Math.random() - 0.4) * 3;
    const rating = Math.min(10, Math.max(4, +(baseRating + variance).toFixed(1)));
    ratingsByPlayerId[p.id] = rating;

    const isStandout = rating >= 8;
    const isPoor = rating <= 5;

    if (isStandout) {
      highlights.push(`⭐ ${p.name} foi destaque (nota ${rating.toFixed(1)})`);
    } else if (isPoor && Math.random() < 0.3) {
      highlights.push(`⚠️ ${p.name} teve atuação fraca (nota ${rating.toFixed(1)})`);
    }

    return {
      ...p,
      gamesPlayed: (p.gamesPlayed ?? 0) + 1,
      trainingProgress: Math.min(100, (p.trainingProgress ?? 0) + (isStandout ? 5 : isPoor ? 1 : 3)),
      highlightStreak: isStandout ? (p.highlightStreak ?? 0) + 1 : 0,
      morale: Math.min(100, Math.max(20, (p.morale ?? 60) + (isStandout ? 5 : isPoor ? -5 : 0))),
    };
  });

  // Generic highlights
  if (awayGoals >= 3) highlights.push(`🥅 Defesa falhou (${awayGoals} gols sofridos)`);
  if (homeGoals >= 3) highlights.push(`⚽ Ataque inspirado (${homeGoals} gols marcados)`);
  if (highlights.length === 0) highlights.push('Partida equilibrada, sem grandes destaques.');

  return {
    report: { rival, homeGoals, awayGoals, result, highlights, ratingsByPlayerId },
    updatedProspects,
  };
}

export function formatYouthMatchNews(clubName: string, report: YouthMatchReport): string {
  const resultEmoji = report.result === 'V' ? '🏆' : report.result === 'D' ? '😞' : '🤝';
  const top = report.highlights.slice(0, 2).join(' · ');
  return `${resultEmoji} BASE: ${clubName} ${report.homeGoals} x ${report.awayGoals} ${report.rival} — ${top}`;
}
