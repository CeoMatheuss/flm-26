import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Player } from '@/types/game';
import { generateFreeAgents } from '@/utils/playerGenerator';
import { Gift, Star, Sparkles, Crown, Lock, Unlock, Zap, HelpCircle } from 'lucide-react';
import stickerPackImg from '@/assets/sticker-pack.png';
import { supabase } from '@/integrations/supabase/client';
import { useLiveMatchGuard } from './LiveMatchGuard';

interface PackOption {
  id: string;
  name: string;
  quantity: number;
  price: number;
  discount?: number;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  premium?: boolean;
  minOvr: number;
  maxOvr: number;
}

const packOptions: PackOption[] = [
  {
    id: 'basic',
    name: 'Básico',
    quantity: 1,
    price: 10000,
    minOvr: 50,
    maxOvr: 65,
    icon: <Gift className="h-5 w-5" />,
    color: 'from-blue-500/20 to-blue-600/5',
    borderColor: 'border-blue-500/40',
  },
  {
    id: 'duplo',
    name: 'Duplo',
    quantity: 2,
    price: 18000,
    minOvr: 52,
    maxOvr: 70,
    icon: <Star className="h-5 w-5" />,
    color: 'from-purple-500/20 to-purple-600/5',
    borderColor: 'border-purple-500/40',
  },
  {
    id: 'premium',
    name: 'Premium',
    quantity: 4,
    price: 35000,
    minOvr: 55,
    maxOvr: 75,
    icon: <Sparkles className="h-5 w-5" />,
    color: 'from-amber-500/20 to-amber-600/5',
    borderColor: 'border-amber-500/40',
  },
  {
    id: 'elite',
    name: 'Elite',
    quantity: 6,
    price: 60000,
    discount: 20,
    premium: true,
    minOvr: 58,
    maxOvr: 80,
    icon: <Crown className="h-5 w-5" />,
    color: 'from-yellow-500/20 to-yellow-600/5',
    borderColor: 'border-yellow-500/40',
  },
];

const ATTR_LABELS: { key: string; label: string; emoji: string }[] = [
  { key: 'speed', label: 'Velocidade', emoji: '⚡' },
  { key: 'shooting', label: 'Finalização', emoji: '🎯' },
  { key: 'passing', label: 'Passe', emoji: '🎯' },
  { key: 'defending', label: 'Defesa', emoji: '🛡️' },
  { key: 'physical', label: 'Físico', emoji: '💪' },
  { key: 'dribbling', label: 'Drible', emoji: '🏃' },
  { key: 'setPieces', label: 'Bola Parada', emoji: '🎱' },
  { key: 'positioning', label: 'Posicionamento', emoji: '📍' },
  { key: 'heading', label: 'Cabeceio', emoji: '🤕' },
  { key: 'marking', label: 'Marcação', emoji: '🔒' },
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
  userId?: string;
}

type RevealPhase = 'closed' | 'opening' | 'player-reveal' | 'done';

export function PacotinhosTab({ budget, onBuyPack: _onBuyPack, userId }: Props) {
  const { guard } = useLiveMatchGuard();
  const onBuyPack = guard(_onBuyPack);
  const [showResult, setShowResult] = useState(false);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('closed');
  const [generatedPlayers, setGeneratedPlayers] = useState<Player[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [revealedAttrCount, setRevealedAttrCount] = useState(0);
  const [packShake, setPackShake] = useState(false);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const currentPlayer = generatedPlayers[currentPlayerIdx];

  const generatePackPlayer = useCallback((minOvr: number, maxOvr: number): Player => {
    const [base] = generateFreeAgents(1);
    const ovr = minOvr + Math.floor(Math.random() * (maxOvr - minOvr + 1));
    const diff = ovr - base.overall;
    base.overall = ovr;
    base.age = 17;
    const attrs = base.attributes as any;
    for (const key of Object.keys(attrs)) {
      if (attrs[key] != null) {
        attrs[key] = Math.max(30, Math.min(85, attrs[key] + Math.floor(diff * 0.8)));
      }
    }
    return base;
  }, []);

  const handleBuyPack = (option: PackOption) => {
    const finalPrice = option.discount
      ? Math.floor(option.price * (1 - option.discount / 100))
      : option.price;
    if (budget < finalPrice) return;

    const players: Player[] = [];
    for (let i = 0; i < option.quantity; i++) {
      players.push(generatePackPlayer(option.minOvr, option.maxOvr));
    }

    setGeneratedPlayers(players);
    setCurrentPlayerIdx(0);
    setRevealedAttrCount(0);
    setRevealPhase('opening');
    setShowResult(true);
    setPackShake(true);

    // Shake animation then transition to reveal
    setTimeout(() => {
      setPackShake(false);
      setRevealPhase('player-reveal');
      // Start attribute reveal
      startAttrReveal(0);
    }, 1500);

    // Activate premium for ANY pack purchase (30 days from now)
    if (userId) {
      const activatePremium = async () => {
        // Check if already has active premium
        const { data: existing } = await supabase.from('premium_users')
          .select('id').eq('user_id', userId).eq('status', 'active').maybeSingle();
        if (existing) {
          // Renew: update activated_at to now
          await supabase.from('premium_users').update({ activated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('premium_users').insert([{ user_id: userId, status: 'active' }]);
        }
        setIsPremiumUnlocked(true);
      };
      activatePremium();
    }

    onBuyPack(players, finalPrice);
  };

  const startAttrReveal = (startFrom: number) => {
    setRevealedAttrCount(startFrom);
    let count = startFrom;
    const interval = setInterval(() => {
      count++;
      setRevealedAttrCount(count);
      if (count >= ATTR_LABELS.length) {
        clearInterval(interval);
      }
    }, 350);
  };

  const handleNextPlayer = () => {
    const next = currentPlayerIdx + 1;
    if (next < generatedPlayers.length) {
      setCurrentPlayerIdx(next);
      setRevealedAttrCount(0);
      startAttrReveal(0);
    } else {
      setRevealPhase('done');
    }
  };

  const handleClose = () => {
    setShowResult(false);
    setRevealPhase('closed');
    setGeneratedPlayers([]);
    setCurrentPlayerIdx(0);
    setRevealedAttrCount(0);
  };

  const getOvrColor = (ovr: number) => {
    if (ovr >= 70) return 'text-yellow-400 border-yellow-500';
    if (ovr >= 60) return 'text-emerald-400 border-emerald-500';
    return 'text-primary border-primary';
  };

  const getAttrColor = (val: number) => {
    if (val >= 75) return 'bg-yellow-500';
    if (val >= 65) return 'bg-emerald-500';
    if (val >= 55) return 'bg-primary';
    return 'bg-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" /> Pacotinhos de Figurinha
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto" onClick={() => setShowHelp(true)}>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Todos os jogadores têm <span className="font-bold text-primary">17 anos</span>. Abra e descubra atributo por atributo!
          </p>
          <div className="mt-1 flex items-center gap-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1.5">
            <Crown className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            <span className="text-[10px] text-yellow-300 font-semibold">
              Compre qualquer pacotinho e ganhe <span className="text-yellow-400">PREMIUM por 30 dias!</span>
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-center py-2">
            <img src={stickerPackImg} alt="Pacotinho" className="h-28 object-contain drop-shadow-lg" />
          </div>

          <div className="text-center text-xs text-muted-foreground">
            💰 Orçamento: <span className="font-bold text-primary">R$ {(budget / 1000).toFixed(0)}k</span>
          </div>

          {isPremiumUnlocked && (
            <div className="text-center">
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-[10px]">
                <Crown className="h-3 w-3 mr-1" /> PREMIUM ATIVADO! (30 dias)
              </Badge>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {packOptions.map(option => {
              const finalPrice = option.discount
                ? Math.floor(option.price * (1 - option.discount / 100))
                : option.price;
              const canAfford = budget >= finalPrice;

              return (
                <Card key={option.id} className={`overflow-hidden ${option.borderColor} border`}>
                  <CardContent className={`p-3 bg-gradient-to-br ${option.color}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      {option.icon}
                      <span className="text-xs font-bold">{option.name}</span>
                      {option.premium && (
                        <Badge variant="secondary" className="text-[7px] px-1 py-0 ml-auto">
                          👑 PREMIUM
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 mb-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Jogadores:</span>
                        <span className="font-semibold">{option.quantity}x</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Idade:</span>
                        <span className="font-semibold">17 anos</span>
                      </div>
                    </div>

                    {option.discount && (
                      <Badge className="text-[8px] mb-2 w-full justify-center bg-red-500/20 text-red-400 border-red-500/40">
                        🔥 LANÇAMENTO -{option.discount}% OFF
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      className="w-full h-7 text-[10px] gap-1"
                      disabled={!canAfford || revealPhase !== 'closed'}
                      onClick={() => handleBuyPack(option)}
                    >
                      <Zap className="h-3 w-3" />
                      {option.discount ? (
                        <>
                          <span className="line-through opacity-50 mr-1">R${(option.price / 1000).toFixed(0)}k</span>
                          R${(finalPrice / 1000).toFixed(0)}k
                        </>
                      ) : (
                        <>R$ {(finalPrice / 1000).toFixed(0)}k</>
                      )}
                    </Button>
                    {!canAfford && <p className="text-[8px] text-destructive text-center mt-1">Sem orçamento</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reveal Dialog */}
      <Dialog open={showResult} onOpenChange={(open) => { if (!open && revealPhase === 'done') handleClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {revealPhase === 'opening' && 'Abrindo pacote...'}
              {revealPhase === 'player-reveal' && `Jogador ${currentPlayerIdx + 1}/${generatedPlayers.length}`}
              {revealPhase === 'done' && 'Pacote completo!'}
            </DialogTitle>
          </DialogHeader>

          {/* Opening animation */}
          {revealPhase === 'opening' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <img
                src={stickerPackImg}
                alt="Abrindo..."
                className={`h-36 object-contain drop-shadow-2xl transition-transform ${packShake ? 'animate-[shake_0.15s_ease-in-out_infinite]' : ''}`}
                style={packShake ? {} : { transform: 'scale(1.1)' }}
              />
              <p className="text-xs text-muted-foreground animate-pulse">Rasgando o pacote...</p>
            </div>
          )}

          {/* Player attribute reveal */}
          {revealPhase === 'player-reveal' && currentPlayer && (
            <div className="space-y-3">
              {/* Player header */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 shrink-0 ${getOvrColor(currentPlayer.overall)} bg-background`}>
                  {revealedAttrCount >= ATTR_LABELS.length ? currentPlayer.overall : '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[currentPlayer.position]}`}>
                      {currentPlayer.position}
                    </span>
                    <span className="text-sm font-bold truncate">{currentPlayer.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">17 anos • Promessa</p>
                </div>
              </div>

              {/* Attributes reveal */}
              <div className="space-y-1.5">
                {ATTR_LABELS.map((attr, i) => {
                  const val = (currentPlayer.attributes as any)[attr.key];
                  const isRevealed = i < revealedAttrCount;

                  return (
                    <div
                      key={attr.key}
                      className={`flex items-center gap-2 p-1.5 rounded transition-all duration-300 ${
                        isRevealed ? 'opacity-100 bg-card border border-border' : 'opacity-40 bg-muted/20 border border-transparent'
                      }`}
                    >
                      <span className="text-xs w-5 text-center">
                        {isRevealed ? <Unlock className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3 text-muted-foreground" />}
                      </span>
                      <span className="text-[10px] w-24 truncate">
                        {attr.emoji} {attr.label}
                      </span>
                      <div className="flex-1">
                        {isRevealed ? (
                          <div className="flex items-center gap-2">
                            <Progress value={val} className="h-2 flex-1" />
                            <span className={`text-[10px] font-bold min-w-[24px] text-right ${
                              val >= 70 ? 'text-yellow-400' : val >= 60 ? 'text-emerald-400' : 'text-muted-foreground'
                            }`}>
                              {val}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-muted" />
                            <span className="text-[10px] text-muted-foreground">???</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Next / finish button */}
              {revealedAttrCount >= ATTR_LABELS.length && (
                <div className="pt-2 flex justify-center">
                  <Button size="sm" onClick={handleNextPlayer} className="text-xs gap-1">
                    {currentPlayerIdx + 1 < generatedPlayers.length ? (
                      <>Próximo Jogador <Sparkles className="h-3 w-3" /></>
                    ) : (
                      <>Finalizar <Crown className="h-3 w-3" /></>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {revealPhase === 'done' && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground mb-3">
                  {generatedPlayers.length} jogadores de 17 anos adicionados ao elenco!
                </p>
                <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                  {generatedPlayers.map(p => (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded border bg-card text-xs">
                      <span className={`font-bold ${p.overall >= 70 ? 'text-yellow-400' : p.overall >= 60 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {p.overall}
                      </span>
                      <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
                      <span className="font-semibold truncate">{p.name}</span>
                      {p.overall >= 70 && <span>⭐</span>}
                    </div>
                  ))}
                </div>
              </div>
              {isPremiumUnlocked && (
                <div className="text-center">
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-[10px]">
                    👑 PREMIUM ATIVADO! Válido por 30 dias
                  </Badge>
                </div>
              )}
              <div className="text-center">
                <Button size="sm" onClick={handleClose} className="text-xs">Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" /> Como funcionam os Pacotinhos?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>🎁 Cada pacotinho contém <span className="font-bold text-foreground">jogadores promessas de 17 anos</span> com atributos aleatórios que são revelados um a um!</p>
            
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border">
              <p className="font-bold text-foreground text-[11px]">📈 Quanto melhor o pacote, maiores as chances!</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Gift className="h-3 w-3 text-blue-400 shrink-0" />
                  <span><span className="font-semibold text-foreground">Básico</span> — Jogadores comuns, bom para começar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-purple-400 shrink-0" />
                  <span><span className="font-semibold text-foreground">Duplo</span> — Chances melhores de jogadores bons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                  <span><span className="font-semibold text-foreground">Premium</span> — Alta chance de promessas fortes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="h-3 w-3 text-yellow-400 shrink-0" />
                  <span><span className="font-semibold text-foreground">Elite</span> — As melhores chances! Pode vir craque ⭐</span>
                </div>
              </div>
            </div>

            <p>⚡ Pacotes mais caros têm <span className="font-bold text-primary">ranges de OVR mais altos</span>, ou seja, a probabilidade de vir um jogador forte é muito maior!</p>
            
            <p>👑 Comprando o pacote <span className="font-bold text-yellow-400">Elite</span>, você desbloqueia o status <span className="font-bold text-yellow-400">Premium</span>!</p>
            
            <p>🔥 O Elite está com <span className="font-bold text-red-400">20% de desconto</span> de lançamento — aproveite!</p>
          </div>
          <div className="text-center pt-1">
            <Button size="sm" onClick={() => setShowHelp(false)} className="text-xs">Entendi!</Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-6px) rotate(-3deg); }
          50% { transform: translateX(6px) rotate(3deg); }
          75% { transform: translateX(-4px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
