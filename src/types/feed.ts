import { Player } from './game';

export interface FeedItem {
  id: string;
  type: 'transfer_in' | 'free_agent_signed' | 'stadium_upgrade' | 'facility_upgrade' | 'player_sold' | 'youth_promoted' | 'sponsor_signed' | 'season_end';
  title: string;
  description: string;
  icon: string;
  timestamp: number;
  playerData?: { name: string; overall: number; age: number; position: string };
  facilityData?: { name: string; level: number };
  reactions: Record<string, number>; // emoji -> count (simulated)
  fanReaction?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    message: string;
  };
  userReaction?: string; // user's own emoji
}

// Fan reaction based on player quality
export function generateFanReaction(overall: number, age: number, salary: number): FeedItem['fanReaction'] {
  if (overall >= 85) {
    const msgs = [
      '🤩 Torcida em êxtase! Contratação de gala!',
      '🔥 A torcida já está fazendo fila pra comprar a camisa!',
      '🏟️ Estádio vai lotar! Que reforço!',
      '👏 A diretoria acertou em cheio! Craque de nível mundial!',
    ];
    return { sentiment: 'positive', message: msgs[Math.floor(Math.random() * msgs.length)] };
  }
  if (overall >= 75) {
    const msgs = [
      '😄 Boa contratação! Torcida aprova.',
      '👍 Reforço de qualidade. Torcida confiante.',
      '💪 Vai agregar muito ao elenco!',
      '✅ A galera gostou! Bom jogador.',
    ];
    return { sentiment: 'positive', message: msgs[Math.floor(Math.random() * msgs.length)] };
  }
  if (overall >= 65) {
    const msgs = [
      '😐 Torcida dividida. "Vamos ver no campo..."',
      '🤔 "Não conheço muito, mas espero que aqui vingue."',
      '😬 "É aposta... tomara que dê certo."',
      '🙏 "Que ele prove seu valor aqui!"',
    ];
    return { sentiment: 'neutral', message: msgs[Math.floor(Math.random() * msgs.length)] };
  }
  if (overall >= 55) {
    const msgs = [
      '😤 "Cadê os reforços de verdade?!"',
      '👎 Torcida descontente. "Isso é nível de série B..."',
      '😡 "A diretoria tá de brincadeira? Jogador fraco!"',
      '🤦 "Espero que aqui vingue, porque com esse nível..."',
    ];
    return { sentiment: 'negative', message: msgs[Math.floor(Math.random() * msgs.length)] };
  }
  const msgs = [
    '😡 Torcida revoltada! "Esse cara não joga nem na pelada!"',
    '🗑️ "A diretoria jogou dinheiro fora!"',
    '💀 "Contratação horrível. Cadê o respeito com a torcida?"',
    '🤬 "FORA DIRETORIA! Que contratação ridícula!"',
  ];
  return { sentiment: 'negative', message: msgs[Math.floor(Math.random() * msgs.length)] };
}

// Generate simulated community reactions (emoji counts)
export function generateSimulatedReactions(type: FeedItem['type'], sentiment?: 'positive' | 'neutral' | 'negative'): Record<string, number> {
  const base: Record<string, number> = {};
  if (type === 'transfer_in' || type === 'free_agent_signed') {
    if (sentiment === 'positive') {
      base['🔥'] = Math.floor(Math.random() * 50 + 30);
      base['👏'] = Math.floor(Math.random() * 40 + 20);
      base['❤️'] = Math.floor(Math.random() * 30 + 10);
    } else if (sentiment === 'negative') {
      base['👎'] = Math.floor(Math.random() * 40 + 20);
      base['😡'] = Math.floor(Math.random() * 30 + 10);
      base['😢'] = Math.floor(Math.random() * 20 + 5);
    } else {
      base['🤔'] = Math.floor(Math.random() * 30 + 15);
      base['👍'] = Math.floor(Math.random() * 20 + 10);
      base['🙏'] = Math.floor(Math.random() * 15 + 5);
    }
  } else if (type === 'stadium_upgrade' || type === 'facility_upgrade') {
    base['🏗️'] = Math.floor(Math.random() * 30 + 20);
    base['👏'] = Math.floor(Math.random() * 25 + 15);
    base['🔥'] = Math.floor(Math.random() * 20 + 10);
  } else if (type === 'youth_promoted') {
    base['⭐'] = Math.floor(Math.random() * 25 + 15);
    base['🙏'] = Math.floor(Math.random() * 20 + 10);
    base['💪'] = Math.floor(Math.random() * 15 + 5);
  } else {
    base['👍'] = Math.floor(Math.random() * 20 + 10);
    base['🔥'] = Math.floor(Math.random() * 15 + 5);
  }
  return base;
}

export function createFeedItem(
  type: FeedItem['type'],
  title: string,
  description: string,
  icon: string,
  extra?: { playerData?: FeedItem['playerData']; facilityData?: FeedItem['facilityData'] }
): FeedItem {
  const fanReaction = extra?.playerData
    ? generateFanReaction(extra.playerData.overall, extra.playerData.age, 0)
    : undefined;

  return {
    id: crypto.randomUUID(),
    type,
    title,
    description,
    icon,
    timestamp: Date.now(),
    playerData: extra?.playerData,
    facilityData: extra?.facilityData,
    reactions: generateSimulatedReactions(type, fanReaction?.sentiment),
    fanReaction,
  };
}
