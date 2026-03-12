/**
 * TrainingWrapper — Container with two sub-tabs: Treinos (regular) and Treinos 2D.
 */
import { useState } from 'react';
import type { Player } from '@/types/game';
import type { Infrastructure } from '@/types/infrastructure';
import type { TacticsConfig } from '@/types/tactics';
import type { TrainingFocusKey } from '@/training/TrainingTypes';
import { TrainingTab } from './TrainingTab';
import { TrainingMatchCanvas } from './TrainingMatchCanvas';
import { Dumbbell, Gamepad2 } from 'lucide-react';

interface Props {
  players: Player[];
  infrastructure: Infrastructure;
  trainingFocus: Record<string, TrainingFocusKey>;
  onSetTrainingFocus: (playerId: string, focus: TrainingFocusKey) => void;
  tactics?: TacticsConfig;
  onPlayersUpdate?: (players: Player[]) => void;
  currentWeek?: number;
  clubName?: string;
}

export function TrainingWrapper({
  players, infrastructure, trainingFocus, onSetTrainingFocus,
  tactics, onPlayersUpdate, currentWeek, clubName = 'Meu Clube',
}: Props) {
  const [activeTab, setActiveTab] = useState<'training' | 'training2d'>('training');

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
          tactics={tactics}
          onPlayersUpdate={onPlayersUpdate}
          currentWeek={currentWeek}
        />
      ) : (
        <TrainingMatchCanvas clubName={clubName} />
      )}
    </div>
  );
}
