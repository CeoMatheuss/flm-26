import { useState, useMemo } from 'react';
import { useScouting } from '@/hooks/useScouting';
import { toast } from 'sonner';
import { ScoutCard } from './scouting/ScoutCard';
import { MarketScoutCard } from './scouting/MarketScoutCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Globe, 
  DollarSign, 
  Loader2, 
  UserPlus, 
  Filter,
  Users,
  Compass,
  FileText,
  X,
  Plus,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ScoutsTab({ userId, budget }: { userId: string, budget: number }) {
  const { 
    myScouts, 
    marketPool, 
    missions, 
    reports, 
    loading, 
    handleHire, 
    fireScout 
  } = useScouting(userId);

  const [activeTab, setActiveTab] = useState('scouts');
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('Todas');
  const [filterLevel, setFilterLevel] = useState('Todos');

  const filteredMarket = useMemo(() => {
    return marketPool.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchRegion = filterRegion === 'Todas' || s.preferred_region === filterRegion;
      const matchLevel = filterLevel === 'Todos' || s.level === filterLevel;
      return matchSearch && matchRegion && matchLevel;
    });
  }, [marketPool, search, filterRegion, filterLevel]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary animate-pulse" />
        </div>
        <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
          Sincronizando Rede Global de Scouting
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-6 space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      {/* Dynamic Modern Header */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-white/5 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Compass className="w-48 h-48 text-white rotate-12" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              <Plus className="h-3 w-3" /> Sistema de Observação V4.0
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-white italic uppercase leading-none">
                Global <span className="text-primary">Scouting</span>
              </h1>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-widest font-black">
                    {myScouts.length}/5 Olheiros Ativos
                  </p>
                </div>
                <div className="w-px h-4 bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2 text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest font-black">
                    Disponível: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-1 rounded-2xl border border-white/5 w-full lg:w-auto overflow-x-auto no-scrollbar">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent gap-1 h-12">
                {[
                  { id: 'scouts', label: 'Equipe', icon: Users },
                  { id: 'market', label: 'Mercado', icon: Globe },
                  { id: 'reports', label: 'Relatórios', icon: FileText },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-white data-[state=active]:text-black rounded-xl px-6 font-black uppercase text-[10px] tracking-widest h-10 transition-all"
                  >
                    <tab.icon className="h-3.5 w-3.5 mr-2" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'scouts' && (
          <motion.div
            key="scouts-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {myScouts.map((scout) => (
              <ScoutCard 
                key={scout.id} 
                scout={scout} 
                onFire={fireScout} 
                onStartMission={(s) => toast.info(`Preparando missão para ${s.name}...`)}
              />
            ))}

            {myScouts.length < 5 && (
              <motion.div
                whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.2)' }}
                onClick={() => setActiveTab('market')}
                className="group border-2 border-dashed border-white/5 bg-zinc-900/20 rounded-3xl flex flex-col items-center justify-center p-12 cursor-pointer transition-all duration-500 min-h-[220px]"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:border-primary transition-all duration-500">
                  <UserPlus className="h-8 w-8 text-zinc-600 group-hover:text-black transition-colors" />
                </div>
                <h3 className="font-black text-white uppercase italic tracking-tighter text-2xl group-hover:text-primary transition-colors">Expandir Rede</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-2">Clique para contratar novos olheiros</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'market' && (
          <motion.div
            key="market-list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Market Info Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-950/60 p-6 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-white font-black uppercase italic text-sm">Mercado Rotativo</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Renovação global a cada 15 dias</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Status da Rede</p>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase">2 Profissionais Disponíveis</p>
                </div>
                <div className="w-px h-8 bg-white/10 mx-4 hidden sm:block" />
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase py-1.5 px-4 tracking-tighter italic">
                  Habilidades Aleatórias
                </Badge>
              </div>
            </div>

            {marketPool.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {marketPool.map((scout) => (
                  <MarketScoutCard 
                    key={scout.id} 
                    scout={scout} 
                    onHire={handleHire}
                    canAfford={budget >= scout.salary}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-white/5">
                  <Search className="h-8 w-8 text-zinc-700" />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic">Nenhum olheiro encontrado</h3>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto">Tente ajustar seus filtros para encontrar novos profissionais disponíveis.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div
            key="reports-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="h-20 w-20 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-6">
              <FileText className="h-10 w-10 text-zinc-700" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Central de Relatórios</h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-sm">
              As observações concluídas por seus olheiros aparecerão aqui. Envie sua equipe a campo para começar.
            </p>
            <Button 
              onClick={() => setActiveTab('scouts')}
              className="mt-8 h-12 px-10 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-primary transition-all"
            >
              Ver Olheiros Ativos
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
