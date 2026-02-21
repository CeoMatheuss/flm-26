import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Player } from '@/types/game';
import { generateFreeAgents } from '@/utils/playerGenerator';
import { Gift, Star, Sparkles, Zap, Crown } from 'lucide-react';
import stickerPackImg from '@/assets/sticker-pack.png';

interface PackOption {
  id: string;
  name: string;
  packs: number;
  price: number;
  playersPerPack: number;
  minOvr: number;
  maxOvr: number;
  guaranteed?: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
}

const packOptions: PackOption[] = [
  {
    id: 'basic',
    name: 'Pacote Básico',
    packs: 1,
    price: 15000,
    playersPerPack: 3,
    minOvr: 50,
    maxOvr: 68,
    icon: <Gift className="h-5 w-5" />,
    color: 'from-blue-500/20 to-blue-600/5',
    borderColor: 'border-blue-500/40',
  },
  {
    id: 'duo',
    name: 'Pacote Duplo',
    packs: 2,
    price: 30000,
    playersPerPack: 3,
    minOvr: 55,
    maxOvr: 72,
    guaranteed: '1 jogador 65+ garantido',
    icon: <Star className="h-5 w-5" />,
    color: 'from-purple-500/20 to-purple-600/5',
    borderColor: 'border-purple-500/40',
  },
  {
    id: 'premium',
    name: 'Pacote Premium',
    packs: 3,
    price: 60000,
    playersPerPack: 4,
    minOvr: 60,
    maxOvr: 78,
    guaranteed: '1 jogador 70+ garantido',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'from-amber-500/20 to-amber-600/5',
    borderColor: 'border-amber-500/40',
  },
  {
    id: 'elite',
    name: 'Pacote Elite',
    packs: 5,
    price: 120000,
    playersPerPack: 4,
    minOvr: 65,
    maxOvr: 85,
    guaranteed: '2 jogadores 75+ garantidos',
    icon: <Crown className="h-5 w-5" />,
    color: 'from-yellow-500/20 to-yellow-600/5',
    borderColor: 'border-yellow-500/40',
  },
];

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

interface Props {
  budget: number;
  onBuyPack: (players: Player[], cost: number) => void;
}

export function PacotinhosTab({ budget, onBuyPack }: Props) {
  const [openedPlayers, setOpenedPlayers] = useState<Player[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const [opening, setOpening] = useState(false);

  const handleBuyPack = (option: PackOption) => {
    if (budget < option.price) return;

    setOpening(true);
    const allPlayers: Player[] = [];

    for (let p = 0; p < option.packs; p++) {
      const generated = generateFreeAgents(option.playersPerPack);
      // Adjust OVR to be within pack range
      generated.forEach(player => {
        const rangeOvr = option.minOvr + Math.floor(Math.random() * (option.maxOvr - option.minOvr));
        const diff = rangeOvr - player.overall;
        player.overall = rangeOvr;
        // Adjust attributes proportionally
        const attrs = player.attributes as any;
        for (const key of Object.keys(attrs)) {
          if (attrs[key] != null) {
            attrs[key] = Math.max(30, Math.min(95, attrs[key] + Math.floor(diff * 0.8)));
          }
        }
      });
      allPlayers.push(...generated);
    }

    // Guarantee minimum if specified
    if (option.id === 'duo' && allPlayers.length > 0) {
      const best = allPlayers.reduce((a, b) => a.overall > b.overall ? a : b);
      if (best.overall < 65) best.overall = 65 + Math.floor(Math.random() * 5);
    }
    if (option.id === 'premium' && allPlayers.length > 0) {
      const best = allPlayers.reduce((a, b) => a.overall > b.overall ? a : b);
      if (best.overall < 70) best.overall = 70 + Math.floor(Math.random() * 5);
    }
    if (option.id === 'elite' && allPlayers.length > 1) {
      const sorted = [...allPlayers].sort((a, b) => b.overall - a.overall);
      if (sorted[0].overall < 75) sorted[0].overall = 75 + Math.floor(Math.random() * 8);
      if (sorted[1].overall < 75) sorted[1].overall = 75 + Math.floor(Math.random() * 5);
    }

    setOpenedPlayers(allPlayers);
    setRevealedIndex(-1);
    setShowResult(true);

    // Reveal animation
    let idx = 0;
    const interval = setInterval(() => {
      setRevealedIndex(idx);
      idx++;
      if (idx >= allPlayers.length) {
        clearInterval(interval);
        setOpening(false);
      }
    }, 400);

    onBuyPack(allPlayers, option.price);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" /> Pacotinhos de Figurinha
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Abra pacotinhos para descobrir novos jogadores! Os jogadores revelados são adicionados ao seu elenco.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pack image banner */}
          <div className="flex justify-center py-2">
            <img src={stickerPackImg} alt="Pacotinho" className="h-28 object-contain drop-shadow-lg" />
          </div>

          <div className="text-center text-xs text-muted-foreground">
            💰 Orçamento disponível: <span className="font-bold text-primary">R$ {(budget / 1000).toFixed(0)}k</span>
          </div>

          {/* Pack options */}
          <div className="grid grid-cols-2 gap-2">
            {packOptions.map(option => {
              const canAfford = budget >= option.price;
              return (
                <Card key={option.id} className={`overflow-hidden ${option.borderColor} border`}>
                  <CardContent className={`p-3 bg-gradient-to-br ${option.color}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      {option.icon}
                      <span className="text-xs font-bold">{option.name}</span>
                    </div>
                    
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Pacotes:</span>
                        <span className="font-semibold">{option.packs}x</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Jogadores:</span>
                        <span className="font-semibold">{option.playersPerPack}/pack</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">OVR Range:</span>
                        <span className="font-semibold">{option.minOvr}-{option.maxOvr}</span>
                      </div>
                    </div>

                    {option.guaranteed && (
                      <Badge variant="secondary" className="text-[8px] mb-2 w-full justify-center">
                        ⭐ {option.guaranteed}
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      className="w-full h-7 text-[10px] gap-1"
                      disabled={!canAfford || opening}
                      onClick={() => handleBuyPack(option)}
                    >
                      <Zap className="h-3 w-3" />
                      R$ {(option.price / 1000).toFixed(0)}k
                    </Button>
                    {!canAfford && <p className="text-[8px] text-destructive text-center mt-1">Sem orçamento</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Result dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Jogadores Revelados!
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            {openedPlayers.map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-300 ${
                  i <= revealedIndex
                    ? 'opacity-100 translate-y-0 bg-card'
                    : 'opacity-0 translate-y-4 bg-muted/20'
                } ${player.overall >= 75 ? 'border-yellow-500/50 bg-yellow-500/5' : player.overall >= 65 ? 'border-primary/30' : 'border-border'}`}
              >
                {/* OVR */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 shrink-0 ${
                  player.overall >= 80 ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' :
                  player.overall >= 70 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                  player.overall >= 60 ? 'border-primary bg-primary/10 text-primary' :
                  'border-muted-foreground bg-muted/20 text-muted-foreground'
                }`}>
                  {i <= revealedIndex ? player.overall : '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[player.position]}`}>
                      {i <= revealedIndex ? player.position : '???'}
                    </span>
                    <span className="text-xs font-semibold truncate">
                      {i <= revealedIndex ? player.name : '???'}
                    </span>
                    {i <= revealedIndex && player.overall >= 75 && <span className="text-xs">⭐</span>}
                  </div>
                  {i <= revealedIndex && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {player.age}a • 💰{(player.salary / 1000).toFixed(0)}k/mês
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {revealedIndex >= openedPlayers.length - 1 && (
            <div className="text-center pt-2">
              <p className="text-[10px] text-muted-foreground mb-2">
                Todos os jogadores foram adicionados ao seu elenco!
              </p>
              <Button size="sm" onClick={() => setShowResult(false)} className="text-xs">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
