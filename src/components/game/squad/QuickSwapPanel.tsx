import { useState, useMemo } from 'react';
import { Player } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Repeat, Zap, Heart, Search } from 'lucide-react';
import { getAdaptationLevel, getAdaptationColor, positionCompatibility } from '@/utils/positionUtils';

interface QuickSwapPanelProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSwap: (playerAId: string, playerBId: string) => void;
}

export function QuickSwapPanel({ isOpen, onClose, players, onSwap }: QuickSwapPanelProps) {
  const [selectedPlayerA, setSelectedPlayerA] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlayers = useMemo(() => {
    return players.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.position.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [players, searchQuery]);

  const starters = useMemo(() => players.slice(0, 11), [players]);
  const reserves = useMemo(() => players.slice(11, 18), [players]);
  const youth = useMemo(() => players.slice(18), [players]);

  const handlePlayerSelect = (player: Player) => {
    if (!selectedPlayerA) {
      setSelectedPlayerA(player);
    } else if (selectedPlayerA.id === player.id) {
      setSelectedPlayerA(null);
    } else {
      onSwap(selectedPlayerA.id, player.id);
      setSelectedPlayerA(null);
      onClose();
    }
  };

  const PlayerRow = ({ player }: { player: Player }) => {
    const isSelected = selectedPlayerA?.id === player.id;
    const compatibility = selectedPlayerA ? (positionCompatibility[player.position]?.[selectedPlayerA.position] || 0.3) : 1.0;
    const adaptationLevel = getAdaptationLevel(compatibility);
    const adaptationColor = getAdaptationColor(adaptationLevel);

    return (
      <div 
        onClick={() => handlePlayerSelect(player)}
        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group mb-2
          ${isSelected 
            ? 'bg-primary/20 border-primary ring-1 ring-primary' 
            : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2 
            ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 bg-slate-800 text-white'}`}>
            {player.overall}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate uppercase tracking-tighter">{player.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 h-4 border-white/20 text-white/60">
                {player.position}
              </Badge>
              {selectedPlayerA && !isSelected && (
                <span className={`text-[9px] font-black uppercase ${adaptationColor}`}>
                  {adaptationLevel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <Zap className={`w-3 h-3 ${player.stamina < 50 ? 'text-red-500' : 'text-amber-400'}`} />
              <span className="text-[10px] font-black text-white/60">{player.stamina}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className={`w-3 h-3 ${player.morale < 50 ? 'text-red-500' : 'text-emerald-400'}`} />
              <span className="text-[10px] font-black text-white/60">{player.morale}%</span>
            </div>
          </div>
          {isSelected && <Repeat className="w-5 h-5 text-primary animate-spin-slow" />}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-primary/20 bg-slate-900/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-2 border-b border-white/5">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <Repeat className="w-6 h-6 text-primary" /> Troca Rápida
            </DialogTitle>
          </div>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
            {selectedPlayerA ? `Selecione o substituto para ${selectedPlayerA.name}` : 'Selecione o primeiro jogador para trocar'}
          </p>
          
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              type="text"
              placeholder="PESQUISAR JOGADOR OU POSIÇÃO..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </DialogHeader>

        <div className="p-4">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-10 bg-black/40 border-white/5 p-1 rounded-xl mb-4">
              <TabsTrigger value="all" className="text-[9px] font-black uppercase tracking-tighter rounded-lg">Todos</TabsTrigger>
              <TabsTrigger value="starters" className="text-[9px] font-black uppercase tracking-tighter rounded-lg">Titulares</TabsTrigger>
              <TabsTrigger value="reserves" className="text-[9px] font-black uppercase tracking-tighter rounded-lg">Reservas</TabsTrigger>
              <TabsTrigger value="youth" className="text-[9px] font-black uppercase tracking-tighter rounded-lg">Base</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] pr-4">
              <TabsContent value="all" className="mt-0">
                {filteredPlayers.map(p => <PlayerRow key={p.id} player={p} />)}
              </TabsContent>
              <TabsContent value="starters" className="mt-0">
                {starters.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => <PlayerRow key={p.id} player={p} />)}
              </TabsContent>
              <TabsContent value="reserves" className="mt-0">
                {reserves.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => <PlayerRow key={p.id} player={p} />)}
              </TabsContent>
              <TabsContent value="youth" className="mt-0">
                {youth.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => <PlayerRow key={p.id} player={p} />)}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <div className="p-4 bg-black/20 border-t border-white/5 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl text-xs font-black uppercase h-12 border-white/10" onClick={onClose}>
            Cancelar
          </Button>
          {selectedPlayerA && (
            <Button variant="default" className="flex-1 rounded-xl text-xs font-black uppercase h-12" onClick={() => setSelectedPlayerA(null)}>
              Limpar Seleção
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
