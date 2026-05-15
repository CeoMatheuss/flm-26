import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Player, Club } from '@/types/game';
import { SeasonData, YouthProspect } from '@/types/infrastructure';
import { TacticsTab } from '../TacticsTab';
import { YouthAcademyModernTab } from './YouthAcademyModernTab';
import { SquadHeader } from './SquadHeader';
import { PlayerRow } from './PlayerRow';
import { PlayerDetailPanel } from './PlayerDetailPanel';
import { useAttributeEvolution } from './useAttributeEvolution';
import { getPlayerStatus } from './squadHelpers';
import { toast } from 'sonner';

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
      // Fallback: top 11 by sort
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

  // Group rendering by position for the squad tab
  const grouped = useMemo(() => {
    const m = new Map<string, Player[]>();
    POS_ORDER.forEach(p => m.set(p, []));
    sorted.forEach(p => m.get(p.position)?.push(p));
    return m;
  }, [sorted]);

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white">
      <SquadHeader club={club} season={season} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 sm:px-5 pt-3 pb-2 border-b border-white/5 bg-zinc-950/80">
          <TabsList className="bg-white/[0.03] border border-white/5 p-1 h-9 gap-1 rounded-xl">
            <TabsTrigger value="squad"   className="text-[11px] font-bold uppercase tracking-wider rounded-lg px-3 h-7 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">Elenco</TabsTrigger>
            <TabsTrigger value="youth"   className="text-[11px] font-bold uppercase tracking-wider rounded-lg px-3 h-7 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">Base</TabsTrigger>
            <TabsTrigger value="tactics" className="text-[11px] font-bold uppercase tracking-wider rounded-lg px-3 h-7 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">Tático</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="squad" className="h-full m-0 overflow-y-auto px-3 sm:px-5 py-4 space-y-5">
            {POS_ORDER.map(pos => {
              const list = grouped.get(pos) ?? [];
              if (!list.length) return null;
              return (
                <section key={pos}>
                  <header className="flex items-center gap-2 mb-2 px-1">
                    <span className="w-1 h-4 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">{pos}</h3>
                    <span className="text-[10px] text-white/30 font-bold">{list.length}</span>
                  </header>
                  <div className="space-y-1.5">
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
                </section>
              );
            })}
            {!players.length && (
              <div className="text-center py-16 text-white/40 text-sm">Nenhum jogador no elenco.</div>
            )}
          </TabsContent>

          <TabsContent value="youth" className="h-full m-0 overflow-y-auto p-3 sm:p-5">
            <YouthAcademyModernTab
              prospects={youthProspects}
              onPromote={onPromoteYouth}
              monthlyInvestment={youthInvestment}
              onSetInvestment={onSetYouthInvestment}
            />
          </TabsContent>

          <TabsContent value="tactics" className="h-full m-0 overflow-y-auto p-3 sm:p-5">
            <TacticsTab players={players} tactics={tactics} onUpdate={() => {}} />
          </TabsContent>
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
