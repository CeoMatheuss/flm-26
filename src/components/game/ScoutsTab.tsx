import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/tabs-scout';
import { 
  ScoutV3, 
  ScoutMissionV3, 
  ScoutReportV3, 
  ScoutLevel, 
  ScoutSpecialization, 
  MissionType, 
  RegionType,
  ScoutMarketPool 
} from '@/types/scoutingV3';
import { 
  Search, 
  UserPlus, 
  Trash2, 
  MapPin, 
  Globe, 
  Target, 
  Star, 
  Shield, 
  Clock, 
  Play, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight, 
  User, 
  Loader2,
  TrendingUp,
  Zap,
  Award,
  DollarSign,
  Calendar,
  Compass,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, addYears, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const LEVEL_CONFIG: Record<ScoutLevel, { color: string, label: string }> = {
  'Amador': { color: 'text-gray-400 bg-gray-500/10', label: 'Amador' },
  'Regional': { color: 'text-blue-400 bg-blue-500/10', label: 'Regional' },
  'Nacional': { color: 'text-purple-400 bg-purple-500/10', label: 'Nacional' },
  'Internacional': { color: 'text-amber-400 bg-amber-500/10', label: 'Internacional' },
  'Elite Mundial': { color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30', label: 'Elite Mundial' }
};

const SPEC_LABELS: Record<ScoutSpecialization, string> = {
  ataque: '🎯 Ataque',
  defesa: '🛡️ Defesa',
  meio: '⚙️ Meio-campo',
  jovens: '💎 Promessas',
  geral: '🔍 Geral'
};

const REGIONS: RegionType[] = ['Brasil', 'América do Sul', 'Europa', 'África', 'Ásia', 'América do Norte'];

export function ScoutsTab({ userId, budget }: { userId: string, budget: number }) {
  const [myScouts, setMyScouts] = useState<ScoutV3[]>([]);
  const [marketPool, setMarketPool] = useState<ScoutMarketPool[]>([]);
  const [missions, setMissions] = useState<ScoutMissionV3[]>([]);
  const [reports, setReports] = useState<ScoutReportV3[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scouts');
  const [selectedScout, setSelectedScout] = useState<ScoutV3 | null>(null);
  const SCOUT_LIMIT = 5;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scoutsRes, marketRes, missionsRes, reportsRes] = await Promise.all([
        supabase.from('scouts').select('*').eq('user_id', userId),
        supabase.from('scout_market_pool').select('*').gt('expires_at', new Date().toISOString()),
        supabase.from('scout_missions').select('*').eq('user_id', userId).eq('status', 'em_andamento'),
        supabase.from('scout_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      if (scoutsRes.data) setMyScouts(scoutsRes.data as ScoutV3[]);
      if (marketRes.data) setMarketPool(marketRes.data as ScoutMarketPool[]);
      if (missionsRes.data) setMissions(missionsRes.data as ScoutMissionV3[]);
      if (reportsRes.data) setReports(reportsRes.data as ScoutReportV3[]);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do scouting');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const handleHire = async (scout: ScoutMarketPool) => {
    if (myScouts.length >= SCOUT_LIMIT) {
      toast.error(`Limite de olheiros atingido (Máx: ${SCOUT_LIMIT})`);
      return;
    }

    const contractEnd = addYears(new Date(), 5).toISOString();

    const { error } = await supabase.from('scouts').insert([{
      user_id: userId,
      name: scout.name,
      country: scout.country,
      level: scout.level,
      specialization: scout.specialization,
      potential_evaluation: scout.potential_evaluation,
      technical_evaluation: scout.technical_evaluation,
      analysis_speed: scout.analysis_speed,
      youth_discovery: scout.youth_discovery,
      reputation: scout.reputation,
      salary: scout.salary,
      preferred_region: scout.preferred_region,
      efficiency: (scout.potential_evaluation + scout.technical_evaluation) / 200,
      contract_start: new Date().toISOString(),
      contract_end: contractEnd,
      seasons_remaining: 5,
      is_busy: false,
      is_free_agent: false
    }]);

    if (error) {
      toast.error('Erro ao contratar olheiro');
    } else {
      await supabase.from('scout_market_pool').delete().eq('id', scout.id);
      toast.success(`${scout.name} contratado por 5 temporadas!`);
      fetchData();
    }
  };

  const renderAttribute = (label: string, value: number, icon: any) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
        <span className="flex items-center gap-1">{icon} {label}</span>
        <span className={value > 80 ? 'text-emerald-400' : value > 60 ? 'text-amber-400' : 'text-red-400'}>{value}</span>
      </div>
      <Progress value={value} className="h-1 bg-white/5" indicatorClassName={value > 80 ? 'bg-emerald-500' : value > 60 ? 'bg-amber-500' : 'bg-red-500'} />
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground animate-pulse font-black uppercase tracking-[0.2em]">Sincronizando Rede Global de Scouting...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      {/* Dynamic Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-black/60 p-8 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white italic uppercase flex items-center gap-3">
              Global Scouting Network
              <Badge className="bg-primary text-black font-black text-[10px]">V3.5</Badge>
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                <Globe className="h-3 w-3" /> {myScouts.length} Profissionais em campo
              </p>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                <DollarSign className="h-3 w-3" /> Budget: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {['scouts', 'market', 'missions', 'reports'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab)}
              className={`font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl transition-all ${
                activeTab === tab ? 'shadow-lg shadow-primary/20 scale-105' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab === 'scouts' && 'Meus Olheiros'}
              {tab === 'market' && 'Mercado'}
              {tab === 'missions' && 'Missões'}
              {tab === 'reports' && 'Relatórios'}
            </Button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'scouts' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {myScouts.map((scout) => (
              <Card key={scout.id} className="bg-black/40 border-white/5 overflow-hidden group hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5">
                <div className="relative h-32 bg-gradient-to-br from-zinc-900 to-black p-6 flex justify-between items-start">
                  <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
                    <Compass className="absolute -right-10 -bottom-10 w-40 h-40 text-white" />
                  </div>
                  <div className="z-10 flex gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-xl">
                      <User className="w-10 h-10 text-zinc-600" />
                    </div>
                    <div className="pt-2">
                      <h3 className="font-black text-white uppercase italic text-lg leading-tight group-hover:text-primary transition-colors">{scout.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[8px] font-black uppercase ${LEVEL_CONFIG[scout.level]?.color || ''}`}>
                          {scout.level}
                        </Badge>
                        <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {scout.country}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="z-10">
                    <Award className={`h-6 w-6 ${scout.reputation > 80 ? 'text-emerald-400' : 'text-zinc-600'}`} />
                  </div>
                </div>

                <CardContent className="p-6 space-y-6 bg-zinc-950/50">
                  <div className="grid grid-cols-2 gap-4">
                    {renderAttribute('Potencial', scout.potential_evaluation, <TrendingUp className="h-3 w-3" />)}
                    {renderAttribute('Técnica', scout.technical_evaluation, <Zap className="h-3 w-3" />)}
                    {renderAttribute('Velocidade', scout.analysis_speed, <Clock className="h-3 w-3" />)}
                    {renderAttribute('Base', scout.youth_discovery, <Star className="h-3 w-3" />)}
                  </div>

                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-zinc-500">Contrato</span>
                      <span className="text-white flex items-center gap-2">
                        {format(new Date(scout.contract_end), 'MMM yyyy', { locale: ptBR })}
                        <Badge className="bg-white/5 text-[8px]">{scout.seasons_remaining}T</Badge>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-zinc-500">Salário Semanal</span>
                      <span className="text-emerald-400 font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(scout.salary)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-zinc-500">Foco Regional</span>
                      <span className="text-primary italic">{scout.preferred_region}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 h-11 font-black uppercase text-[10px] tracking-widest gap-2 bg-white text-black hover:bg-primary hover:text-black border-none">
                      <Play className="h-3 w-3" /> Iniciar Missão
                    </Button>
                    <Button variant="outline" className="h-11 border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 font-black uppercase text-[10px]">
                      Renovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {myScouts.length < SCOUT_LIMIT && (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveTab('market')}
                className="border-2 border-dashed border-white/5 bg-black/20 rounded-3xl flex flex-col items-center justify-center p-12 cursor-pointer hover:bg-white/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all">
                  <UserPlus className="h-8 w-8 text-white/20 group-hover:text-primary transition-all" />
                </div>
                <h3 className="font-black text-zinc-500 uppercase italic tracking-tighter text-xl group-hover:text-white">Vaga Disponível</h3>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2">Expanda seu departamento</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'market' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {marketPool.map((scout) => (
              <Card key={scout.id} className="bg-zinc-900/40 border-primary/10 overflow-hidden relative">
                <div className="absolute top-4 right-4 z-10">
                   <Badge className="bg-primary text-black font-black text-[9px]">Livre no Mercado</Badge>
                </div>
                
                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-zinc-800/50 to-transparent">
                  <div className="flex gap-4 items-center mb-6">
                    <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/10">
                      <User className="h-8 w-8 text-zinc-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-xl italic uppercase leading-none">{scout.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[8px] font-black uppercase ${LEVEL_CONFIG[scout.level as ScoutLevel]?.color}`}>
                          {scout.level}
                        </Badge>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{scout.country}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {renderAttribute('Potencial', scout.potential_evaluation, null)}
                    {renderAttribute('Técnica', scout.technical_evaluation, null)}
                    {renderAttribute('Recrutamento', scout.youth_discovery, null)}
                    {renderAttribute('Reputação', scout.reputation, null)}
                  </div>
                </div>

                <div className="p-6 space-y-4 bg-black/60">
                   <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-zinc-500" />
                        <div>
                          <p className="text-[8px] text-zinc-500 font-black uppercase">Pretensão Salarial</p>
                          <p className="text-sm font-black text-emerald-400 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(scout.salary)}/sem
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-zinc-500 font-black uppercase">Contrato Sugerido</p>
                        <p className="text-sm font-black text-white italic">5 Temporadas</p>
                      </div>
                   </div>

                   <Button 
                    onClick={() => handleHire(scout)}
                    className="w-full h-12 font-black uppercase tracking-widest bg-primary text-black hover:bg-white transition-all shadow-xl shadow-primary/10"
                   >
                     Assinar Contrato Profissional
                   </Button>
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
