import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoutV3, ScoutMissionV3, ScoutReportV3, ScoutLevel, ScoutSpecialization, MissionType } from '@/types/scoutingV3';
import { Search, UserPlus, Trash2, MapPin, Globe, Target, Star, Shield, Clock, Play, FileText, CheckCircle2, AlertCircle, X, ChevronRight, User } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScoutsTabProps {
  userId: string;
  budget: number;
}

const LEVEL_COLORS: Record<ScoutLevel, string> = {
  baixo: 'text-muted-foreground bg-muted/20',
  médio: 'text-blue-400 bg-blue-500/10',
  alto: 'text-amber-400 bg-amber-500/10',
  elite: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
};

const SPEC_LABELS: Record<ScoutSpecialization, string> = {
  ataque: '🎯 Ataque',
  defesa: '🛡️ Defesa',
  meio: '⚙️ Meio-campo',
  jovens: '💎 Promessas',
  geral: '🔍 Geral'
};

export function ScoutsTab({ userId, budget }: ScoutsTabProps) {
  const [myScouts, setMyScouts] = useState<ScoutV3[]>([]);
  const [marketScouts, setMarketScouts] = useState<ScoutV3[]>([]);
  const [missions, setMissions] = useState<ScoutMissionV3[]>([]);
  const [reports, setReports] = useState<ScoutReportV3[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMissionModal, setShowMissionModal] = useState<ScoutV3 | null>(null);
  const [activeTab, setActiveTab] = useState('scouts');

  const fetchScoutingData = async () => {
    try {
      setLoading(true);
      const [myScoutsRes, marketScoutsRes, missionsRes, reportsRes] = await Promise.all([
        supabase.from('scouts').select('*').eq('user_id', userId),
        supabase.from('scouts').select('*').eq('is_free_agent', true),
        supabase.from('scout_missions').select('*').eq('user_id', userId).eq('status', 'em_andamento'),
        supabase.from('scout_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      if (myScoutsRes.data) setMyScouts(myScoutsRes.data as ScoutV3[]);
      if (marketScoutsRes.data) setMarketScouts(marketScoutsRes.data as ScoutV3[]);
      if (missionsRes.data) setMissions(missionsRes.data as ScoutMissionV3[]);
      if (reportsRes.data) setReports(reportsRes.data as ScoutReportV3[]);
    } catch (error) {
      console.error('Error fetching scouting data:', error);
      toast.error('Erro ao carregar dados de olheiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoutingData();
  }, [userId]);

  const handleHireScout = async (scout: ScoutV3) => {
    if (myScouts.length >= 5) {
      toast.error('Limite de olheiros atingido (Máx: 5)');
      return;
    }

    const { error } = await supabase
      .from('scouts')
      .update({ 
        user_id: userId, 
        is_free_agent: false,
        seasons_remaining: 5 
      })
      .eq('id', scout.id);

    if (error) {
      toast.error('Erro ao contratar olheiro');
    } else {
      toast.success(`${scout.name} contratado por 5 temporadas!`);
      fetchScoutingData();
    }
  };

  const handleFireScout = async (scoutId: string) => {
    const { error } = await supabase
      .from('scouts')
      .update({ 
        user_id: null, 
        is_free_agent: true,
        is_busy: false 
      })
      .eq('id', scoutId);

    if (error) {
      toast.error('Erro ao dispensar olheiro');
    } else {
      toast.success('Olheiro dispensado e agora está livre no mercado.');
      fetchScoutingData();
    }
  };

  const startMission = async (scoutId: string, type: MissionType, level: ScoutLevel) => {
    // Duração baseada na habilidade (em horas para teste, mas sistema pede dias)
    // Para Engine V3 real: Baixo (120h), Médio (72-96h), Alto (48-72h), Elite (24-48h)
    // Para visualização no preview vamos usar horas reduzidas:
    const durationMap: Record<ScoutLevel, number> = {
      'baixo': 120,
      'médio': 84,
      'alto': 60,
      'elite': 36
    };
    
    const durationHours = durationMap[level];
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + durationHours);

    const { error } = await supabase.from('scout_missions').insert([{
      user_id: userId,
      scout_id: scoutId,
      type,
      ends_at: endsAt.toISOString(),
      risk: Math.random() * 0.3,
      reward_multiplier: 1.0 + (Math.random() * 0.5)
    }]);

    if (error) toast.error('Erro ao iniciar missão');
    else {
      toast.success('Olheiro enviado para campo!');
      setShowMissionModal(null);
      fetchScoutingData();
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando scouting...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 sm:p-4">
      {/* Header Estilizado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2 text-white">
            <Search className="h-6 w-6 text-primary" /> SCOUTING ENGINE V3
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            {activeTab === 'scouts' ? 'Gerencie seu departamento de olheiros' : 
             activeTab === 'market' ? 'Contrate novos talentos para sua equipe' :
             'Relatórios de campo detalhados'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="scouts" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-2xl mb-6 bg-black/40 border border-white/5 p-1 h-12">
          <TabsTrigger value="scouts" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-black">
            MEUS OLHEIROS ({myScouts.length}/5)
          </TabsTrigger>
          <TabsTrigger value="market" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-black">
            MERCADO ({marketScouts.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-black">
            RELATÓRIOS ({reports.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA: MEUS OLHEIROS */}
        <TabsContent value="scouts" className="space-y-4">
          {myScouts.length === 0 ? (
            <Card className="border-dashed border-2 bg-black/20 border-white/10">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="font-black text-xl text-white uppercase italic">Nenhum olheiro vinculado</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">Vá ao mercado para contratar profissionais e começar a mapear o mundo.</p>
                <Button onClick={() => setActiveTab('market')} className="font-black uppercase tracking-tighter h-12 px-8">Explorar Mercado</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myScouts.map(scout => {
                const activeMission = missions.find(m => m.scout_id === scout.id);
                return (
                  <Card key={scout.id} className={`overflow-hidden border-white/5 bg-black/40 transition-all hover:border-primary/40 ${scout.is_busy ? 'opacity-90' : ''}`}>
                    <CardContent className="p-0">
                      <div className="flex items-stretch">
                        <div className={`w-28 sm:w-36 bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center p-4 border-r border-white/5`}>
                          <div className="relative mb-3">
                            <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-primary/20 flex items-center justify-center shadow-2xl">
                              <User className="h-10 w-10 text-primary/40" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-black border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-black text-primary">
                              {scout.seasons_remaining}T
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[9px] uppercase font-black px-2 py-0.5 ${LEVEL_COLORS[scout.level]}`}>
                            {scout.level}
                          </Badge>
                        </div>

                        <div className="flex-1 p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-black text-base text-white uppercase italic leading-tight">{scout.name}</h3>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1 mt-1">
                                <Globe className="h-3 w-3" /> {scout.country}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="secondary" className="text-[9px] font-black bg-white/5 text-zinc-300 border-white/5">
                                {SPEC_LABELS[scout.specialization]}
                              </Badge>
                              {scout.seasons_remaining <= 1 && (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[8px] font-black uppercase">Expirando</Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] uppercase font-black text-muted-foreground">
                                <span>Expertise</span>
                                <span className="text-white">{Math.round(scout.efficiency * 100)}%</span>
                              </div>
                              <Progress value={scout.efficiency * 100} className="h-1 bg-white/5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] uppercase font-black text-muted-foreground">
                                <span>Contrato</span>
                                <span className="text-white">{scout.seasons_remaining}/5</span>
                              </div>
                              <Progress value={(scout.seasons_remaining / 5) * 100} className="h-1 bg-white/5" />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {scout.is_busy && activeMission ? (
                              <div className="flex-1 bg-primary/5 rounded border border-primary/20 p-2 space-y-1.5">
                                <div className="flex justify-between items-center text-[9px] font-black uppercase text-primary italic">
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 animate-pulse" /> {activeMission.type}</span>
                                  <span>{formatDistanceToNow(new Date(activeMission.ends_at), { locale: ptBR })}</span>
                                </div>
                                <Progress value={50} className="h-1 bg-primary/20" />
                              </div>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => setShowMissionModal(scout)}
                                  className="flex-1 h-9 text-[10px] font-black uppercase tracking-tighter gap-2 shadow-lg shadow-primary/10"
                                >
                                  <Play className="h-3 w-3" /> Iniciar Missão
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
                                  onClick={() => handleFireScout(scout.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA: MERCADO */}
        <TabsContent value="market" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketScouts.length === 0 ? (
              <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed border-white/5 rounded-xl">
                Nenhum olheiro disponível no mercado no momento.
              </div>
            ) : (
              marketScouts.map(scout => (
                <Card key={scout.id} className="bg-zinc-900/40 border-white/5 hover:border-primary/20 transition-all overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-zinc-500" />
                      </div>
                      <div>
                        <h4 className="font-black text-white uppercase italic text-sm">{scout.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[8px] font-black uppercase ${LEVEL_COLORS[scout.level]}`}>
                            {scout.level}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-bold">{scout.country}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 mb-5">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-muted-foreground uppercase">Especialidade</span>
                        <span className="text-zinc-300">{SPEC_LABELS[scout.specialization]}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-muted-foreground uppercase">Precisão</span>
                        <span className="text-primary">{Math.round(scout.efficiency * 100)}%</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full h-10 font-black uppercase text-[10px] gap-2"
                      onClick={() => handleHireScout(scout)}
                      disabled={myScouts.length >= 5}
                    >
                      <UserPlus className="h-3 w-3" /> Contratar (5 Temp.)
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ABA: RELATÓRIOS */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-black/20 border-2 border-dashed border-white/5 rounded-xl">
              <FileText className="h-16 w-16 mx-auto mb-6 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-50">Aguardando relatórios de campo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map(report => (
                <Card key={report.id} className="group hover:border-primary/40 transition-all cursor-pointer bg-zinc-900/40 border-white/5 overflow-hidden">
                  <div className="bg-primary/5 p-4 border-b border-white/5 flex justify-between items-center">
                    <Badge className="bg-primary text-black font-black text-[9px] px-2">
                      {report.player_data.position}
                    </Badge>
                    <div className="text-right">
                      <div className="text-[8px] text-muted-foreground uppercase font-black">Média Estimada</div>
                      <div className="text-lg font-black text-white italic">~{report.player_data.overall}</div>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h4 className="font-black text-white uppercase italic truncate text-sm">{report.player_data.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black mt-1">
                        <span>{report.player_data.age} ANOS</span>
                        <span>•</span>
                        <span>{report.player_data.nationality}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      <div>
                        <div className="text-[8px] text-muted-foreground uppercase font-black">Potencial</div>
                        <div className="text-xs font-black text-blue-400 italic">~{report.player_data.potential}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] text-muted-foreground uppercase font-black">Status</div>
                        <div className="text-xs font-black text-zinc-300 uppercase">{report.player_data.status || 'Disponível'}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 h-8 text-[9px] font-black uppercase border-white/10 hover:bg-white/5">
                        Relatório
                      </Button>
                      <Button className="flex-1 h-8 text-[9px] font-black uppercase">
                        Contratar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Missão Estilizado */}
      {showMissionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-white/5 bg-zinc-900 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-transparent p-6 border-b border-white/5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-black tracking-tight uppercase italic text-white leading-none">Diretrizes de Missão</CardTitle>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Defina o foco do olheiro</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowMissionModal(null)} className="text-white/50 hover:text-white">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-primary/20 flex items-center justify-center text-primary/60">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase text-white italic">{showMissionModal.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-[8px] font-black uppercase ${LEVEL_COLORS[showMissionModal.level]}`}>
                      {showMissionModal.level}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">{SPEC_LABELS[showMissionModal.specialization]}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'local', icon: MapPin, label: 'Busca Local', time: '2h', reward: 'Relatório Regional', color: 'text-blue-400' },
                  { id: 'global', icon: Globe, label: 'Busca Global', time: '6h', reward: 'Mapeamento Mundial', color: 'text-emerald-400' },
                  { id: 'posição', icon: Target, label: 'Foco Posição', time: '4h', reward: 'Necessidade do Elenco', color: 'text-amber-400' },
                  { id: 'promessas', icon: Star, label: 'Jovens Promessas', time: '8h', reward: 'Foco no Futuro', color: 'text-purple-400' }
                ].map(type => (
                  <Button 
                    key={type.id} 
                    variant="outline" 
                    className="group justify-between h-16 px-5 border-white/5 bg-black/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    onClick={() => startMission(showMissionModal.id, type.id as MissionType)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-zinc-900 border border-white/5 group-hover:border-primary/20 ${type.color}`}>
                        <type.icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black uppercase text-white leading-none group-hover:text-primary transition-colors">{type.label}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1 tracking-tighter">{type.reward}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-white italic">{type.time}</div>
                      <div className="text-[8px] text-muted-foreground uppercase font-bold">Duração</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
