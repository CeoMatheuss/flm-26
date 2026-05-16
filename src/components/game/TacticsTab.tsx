import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormationView } from './FormationView';
import { TacticsConfig } from '@/types/tactics';
import { Player } from '@/types/game';
import { ArrowLeft, Zap, Target, Shield, LayoutGrid, X } from 'lucide-react';

interface Props {
  tactics: TacticsConfig;
  players: Player[];
  onUpdate: (tactics: TacticsConfig) => void;
  onUpdatePlayers?: (players: Player[]) => void;
  season?: number;
  userId?: string;
}

export function TacticsTab({ tactics, players, onUpdate, onUpdatePlayers, season, userId }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const starters = players.slice(0, 11);

  if (!isOpen) {
    return (
      <div className="p-4">
        <Button onClick={() => setIsOpen(true)} className="bg-primary text-primary-foreground font-bold">
          Abrir Centro Tático
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('flm:navigate-to-tab', { detail: { tab: 'squad' } }))}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Elenco
            </Button>
          </div>
          <Button variant="destructive" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4 mr-2" /> Fechar Centro Tático
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-100px)]">
          {/* Campo - 75% */}
          <div className="col-span-12 lg:col-span-9 bg-slate-900/50 rounded-3xl p-4 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl">
              <FormationView
                formation={tactics.formation}
                players={players}
                captainId={tactics.captainId}
                isInteractive={false}
              />
            </div>
          </div>

          {/* Sidebar - 25% */}
          <div className="col-span-12 lg:col-span-3 space-y-4 overflow-y-auto pr-2">
             <Card className="bg-slate-900/50 border-white/5">
                <CardContent className="p-4">
                    <h3 className="font-bold uppercase text-xs text-muted-foreground mb-4">Configurações</h3>
                    <div className="space-y-4">
                        <div className="p-2 bg-black/20 rounded-lg">
                            <label className="text-[10px] text-muted-foreground">Pressão</label>
                            <p className="text-sm font-bold text-white">{tactics.pressing}</p>
                        </div>
                        <div className="p-2 bg-black/20 rounded-lg">
                            <label className="text-[10px] text-muted-foreground">Ritmo</label>
                            <p className="text-sm font-bold text-white">{tactics.tempo}</p>
                        </div>
                    </div>
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
