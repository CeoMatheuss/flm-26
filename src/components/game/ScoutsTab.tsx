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

  const startMission = async (scoutId: string, type: MissionType) => {
    const durationHours = type === 'local' ? 2 : type === 'global' ? 6 : type === 'posição' ? 4 : 8;
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
      toast.success('Missão iniciada!');
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
          <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" /> DEPARTAMENTO DE SCOUTING
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Descubra os próximos craques do {scouts.length > 0 ? 'clube' : 'mercado'}</p>
        </div>
        {scouts.length < 5 && (
          <Button onClick={handleHireInitialScout} className="gap-2 font-bold shadow-lg shadow-primary/20">
            <UserPlus className="h-4 w-4" /> CONTRATAR OLHEIRO
          </Button>
        )}
      </div>

      <Tabs defaultValue="scouts" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
          <TabsTrigger value="scouts" className="font-bold">Olheiros ({scouts.length})</TabsTrigger>
          <TabsTrigger value="reports" className="font-bold">Relatórios ({reports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scouts" className="space-y-4">
          {scouts.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/5">
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-bold">Nenhum olheiro na equipe</h3>
                <p className="text-sm text-muted-foreground mb-6">Contrate seu primeiro olheiro para começar a descobrir talentos.</p>
                <Button onClick={handleHireInitialScout} variant="outline" className="font-bold">Iniciar Departamento</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scouts.map(scout => {
                const activeMission = missions.find(m => m.scout_id === scout.id);
                return (
                  <Card key={scout.id} className={`overflow-hidden transition-all hover:border-primary/40 ${scout.is_busy ? 'opacity-90 grayscale-[0.3]' : ''}`}>
                    <CardContent className="p-0">
                      <div className="flex items-stretch">
                        {/* Avatar/Icone do Olheiro */}
                        <div className={`w-24 sm:w-32 bg-gradient-to-b from-muted to-muted/30 flex flex-col items-center justify-center p-4 border-r ${scout.is_busy ? 'bg-primary/5' : ''}`}>
                          <div className="w-16 h-16 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center mb-2 shadow-inner">
                            <User className="h-8 w-8 text-primary/50" />
                          </div>
                          <Badge variant="outline" className={`text-[10px] uppercase font-black ${LEVEL_COLORS[scout.level]}`}>
                            {scout.level}
                          </Badge>
                        </div>

                        {/* Info do Olheiro */}
                        <div className="flex-1 p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-sm sm:text-base">{scout.name}</h3>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">🌍 {scout.country}</p>
                            </div>
                            <Badge variant="secondary" className="text-[9px] font-bold">
                              {SPEC_LABELS[scout.specialization]}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                              <span>Eficiência</span>
                              <span>{Math.round(scout.efficiency * 100)}%</span>
                            </div>
                            <Progress value={scout.efficiency * 100} className="h-1" />
                          </div>

                          {scout.is_busy && activeMission ? (
                            <div className="bg-primary/5 rounded-lg p-2 space-y-1.5 border border-primary/10">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase text-primary">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Missão {activeMission.type}</span>
                                <span>Finaliza em {formatDistanceToNow(new Date(activeMission.ends_at), { locale: ptBR })}</span>
                              </div>
                              <Progress value={50} className="h-1.5 bg-primary/10" />
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => setShowMissionModal(scout)}
                              className="w-full h-8 text-[11px] font-black uppercase tracking-tighter gap-2"
                            >
                              <Play className="h-3 w-3" /> Enviar em Missão
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Nenhum relatório disponível ainda. Envie seus olheiros em missões!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map(report => (
                <Card key={report.id} className="group hover:border-emerald-500/50 transition-all cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-black text-[10px]">
                        {report.player_data.position}
                      </Badge>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">OVR Estimado</div>
                        <div className="text-lg font-black text-primary">~{report.player_data.overall}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm truncate">{report.player_data.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                        <span>{report.player_data.age} ANOS</span>
                        <span>•</span>
                        <span>🌍 {report.player_data.nationality}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-muted/50">
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase font-black">Potencial</div>
                        <div className="text-xs font-bold text-blue-400">~{report.player_data.potential}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-muted-foreground uppercase font-black">Precisão</div>
                        <div className="text-xs font-bold">{report.accuracy}%</div>
                      </div>
                    </div>

                    <Button variant="secondary" size="sm" className="w-full h-7 text-[10px] font-black group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      VER DETALHES
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Missão (Simples para MVP) */}
      {showMissionModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black tracking-tight uppercase italic">Nova Missão Scouting</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowMissionModal(null)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {showMissionModal.name[0]}
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-primary">{showMissionModal.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Nível: {showMissionModal.level}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'local', icon: MapPin, label: 'Missão Local', time: '2h', reward: 'Relatório Simples' },
                  { id: 'global', icon: Globe, label: 'Missão Global', time: '6h', reward: 'Grandes Talentos' },
                  { id: 'posição', icon: Target, label: 'Foco Posição', time: '4h', reward: 'Alvos Específicos' },
                  { id: 'promessas', icon: Star, label: 'Jovens Promessas', time: '8h', reward: 'Futuros Craques' }
                ].map(type => (
                  <Button 
                    key={type.id} 
                    variant="outline" 
                    className="justify-between h-12 px-4 hover:border-primary/50"
                    onClick={() => startMission(showMissionModal.id, type.id as MissionType)}
                  >
                    <div className="flex items-center gap-3">
                      <type.icon className="h-4 w-4 text-primary" />
                      <div className="text-left">
                        <p className="text-[11px] font-black uppercase leading-none">{type.label}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{type.reward}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">{type.time}</Badge>
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
