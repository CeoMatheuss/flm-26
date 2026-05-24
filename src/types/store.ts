import { Player } from '@/types/game';

export type ShopCategory = 'uniform' | 'sponsorship' | 'marketing' | 'stickers' | 'infrastructure' | 'staff' | 'products' | 'members' | 'scouting' | 'fans' | 'customization' | 'delivery';

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
  manualMembers?: number;
  activePlanId: string | null;
  monthlyRevenue: number;
  happiness: number;
}

export interface ShippingCompany {
  id: string;
  name: string;
  speed_factor: number;
  quality_score: number;
  price_factor: number;
  delay_risk: number;
}

export type OrderStatus = 'processing' | 'separating' | 'shipping' | 'out_for_delivery' | 'delivered' | 'delayed' | 'cancelled';

export interface ShopOrder {
  id: string;
  product_id: string;
  shipping_company_id: string;
  status: OrderStatus;
  customer_satisfaction?: number;
  freight_cents: number;
  distance_km: number;
  risk_factor: number;
  estimated_delivery_at: string;
  actual_delivery_at?: string;
  created_at: string;
  product?: ShopProduct;
  shipping_company?: ShippingCompany;
}

export interface ShopProduct {
  id: string;
  name: string;
  category: string;
  base_price_cents: number;
  stock_quantity: number;
  max_stock: number;
  popularity_score: number;
  is_limited_edition: boolean;
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  image_url?: string;
}

export interface OfflineSummary {
  revenue: number;
  products_sold: number;
  fans_growth: number;
  completed_deliveries: number;
  out_of_stock: number;
  time_offline_seconds: number;
}

export interface StoreStats {
  level: number;
  dailyRevenue: number;
  totalRevenue: number;
  activeEffects: ActiveEffect[];
  uniformLaunches: UniformLaunch[];
  membership: ClubMembership;
  recentOrders: ShopOrder[];
  products: ShopProduct[];
}

