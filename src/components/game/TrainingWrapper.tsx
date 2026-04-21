/**
 * TrainingWrapper — Container with two sub-tabs: Treinos (regular) and Treinos 2D.
 */
import { useState, useCallback } from 'react';
import type { Player } from '@/types/game';
import type { Infrastructure } from '@/types/infrastructure';
import type { TacticsConfig } from '@/types/tactics';
import type { TrainingFocusKey } from '@/training/TrainingTypes';
import { TrainingTab } from './TrainingTab';
import { TrainingMatchCanvas, TrainingReport } from './TrainingMatchCanvas';
import { Dumbbell, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';

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
  trainingIntensity, onSetTrainingIntensity, budget, onUpgradeCT,
  tactics, onPlayersUpdate, currentWeek, clubName = 'Meu Clube', userId,
}: Props) {
  const [activeTab, setActiveTab] = useState<'training' | 'training2d'>('training');

  const handleTrainingFinish = useCallback((report: TrainingReport) => {
    if (!onPlayersUpdate || !report.drill) return;

    const bonuses = DRILL_BONUS_MAP[report.drill] || {};
    if (Object.keys(bonuses).length === 0) return;

    // Apply temporary bonuses (last 3 matches worth of time ~2h)
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

  return (
    <div className="space-y-3">
      {/* Sub-tab selector */}
      <div className="flex gap-1 p-1 bg-muted/20 rounded-lg border border-border/30">
        <button
          onClick={() => setActiveTab('training')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'training'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
        >
          <Dumbbell className="h-4 w-4" /> Treinos
        </button>
        <button
          onClick={() => setActiveTab('training2d')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'training2d'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
        >
          <Gamepad2 className="h-4 w-4" /> Treinos 2D
        </button>
      </div>

      {/* Content */}
      {activeTab === 'training' ? (
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
      ) : (
        <TrainingMatchCanvas clubName={clubName} players={players} onFinish={handleTrainingFinish} />
      )}
    </div>
  );
}
