import { useState, useMemo, useEffect } from 'react';
import { Player } from '@/types/game';
import { formatMoney } from '@/lib/formatMoney';
import { getPlayerValue } from '@/utils/playerGenerator';
import { getDynamicOverall, getAdaptationLevel, getAdaptationColor } from '@/utils/positionUtils';
import { Heart, Activity, Shield, ChevronRight, ArrowUp, ArrowDown, Search, Filter, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAttributeEvolution } from './useAttributeEvolution';
import { supabase } from '@/integrations/supabase/client';
import {
  PlayerStatus,
  statusMeta,
  ovrTier,
  positionColors,
  flagFor,
  getPlayerStatus,
  attrConfig,
  getAttrValue,
} from './squadHelpers';

interface Props {
  players: Player[];
  starterIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeTab: string;
  userId: string;
  onRest: (id: string) => void;
  pendingSwapId?: string | null;
}

export function SquadMainTable({ players, starterIds, selectedId, onSelect, activeTab, userId, onRest, pendingSwapId }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'overall' | 'name' | 'age' | 'value'>('overall');
  const [negotiations, setNegotiations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchNegotiations = async () => {
      const { data } = await supabase
        .from('player_negotiations')
        .select('player_id')
        .eq('user_id', userId)
        .eq('status', 'pending');
      
      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach(n => map[negotiationPlayerId(n.player_id)] = true);
        setNegotiations(map);
      }
    };
    fetchNegotiations();
  }, [userId, players]);

  // Helper to ensure we match player IDs correctly if they have prefixes or suffixes
  const negotiationPlayerId = (id: string) => id;

  const deltas = useAttributeEvolution(players);

  const filtered = useMemo(() => {
    return players.filter(p => {
      const isStarter = starterIds.has(p.id);
      const isNegotiating = negotiations[p.id];
      const status = getPlayerStatus(p, isStarter, isNegotiating);
      
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;

      switch (activeTab) {
        case 'titulares': return isStarter && status !== 'lesionado' && status !== 'suspenso';
        case 'reservas': return !isStarter && status === 'reserva';
        case 'fora': return status === 'afastado' || status === 'indisponivel' || status === 'lesionado' || status === 'lista-transferencia' || !!p.injury;
        case 'suspensos': return status === 'suspenso';
        case 'emprestados': return status === 'emprestado';
        default: return true;
      }
    }).sort((a, b) => {
      // Regra de Ouro: Organização fixa por posição
      const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
      const posA = posOrder.indexOf(a.position);
      const posB = posOrder.indexOf(b.position);
      
      if (posA !== posB) return posA - posB;
      
      // Sub-ordenação por sortBy
      if (sortBy === 'overall') return b.overall - a.overall;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'age') return b.age - a.age;
      if (sortBy === 'value') return getPlayerValue(b) - getPlayerValue(a);
      return 0;
    });
  }, [players, starterIds, activeTab, search, sortBy]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search & Filters */}
      <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-950/20">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            type="text"
            placeholder="Buscar jogador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs font-bold focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mr-2">Ordenar por:</span>
           <SortBtn active={sortBy === 'overall'} onClick={() => setSortBy('overall')} label="OVR" />
           <SortBtn active={sortBy === 'value'} onClick={() => setSortBy('value')} label="VALOR" />
           <SortBtn active={sortBy === 'age'} onClick={() => setSortBy('age')} label="IDADE" />
        </div>
      </div>

      {/* Table Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-950/40 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/5">
        <div className="col-span-1">#</div>
        <div className="col-span-4">Jogador / Posição</div>
        <div className="col-span-1 text-center">Idade</div>
        <div className="col-span-3 text-center">Atributos</div>
        <div className="col-span-3 text-right">Contrato / Valor</div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((p, idx) => (
            <PlayerListRow 
              key={p.id} 
              player={p} 
              idx={idx + 1}
              isStarter={starterIds.has(p.id)}
              isNegotiating={negotiations[p.id]}
              delta={deltas[p.id]?.overall || 0}
              selected={selectedId === p.id || pendingSwapId === p.id}
              isPendingSwap={pendingSwapId === p.id}
              canBeSwapped={!!pendingSwapId && pendingSwapId !== p.id}
              onRest={() => onRest(p.id)}
              onClick={() => onSelect(p.id)}
              activeTab={activeTab}
            />
          ))}
        </AnimatePresence>
        
        {filtered.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-center opacity-20">
             <Filter className="w-12 h-12 mb-4" />
             <p className="text-sm font-black uppercase italic">Nenhum jogador encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SortBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all",
        active ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20" : "bg-white/5 text-white/40 hover:bg-white/10"
      )}
    >
      {label}
    </button>
  );
}

function PlayerListRow({ player, idx, isStarter, isNegotiating, delta, selected, onClick, isPendingSwap, canBeSwapped, onRest, activeTab }: { player: Player; idx: number; isStarter: boolean; isNegotiating?: boolean; delta: number; selected: boolean; onClick: () => void; isPendingSwap?: boolean; canBeSwapped?: boolean; onRest: () => void; activeTab?: string }) {
  const tier = ovrTier(player.overall);
  const value = getPlayerValue(player);
  const status = getPlayerStatus(player, isStarter, isNegotiating);
  const sm = statusMeta[status] || statusMeta.reserva;

  // Lógica de Overall Dinâmico: Se for titular, mostrar overall da posição da escalação (se possível)
  // Como SquadMainTable não tem a formação/requirements direta, usamos heurística se estiver na aba titulares
  const showDynamic = activeTab === 'titulares' && isStarter;
  // Simplificação: No PlayerRow da lista, mantemos o Overall Base, mas adicionamos o indicador de adaptação se for o caso.
  // No FLM, a tela de elenco foca no valor intrínseco, a tela Tática foca no dinâmico.
  // Porém, o prompt pede "O overall mostrado no campo deve mudar automaticamente", o que já fizemos no FormationView.
  // Para a lista, vamos adicionar o badge de adaptação.

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3 sm:gap-4 px-4 py-3 sm:py-3 transition-all duration-300 group relative overflow-hidden",
        selected 
          ? (isPendingSwap ? "bg-primary/20 border-primary ring-2 ring-primary/50 animate-pulse" : "bg-emerald-500/10 border-emerald-500/30 shadow-xl")
          : (canBeSwapped ? "bg-white/[0.05] border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10")
      )}
    >
      {/* Decorative Glow */}
      <div className={cn("absolute inset-y-0 left-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity", tier.bg.split(' ')[0])} />

      {/* Shirt Number / Index */}
      <div className="hidden sm:flex col-span-1 items-center gap-2">
        <span className="text-[10px] font-black text-white/20 italic tracking-tighter">
          {player.shirtNumber ? String(player.shirtNumber).padStart(2, '0') : String(idx).padStart(2, '0')}
        </span>
      </div>

      {/* Name & Position */}
      <div className="col-span-11 sm:col-span-4 flex items-center gap-3">
          <div className={cn(
            "shrink-0 w-11 h-11 rounded-xl border-2 flex items-center justify-center font-black italic relative overflow-hidden",
            tier.ring, tier.glow, "bg-zinc-950/80"
          )}>
            <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", tier.bg)} />
            <span className={cn("text-lg z-10 font-black", tier.color)}>{player.overall}</span>
            {delta !== 0 && (
               <span className="absolute -top-1 -right-1 p-0.5 z-10">
                 {delta > 0 ? (
                   <ArrowUp className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                 ) : (
                   <ArrowDown className="w-3.5 h-3.5 text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                 )}
               </span>
            )}
          </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white truncate sm:overflow-visible sm:whitespace-normal group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
              {player.name}
            </span>
            <span className="text-sm">{flagFor((player as any).country)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
             <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest", positionColors[player.position])}>
               {player.position}
             </span>
             {player.potential && player.potential >= 88 && (
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">💎 JOIA</span>
             )}
             <span className={cn("text-[8px] font-black uppercase tracking-widest opacity-60", sm.color)}>
               {sm.label}
             </span>
          </div>
        </div>
      </div>

      {/* Age */}
      <div className="hidden sm:block col-span-1 text-center">
        <span className="text-xs font-bold text-white/50">{player.age}a</span>
      </div>

      {/* Attributes (Compact Row View) */}
      <div className="col-span-3 hidden lg:flex items-center justify-center gap-4">
        {attrConfig.slice(0, 4).map(attr => {
          const { value: val } = getAttrValue(player, attr.from as any);
          return (
            <div key={attr.key} className="flex flex-col items-center min-w-[32px]">
              <span className="text-[8px] font-black text-white/20 uppercase mb-0.5">{attr.key}</span>
              <span className={cn(
                "text-[10px] font-black tabular-nums italic",
                val >= 80 ? 'text-emerald-400' : val >= 60 ? 'text-sky-400' : 'text-red-400'
              )}>{val}</span>
            </div>
          );
        })}
        <div className="h-6 w-px bg-white/5 mx-1" />
        <MiniStat value={player.stamina} icon={<Activity className="w-3 h-3" />} color="text-emerald-400" label="FIS" onRest={onRest} />
      </div>

      {/* Contract & Market Value */}
      <div className="col-span-11 sm:col-span-4 flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-white/80 italic">{formatMoney(player.salary)}<span className="text-[8px] opacity-40">/sem</span></span>
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{player.contract} Anos</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-emerald-400 italic leading-none whitespace-nowrap">{formatMoney(value)}</span>
            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.1em] mt-1">Mkt Value</span>
          </div>
          <ChevronRight className={cn("w-4 h-4 text-white/10 group-hover:text-emerald-400 transition-all group-hover:translate-x-1", isPendingSwap && "text-primary animate-bounce")} />
        </div>
      </div>
    </motion.button>
  );
}

function MiniStat({ value, icon, color, label, onRest }: { value: number; icon: React.ReactNode; color: string; label?: string; onRest?: () => void }) {
  const v = Math.round(value || 0);
  return (
    <div className="flex items-center gap-1.5 min-w-[40px] group/stat">
      <div 
        className={cn(color, "opacity-50 cursor-pointer hover:opacity-100 hover:scale-110 transition-all")}
        onClick={(e) => {
          e.stopPropagation();
          onRest?.();
        }}
      >
        {icon}
      </div>
      <div className="flex flex-col">
        {label && <span className="text-[7px] font-black text-white/20 uppercase tracking-tighter -mb-0.5">{label}</span>}
        <span className={cn("text-[10px] font-black tabular-nums", v < 40 ? 'text-red-400' : v < 70 ? 'text-amber-400' : 'text-white/80')}>
          {v}
        </span>
      </div>
    </div>
  );
}
