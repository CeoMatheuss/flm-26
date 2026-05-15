import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Player, Club } from '@/types/game';
import { SeasonData, YouthProspect } from '@/types/infrastructure';
import { TacticsTab } from '../TacticsTab';
import { YouthAcademyModernTab } from './YouthAcademyModernTab';
import { SquadHeader } from './SquadHeader';
import { PlayerRow } from './PlayerRow';
import { PremiumPlayerCard } from './cards/PremiumPlayerCard';
import { PlayerDetailPanel } from './PlayerDetailPanel';
import { useAttributeEvolution } from './useAttributeEvolution';
import { getPlayerStatus } from './squadHelpers';
import { toast } from 'sonner';
import { LayoutGrid, List, Users, Shield, Sparkles, Trophy } from 'lucide-react';
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
  youthInvestment: number;
  onSetYouthInvestment: (amount: number) => void;
}

const POS_ORDER = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

export function SquadModernLayout({
  club, season, players, tactics, onUpdatePlayers,
  youthProspects, onPromoteYouth, youthInvestment, onSetYouthInvestment,
}: SquadModernProps) {
  const [activeTab, setActiveTab] = useState<'squad' | 'youth' | 'tactics'>('squad');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const deltas = useAttributeEvolution(players);

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      const pA = POS_ORDER.indexOf(a.position);
      const pB = POS_ORDER.indexOf(b.position);
      if (pA !== pB) return pA - pB;
      return b.overall - a.overall;
    });
  }, [players]);

  const starterIds = useMemo(() => {
    const ids = new Set<string>();
    const lineup = (tactics?.lineup ?? tactics?.startingXI ?? tactics?.starting_xi) as string[] | undefined;
    if (Array.isArray(lineup)) {
      lineup.forEach(id => id && ids.add(id));
    } else {
      sorted.slice(0, 11).forEach(p => ids.add(p.id));
    }
    return ids;
  }, [tactics, sorted]);

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

  const grouped = useMemo(() => {
    const m = new Map<string, Player[]>();
    POS_ORDER.forEach(p => m.set(p, []));
    sorted.forEach(p => m.get(p.position)?.push(p));
    return m;
  }, [sorted]);

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white selection:bg-emerald-500/30">
      <SquadHeader 
        club={club} 
        season={season} 
        viewMode={viewMode} 
        onViewModeChange={setViewMode}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Tab Navigation */}
        <div className="px-4 sm:px-6 py-2 bg-zinc-950/50 border-b border-white/5 flex items-center justify-between">
          <TabsList className="bg-white/5 border border-white/5 p-1 h-10 gap-1 rounded-2xl">
            <TabTrigger value="squad" icon={<Users className="w-3.5 h-3.5" />} label="Elenco" />
            <TabTrigger value="youth" icon={<Sparkles className="w-3.5 h-3.5" />} label="Base" />
            <TabTrigger value="tactics" icon={<Shield className="w-3.5 h-3.5" />} label="Tático" />
          </TabsList>

          {activeTab === 'squad' && (
            <div className="hidden sm:flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-xl">
              <ViewToggle active={viewMode === 'grid'} onClick={() => setViewMode('grid')} icon={<LayoutGrid className="w-3.5 h-3.5" />} />
              <ViewToggle active={viewMode === 'list'} onClick={() => setViewMode('list')} icon={<List className="w-3.5 h-3.5" />} />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <TabsContent key={activeTab} value={activeTab} className="h-full m-0 overflow-y-auto outline-none">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "h-full p-4 sm:p-6",
                  activeTab === 'squad' ? "space-y-8" : ""
                )}
              >
                {activeTab === 'squad' && (
                  <>
                    {POS_ORDER.map(pos => {
                      const list = grouped.get(pos) ?? [];
                      if (!list.length) return null;
                      return (
                        <section key={pos} className="space-y-4">
                          <header className="flex items-center gap-3 px-1">
                            <div className="flex flex-col">
                              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                {pos}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
                                <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">{list.length} Atletas</span>
                              </div>
                            </div>
                          </header>

                          {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-6">
                              {list.map(p => (
                                <PremiumPlayerCard
                                  key={p.id}
                                  player={p}
                                  isStarter={starterIds.has(p.id)}
                                  selected={selectedId === p.id}
                                  onClick={() => handleSelect(p.id)}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {list.map(p => (
                                <PlayerRow
                                  key={p.id}
                                  player={p}
                                  status={getPlayerStatus(p, starterIds.has(p.id))}
                                  selected={selectedId === p.id}
                                  onClick={() => handleSelect(p.id)}
                                />
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}
                    {!players.length && (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mb-4 text-white/20">
                          <Users className="w-8 h-8" />
                        </div>
                        <h4 className="text-white font-bold">Nenhum jogador</h4>
                        <p className="text-white/40 text-sm mt-1">Seu elenco está vazio.</p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'youth' && (
                  <YouthAcademyModernTab
                    prospects={youthProspects}
                    onPromote={onPromoteYouth}
                    monthlyInvestment={youthInvestment}
                    onSetInvestment={onSetYouthInvestment}
                  />
                )}

                {activeTab === 'tactics' && (
                  <TacticsTab players={players} tactics={tactics} onUpdate={() => {}} />
                )}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </div>
      </Tabs>

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
        "text-[11px] font-black uppercase tracking-widest rounded-xl px-4 h-8 gap-2",
        "transition-all duration-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-zinc-950 data-[state=active]:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
      )}
    >
      {icon}
      <span>{label}</span>
    </TabsTrigger>
  );
}

function ViewToggle({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
        active ? "bg-emerald-500 text-zinc-950" : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
    </button>
  );
}
