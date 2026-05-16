import { Player } from '@/types/game';

export type ShopCategory = 'uniform' | 'sponsorship' | 'marketing' | 'stickers' | 'infrastructure' | 'staff' | 'products' | 'members';

export interface ActiveEffect {
  id: string;
  itemId: string;
  category: ShopCategory;
  bonusData: any;
  startedAt: string;
  expiresAt?: string;
  lastUpdateAt: string;
}

export interface UniformLaunch {
  id: string;
  seasonYear: number;
  type: 'home' | 'away' | 'third';
  designData: any;
  hypeScore: number;
  totalSales: number;
  launchedAt: string;
  isActive: boolean;
}

export interface ClubMembership {
  totalMembers: number;
  activePlanId: string | null;
  monthlyRevenue: number;
  happiness: number;
}

export interface StoreStats {
  level: number;
  dailyRevenue: number;
  totalRevenue: number;
  activeEffects: ActiveEffect[];
  uniformLaunches: UniformLaunch[];
  membership: ClubMembership;
}
