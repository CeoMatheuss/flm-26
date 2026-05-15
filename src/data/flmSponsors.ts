import {
  Sponsor, SponsorOffer, SponsorType, SponsorPayMode, SponsorStatus,
  sponsorTypeLabels, objectiveLabels
} from '@/types/sponsor';

/**
 * NOVOS PATROCÍNIOS FLM 26
 * Sistema baseado em exigência de TORCIDA (Fans) em vez de reputação.
 */

export interface FLMSponsorConfig {
  id: string;
  name: string;
  monthlyPay: number;
  winBonus: number;
  titleBonus: number;
  minFans: number;
  duration: number; // temporadas
}

export const FLM_SPONSOR_CATALOG: FLMSponsorConfig[] = [
  { id: 'betgol', name: 'BetGol', monthlyPay: 100000, winBonus: 5000, titleBonus: 50000, minFans: 1000, duration: 1 },
  { id: 'megabet', name: 'MegaBet', monthlyPay: 300000, winBonus: 15000, titleBonus: 150000, minFans: 3000, duration: 1 },
  { id: 'arenabank', name: 'ArenaBank', monthlyPay: 500000, winBonus: 20000, titleBonus: 250000, minFans: 5000, duration: 2 },
  { id: 'sportpay', name: 'SportPay', monthlyPay: 700000, winBonus: 30000, titleBonus: 350000, minFans: 8000, duration: 2 },
  { id: 'nitroenergy', name: 'Nitro Energy', monthlyPay: 1000000, winBonus: 40000, titleBonus: 500000, minFans: 12000, duration: 2 },
  { id: 'visiontelecom', name: 'Vision Telecom', monthlyPay: 2000000, winBonus: 60000, titleBonus: 1000000, minFans: 20000, duration: 3 },
  { id: 'maxcola', name: 'Max Cola', monthlyPay: 3000000, winBonus: 80000, titleBonus: 1500000, minFans: 35000, duration: 3 },
  { id: 'flyair', name: 'FlyAir', monthlyPay: 5000000, winBonus: 120000, titleBonus: 2500000, minFans: 60000, duration: 3 },
];

/**
 * Converte um FLMSponsorConfig em SponsorOffer para compatibilidade com o sistema existente.
 */
export function convertToSponsorOffer(cfg: FLMSponsorConfig, clubFans: number): SponsorOffer {
  return {
    id: `flm_${cfg.id}`,
    name: cfg.name,
    type: 'geral',
    totalValue: cfg.monthlyPay * (cfg.duration * 6), // 6 parcelas por temporada no sistema atual
    monthlyPay: cfg.monthlyPay,
    installmentsTotal: cfg.duration * 6,
    installmentsPaid: 0,
    payMode: 'monthly',
    penalty: cfg.monthlyPay * 5, // Multa pesada
    objective: { kind: 'win_n_matches', target: 5, label: `⚽ Vencer 5+ partidas oficiais` },
    signedSeason: 0,
    duration: cfg.duration,
    status: 'active',
    winsTracked: 0,
    minReputation: 0, // Ignorado no novo sistema
  };
}
