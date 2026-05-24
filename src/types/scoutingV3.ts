export type ScoutLevel = 'Amador' | 'Regional' | 'Nacional' | 'Internacional' | 'Elite Mundial';
export type ScoutSpecialization = 'ataque' | 'defesa' | 'meio' | 'jovens' | 'geral';
export type MissionType = 'local' | 'global' | 'posição' | 'promessas' | 'empréstimos' | 'baratos' | 'prontos';
export type MissionStatus = 'em_andamento' | 'concluída' | 'cancelada';
export type RegionType = 'Brasil' | 'América do Sul' | 'Europa' | 'África' | 'Ásia' | 'América do Norte';

export interface RegionalKnowledge {
  region: RegionType;
  proficiency: number; // 0-100
}

export interface ScoutV3 {
  id: string;
  user_id: string | null;
  name: string;
  country: string;
  level: ScoutLevel;
  specialization: ScoutSpecialization;
  efficiency: number;
  is_busy: boolean;
  is_free_agent: boolean;
  seasons_remaining: number;
  
  // New Attributes
  potential_evaluation: number;
  technical_evaluation: number;
  analysis_speed: number;
  youth_discovery: number;
  reputation: number;
  
  // Contract & Region
  salary: number;
  contract_start: string;
  contract_end: string;
  preferred_region: RegionType;
  regional_knowledge: RegionalKnowledge[];
  
  avatar_url?: string;
  created_at?: string;
}

export interface ScoutMarketPool extends Omit<ScoutV3, 'user_id' | 'is_busy' | 'is_free_agent' | 'seasons_remaining' | 'contract_start' | 'contract_end'> {
  expires_at: string;
}

export interface ScoutMissionV3 {
  id: string;
  user_id: string;
  scout_id: string;
  type: MissionType;
  status: MissionStatus;
  starts_at: string;
  ends_at: string;
  region?: RegionType;
  target_position?: string;
  target_min_age?: number;
  target_max_age?: number;
  target_min_potential?: number;
  risk: number;
  reward_multiplier: number;
  created_at?: string;
}

export interface ScoutReportV3 {
  id: string;
  user_id: string;
  mission_id: string;
  player_data: {
    name: string;
    age: number;
    position: string;
    overall: number;
    potential: number;
    market_value: number;
    nationality: string;
    personality?: string;
    style?: string;
    strengths?: string[];
    weaknesses?: string[];
    comparison?: string;
    expected_salary?: number;
    signing_risk?: 'baixo' | 'médio' | 'alto';
    status?: 'livre' | 'contratado' | 'disponível';
  };
  accuracy: number;
  status: 'novo' | 'visto' | 'contratado' | 'descartado';
  created_at?: string;
}
