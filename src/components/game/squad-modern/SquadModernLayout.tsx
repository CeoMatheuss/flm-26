import { useMemo, useState, useEffect, useCallback, useRef, type SyntheticEvent } from 'react';
import { QuickSwapPanel } from '../squad/QuickSwapPanel';
import { Button } from '@/components/ui/button';
import { Repeat, ShoppingCart, ArrowLeftRight, ArrowRightLeft } from 'lucide-react';

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
import { Users, Shield, Sparkles, Ban, Clock, Share2, LayoutDashboard, X } from 'lucide-react';
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
  const mainContentRef = useRef<HTMLDivElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);

  const deltas = useAttributeEvolution(players);

  // Lógica de navegação inteligente para substituição
  useEffect(() => {
    if (pendingSwap && mainContentRef.current) {
      const p = pendingSwap;
      const isStarter = starterIds.has(p.id);
      
      // Encontrar o índice real no array players para determinar se está "fora"
      const playerIndex = players.findIndex(pl => pl.id === p.id);
      const isFora = playerIndex >= 22; // Fora da convocação (11 titulares + 11 reservas)
      
      let targetTab = '';
      if (isStarter) {
        targetTab = 'reservas';
      } else if (isFora) {
        targetTab = 'reservas';
      } else {
        // Se for reserva (está entre o índice 11 e 21)
        targetTab = 'titulares';
      }

      if (targetTab && activeTab !== targetTab) {
        setActiveTab(targetTab);
        
        // Scroll suave para o topo da lista
        setTimeout(() => {
          mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          // Scroll horizontal das abas se necessário
          const tabElement = tabsListRef.current?.querySelector(`[data-value="${targetTab}"]`);
          if (tabElement) {
            tabElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        }, 100);
      }
    }
  }, [pendingSwap]);

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
    const startSwapHandler = (e: any) => {
      const p = e.detail.player;
      if (pendingSwap && pendingSwap.id === p.id) {
        setPendingSwap(null);
      } else {
        setPendingSwap(p);
        toast.info(`Substituição iniciada: selecione o jogador para trocar com ${p.name}`, {
          icon: '🔄',
          duration: 3000
        });
      }
    };
    window.addEventListener('flm:start-swap', startSwapHandler);
    return () => window.removeEventListener('flm:start-swap', startSwapHandler);
  }, [pendingSwap]);

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

  // Derive starter and bench sets from squad_status when available.
  // 11 Starters + 11 Balanced Reserves.
  const { starterIds, benchIds } = useMemo(() => {
    const sIds = new Set<string>();
    const bIds = new Set<string>();
    
    players.forEach(p => {
      const ss = (p as any).squad_status;
      if (ss === 'starter') sIds.add(p.id);
      else if (ss === 'bench') bIds.add(p.id);
    });

    // Fallback if status not explicitly set
    if (sIds.size === 0) {
      players.slice(0, 11).forEach(p => sIds.add(p.id));
      players.slice(11, 22).forEach(p => bIds.add(p.id));
    }

    return { starterIds: sIds, benchIds: bIds };
  }, [players]);

  // Sincroniza Juniores: prospects do banco + jogadores do elenco marcados como isYouth (base).
  const mergedYouthProspects = useMemo(() => {
    const byId = new Map<string, YouthProspect>();
    (youthProspects || []).forEach(yp => byId.set(yp.id, yp));
    (players || []).forEach(p => {
      const raw = p as any;
      const isBaseYouth = !!raw.isYouth && raw.contractStatus !== 'profissional';
      if (!isBaseYouth || byId.has(p.id)) return;
      byId.set(p.id, {
        ...(p as any),
        potential: Number(raw.potential ?? Math.max(50, (p.overall ?? 45) + 5)),
        monthsInAcademy: Number(raw.monthsInAcademy ?? 0),
        contractStatus: raw.contractStatus ?? 'base',
        nationality: raw.country ?? raw.nationality ?? 'Brasil',
        rarity: raw.rarity ?? 'comum',
        dominantFoot: raw.dominantFoot ?? 'right',
      } as YouthProspect);
    });
    return Array.from(byId.values());
  }, [players, youthProspects]);

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
    if (pendingSwap) {
      if (id === pendingSwap.id) {
        setPendingSwap(null);
        return;
      }
      handleSwap(pendingSwap.id, id);
      return;
    }
    setSelectedId(id);
    setPanelOpen(true);
  };

  const handleYouthSelect = (prospect: YouthProspect) => {
    // Transformar YouthProspect em Player para o painel
    const transformed: Player = {
      id: prospect.id,
      name: prospect.name,
      overall: prospect.overall,
      position: prospect.position as Player['position'],
      age: prospect.age,
      country: prospect.nationality || 'Brasil',
      salary: prospect.salary || 0,
      contract: (prospect as any).contract || 1,
      stamina: 100,
      morale: 100,
      value: getPlayerValue(prospect as any),
      // Adicionar outros campos necessários
      seasonRatings: [],
      goals: 0,
      assists: 0,
      gamesPlayed: 0,
      personality: 'Competitive',
      contractStatus: (prospect as any).contractStatus || 'base',
      squad_status: 'reserve',
    } as any;

    setSelectedId(prospect.id);
    setPanelOpen(true);
  };

  const handleSwap = useCallback((idA: string, idB: string) => {
    const playerA = players.find(p => p.id === idA);
    const playerB = players.find(p => p.id === idB);
    if (!playerA || !playerB) return;

    // BLOQUEIO: Impedir 2 goleiros titulares
    const starters = players.filter(p => (p as any).squad_status === 'starter');
    const isAServingInLineup = starters.some(p => p.id === idA);
    const isBServingInLineup = starters.some(p => p.id === idB);

    if (!isAServingInLineup && playerA.position === 'GOL') {
       const otherGK = starters.find(p => p.position === 'GOL' && p.id !== idB);
       if (otherGK) {
         toast.error("Escalação inválida: apenas 1 goleiro pode iniciar.");
         return;
       }
    }
    if (!isBServingInLineup && playerB.position === 'GOL') {
       const otherGK = starters.find(p => p.position === 'GOL' && p.id !== idA);
       if (otherGK) {
         toast.error("Escalação inválida: apenas 1 goleiro pode iniciar.");
         return;
       }
    }

    const idxA = players.findIndex(p => p.id === idA);
    const idxB = players.findIndex(p => p.id === idB);
    if (idxA < 0 || idxB < 0) return;

    const newPlayers = [...players];
    [newPlayers[idxA], newPlayers[idxB]] = [newPlayers[idxB], newPlayers[idxA]];
    
    onUpdatePlayers(newPlayers);
    setPendingSwap(null);
    setPanelOpen(false);
    toast.success('Substituição realizada!', {
      description: `${players[idxA].name} ↔ ${players[idxB].name}`
    });
  }, [players, onUpdatePlayers]);

  // Modal States
  const [confirmAction, setConfirmAction] = useState<null | {
    type: 'transfer' | 'loan-out' | 'auction' | 'renew' | 'shirt-number' | 'train' | 'promote-youth';
    player: Player;
    value?: number;
    listingFeeRate?: number;
    agentFeeRate?: number;
    adminFeeRate?: number;
    listingFee?: number;
    agentFee?: number;
    adminFee?: number;
    total?: number;
    renewalProposal?: { salary: number; bonus: number; duration: number };
  }>(null);
  const [submitting, setSubmitting] = useState(false);

  const openMarketConfirm = (p: Player) => {
    setPanelOpen(false); // Fechar o painel lateral ao abrir a confirmação
    const value = getPlayerValue(p);
    const listingFeeRate = 0.01;
    const agentFeeRate = 0.01;
    const adminFeeRate = 0.01;
    const listingFee = Math.round(value * listingFeeRate);
    const agentFee = Math.round(value * agentFeeRate);
    const adminFee = Math.round(value * adminFeeRate);
    setConfirmAction({
      type: 'transfer', player: p, value,
      listingFeeRate, agentFeeRate, adminFeeRate,
      listingFee, agentFee, adminFee,
      total: listingFee + agentFee + adminFee,
    });
  };

  const openLoanConfirm = (p: Player) => {
    setPanelOpen(false); // Fechar o painel lateral ao abrir a confirmação
    const value = getPlayerValue(p);
    const listingFeeRate = 0.01;
    const agentFeeRate = 0.01;
    const adminFeeRate = 0.01;
    const listingFee = Math.round(value * listingFeeRate);
    const agentFee = Math.round(value * agentFeeRate);
    const adminFee = Math.round(value * adminFeeRate);
    setConfirmAction({
      type: 'loan-out', player: p, value,
      listingFeeRate, agentFeeRate, adminFeeRate,
      listingFee, agentFee, adminFee,
      total: listingFee + agentFee + adminFee,
    });
  };

  const confirmListing = async () => {
    if (!confirmAction) return;
    const { type, player, value, total } = confirmAction;

    if (type === 'promote-youth') {
      setSubmitting(true);
      try {
        await onPromoteYouth(player.id);
        
        // Publicar no jornal
        await supabase.from('newspaper_entries').insert({
          user_id: userId,
          text: `PROMESSA NO PROFISSIONAL: ${player.name} acaba de assinar seu primeiro contrato profissional com o ${clubName}!`,
          category: 'CONTRATAÇÃO',
          metadata: {
            club_id: club.id,
            club_name: clubName,
            player_name: player.name,
            player_overall: player.overall,
            player_position: player.position
          }
        });

        toast.success(`${player.name} assinou o contrato profissional!`, {
          description: "Notícia publicada no Diário do Futebol."
        });
        setConfirmAction(null);
      } catch (err: any) {
        toast.error("Erro ao promover jogador.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if ((club.budget ?? 0) < (total || 0)) {
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

  const closeConfirmAction = (event?: SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!submitting) setConfirmAction(null);
  };

  const submitConfirmAction = (event?: SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!submitting) void confirmListing();
  };

  const handleAction = (action: 'renew' | 'transfer' | 'loan-out' | 'auction' | 'shirt-number' | 'train' | 'promote-youth', p: Player, extra?: string) => {
    // Ao iniciar qualquer ação, fechamos o painel lateral para não atrapalhar
    setPanelOpen(false);
    
    switch (action) {
      case 'transfer':
        openMarketConfirm(p);
        break;
      case 'loan-out':
        openLoanConfirm(p);
        break;
      case 'auction':
        if (!extra) {
          setConfirmAction({ type: 'auction', player: p });
        } else {
          toast.info(`${p.name} enviado para leilão.`);
        }
        break;
      case 'shirt-number':
        setConfirmAction({ type: 'shirt-number', player: p });
        break;
      case 'renew':
        if (!extra) {
          // Inicializa proposta com valores padrão, mas permitindo edição
          setConfirmAction({ 
            type: 'renew', 
            player: p,
            renewalProposal: {
              salary: Math.round((p.salary || 0) * 1.15),
              bonus: Math.round(getPlayerValue(p) * 0.05),
              duration: 3
            }
          });
        } else if (extra === 'confirm') {
          if (!confirmAction?.renewalProposal) return;
          
          const proposal = confirmAction.renewalProposal;
          
          // Lógica de aceitação/rejeição/contraproposta
          // Fatores: Salário vs Expectativa (baseada em OVR e idade), Bônus
          const baseExpectation = Math.round((p.salary || 0) * 1.25);
          const minAcceptable = Math.round((p.salary || 0) * 1.10);
          
          if (proposal.salary >= baseExpectation) {
            // Aceita imediatamente
            const updated = players.map(pl => 
              pl.id === p.id ? { ...pl, salary: proposal.salary, contract: (pl.contract || 0) + proposal.duration } : pl
            );
            onUpdatePlayers(updated);
            onSpendBudget?.(proposal.bonus, 'Contratos', `Bônus de renovação — ${p.name}`);
            toast.success(`${p.name} aceitou a proposta de renovação!`);
            setConfirmAction(null);
          } else if (proposal.salary < minAcceptable) {
            // Rejeita categoricamente
            toast.error(`${p.name} rejeitou a proposta e encerrou as negociações por hoje.`);
            setConfirmAction(null);
          } else {
            // Contraproposta: Jogador pede o meio do caminho entre o que ele quer e o que foi oferecido
            const counterSalary = Math.round((proposal.salary + baseExpectation) / 2);
            toast.info(`${p.name} achou a oferta baixa. Contraproposta: ${formatMoney(counterSalary)}/s e ${proposal.duration} temporadas.`);
            
            // Atualiza o modal com a contraproposta para o usuário decidir
            setConfirmAction({
              ...confirmAction,
              renewalProposal: { ...proposal, salary: counterSalary }
            });
          }
        }
        break;
      case 'train':
        if (!extra) {
          setConfirmAction({ type: 'train', player: p });
        } else {
          // Aqui integraria com o sistema de treino real se disponível
          console.log(`Foco de treino ${extra} para ${p.name}`);
        }
        break;
      case 'promote-youth':
        setConfirmAction({ type: 'promote-youth', player: p });
        break;
    }
  };

  const handleAutoLineup = () => {
    const nextPlayers = autoLineup(players, tactics.formation);
    onUpdatePlayers(nextPlayers);
    toast.success('Escalação e banco otimizados automaticamente!');
  };

  return (
    <div className="h-full min-h-[calc(100vh-180px)] flex flex-col bg-zinc-950 text-white selection:bg-emerald-500/30 overflow-hidden">
      {!panelOpen && (
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
      )}

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
            <div 
              ref={tabsListRef}
              className="px-3 sm:px-6 py-3 bg-zinc-950/50 border-b border-white/5 overflow-x-auto scrollbar-hide flex items-center justify-between gap-4"
            >
              <TabsList className="bg-white/5 border border-white/5 p-1 h-12 gap-1 rounded-2xl shrink-0">
                <TabTrigger value="titulares" icon={<Shield className="w-3.5 h-3.5" />} label="Titulares" />
                <TabTrigger value="reservas" icon={<Users className="w-3.5 h-3.5" />} label="Reservas" />
                <TabTrigger value="fora" icon={<Ban className="w-3.5 h-3.5" />} label="Fora" />
                <TabTrigger value="base" icon={<Sparkles className="w-3.5 h-3.5" />} label="Juniores" />
                <TabTrigger value="suspensos" icon={<Clock className="w-3.5 h-3.5" />} label="Suspensos" />
                <TabTrigger value="emprestados" icon={<Share2 className="w-3.5 h-3.5" />} label="Emprestados" />
              </TabsList>
            </div>

            <div ref={mainContentRef} className="flex-1 overflow-x-auto custom-scrollbar relative">
              <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full min-h-[60vh] p-2 sm:p-6"
                  >
                    {activeTab === 'base' ? (
                      <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                         <YouthAcademyModernTab
                           prospects={mergedYouthProspects}
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
                           onSelect={handleYouthSelect}
                         />
                      </div>
                    ) : (
                      <SquadMainTable 
                        players={players} 
                        starterIds={starterIds}
                        benchIds={benchIds}
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
                         className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
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
        onSwap={(p) => setPendingSwap(p)}
        status={selectedStatus}
        delta={selectedDelta}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onAction={handleAction}
        isYouth={activeTab === 'base'}
      />

      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeConfirmAction}
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
                {confirmAction.type === 'transfer' || confirmAction.type === 'loan-out' ? (
                  <>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {confirmAction.type === 'transfer'
                        ? '📢 Tem certeza que deseja anunciar este jogador no mercado?'
                        : '🤝 Tem certeza que deseja colocar este jogador para empréstimo?'}
                    </p>

                    <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">Valor sugerido</span>
                        <span className="font-bold text-white">{formatMoney(confirmAction.value || 0)}</span>
                      </div>
                      <div className="h-px bg-white/5 my-2" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">💰 Taxa de anúncio</span>
                        <span className="font-bold text-amber-300">{formatMoney(confirmAction.listingFee || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">💼 Taxa de empresário</span>
                        <span className="font-bold text-amber-300">{formatMoney(confirmAction.agentFee || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">📋 Custos administrativos</span>
                        <span className="font-bold text-amber-300">{formatMoney(confirmAction.adminFee || 0)}</span>
                      </div>
                      <div className="h-px bg-white/5 my-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-black text-white uppercase tracking-wider text-[11px]">Total a debitar</span>
                        <span className="font-black text-rose-300">{formatMoney(confirmAction.total || 0)}</span>
                      </div>
                    </div>

                    {(club.budget ?? 0) < (confirmAction.total || 0) && (
                      <p className="text-[11px] text-rose-400 font-bold">⚠️ Saldo insuficiente para arcar com as taxas.</p>
                    )}
                  </>
                ) : confirmAction.type === 'auction' ? (
                  <p className="text-sm text-white/80 leading-relaxed">
                    🔨 Deseja enviar <strong>{confirmAction.player.name}</strong> para o leilão do final da temporada? O valor arrecadado dependerá dos lances recebidos.
                  </p>
                ) : confirmAction.type === 'renew' && confirmAction.renewalProposal ? (
                  <div className="space-y-4">
                    <p className="text-xs text-white/60 uppercase tracking-widest font-black italic">Proposta de Renovação</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 group">
                        <p className="text-[9px] text-white/40 uppercase font-bold mb-1">Novo Salário</p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            value={confirmAction.renewalProposal.salary}
                            onChange={(e) => setConfirmAction({
                              ...confirmAction,
                              renewalProposal: { ...confirmAction.renewalProposal!, salary: Number(e.target.value) }
                            })}
                            className="bg-transparent text-sm font-black text-emerald-400 outline-none w-full"
                          />
                          <span className="text-[10px] text-white/20">/s</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[9px] text-white/40 uppercase font-bold mb-1">Luvas (Bônus)</p>
                        <input 
                          type="number"
                          value={confirmAction.renewalProposal.bonus}
                          onChange={(e) => setConfirmAction({
                            ...confirmAction,
                            renewalProposal: { ...confirmAction.renewalProposal!, bonus: Number(e.target.value) }
                          })}
                          className="bg-transparent text-sm font-black text-amber-400 outline-none w-full"
                        />
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 col-span-2">
                        <p className="text-[9px] text-white/40 uppercase font-bold mb-1">Duração do Contrato (Anos)</p>
                        <select 
                          value={confirmAction.renewalProposal.duration}
                          onChange={(e) => setConfirmAction({
                            ...confirmAction,
                            renewalProposal: { ...confirmAction.renewalProposal!, duration: Number(e.target.value) }
                          })}
                          className="bg-transparent text-sm font-black text-sky-400 outline-none w-full"
                        >
                          {[1, 2, 3, 4, 5].map(y => (
                            <option key={y} value={y} className="bg-zinc-900">{y} Temporadas Adicionais</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : confirmAction.type === 'shirt-number' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-white/60 uppercase tracking-widest font-black italic">Escolher Número da Camisa</p>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2 grid grid-cols-4 gap-2">
                      {Array.from({ length: 99 }, (_, i) => i + 1).map(num => {
                        const occupiedBy = players.find(pl => pl.shirtNumber === num && pl.id !== confirmAction.player.id);
                        return (
                          <button
                            key={num}
                            disabled={!!occupiedBy}
                            onClick={() => {
                              const updated = players.map(pl => 
                                pl.id === confirmAction.player.id ? { ...pl, shirtNumber: num } : pl
                              );
                              onUpdatePlayers(updated);
                              toast.success(`Camisa #${num} atribuída a ${confirmAction.player.name}`);
                              setConfirmAction(null);
                            }}
                            className={cn(
                              "h-10 rounded-lg flex flex-col items-center justify-center border transition-all relative overflow-hidden",
                              occupiedBy 
                                ? "bg-red-500/10 border-red-500/20 opacity-50 cursor-not-allowed" 
                                : "bg-white/5 border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                            )}
                          >
                            <span className="text-xs font-black">{num}</span>
                            {occupiedBy && (
                              <span className="text-[6px] uppercase font-bold text-red-400 absolute bottom-1 truncate px-1 w-full text-center">
                                {occupiedBy.name.split(' ')[0]}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : confirmAction.type === 'train' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-white/80 leading-relaxed italic">
                      Selecione o foco de treinamento individual para <strong>{confirmAction.player.name}</strong>:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {['speed', 'shooting', 'passing', 'defending', 'physical', 'dribbling'].map(key => (
                        <button
                          key={key}
                          onClick={() => {
                            const labels: Record<string, string> = { speed: 'Velocidade', shooting: 'Finalização', passing: 'Passe', defending: 'Marcação', physical: 'Físico', dribbling: 'Drible' };
                            const focusLabel = labels[key];
                            handleAction('train', confirmAction.player, key);
                            toast.success(`Foco em ${focusLabel} definido para ${confirmAction.player.name}`);
                            setConfirmAction(null);
                          }}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
                        >
                          {{ speed: 'Velocidade', shooting: 'Finalização', passing: 'Passe', defending: 'Marcação', physical: 'Físico', dribbling: 'Drible' }[key as 'speed' | 'shooting' | 'passing' | 'defending' | 'physical' | 'dribbling']}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : confirmAction.type === 'promote-youth' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-white/60 uppercase tracking-widest font-black italic">Contrato Profissional</p>
                    <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                      <p className="text-sm text-white/80 leading-relaxed">
                        Deseja assinar o primeiro contrato profissional de <strong>{confirmAction.player.name}</strong>?
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-zinc-950/50 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase font-bold mb-1">Salário Profissional</p>
                          <p className="text-sm font-black text-emerald-400">{formatMoney(500)}/s</p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-950/50 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase font-bold mb-1">Duração</p>
                          <p className="text-sm font-black text-sky-400">3 Temporadas</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/40 italic">
                        * Ao assinar, o jogador passará a integrar o elenco principal e a notícia será publicada no jornal.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-4 border-t border-white/5 bg-zinc-950/50 flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submitting}
                  onClick={closeConfirmAction}
                  className="flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-widest text-white/70 hover:bg-white/5"
                >
                  {confirmAction.type === 'shirt-number' || confirmAction.type === 'train' ? 'Voltar' : 'Cancelar'}
                </Button>
                {confirmAction.type !== 'shirt-number' && confirmAction.type !== 'train' && (
                  <Button
                    type="button"
                    disabled={submitting || (confirmAction.total && (club.budget ?? 0) < confirmAction.total)}
                    onClick={(e) => {
                      if (confirmAction.type === 'renew') {
                        handleAction('renew', confirmAction.player, 'confirm');
                        setConfirmAction(null);
                      } else if (confirmAction.type === 'auction') {
                        handleAction('auction', confirmAction.player, 'confirm');
                        setConfirmAction(null);
                      } else {
                        submitConfirmAction(e);
                      }
                    }}
                    className={cn(
                      "flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-950 shadow-lg transition-all active:scale-95",
                      confirmAction.type === 'renew' ? "bg-amber-400 hover:bg-amber-300" :
                      confirmAction.type === 'auction' ? "bg-sky-500 hover:bg-sky-400" :
                      confirmAction.type === 'transfer' ? "bg-emerald-500 hover:bg-emerald-400" :
                      "bg-sky-500 hover:bg-sky-400"
                    )}
                  >
                    {submitting ? 'Processando…' : confirmAction.type === 'renew' ? 'Assinar Contrato' : confirmAction.type === 'auction' ? 'Enviar' : 'Confirmar'}
                  </Button>
                )}
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
