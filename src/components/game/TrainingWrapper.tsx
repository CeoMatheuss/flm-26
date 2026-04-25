/**
 * TrainingWrapper — Container with sub-tabs:
 *  - Treinos (rotina semanal)
 *  - Treinos 2D (drills)
 *  - Infraestrutura (Fisioterapia + Centro de Treinamento + Salas do CT)
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
import { Dumbbell, Gamepad2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

type FacilityKey = 'trainingCenter' | 'physiotherapy' | 'youthAcademy' | 'stadium';

interface Props {
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
  /** Full facility upgrade callback (Fisio + CT) — required for Infra sub-tab */
  onUpgradeFacility?: (facility: FacilityKey) => void;
  /** CT Rooms data for the rooms sub-tab */
  ctRooms?: CTRooms;
  onUpgradeCTRoom?: (room: keyof CTRooms) => void;
}

const DRILL_BONUS_MAP: Record<string, Partial<Record<string, number>>> = {
  penalties: { shooting: 1, setPieces: 1 },
  freekicks: { setPieces: 2, shooting: 1 },
  crossing: { heading: 1, passing: 1 },
  counterattack: { speed: 1, passing: 1 },
  pressing: { marking: 1, speed: 1 },
  tactical: { passing: 1, marking: 1 },
};

export function TrainingWrapper({
  players, infrastructure, trainingFocus, onSetTrainingFocus,
  trainingIntensity, onSetTrainingIntensity, budget = 0, onUpgradeCT,
  tactics, onPlayersUpdate, currentWeek, clubName = 'Meu Clube', userId,
  onUpgradeFacility, ctRooms, onUpgradeCTRoom,
}: Props) {
  const [activeTab, setActiveTab] = useState<'training' | 'training2d' | 'infra'>('training');

  const handleTrainingFinish = useCallback((report: TrainingReport) => {
    if (!onPlayersUpdate || !report.drill) return;

    const bonuses = DRILL_BONUS_MAP[report.drill] || {};
    if (Object.keys(bonuses).length === 0) return;

    const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
    const updated = players.map(p => ({
      ...p,
      trainingBonuses: {
        ...p.trainingBonuses,
        ...bonuses,
        expiresAt,
      },
    }));

    onPlayersUpdate(updated);
    const bonusNames = Object.entries(bonuses).map(([k, v]) => `+${v} ${k}`).join(', ');
    toast.success(`🎯 Treino 2D aplicou bônus: ${bonusNames} para o próximo jogo!`);
  }, [players, onPlayersUpdate]);

  const tabBtn = (key: typeof activeTab, label: string, Icon: any) => (
    <button
      onClick={() => setActiveTab(key)}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold transition-all ${
        activeTab === key
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Sub-tab selector */}
      <div className="flex gap-1 p-1 bg-muted/20 rounded-lg border border-border/30">
        {tabBtn('training', 'Treinos', Dumbbell)}
        {tabBtn('training2d', 'Treinos 2D', Gamepad2)}
        {tabBtn('infra', 'Infraestrutura', Building2)}
      </div>

      {/* Content */}
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
      {activeTab === 'infra' && (
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
            />
          )}
          {ctRooms && onUpgradeCTRoom && (
            <CTRoomsTab
              rooms={ctRooms}
              budget={budget}
              trainingCenterLevel={infrastructure?.trainingCenter?.level ?? 1}
              onUpgradeRoom={onUpgradeCTRoom}
            />
          )}
        </div>
      )}
    </div>
  );
}
