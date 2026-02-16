import { Injury } from './game';

export interface GameEvent {
  id: string;
  type: 'injury' | 'offer' | 'protest' | 'bonus' | 'scandal' | 'discovery' | 'player_upgrade' | 'fan_rage' | 'stadium_upgrade' | 'transfer_in' | 'transfer_out' | 'record' | 'captain' | 'derby' | 'weather' | 'season_awards' | 'player_unhappy';
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
  return Math.min(4, Math.floor(physioLevel * 0.5));
}

export function generateRandomEvents(
  players: { id: string; name: string; position: string; overall: number; age: number; stamina?: number; injury?: Injury; goals?: number; assists?: number }[],
  fans: number,
  reputation: number,
  recentLosses: number,
  recentWins: number,
  physioLevel?: number,
  trainingCenterLevel?: number,
): GameEvent[] {
  const events: GameEvent[] = [];
  const roll = Math.random();
  const pLevel = physioLevel ?? 1;

  const availablePlayers = players.filter(p => !p.injury);

  // ~12% chance of injury
  if (roll < 0.12 && availablePlayers.length > 0) {
    const p = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    const staminaFactor = (p.stamina ?? 80) < 50 ? 0.3 : 0;
    const severityRoll = Math.random() + staminaFactor;
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

  // ~15% chance of big club offer
  if (roll >= 0.12 && roll < 0.27) {
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

  // ~10% chance of fan protest when losing streak
  if (roll >= 0.27 && roll < 0.37 && recentLosses >= 2) {
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

  // ~10% chance of bonus when winning streak — requires CT level >= 3
  const ctLevel = trainingCenterLevel ?? 1;
  if (roll >= 0.37 && roll < 0.47 && recentWins >= 2 && ctLevel >= 3) {
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

  // ~11% chance of youth talent discovery
  if (roll >= 0.47 && roll < 0.58) {
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

  // ~7% chance of scandal
  if (roll >= 0.58 && roll < 0.65) {
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

  // ~10% chance of record event
  if (roll >= 0.65 && roll < 0.75) {
    const topScorer = [...players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    if (topScorer && (topScorer.goals ?? 0) > 0) {
      const goals = topScorer.goals ?? 0;
      const records = [
        `${topScorer.name} se torna o maior artilheiro da temporada com ${goals} gols!`,
        `${topScorer.name} bate recorde pessoal de gols na carreira!`,
        `Marca histórica: ${topScorer.name} atinge ${goals} gols e entra para a história do clube!`,
      ];
      events.push({
        id: crypto.randomUUID(),
        type: 'record',
        title: '🏆 Recorde Batido!',
        description: records[Math.floor(Math.random() * records.length)],
        icon: '🏅',
        impact: `morale_all:3,reputation:2`,
        resolved: true,
      });
    }
  }

  // ~10% chance of derby/classic match hype
  if (roll >= 0.75 && roll < 0.85) {
    const derbyMessages = [
      'A cidade ferve! O clássico da próxima rodada promete casa cheia e emoção.',
      'Rivalidade acirrada: torcidas organizam mosaicos gigantes para o próximo jogo.',
      'Clássico no horizonte! Ingressos esgotados em poucas horas.',
      'Dirigentes declaram: "Este clássico vale mais que 3 pontos, vale orgulho!"',
    ];
    events.push({
      id: crypto.randomUUID(),
      type: 'derby',
      title: '🔥 Clássico à Vista!',
      description: derbyMessages[Math.floor(Math.random() * derbyMessages.length)],
      icon: '⚔️',
      impact: `morale_all:2,fans:500`,
      resolved: true,
    });
  }

  // ~15% chance of weather event
  if (roll >= 0.85) {
    const weatherEvents = [
      { title: '🌧️ Chuva Torrencial', desc: 'Forte chuva afeta o gramado e dificulta treinos da semana. Condicionamento físico do elenco prejudicado.', impact: 'morale_all:-2' },
      { title: '☀️ Calor Extremo', desc: 'Onda de calor atinge a cidade. Jogadores treinam em horário alternativo para evitar desidratação.', impact: 'morale_all:-1' },
      { title: '🌤️ Clima Perfeito', desc: 'Condições climáticas ideais favorecem treinamentos e a moral do elenco sobe.', impact: 'morale_all:3' },
    ];
    const w = weatherEvents[Math.floor(Math.random() * weatherEvents.length)];
    events.push({
      id: crypto.randomUUID(),
      type: 'weather',
      title: w.title,
      description: w.desc,
      icon: '🌦️',
      impact: w.impact,
      resolved: true,
    });
  }

  return events;
}
