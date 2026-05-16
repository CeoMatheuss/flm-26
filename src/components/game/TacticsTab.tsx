import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormationView } from './FormationView';
import { TacticsConfig, tacticsPresets } from '@/types/tactics';
import { Player } from '@/types/game';
import { ArrowLeft, Zap, Target, Shield, LayoutGrid, X, Sparkles, Activity, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  tactics: TacticsConfig;
  players: Player[];
  onUpdate: (tactics: TacticsConfig) => void;
  onUpdatePlayers?: (players: Player[]) => void;
  onChangePosition?: (playerId: string, newPos: Player['position'], side?: 'L' | 'R' | 'C') => void;
  season?: number;
  userId?: string;
  hideSwapButton?: boolean;
}

export function TacticsTab({ tactics, players, onUpdate, onUpdatePlayers, season, userId, hideSwapButton }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  const starters = players.slice(0, 11);
  
  const getTacticalRating = () => {
    let rating = 65; // Base rating
    const avgStamina = starters.reduce((s, p) => s + p.stamina, 0) / 11;
    rating += (avgStamina / 100) * 10;
    return Math.min(100, Math.round(rating));
  };

  const setField = <K extends keyof TacticsConfig>(key: K, value: TacticsConfig[K]) => {
    onUpdate({ ...tactics, [key]: value });
  };

  if (!isOpen) {
    return (
      <div className="space-y-4">
        <Button 
          onClick={() => setIsOpen(true)} 
          className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black italic uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 rounded-2xl"
        >
          <LayoutGrid className="w-5 h-5 mr-2" />
          Abrir Centro Tático
        </Button>
        
        <Card className="bg-zinc-900/50 border-white/5 rounded-2xl overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Resumo Tático</span>
              <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-400">
                {tactics.formation}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Estilo</p>
                <p className="text-xs font-black text-white capitalize">{tactics.playStyle}</p>
              </div>
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Ritmo</p>
                <p className="text-xs font-black text-white capitalize">{tactics.tempo}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Premium Header */}
      <div className="h-20 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-6 sm:px-10 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            Voltar
          </button>
          <div className="w-[1px] h-8 bg-white/10" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tighter">Centro Tático</h1>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Football Manager Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-6 bg-white/5 px-6 py-2 rounded-2xl border border-white/10">
            <div className="text-center">
              <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">Entrosamento</p>
              <p className="text-lg font-black text-emerald-400 leading-none">{getTacticalRating()}%</p>
            </div>
            <div className="w-[1px] h-6 bg-white/10" />
            <div className="text-center">
              <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">Formação</p>
              <p className="text-lg font-black text-white leading-none">{tactics.formation}</p>
            </div>
          </div>
          <Button 
            variant="destructive" 
            onClick={() => setIsOpen(false)}
            className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-500/20"
          >
            <X className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 sm:p-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
        {/* Campo Tático - Estilo Moderno Compacto */}
        <div className="flex-1 bg-zinc-900/40 rounded-[2.5rem] border border-white/5 relative flex flex-col items-center justify-center p-4 sm:p-8 shadow-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="w-full max-w-3xl transform lg:scale-[0.9] 2xl:scale-100 transition-transform duration-500">
            <FormationView
              formation={tactics.formation}
              players={players}
              captainId={tactics.captainId}
              onSwapPlayers={onUpdatePlayers ? (idA, idB) => {
                const idxA = players.findIndex(p => p.id === idA);
                const idxB = players.findIndex(p => p.id === idB);
                if (idxA < 0 || idxB < 0) return;
                const newPlayers = [...players];
                [newPlayers[idxA], newPlayers[idxB]] = [newPlayers[idxB], newPlayers[idxA]];
                onUpdatePlayers(newPlayers);
                toast.success('Troca tática realizada!');
              } : undefined}
              isInteractive={true}
            />
          </div>

          <div className="absolute bottom-10 left-10 flex gap-4">
             <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 flex flex-col">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Qualidade Média</span>
                <span className="text-lg font-black text-white">{Math.round(starters.reduce((s,p) => s + p.overall, 0) / 11)}</span>
             </div>
             <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 flex flex-col">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Idade Média</span>
                <span className="text-lg font-black text-white">{(starters.reduce((s,p) => s + p.age, 0) / 11).toFixed(1)}</span>
             </div>
          </div>
        </div>

        {/* Painel Lateral de Ajustes - 25% Compacto */}
        <div className="w-full lg:w-[350px] 2xl:w-[400px] flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 shrink-0">
          {/* Card de Formação */}
          <Card className="bg-zinc-900/60 border-white/5 rounded-[2rem] overflow-hidden shadow-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">Sistema de Jogo</h3>
              </div>
              
              <select 
                value={tactics.formation}
                onChange={(e) => setField('formation', e.target.value as any)}
                className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl px-4 text-sm font-black text-white outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
              >
                {['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '3-4-3', '4-5-1'].map(f => (
                  <option key={f} value={f} className="bg-zinc-900">{f}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Card de Estilo e Ritmo */}
          <Card className="bg-zinc-900/60 border-white/5 rounded-[2rem] overflow-hidden shadow-xl">
            <CardContent className="p-5 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">Dinâmica</h3>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Estilo de Jogo</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['equilibrado', 'ofensivo', 'defensivo', 'posse'].map(style => (
                          <button
                            key={style}
                            onClick={() => setField('playStyle', style as any)}
                            className={cn(
                              "h-10 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border",
                              tactics.playStyle === style 
                                ? "bg-emerald-500 border-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20" 
                                : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Ritmo de Jogo</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['lento', 'normal', 'rapido', 'muito-rapido'].map(t => (
                          <button
                            key={t}
                            onClick={() => setField('tempo', t as any)}
                            className={cn(
                              "h-10 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border",
                              tactics.tempo === t 
                                ? "bg-amber-500 border-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20" 
                                : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Defesa */}
          <Card className="bg-zinc-900/60 border-white/5 rounded-[2rem] overflow-hidden shadow-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4 text-red-400" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">Sistema Defensivo</h3>
              </div>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Pressão na Bola</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['baixo', 'medio', 'alto', 'ultra-alto'].map(p => (
                        <button
                          key={p}
                          onClick={() => setField('pressing', p as any)}
                          className={cn(
                            "h-10 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border",
                            tactics.pressing === p 
                              ? "bg-red-500 border-red-400 text-zinc-950 shadow-lg shadow-red-500/20" 
                              : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Summary */}
          <div className="mt-auto pt-4">
             <div className="p-6 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-zinc-950" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Poder Tático</span>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-4xl font-black text-white tracking-tighter">{getTacticalRating()}</span>
                   <span className="text-sm font-black text-emerald-500">%</span>
                </div>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-2 leading-relaxed">
                   Baseado no entrosamento dos 11 titulares e preparo físico atual.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

