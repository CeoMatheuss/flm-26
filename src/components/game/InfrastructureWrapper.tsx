/**
 * InfrastructureWrapper — Container único da seção INFRAESTRUTURA com 5 sub-abas:
 *  - Treinos
 *  - Fisioterapia
 *  - Estádio
 *  - Categorias de Base
 *  - Salas do CT
 *
 * Substitui o antigo TrainingWrapper. Mantém todas as props expostas para o GameTabRouter.
 */
import { useState, useCallback } from 'react';
import type { Player } from '@/types/game';
import type { Infrastructure } from '@/types/infrastructure';
import type { TacticsConfig } from '@/types/tactics';
import type { TrainingFocusKey } from '@/training/TrainingTypes';
import type { CTRooms } from '@/types/ctRooms';
import { TrainingTab } from './TrainingTab';
import { TrainingMatchCanvas, TrainingReport } from './TrainingMatchCanvas';
import { InfrastructureTab } from './InfrastructureTab';
import { TrainingCenterTab } from './TrainingCenterTab';
import { CTRoomsTab } from './CTRoomsTab';
import { StadiumTab } from './StadiumTab';
import { YouthAcademyTab } from './YouthAcademyTab';
import { Building2, Dumbbell, Gamepad2, HeartPulse, Landmark, GraduationCap, Wrench } from 'lucide-react';
import { toast } from 'sonner';

type FacilityKey = 'trainingCenter' | 'physiotherapy' | 'youthAcademy' | 'stadium';
type SubTab = 'training' | 'training2d' | 'physio' | 'stadium' | 'youth' | 'ctrooms';

interface Props {
  // Treinos
  players: Player[];
  infrastructure: Infrastructure;
  trainingFocus: Record<string, TrainingFocusKey>;
  onSetTrainingFocus: (playerId: string, focus: TrainingFocusKey) => void;
  trainingIntensity?: Record<string, 'leve' | 'moderado' | 'pesado'>;
  onSetTrainingIntensity?: (playerId: string, intensity: 'leve' | 'moderado' | 'pesado') => void;
  tactics?: TacticsConfig;
  onPlayersUpdate?: (players: Player[]) => void;
  currentWeek?: number;
  clubName?: string;
  userId?: string;
  budget?: number;
  onUpgradeCT?: () => void;
  onUpgradeFacility?: (facility: FacilityKey) => void;
  ctRooms?: CTRooms;
  onUpgradeCTRoom?: (room: keyof CTRooms) => void;
  trainingInvestment?: number;
  onSetTrainingInvestment?: (value: number) => void;

  // Estádio
  stadiumProps?: any;

  // Categorias de Base
  youthProps?: any;

  /** Sub-aba inicial (padrão: training) */
  initialSubTab?: SubTab;
  /** Quando true, esconde o menu interno (cada aba é uma tela independente no menu principal). */
  standalone?: boolean;
}

const DRILL_BONUS_MAP: Record<string, Partial<Record<string, number>>> = {
  penalties: { shooting: 1, setPieces: 1 },
  freekicks: { setPieces: 2, shooting: 1 },
  crossing: { heading: 1, passing: 1 },
  counterattack: { speed: 1, passing: 1 },
  pressing: { marking: 1, speed: 1 },
  tactical: { passing: 1, marking: 1 },
};

export function InfrastructureWrapper({
  players, infrastructure, trainingFocus, onSetTrainingFocus,
  trainingIntensity, onSetTrainingIntensity, budget = 0, onUpgradeCT,
  tactics, onPlayersUpdate, currentWeek, clubName = 'Meu Clube', userId,
  onUpgradeFacility, ctRooms, onUpgradeCTRoom,
  trainingInvestment, onSetTrainingInvestment,
  stadiumProps, youthProps,
  initialSubTab = 'training',
  standalone = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>(initialSubTab);

  const handleTrainingFinish = useCallback((report: TrainingReport) => {
    if (!onPlayersUpdate || !report.drill) return;
    const bonuses = DRILL_BONUS_MAP[report.drill] || {};
    if (Object.keys(bonuses).length === 0) return;
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
    const updated = players.map(p => ({
      ...p,
      trainingBonuses: { ...p.trainingBonuses, ...bonuses, expiresAt },
    }));
    onPlayersUpdate(updated);
    const bonusNames = Object.entries(bonuses).map(([k, v]) => `+${v} ${k}`).join(', ');
    toast.success(`🎯 Treino 2D aplicou bônus: ${bonusNames} para o próximo jogo!`);
  }, [players, onPlayersUpdate]);

  const tabBtn = (key: SubTab, label: string, Icon: any) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
        activeTab === key
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );

  return (
    <div className="space-y-3">
      {!standalone && (
        <>
          {/* Título principal da seção */}
          <div className="flex items-center gap-2 px-1">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black uppercase tracking-wide">Infraestrutura</h2>
          </div>

          {/* Menu interno horizontal */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-muted/20 rounded-lg border border-border/30">
            {tabBtn('training', 'Treinos', Dumbbell)}
            {tabBtn('training2d', '2D', Gamepad2)}
            {tabBtn('physio', 'Fisioterapia', HeartPulse)}
            {tabBtn('stadium', 'Estádio', Landmark)}
            {tabBtn('youth', 'Base', GraduationCap)}
            {tabBtn('ctrooms', 'Salas CT', Wrench)}
          </div>
        </>
      )}

      {/* Conteúdo */}
      {activeTab === 'training' && (
        <TrainingTab
          players={players}
          infrastructure={infrastructure}
          trainingFocus={trainingFocus}
          onSetTrainingFocus={onSetTrainingFocus}
          trainingIntensity={trainingIntensity}
          onSetTrainingIntensity={onSetTrainingIntensity}
          tactics={tactics}
          onPlayersUpdate={onPlayersUpdate}
          currentWeek={currentWeek}
          userId={userId}
          budget={budget}
          onUpgradeCT={onUpgradeCT}
        />
      )}
      {activeTab === 'training2d' && (
        <TrainingMatchCanvas clubName={clubName} players={players} onFinish={handleTrainingFinish} />
      )}
      {activeTab === 'physio' && (
        <div className="space-y-4">
          <InfrastructureTab
            infrastructure={infrastructure}
            budget={budget}
            players={players}
            onUpgrade={(f) => onUpgradeFacility?.(f)}
          />
          {onUpgradeFacility && (
            <TrainingCenterTab
              infrastructure={infrastructure}
              budget={budget}
              onUpgradeFacility={onUpgradeFacility}
              trainingInvestment={trainingInvestment}
              onSetTrainingInvestment={onSetTrainingInvestment}
            />
          )}
        </div>
      )}
      {activeTab === 'stadium' && stadiumProps && (
        <StadiumTab {...stadiumProps} />
      )}
      {activeTab === 'youth' && youthProps && (
        <YouthAcademyTab {...youthProps} />
      )}
      {activeTab === 'ctrooms' && ctRooms && onUpgradeCTRoom && (
        <CTRoomsTab
          rooms={ctRooms}
          budget={budget}
          trainingCenterLevel={infrastructure?.trainingCenter?.level ?? 1}
          onUpgradeRoom={onUpgradeCTRoom}
        />
      )}
    </div>
  );
}
