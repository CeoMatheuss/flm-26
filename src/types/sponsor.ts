export interface Sponsor {
  id: string;
  name: string;
  type: 'camisa' | 'estadio' | 'treino' | 'geral';
  monthlyPay: number;
  duration: number; // seasons remaining
  minReputation: number;
}

export interface SponsorOffer extends Sponsor {
  // same as sponsor but available to accept
}

const sponsorNames = [
  'TechBrasil', 'Banco Central+', 'NetPlay', 'AeroSport', 'VitaEnergy',
  'MegaStore', 'AutoMax', 'CryptoFut', 'GlobalTel', 'SuperBet',
  'DrinkMax', 'FastFood BR', 'TurboAuto', 'PixPay', 'CloudNet',
];

const sponsorTypes: Sponsor['type'][] = ['camisa', 'estadio', 'treino', 'geral'];

export function generateSponsorOffers(reputation: number, count: number): SponsorOffer[] {
  return Array.from({ length: count }, () => {
    const type = sponsorTypes[Math.floor(Math.random() * sponsorTypes.length)];
    const basePay = reputation * 1000 + Math.floor(Math.random() * reputation * 2000);
    const duration = Math.floor(Math.random() * 3) + 1;
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: sponsorNames[Math.floor(Math.random() * sponsorNames.length)],
      type,
      monthlyPay: basePay,
      duration,
      minReputation: Math.max(10, reputation - 20),
    };
  });
}

export const sponsorTypeLabels: Record<Sponsor['type'], string> = {
  camisa: '👕 Camisa',
  estadio: '🏟️ Estádio',
  treino: '🏋️ Treino',
  geral: '📋 Geral',
};
