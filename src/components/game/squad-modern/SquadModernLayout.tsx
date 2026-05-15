import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Player, Club } from '@/types/game';
import { SeasonData, YouthProspect } from '@/types/infrastructure';
import { TacticsTab } from '../TacticsTab';
import { YouthAcademyModernTab } from './YouthAcademyModernTab';
import { SquadHeader } from './SquadHeader';
import { PlayerRow } from './PlayerRow';
import { SquadMainTable } from './SquadMainTable';
import { PlayerDetailPanel } from './PlayerDetailPanel';
import { useAttributeEvolution } from './useAttributeEvolution';
import { getPlayerStatus, avgStamina } from './squadHelpers';
import { toast } from 'sonner';
import { Users, Shield, Sparkles, Ban, Clock, Share2, LayoutDashboard } from 'lucide-react';
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
}

export function SquadModernLayout({
  club, season, players, tactics, onUpdatePlayers,
  youthProspects, onPromoteYouth, onSellYouth, onEnrollCopinha, onUpgradeAcademy,
  youthInvestment, onSetYouthInvestment,
  userId, infrastructure
}: SquadModernProps) {
  const [activeTab, setActiveTab] = useState<string>('titulares');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'pitch'>('list');

  const deltas = useAttributeEvolution(players);

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

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
  };

  const handleAction = (action: string, p: Player) => {
    switch (action) {
      case 'lineup':
      case 'bench':
        toast.info(`${p.name} — abra a aba Tático para alterar a escalação.`);
        break;
      case 'transfer':
        toast.info(`${p.name} pode ser listado no Mercado.`);
        break;
      case 'renew':
        toast.success(`Negociação de renovação iniciada com ${p.name}.`);
        break;
      case 'train':
        toast.info(`${p.name} foi adicionado ao foco de treino.`);
        break;
      case 'medical':
        toast.info(`${p.name} foi enviado ao departamento médico.`);
        break;
      case 'captain':
        toast.success(`${p.name} é o novo capitão!`);
        break;
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white selection:bg-emerald-500/30 overflow-hidden">
      <SquadHeader 
        club={club} 
        season={season} 
        viewMode={viewMode} 
        onViewModeChange={(mode) => setViewMode(mode as any)} 
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Main Content Area: Tabs & Tables */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-500",
          viewMode === 'pitch' ? "hidden xl:flex" : "flex"
        )}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            {/* Horizontal Sub-tabs */}
            <div className="px-4 sm:px-6 py-3 bg-zinc-950/50 border-b border-white/5 overflow-x-auto scrollbar-hide">
              <TabsList className="bg-white/5 border border-white/5 p-1 h-12 gap-1 rounded-2xl shrink-0">
                <TabTrigger value="titulares" icon={<Shield className="w-3.5 h-3.5" />} label="Titulares" />
                <TabTrigger value="reservas" icon={<Users className="w-3.5 h-3.5" />} label="Reservas" />
                <TabTrigger value="base" icon={<Sparkles className="w-3.5 h-3.5" />} label="Juniores" />
                <TabTrigger value="fora" icon={<Ban className="w-3.5 h-3.5" />} label="Fora" />
                <TabTrigger value="suspensos" icon={<Clock className="w-3.5 h-3.5" />} label="Suspensos" />
                <TabTrigger value="emprestados" icon={<Share2 className="w-3.5 h-3.5" />} label="Emprestados" />
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <TabsContent key={activeTab} value={activeTab} className="h-full m-0 outline-none">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full p-4 sm:p-6"
                  >
                    {activeTab === 'base' ? (
                      <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                         <YouthAcademyModernTab
                           prospects={youthProspects}
                           onPromote={onPromoteYouth}
                           monthlyInvestment={youthInvestment}
                           onSetInvestment={onSetYouthInvestment}
                           academyLevel={infrastructure?.youthAcademy?.level ?? 0}
                           budget={club.budget}
                           hasScouts={(club.scouts || []).length > 0}
                           currentSeason={season?.currentSeason || 1}
                           onSell={onSellYouth || (() => {})}
                           onEnrollCopinha={onEnrollCopinha || (() => {})}
                           onUpgradeAcademy={onUpgradeAcademy || (() => {})}
                         />
                      </div>
                    ) : (
                      <SquadMainTable 
                        players={players} 
                        starterIds={starterIds}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        activeTab={activeTab}
                      />
                    )}
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>

        {/* Tactical Panel (Desktop Right Side or Mobile Overlay) */}
        <div className={cn(
          "w-full xl:w-[480px] flex-col border-l border-white/5 bg-zinc-950/50 overflow-hidden relative group transition-all duration-500",
          viewMode === 'pitch' ? "flex" : "hidden xl:flex"
        )}>
           {/* Section Header */}
           <div className="p-6 border-b border-white/5 flex items-center justify-between">
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
                    {tactics.formation}
                 </span>
              </div>
           </div>

           {/* Tactical Tabbed Content */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <TacticsTab 
                players={players} 
                tactics={tactics} 
                onUpdate={() => {}} 
                season={season?.currentSeason}
                userId={userId}
              />
           </div>

           {/* Quick Actions Footer */}
           <div className="p-6 border-t border-white/5 bg-zinc-950/80">
              <button 
                 onClick={() => toast.success('Escalação Inteligente aplicada com sucesso!')}
                 className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black italic uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                 <Sparkles className="w-5 h-5" />
                 Otimizar Elenco
              </button>
           </div>
        </div>
      </div>

      <PlayerDetailPanel
        player={selectedPlayer}
        status={selectedStatus}
        delta={selectedDelta}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onAction={handleAction}
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
