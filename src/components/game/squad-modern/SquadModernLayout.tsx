import { useMemo, useState, useEffect, useCallback } from 'react';
import { QuickSwapPanel } from '../squad/QuickSwapPanel';
import { Button } from '@/components/ui/button';
import { Repeat, ShoppingCart, ArrowLeftRight } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Player, Club } from '@/types/game';
import { getPlayerValue } from '@/utils/playerGenerator';
import { formatMoney } from '@/lib/formatMoney';
import { supabase } from '@/integrations/supabase/client';
import { SeasonData, YouthProspect } from '@/types/infrastructure';
import { TacticsTab } from '../TacticsTab';
import { YouthAcademyModernTab } from './YouthAcademyModernTab';
import { SquadHeader } from './SquadHeader';
import { PlayerRow } from './PlayerRow';
import { SquadMainTable } from './SquadMainTable';
import { PlayerDetailPanel } from './PlayerDetailPanel';
import { useAttributeEvolution } from './useAttributeEvolution';
import { getPlayerStatus, avgStamina } from './squadHelpers';
import { detectActualFormation, autoLineup } from '@/utils/lineupManager';
import { toast } from 'sonner';
import { Users, Shield, Sparkles, Ban, Clock, Share2, LayoutDashboard, ArrowRightLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SquadModernProps {
  club: Club;
  season?: SeasonData;
  players: Player[];
  clubName: string;
  userId: string;
  budget: number;
  tactics: any;
  onRest: (id: string) => void;
  onUpdatePlayers: (players: Player[]) => void;
  youthProspects: YouthProspect[];
  onPromoteYouth: (id: string) => void;
  onSellYouth?: (id: string) => void;
  onEnrollCopinha?: () => void;
  onUpgradeAcademy?: () => void;
  youthInvestment: number;
  onSetYouthInvestment: (amount: number) => void;
  infrastructure: any;
  onUpdateTactics?: (tactics: any) => void;
  lastYouthGenAt?: string;
  isPremium?: boolean;
  onSpendBudget?: (cost: number, category: 'Transferência' | 'Empréstimo' | 'Contratos', description: string) => void;
}

export function SquadModernLayout({
  club, season, players, tactics, onUpdatePlayers, onUpdateTactics, onRest,
  youthProspects, onPromoteYouth, onSellYouth, onEnrollCopinha, onUpgradeAcademy,
  youthInvestment, onSetYouthInvestment,
  userId, infrastructure, lastYouthGenAt, isPremium, onSpendBudget, clubName
}: SquadModernProps) {
  const [activeTab, setActiveTab] = useState<string>('titulares');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'pitch'>('list');
  const [pendingSwap, setPendingSwap] = useState<Player | null>(null);
  const [isQuickSwapOpen, setIsQuickSwapOpen] = useState(false);
  const [isTacticsOpen, setIsTacticsOpen] = useState(false);


  const deltas = useAttributeEvolution(players);

  // Sync event for automatic lineup
  useEffect(() => {
    const handler = () => {
      const nextPlayers = autoLineup(players, tactics.formation);
      onUpdatePlayers(nextPlayers);
      toast.success('Escalação e banco otimizados automaticamente!');
    };
    window.addEventListener('flm:auto-lineup', handler);
    return () => window.removeEventListener('flm:auto-lineup', handler);
  }, [players, tactics.formation, onUpdatePlayers]);

  useEffect(() => {
    const handler = (e: any) => {
      handleSwap(e.detail.idA, e.detail.idB);
    };
    window.addEventListener('flm:swap-players', handler);
    return () => window.removeEventListener('flm:swap-players', handler);
  }, [players, onUpdatePlayers]);

  // Sync youth prospects count to tab
  useEffect(() => {
    if (activeTab === 'titulares' && youthProspects.length > 0) {
      // Small visual indicator or auto-switch logic could go here if requested, 
      // but for now we just ensure they are available in the 'base' tab.
    }
  }, [youthProspects.length, activeTab]);

  const starterIds = useMemo(() => {
    const ids = new Set<string>();
    const lineup = (tactics?.lineup ?? tactics?.startingXI ?? tactics?.starting_xi) as string[] | undefined;
    if (Array.isArray(lineup)) {
      lineup.forEach(id => id && ids.add(id));
    } else {
      // Fallback fallback: first 11
      players.slice(0, 11).forEach(p => ids.add(p.id));
    }
    return ids;
  }, [tactics, players]);

  const selectedPlayer = useMemo(
    () => players.find(p => p.id === selectedId) ?? null,
    [players, selectedId],
  );
  
  const selectedStatus = selectedPlayer ? getPlayerStatus(selectedPlayer, starterIds.has(selectedPlayer.id)) : null;
  const selectedDelta = selectedPlayer ? (deltas[selectedPlayer.id] ?? {}) : {};

  // Escalação Dinâmica e Inteligente
  const actualFormation = useMemo(() => {
    return detectActualFormation(players);
  }, [players]);

  const handleSelect = (id: string) => {
    if (pendingSwap && id !== pendingSwap.id) {
      handleSwap(pendingSwap.id, id);
      return;
    }
    setSelectedId(id);
    setPanelOpen(true);
  };

  const handleSwap = useCallback((idA: string, idB: string) => {
    const idxA = players.findIndex(p => p.id === idA);
    const idxB = players.findIndex(p => p.id === idB);
    if (idxA < 0 || idxB < 0) return;

    const newPlayers = [...players];
    [newPlayers[idxA], newPlayers[idxB]] = [newPlayers[idxB], newPlayers[idxA]];
    
    onUpdatePlayers(newPlayers);
    setPendingSwap(null);
    setPanelOpen(false);
    toast.success('Troca realizada com sucesso!', {
      description: `${players[idxA].name} ↔ ${players[idxB].name}`
    });
  }, [players, onUpdatePlayers]);

  // Confirmation modal state for market/loan listing
  const [confirmAction, setConfirmAction] = useState<null | {
    type: 'transfer' | 'loan-out';
    player: Player;
    value: number;
    listingFee: number;
    agentFee: number;
    adminFee: number;
    total: number;
  }>(null);
  const [submitting, setSubmitting] = useState(false);

  const openMarketConfirm = (p: Player) => {
    const value = getPlayerValue(p);
    const listingFee = Math.max(50_000, Math.round(value * 0.01));
    const agentFee = Math.round(value * 0.02);
    const adminFee = 25_000;
    setConfirmAction({
      type: 'transfer', player: p, value,
      listingFee, agentFee, adminFee,
      total: listingFee + agentFee + adminFee,
    });
  };

  const openLoanConfirm = (p: Player) => {
    const value = getPlayerValue(p);
    const listingFee = Math.max(20_000, Math.round(value * 0.005));
    const agentFee = Math.round(value * 0.01);
    const adminFee = 15_000;
    setConfirmAction({
      type: 'loan-out', player: p, value,
      listingFee, agentFee, adminFee,
      total: listingFee + agentFee + adminFee,
    });
  };

  const confirmListing = async () => {
    if (!confirmAction) return;
    const { type, player, value, total } = confirmAction;

    if ((club.budget ?? 0) < total) {
      toast.error(`Saldo insuficiente. Necessário ${formatMoney(total)}.`);
      return;
    }

    // Prevent double-listing
    if (type === 'transfer' && (player as any).onTransferList) {
      toast.error('Este jogador já está anunciado no mercado.');
      setConfirmAction(null);
      return;
    }

    setSubmitting(true);
    try {
      const shieldObj = (club as any).shieldPattern ? {
        primaryColor: (club as any).primaryColor || '#2563EB',
        secondaryColor: (club as any).secondaryColor || '#FFF',
        pattern: (club as any).shieldPattern,
        shape: (club as any).shieldShape || 'classic',
      } : null;

      const body = type === 'transfer' ? {
        action: 'list', playerData: player, playerName: player.name,
        playerPosition: player.position, playerOverall: player.overall, playerAge: player.age,
        askingPrice: value, clubName, sellerShield: shieldObj,
      } : {
        action: 'loan-list', playerData: player, playerName: player.name,
        playerPosition: player.position, playerOverall: player.overall, playerAge: player.age,
        salary: player.salary || 0, clubName, sellerShield: shieldObj,
      };

      const res = await supabase.functions.invoke('process-transfer', { body });
      if (res.error || (res.data as any)?.error) {
        toast.error((res.data as any)?.error || 'Falha ao anunciar jogador.');
        setSubmitting(false);
        return;
      }

      // Charge fees
      onSpendBudget?.(total, type === 'transfer' ? 'Transferência' : 'Empréstimo',
        type === 'transfer'
          ? `Taxas de anúncio no mercado — ${player.name}`
          : `Taxas de listagem em empréstimos — ${player.name}`);

      toast.success(type === 'transfer'
        ? `📢 ${player.name} anunciado no mercado por ${formatMoney(value)}!`
        : `🤝 ${player.name} listado para empréstimo!`,
        { description: `Taxas administrativas pagas: ${formatMoney(total)}` });

      setConfirmAction(null);
    } catch (e: any) {
      toast.error(e?.message || 'Erro inesperado.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = (action: 'renew' | 'transfer' | 'loan-out' | 'auction' | 'shirt-number' | 'train' | 'promote-youth', p: Player) => {
    switch (action) {
      case 'transfer':
        openMarketConfirm(p);
        break;
      case 'loan-out':
        openLoanConfirm(p);
        break;
      case 'auction':
        toast.info(`${p.name} enviado para leilão.`);
        break;
      case 'shirt-number':
        toast.info(`Escolha a camisa de ${p.name} no menu de equipamentos.`);
        break;
      case 'renew':
        toast.success(`Negociação de renovação iniciada com ${p.name}.`);
        break;
      case 'train':
        toast.info(`${p.name} foi adicionado ao foco de treino.`);
        break;
      case 'promote-youth':
        toast.info(`${p.name} promovido da base.`);
        break;
    }
  };

  const handleAutoLineup = () => {
    const nextPlayers = autoLineup(players, tactics.formation);
    onUpdatePlayers(nextPlayers);
    toast.success('Escalação e banco otimizados automaticamente!');
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white selection:bg-emerald-500/30 overflow-hidden">
      <SquadHeader 
        club={club} 
        season={season} 
        viewMode={viewMode} 
        onViewModeChange={(mode) => setViewMode(mode as any)} 
        pendingSwap={pendingSwap ? { id: pendingSwap.id, name: pendingSwap.name } : null}
        onCancelSwap={() => setPendingSwap(null)}
        isTacticsOpen={isTacticsOpen}
        onToggleTactics={() => setIsTacticsOpen(!isTacticsOpen)}
        onBack={() => {
          if (viewMode === 'pitch') {
            setViewMode('list');
            return;
          }
          if (isTacticsOpen) {
            setIsTacticsOpen(false);
            return;
          }
          window.dispatchEvent(new CustomEvent('flm:navigate-to-tab', { detail: { tab: 'dashboard' } }));
        }}
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative gap-3 sm:gap-6 p-2 sm:p-6">
        {/* Main Content Area: Tabs & Tables */}
        <motion.div 
          layout
          className={cn(
            "flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-500 bg-zinc-900/30 rounded-[2.5rem] border border-white/5",
            (viewMode === 'pitch' || isTacticsOpen) ? "hidden" : "flex"
          )}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            {/* Horizontal Sub-tabs */}
            <div className="px-3 sm:px-6 py-3 bg-zinc-950/50 border-b border-white/5 overflow-x-auto scrollbar-hide flex items-center justify-between gap-4">
              <TabsList className="bg-white/5 border border-white/5 p-1 h-12 gap-1 rounded-2xl shrink-0">
                <TabTrigger value="titulares" icon={<Shield className="w-3.5 h-3.5" />} label="Titulares" />
                <TabTrigger value="reservas" icon={<Users className="w-3.5 h-3.5" />} label="Reservas" />
                <TabTrigger value="base" icon={<Sparkles className="w-3.5 h-3.5" />} label="Juniores" />
                <TabTrigger value="fora" icon={<Ban className="w-3.5 h-3.5" />} label="Fora" />
                <TabTrigger value="suspensos" icon={<Clock className="w-3.5 h-3.5" />} label="Suspensos" />
                <TabTrigger value="emprestados" icon={<Share2 className="w-3.5 h-3.5" />} label="Emprestados" />
              </TabsList>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar relative">
              <AnimatePresence mode="wait">
                <TabsContent key={activeTab} value={activeTab} className="h-full m-0 outline-none">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full p-2 sm:p-6"
                  >
                    {activeTab === 'base' ? (
                      <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                         <YouthAcademyModernTab
                           prospects={youthProspects}
                           onPromote={onPromoteYouth}
                           monthlyInvestment={youthInvestment}
                           onSetInvestment={onSetYouthInvestment}
                           academyLevel={infrastructure?.youthAcademy?.level ?? 0}
                           academyUpgradeCompletesAt={infrastructure?.youthAcademy?.upgradeCompletesAt}
                           budget={club.budget}
                           hasScouts={(club.scouts || []).length > 0}
                           currentSeason={season?.currentSeason || 1}
                           onSell={onSellYouth || (() => {})}
                           onEnrollCopinha={onEnrollCopinha || (() => {})}
                           onUpgradeAcademy={onUpgradeAcademy || (() => {})}
                           lastYouthGenAt={lastYouthGenAt}
                           isPremium={isPremium}
                         />
                      </div>
                    ) : (
                      <SquadMainTable 
                        players={players} 
                        starterIds={starterIds}
                         selectedId={selectedId}
                         onSelect={handleSelect}
                         activeTab={activeTab}
                         userId={userId}
                         onRest={onRest}
                         pendingSwapId={pendingSwap?.id}
                         onOpenQuickSwap={() => setIsQuickSwapOpen(true)}
                      />
                    )}
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </div>
          </Tabs>
        </motion.div>

        {/* Tactical Panel — mobile: fixed overlay full-screen; desktop (xl+): side panel */}
        <AnimatePresence>
          {isTacticsOpen && (
            <>
              {/* Backdrop (mobile only) */}
              <motion.div
                key="tactics-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setIsTacticsOpen(false)}
                className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                key="tactics-panel"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className={cn(
                  // Sempre cobre a tela inteira (igual à aba "Táticas")
                  "fixed inset-0 z-[60] bg-zinc-950 flex flex-col overflow-hidden"
                )}
              >
                 {/* Section Header */}
                 <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-zinc-950/40 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                       <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                          <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                       </div>
                       <div className="min-w-0">
                          <h2 className="text-sm font-black uppercase tracking-widest text-white italic truncate">Centro Tático</h2>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Configurações de Jogo</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                       <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                          {actualFormation}
                       </span>
                       <button
                         onClick={() => setIsTacticsOpen(false)}
                         className="xl:hidden w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                         aria-label="Fechar painel tático"
                       >
                         <X className="w-4 h-4 text-white/70" />
                       </button>
                    </div>
                 </div>

                 {/* Tactical Tabbed Content */}
                 <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-6 overscroll-contain">
                    <TacticsTab 
                      players={players} 
                      tactics={tactics} 
                      onUpdate={onUpdateTactics || (() => {})} 
                      season={season?.currentSeason}
                      userId={userId}
                      hideSwapButton={true}
                    />
                 </div>

              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <PlayerDetailPanel
        player={selectedPlayer}
        status={selectedStatus}
        delta={selectedDelta}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onAction={handleAction}
      />

      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !submitting && setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 240 }}
              className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.7)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "p-5 border-b border-white/5 flex items-center gap-3",
                confirmAction.type === 'transfer' ? "bg-emerald-500/5" : "bg-sky-500/5"
              )}>
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center border",
                  confirmAction.type === 'transfer'
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-sky-500/10 border-sky-500/30 text-sky-400"
                )}>
                  {confirmAction.type === 'transfer'
                    ? <ShoppingCart className="w-5 h-5" />
                    : <ArrowLeftRight className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {confirmAction.type === 'transfer' ? 'Mercado de Transferências' : 'Mercado de Empréstimos'}
                  </p>
                  <p className="text-sm font-black text-white truncate">{confirmAction.player.name}</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm text-white/80 leading-relaxed">
                  {confirmAction.type === 'transfer'
                    ? '📢 Tem certeza que deseja anunciar este jogador no mercado?'
                    : '🤝 Tem certeza que deseja colocar este jogador para empréstimo?'}
                </p>

                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Valor sugerido</span>
                    <span className="font-bold text-white">{formatMoney(confirmAction.value)}</span>
                  </div>
                  <div className="h-px bg-white/5 my-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">💰 Taxa de anúncio</span>
                    <span className="font-bold text-amber-300">{formatMoney(confirmAction.listingFee)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">💼 Taxa de empresário</span>
                    <span className="font-bold text-amber-300">{formatMoney(confirmAction.agentFee)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">📋 Custos administrativos</span>
                    <span className="font-bold text-amber-300">{formatMoney(confirmAction.adminFee)}</span>
                  </div>
                  <div className="h-px bg-white/5 my-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-black text-white uppercase tracking-wider text-[11px]">Total a debitar</span>
                    <span className="font-black text-rose-300">{formatMoney(confirmAction.total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/40 pt-1">
                    <span>Saldo atual</span>
                    <span>{formatMoney(club.budget ?? 0)}</span>
                  </div>
                </div>

                {(club.budget ?? 0) < confirmAction.total && (
                  <p className="text-[11px] text-rose-400 font-bold">⚠️ Saldo insuficiente para arcar com as taxas.</p>
                )}
              </div>

              <div className="p-4 border-t border-white/5 bg-zinc-950/50 flex items-center gap-3">
                <Button
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-widest text-white/70 hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={submitting || (club.budget ?? 0) < confirmAction.total}
                  onClick={confirmListing}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-950",
                    confirmAction.type === 'transfer'
                      ? "bg-emerald-500 hover:bg-emerald-400"
                      : "bg-sky-500 hover:bg-sky-400"
                  )}
                >
                  {submitting ? 'Processando…' : 'Confirmar'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickSwapPanel
        isOpen={isQuickSwapOpen}
        onClose={() => setIsQuickSwapOpen(false)}
        players={players}
        onSwap={handleSwap}
      />
    </div>
  );
}

function TabTrigger({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) {
  return (
    <TabsTrigger 
      value={value}   
      className={cn(
        "text-[10px] font-black uppercase tracking-widest rounded-xl px-4 h-9 gap-2 shrink-0",
        "transition-all duration-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-zinc-950 data-[state=active]:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
      )}
    >
      {icon}
      <span>{label}</span>
    </TabsTrigger>
  );
}
