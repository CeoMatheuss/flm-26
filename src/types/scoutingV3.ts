import { LucideIcon } from 'lucide-react';

export type ScoutLevel = 'baixo' | 'médio' | 'alto' | 'elite';
export type ScoutSpecialization = 'ataque' | 'defesa' | 'meio' | 'jovens' | 'geral';
export type MissionType = 'local' | 'global' | 'posição' | 'promessas';
export type MissionStatus = 'em_andamento' | 'concluída' | 'cancelada';

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
  market_available_at?: string;
  last_mission_completed_at?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface ScoutMissionV3 {
  id: string;
  user_id: string;
  scout_id: string;
  type: MissionType;
  status: MissionStatus;
  starts_at: string;
  ends_at: string;
  target_position?: string;
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
    status?: 'livre' | 'contratado' | 'disponível';
  };
  accuracy: number;
  status: 'novo' | 'visto' | 'contratado' | 'descartado';
  created_at?: string;
}
