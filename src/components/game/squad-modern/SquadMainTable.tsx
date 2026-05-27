import { useState, useMemo, useEffect } from 'react';
import { Player } from '@/types/game';
import { formatMoney } from '@/lib/formatMoney';
import { getPlayerValue } from '@/utils/playerGenerator';
import { getDynamicOverall, getAdaptationLevel, getAdaptationColor } from '@/utils/positionUtils';
import { Heart, Activity, Shield, ChevronRight, ArrowUp, ArrowDown, Search, Filter, Clock, AlertTriangle, Tag, Handshake, ArrowLeftRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAttributeEvolution } from './useAttributeEvolution';
import { supabase } from '@/integrations/supabase/client';
import swapIcon from '@/assets/swap-icon.png';
import { usePlayerHighlight } from '@/contexts/PlayerHighlightContext';
import {
  PlayerStatus,
  statusMeta,
  ovrTier,
  getPositionColor,
  flagFor,
  getPlayerStatus,
  attrConfig,
  getAttrValue,
} from './squadHelpers';

interface Props {
  players: Player[];
  starterIds: Set<string>;
  benchIds?: Set<string>; // Adicionado para filtrar exatamente 11 reservas
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeTab: string;
  userId: string;
  onRest: (id: string) => void;
  pendingSwapId?: string | null;
  onOpenQuickSwap?: () => void;
}

export function SquadMainTable({ players, starterIds, benchIds, selectedId, onSelect, activeTab, userId, onRest, pendingSwapId, onOpenQuickSwap }: Props) {
  const { highlights, removeHighlight } = usePlayerHighlight();
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
      const raw = p as any;
      const ss = raw.squad_status as string | undefined;
      const isStarter = starterIds.has(p.id) || ss === 'starter';
      const isBench = benchIds?.has(p.id) || ss === 'bench';
      const isNegotiating = negotiations[p.id];
      const status = getPlayerStatus(p, isStarter, isNegotiating);
      const isBaseYouth = !!raw.isYouth && raw.contractStatus !== 'profissional';

      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;

      // Unavailable status takes precedence over any tab classification.
      const unavailable =
        status === 'lesionado' || status === 'suspenso' || status === 'emprestado' ||
        status === 'lista-transferencia' || status === 'afastado' || status === 'indisponivel' || !!p.injury;

      switch (activeTab) {
        case 'titulares':
          return isStarter && !unavailable;
        case 'reservas':
          // Apenas os 11 reservas oficiais disponíveis
          return isBench && !unavailable;
        case 'fora':
          // Qualquer um que não seja titular nem reserva oficial, OU que esteja indisponível
          // Corrigido: remover filtro que escondia jogadores sem contractStatus 'profissional'
          return (!isStarter && !isBench) || unavailable;
        case 'suspensos':
          return status === 'suspenso';
        case 'emprestados':
          return status === 'emprestado' || status === 'recebido-emprestimo';
        default:
          return true;
      }
    }).sort((a, b) => {
      // Regra de Ouro 0: Destaques temporários no topo
      const isAHighlighted = !!highlights[a.id];
      const isBHighlighted = !!highlights[b.id];
      if (isAHighlighted && !isBHighlighted) return -1;
      if (!isAHighlighted && isBHighlighted) return 1;

      // Regra de Ouro 1: Organização fixa por posição
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
  }, [players, starterIds, activeTab, search, sortBy, negotiations, highlights]);

  return (
    <div className={cn(
      "flex flex-col h-full overflow-hidden min-w-[700px] bg-zinc-950/20 rounded-[2rem] transition-all duration-500",
      pendingSwapId && "ring-4 ring-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)] bg-emerald-500/10"
    )}>
      {/* Filters */}
      <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-950/20">
        <div className="relative w-full sm:w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar jogador..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all"
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
      <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-zinc-950/40 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/5 items-center">
        {activeTab === 'emprestados' ? (
          <>
            <div className="col-span-1">#</div>
            <div className="col-span-1 text-center">OVR</div>
            <div className="col-span-3">Jogador / Origem</div>
            <div className="col-span-2 text-center">Destino</div>
            <div className="col-span-2 text-center">Duração</div>
            <div className="col-span-3 text-right">Situação</div>
          </>
        ) : (
          <>
            <div className="col-span-1">#</div>
            <div className="col-span-1 text-center">OVR</div>
            <div className="col-span-3">Jogador / Posição</div>
            <div className="col-span-1 text-center">País</div>
            <div className="col-span-1 text-center">Idade</div>
            <div className="col-span-2 text-center">Atributos</div>
            <div className="col-span-3 text-right">Contrato / Valor</div>
          </>
        )}
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
              onClick={() => {
                if (pendingSwapId) {
                  // Se já houver uma troca pendente, realizar a troca
                  // @ts-ignore - handleSwap exists in parent context but we invoke handleSelect here
                  onSelect(p.id);
                } else {
                  // Caso contrário, abrir o painel ou iniciar troca rápida
                  // @ts-ignore
                  onSelect(p.id);
                }
              }}
              onSwapAction={(e) => {
                e.stopPropagation();
                // Dispara o evento de início de troca para o pai capturar
                window.dispatchEvent(new CustomEvent('flm:start-swap', { detail: { player: p } }));
              }}
              onOpenQuickSwap={onOpenQuickSwap}
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

function PlayerListRow({ player, idx, isStarter, isNegotiating, delta, selected, onClick, onSwapAction, isPendingSwap, canBeSwapped, onRest, activeTab, onOpenQuickSwap }: { player: Player; idx: number; isStarter: boolean; isNegotiating?: boolean; delta: number; selected: boolean; onClick: () => void; onSwapAction?: (e: any) => void; isPendingSwap?: boolean; canBeSwapped?: boolean; onRest: () => void; activeTab?: string; onOpenQuickSwap?: () => void }) {
  const { highlights, removeHighlight } = usePlayerHighlight();
  const highlight = highlights[player.id];
  const tier = ovrTier(player.overall);
  const value = getPlayerValue(player);

  const status = getPlayerStatus(player, isStarter, isNegotiating);
  const sm = statusMeta[status] || statusMeta.reserva;

  const isForSale = player.onTransferList || status === 'lista-transferencia' || highlight?.type === 'listed_sale';
  const isForLoan = player.onLoanList || status === 'lista-emprestimo' || highlight?.type === 'listed_loan';
  const isLoanedOut = (player.isLoaned && !player.isReceivedLoan) || status === 'emprestado';
  const isLoanedIn = player.isReceivedLoan || status === 'recebido-emprestimo';

  const badgeLabels: Record<string, string> = {
    new_signing: 'NOVO REFORÇO',
    listed_loan: 'DISPONÍVEL P/ EMPRÉSTIMO',
    transferred: 'TRANSFERIDO',
    listed_sale: 'À VENDA'
  };

  // Badge "NOVO REFORÇO" - destaque temporário (7 dias)
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const isNewSigning = !!player.signedAt && (Date.now() - player.signedAt) < SEVEN_DAYS;
  const signingMetaMap: Record<string, { label: string; cls: string; tooltip: string }> = {
    free_agent: { label: '🎁 JOGADOR LIVRE', cls: 'bg-amber-500/20 border-amber-500/40 text-amber-300', tooltip: 'Contratado sem custo de transferência' },
    buy_now: { label: '⚡ COMPRA IMEDIATA', cls: 'bg-teal-500/20 border-teal-500/40 text-teal-300', tooltip: 'Adquirido via compra imediata' },
    auction: { label: '✨ LEILÃO', cls: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300', tooltip: 'Vencido em leilão' },
    transfer: { label: '✨ NOVO REFORÇO', cls: 'bg-sky-500/20 border-sky-500/40 text-sky-300', tooltip: 'Reforço chegou ao elenco' },
    loan_in: { label: '🤝 NOVO EMPRÉSTIMO', cls: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300', tooltip: 'Chegou por empréstimo' },
  };
  const signingMeta = player.signingType ? signingMetaMap[player.signingType] : signingMetaMap.transfer;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3 sm:gap-4 px-4 py-3 sm:py-3 transition-all duration-300 group relative overflow-hidden min-h-[80px]",
        highlight
          ? (highlight.type === 'listed_sale' || highlight.type === 'new_signing' ? "bg-amber-400/10 border-amber-400 ring-2 ring-amber-400/50 z-50 shadow-[0_0_30px_rgba(245,158,11,0.2)]" : "bg-cyan-400/10 border-cyan-400 ring-2 ring-cyan-400/50 z-50 shadow-[0_0_30px_rgba(34,211,238,0.2)]")
          : selected 
            ? (isPendingSwap ? "bg-primary/20 border-primary ring-2 ring-primary/50 animate-pulse" : "bg-emerald-500/10 border-emerald-500/30 shadow-xl")
            : (canBeSwapped ? "bg-white/[0.05] border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"),
        isForSale && !highlight && "border-emerald-500/40 bg-emerald-500/[0.03] shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]",
        isForLoan && !highlight && "border-cyan-500/40 bg-cyan-500/[0.03]",
        isLoanedIn && "border-indigo-500/40 bg-indigo-500/[0.03]",
        isLoanedOut && "border-zinc-500/40 bg-zinc-500/[0.03] opacity-80"
      )}
    >
      {highlight && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            "absolute inset-0 pointer-events-none z-0",
            highlight.type === 'listed_sale' || highlight.type === 'new_signing' ? "bg-amber-400" : "bg-cyan-400"
          )}
        />
      )}

      {highlight && (
        <div className="absolute top-1 right-1 z-50">
          <button 
            onClick={(e) => { e.stopPropagation(); removeHighlight(player.id); }}
            className="p-1 rounded-full bg-black/50 hover:bg-black/80 text-white/70 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {/* Decorative Glow & Visual Identity */}
      {(isForSale || isForLoan || isLoanedIn) && (
        <div className={cn(
          "absolute inset-y-0 left-0 w-1",
          isForSale ? "bg-emerald-500" : isForLoan ? "bg-cyan-500" : "bg-indigo-500"
        )} />
      )}
      
      {/* Shirt Number / Index */}
      <div className="hidden sm:flex col-span-1 items-center justify-center">
        <span className="text-[10px] font-black text-white/20 italic tracking-tighter">
          {player.shirtNumber ? String(player.shirtNumber).padStart(2, '0') : String(idx).padStart(2, '0')}
        </span>
      </div>

      {/* Overall */}
      <div className="hidden sm:flex col-span-1 items-center justify-center">
        <div className={cn(
          "shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black italic relative overflow-hidden shadow-lg",
          tier.ring, tier.glow, "bg-zinc-950/80"
        )}>
          <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", tier.bg)} />
          <span className={cn("text-base z-10 font-black", tier.color)}>{player.overall}</span>
          {delta !== 0 && (
             <span className="absolute -top-1 -right-1 p-0.5 z-10">
               {delta > 0 ? (
                 <ArrowUp className="w-3 h-3 text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
               ) : (
                 <ArrowDown className="w-3 h-3 text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
               )}
             </span>
          )}
        </div>
      </div>

      {/* Name & Position */}
      <div className="col-span-11 sm:col-span-3 flex items-center gap-3">
        {/* Mobile-only Overall */}
        <div className={cn(
          "sm:hidden shrink-0 w-11 h-11 rounded-xl border-2 flex items-center justify-center font-black italic relative overflow-hidden",
          tier.ring, tier.glow, "bg-zinc-950/80"
        )}>
          <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", tier.bg)} />
          <span className={cn("text-lg z-10 font-black", tier.color)}>{player.overall}</span>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 max-w-full">
            <span className="text-sm sm:text-base font-black text-white truncate group-hover:text-emerald-400 transition-colors uppercase tracking-tighter block">
              {player.name}
            </span>
            {activeTab !== 'emprestados' && (
              <span className="text-[14px] flex items-center gap-1.5 shrink-0">
                {flagFor((player as any).country || player.nationality)}
                <button
                  onClick={(e) => {
                    if (onSwapAction) {
                      onSwapAction(e);
                    } else {
                      e.stopPropagation();
                      onOpenQuickSwap?.();
                    }
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-110 bg-black/20 backdrop-blur-sm border border-white/5",
                    isPendingSwap && "animate-pulse ring-1 ring-red-500/40 bg-red-500/10"
                  )}
                  title={isPendingSwap ? "Cancelar Troca" : "Substituir Jogador"}
                >
                  {isPendingSwap ? (
                    <span className="text-white font-bold">✖</span>
                  ) : (
                    <ArrowLeftRight className={cn(
                      "w-4 h-4 transition-colors drop-shadow-sm",
                      isStarter ? "text-emerald-400" : "text-zinc-400"
                    )} />
                  )}
                </button>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest", getPositionColor(player.position))}>
               {player.position}
             </span>
             {activeTab === 'emprestados' && (
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate max-w-[120px]">
                 {player.loanedFrom || 'Dono desconhecido'}
               </span>
             )}
             {player.potential && player.potential >= 88 && (
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">💎 JOIA</span>
             )}
             
             {/* Dynamic Status Badges */}
             {!isLoanedIn && !isLoanedOut && player.contract <= 1 && (
               <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-[8px] font-black text-red-400 uppercase tracking-widest animate-bounce">
                 <Clock className="w-2.5 h-2.5" /> RENOVAR AGORA
               </span>
             )}
              {highlight ? (
                <span className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest animate-pulse z-10 shadow-sm",
                  highlight.type === 'listed_sale' || highlight.type === 'new_signing' ? "bg-amber-400 text-black border-amber-500" : "bg-cyan-400 text-black border-cyan-500"
                )}>
                  {badgeLabels[highlight.type]}
                </span>
              ) : isForSale && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[8px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                  <Tag className="w-2.5 h-2.5" /> À VENDA
                </span>
              )}
              {isForLoan && !highlight && (
               <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-[8px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">
                 <ArrowLeftRight className="w-2.5 h-2.5" /> EMPRÉSTIMO
               </span>
             )}
             {isLoanedIn && (
               <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                 <Handshake className="w-2.5 h-2.5" /> EMP. RECEBIDO {player.loanedFrom && `(${player.loanedFrom})`}
               </span>
             )}
             {isLoanedOut && (
               <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-500/20 border border-zinc-500/40 text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                 <ArrowLeftRight className="w-2.5 h-2.5" /> EMPRESTADO {player.loanedTo && `→ ${player.loanedTo}`}
               </span>
             )}
             {isNewSigning && signingMeta && (
               <motion.span
                 initial={{ scale: 0, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                 title={signingMeta.tooltip + (player.signedFromClub ? ` • Origem: ${player.signedFromClub}` : '')}
                 className={cn('flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest animate-pulse', signingMeta.cls)}
               >
                 {signingMeta.label}
               </motion.span>
             )}

             <span className={cn("text-[8px] font-black uppercase tracking-widest opacity-60", sm.color)}>
               {sm.label}
             </span>
          </div>
        </div>
      </div>

      {/* Conditional Middle Columns */}
      {activeTab === 'emprestados' ? (
        <>
          {/* Destination */}
          <div className="hidden sm:flex col-span-2 items-center justify-center">
            <span className="text-[11px] font-black text-white uppercase tracking-wider truncate">
              {player.loanedTo || 'Mercado'}
            </span>
          </div>
          {/* Duration */}
          <div className="hidden sm:flex col-span-2 items-center justify-center">
            <div className="flex flex-col items-center">
              <span className="text-xs font-black text-amber-400 italic">
                {player.loanWeeksRemaining || 0}
              </span>
              <span className="text-[7px] font-black text-white/20 uppercase">Semanas restantes</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Country (Desktop) */}
          <div className="hidden sm:block col-span-1 text-center">
            <span className="text-xl filter drop-shadow-sm">{flagFor((player as any).country || player.nationality)}</span>
          </div>

          {/* Age */}
          <div className="hidden sm:block col-span-1 text-center">
            <span className="text-xs font-bold text-white/60">{player.age}a</span>
          </div>

          {/* Attributes (Compact Row View) */}
          <div className="col-span-2 hidden xl:flex items-center justify-center gap-3 overflow-hidden px-1">
            {attrConfig.slice(0, 3).map(attr => {
              const { value: val } = getAttrValue(player, attr.from as any);
              return (
                <div key={attr.key} className="flex flex-col items-center min-w-[28px] sm:min-w-[32px] shrink-0">
                  <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase mb-0.5">{attr.key}</span>
                  <span className={cn(
                    "text-[9px] sm:text-[10px] font-black tabular-nums italic",
                    val >= 80 ? 'text-emerald-400' : val >= 60 ? 'text-sky-400' : 'text-red-400'
                  )}>{val}</span>
                </div>
              );
            })}
            <div className="h-6 w-px bg-white/5 mx-0.5 sm:mx-1 shrink-0" />
            <div className="shrink-0">
              <MiniStat value={player.stamina} icon={<Activity className="w-3 h-3" />} color="text-emerald-400" label="FIS" onRest={onRest} />
            </div>
          </div>
        </>
      )}

      {/* Last Column: Contract & Value OR Situation */}
      <div className="col-span-11 sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 overflow-hidden">
        {activeTab === 'emprestados' ? (
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[10px] sm:text-[12px] font-black text-emerald-400 uppercase italic tracking-widest leading-none">
              {isLoanedIn ? 'REC. EMPRÉSTIMO' : 'EMPRESTADO'}
            </span>
            <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Retorno: Fim da Temporada
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[10px] sm:text-[11px] font-black text-white/80 italic whitespace-nowrap">{formatMoney(player.salary)}<span className="text-[9px] opacity-40">/sem</span></span>
              <span className={cn(
                "text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1",
                (!isLoanedIn && !isLoanedOut && player.contract <= 1) ? "text-red-400 animate-pulse font-black" : "text-white/30"
              )}>
                {(!isLoanedIn && !isLoanedOut && player.contract <= 1) && <AlertTriangle className="w-3 h-3" />}
                {isLoanedIn || isLoanedOut ? `${player.loanWeeksRemaining || 0} SEM (EMP)` : `${player.contract} TEMP`}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex flex-col items-end min-w-[80px] sm:min-w-[100px]">
                <span className={cn(
                  "text-xs sm:text-sm font-black italic leading-none whitespace-nowrap",
                  (!isLoanedIn && !isLoanedOut && player.contract <= 1) ? "text-red-400" : "text-emerald-400"
                )}>{formatMoney(getPlayerValue(player))}</span>
                <span className="text-[8px] sm:text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1.5">Mkt Value</span>
              </div>
            </div>
          </>
        )}
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
