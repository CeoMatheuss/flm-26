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
}

export function SquadModernLayout({
  club, season, players, tactics, onUpdatePlayers, onUpdateTactics, onRest,
  youthProspects, onPromoteYouth, onSellYouth, onEnrollCopinha, onUpgradeAcademy,
  youthInvestment, onSetYouthInvestment,
  userId, infrastructure, lastYouthGenAt, isPremium
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

  const handleAction = (action: 'renew' | 'transfer' | 'loan-out' | 'auction' | 'shirt-number' | 'train' | 'promote-youth', p: Player) => {
    switch (action) {
      case 'transfer':
        toast.info(`${p.name} pode ser listado no Mercado.`);
        break;
      case 'loan-out':
        toast.info(`${p.name} disponibilizado para empréstimo.`);
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
          if (isTacticsOpen && window.innerWidth < 1280) {
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
            (viewMode === 'pitch' || isTacticsOpen) ? "hidden xl:flex" : "flex"
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

        {/* Tactical Panel (Desktop Right Side or Mobile Overlay) */}
        <AnimatePresence>
          {isTacticsOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 50, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 'auto' }}
              exit={{ opacity: 0, x: 50, width: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "w-full xl:w-[400px] 2xl:w-[450px] flex-col border border-white/5 bg-zinc-900/30 rounded-[2.5rem] overflow-hidden relative group shrink-0",
                (viewMode === 'pitch' || isTacticsOpen) ? "flex" : "hidden xl:flex"
              )}
            >
               {/* Section Header */}
               <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-950/20">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                     </div>
                     <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-white italic">Centro Tático</h2>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Configurações de Jogo</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        {actualFormation}
                     </span>
                  </div>
               </div>

               {/* Tactical Tabbed Content */}
               <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
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
