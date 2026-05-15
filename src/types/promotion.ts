import { YouthProspect } from '@/types/infrastructure';

export type PromotionDecision = 'promoted' | 'stayed' | 'observing' | 'released';

export interface PromotionEvent {
  id: string;
  prospect: YouthProspect;
  status: 'notified' | 'negotiating' | 'decided';
  decision?: PromotionDecision;
  createdAt: string;
}

export interface ContractOffer {
  years: number;
  salary: number; // monthly
  releaseClause: number;
  signingBonus: number;
  squadRole: 'promessa' | 'reserva' | 'rotacao' | 'titular-futuro';
}

export interface NegotiationState {
  playerDemand: ContractOffer;
  currentOffer: ContractOffer;
  patience: number; // 0-100
  history: { type: 'player' | 'user', text: string, offer?: ContractOffer }[];
  isCompleted: boolean;
  isAccepted: boolean;
}
