export interface GameEvent {
  id: string;
  type: 'injury' | 'offer' | 'protest' | 'bonus' | 'scandal' | 'discovery';
  title: string;
  description: string;
  icon: string;
  impact: string;
  resolved: boolean;
}

const bigClubs = ['Real Madrid', 'Barcelona', 'Manchester City', 'PSG', 'Bayern Munich', 'Juventus', 'Liverpool', 'Chelsea'];

export function generateRandomEvents(
  players: { id: string; name: string; position: string; overall: number; age: number }[],
  fans: number,
  reputation: number,
  recentLosses: number,
  recentWins: number,
): GameEvent[] {
  const events: GameEvent[] = [];
  const roll = Math.random();

  // ~30% chance of injury
  if (roll < 0.3 && players.length > 0) {
    const p = players[Math.floor(Math.random() * players.length)];
    const severity = Math.random();
    const weeks = severity < 0.5 ? 1 : severity < 0.8 ? 2 : 4;
    events.push({
      id: crypto.randomUUID(),
      type: 'injury',
      title: `🤕 Lesão: ${p.name}`,
      description: `${p.name} sofreu uma lesão ${weeks <= 1 ? 'leve' : weeks <= 2 ? 'moderada' : 'grave'} e perderá energia e moral.`,
      icon: '🏥',
      impact: `stamina:-${weeks * 15},morale:-${weeks * 5},player:${p.id}`,
      resolved: false,
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
