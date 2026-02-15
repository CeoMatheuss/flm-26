import { Injury } from './game';

export interface GameEvent {
  id: string;
  type: 'injury' | 'offer' | 'protest' | 'bonus' | 'scandal' | 'discovery' | 'player_upgrade' | 'fan_rage';
  title: string;
  description: string;
  icon: string;
  impact: string;
  resolved: boolean;
  injuryData?: {
    playerId: string;
    injury: Injury;
  };
}

const bigClubs = ['Real Madrid', 'Barcelona', 'Manchester City', 'PSG', 'Bayern Munich', 'Juventus', 'Liverpool', 'Chelsea'];

const injuryTypes = [
  { type: 'Estiramento muscular', severity: 'leve' as const, baseWeeks: 1 },
  { type: 'Contusão', severity: 'leve' as const, baseWeeks: 1 },
  { type: 'Entorse de tornozelo', severity: 'moderada' as const, baseWeeks: 2 },
  { type: 'Lesão muscular', severity: 'moderada' as const, baseWeeks: 3 },
  { type: 'Distensão no joelho', severity: 'moderada' as const, baseWeeks: 3 },
  { type: 'Lesão no ligamento', severity: 'grave' as const, baseWeeks: 5 },
  { type: 'Fratura', severity: 'grave' as const, baseWeeks: 6 },
  { type: 'Ruptura de ligamento', severity: 'grave' as const, baseWeeks: 8 },
];

export function getInjuryRecoveryReduction(physioLevel: number): number {
  // Each physio level reduces recovery by ~0.5 weeks (rounded), max 4 weeks reduction
  return Math.min(4, Math.floor(physioLevel * 0.5));
}

export function generateRandomEvents(
  players: { id: string; name: string; position: string; overall: number; age: number; stamina?: number; injury?: Injury }[],
  fans: number,
  reputation: number,
  recentLosses: number,
  recentWins: number,
  physioLevel?: number,
): GameEvent[] {
  const events: GameEvent[] = [];
  const roll = Math.random();
  const pLevel = physioLevel ?? 1;

  // Available (non-injured) players for injury
  const availablePlayers = players.filter(p => !p.injury);

  // ~30% chance of injury (only on non-injured players)
  if (roll < 0.3 && availablePlayers.length > 0) {
    const p = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    
    // Low stamina increases chance of severe injury
    const staminaFactor = (p.stamina ?? 80) < 50 ? 0.3 : 0; // bias toward severe if tired
    const severityRoll = Math.random() + staminaFactor;
    
    // Older players more injury prone — bias severity
    const ageFactor = p.age > 30 ? 0.15 : 0;
    const adjustedRoll = Math.min(1, severityRoll + ageFactor);
    
    let injuryPool: typeof injuryTypes;
    if (adjustedRoll < 0.45) {
      injuryPool = injuryTypes.filter(i => i.severity === 'leve');
    } else if (adjustedRoll < 0.8) {
      injuryPool = injuryTypes.filter(i => i.severity === 'moderada');
    } else {
      injuryPool = injuryTypes.filter(i => i.severity === 'grave');
    }
    
    const injuryInfo = injuryPool[Math.floor(Math.random() * injuryPool.length)];
    const reduction = getInjuryRecoveryReduction(pLevel);
    const finalWeeks = Math.max(1, injuryInfo.baseWeeks - reduction);
    
    const injury: Injury = {
      type: injuryInfo.type,
      severity: injuryInfo.severity,
      weeksRemaining: finalWeeks,
      originalWeeks: injuryInfo.baseWeeks,
    };
    
    const savedWeeks = injuryInfo.baseWeeks - finalWeeks;
    const physioNote = savedWeeks > 0 ? ` (Fisioterapia Nv.${pLevel} reduziu ${savedWeeks} semana(s))` : '';
    
    events.push({
      id: crypto.randomUUID(),
      type: 'injury',
      title: `🤕 ${injuryInfo.type}: ${p.name}`,
      description: `${p.name} sofreu ${injuryInfo.severity === 'leve' ? 'uma lesão leve' : injuryInfo.severity === 'moderada' ? 'uma lesão moderada' : 'uma lesão GRAVE'}. Fora por ${finalWeeks} partida(s).${physioNote}`,
      icon: '🏥',
      impact: `stamina:-${finalWeeks * 10},morale:-${finalWeeks * 3},player:${p.id}`,
      resolved: false,
      injuryData: { playerId: p.id, injury },
    });
  }

  // ~20% chance of big club offer for top players
  if (roll >= 0.3 && roll < 0.5) {
    const topPlayers = players.filter(p => p.overall >= 70 && p.age <= 30);
    if (topPlayers.length > 0) {
      const p = topPlayers[Math.floor(Math.random() * topPlayers.length)];
      const club = bigClubs[Math.floor(Math.random() * bigClubs.length)];
      const value = Math.floor((p.overall * 50000 + Math.random() * 500000) * (1 + reputation / 100));
      events.push({
        id: crypto.randomUUID(),
        type: 'offer',
        title: `💰 Proposta: ${club}`,
        description: `${club} oferece R$ ${(value / 1000).toFixed(0)}k por ${p.name} (OVR ${p.overall}).`,
        icon: '📨',
        impact: `offer:${value},player:${p.id},club:${club}`,
        resolved: false,
      });
    }
  }

  // ~15% chance of fan protest when losing streak
  if (roll >= 0.5 && roll < 0.65 && recentLosses >= 2) {
    const intensity = recentLosses >= 4 ? 'violento' : recentLosses >= 3 ? 'grande' : 'moderado';
    events.push({
      id: crypto.randomUUID(),
      type: 'protest',
      title: '😡 Protesto da Torcida',
      description: `Torcedores organizaram um protesto ${intensity} contra os maus resultados. Moral do elenco afetada.`,
      icon: '📢',
      impact: `morale_all:-${recentLosses * 3},fans:-${recentLosses * 200}`,
      resolved: false,
    });
  }

  // ~15% chance of bonus when winning streak
  if (roll >= 0.65 && roll < 0.8 && recentWins >= 2) {
    const bonus = recentWins * 50000 + Math.floor(Math.random() * 100000);
    events.push({
      id: crypto.randomUUID(),
      type: 'bonus',
      title: '🎉 Premiação Extra',
      description: `A diretoria concedeu um bônus de R$ ${(bonus / 1000).toFixed(0)}k pela sequência de vitórias!`,
      icon: '💎',
      impact: `budget:${bonus}`,
      resolved: false,
    });
  }

  // ~10% chance of youth talent discovery
  if (roll >= 0.8 && roll < 0.9) {
    events.push({
      id: crypto.randomUUID(),
      type: 'discovery',
      title: '⭐ Joia Descoberta',
      description: 'Olheiros encontraram um jovem promissor na região. Ele será adicionado à base!',
      icon: '🔍',
      impact: 'youth_prospect',
      resolved: false,
    });
  }

  // ~10% chance of scandal
  if (roll >= 0.9) {
    const p = players[Math.floor(Math.random() * players.length)];
    if (p) {
      events.push({
        id: crypto.randomUUID(),
        type: 'scandal',
        title: '📰 Escândalo na Mídia',
        description: `${p.name} se envolveu em polêmica fora de campo. Reputação do clube e moral afetados.`,
        icon: '🗞️',
        impact: `reputation:-3,morale:-5,player:${p.id}`,
        resolved: false,
      });
    }
  }

  return events;
}