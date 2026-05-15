import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { YouthProspect, potentialTierInfo, evolutionStatusInfo } from '@/types/infrastructure';
import { 
  User, Calendar, Ruler, Weight, Footprints, Flag, 
  TrendingUp, BarChart3, GraduationCap, Coins, 
  Zap, Heart, Award, Newspaper, Target, Dumbbell,
  ShieldCheck, ArrowUpCircle, Info, Star, Crown
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

interface Props {
  prospect: YouthProspect | null;
  isOpen: boolean;
  onClose: () => void;
  onPromote: (id: string) => void;
  onSell: (id: string) => void;
}

export function YouthPlayerDetailModal({ prospect, isOpen, onClose, onPromote, onSell }: Props) {
  if (!prospect) return null;

  const potTier = prospect.potentialTier ?? 'comum';
  const potInfo = potentialTierInfo[potTier];
  const evoStatus = prospect.evolutionStatus ?? 'estavel';
  const evoInfo = evolutionStatusInfo[evoStatus];

  const radarData = [
    { subject: 'Passe', A: prospect.attributes.passing, fullMark: 100 },
    { subject: 'Final.', A: prospect.attributes.shooting, fullMark: 100 },
    { subject: 'Defesa', A: prospect.attributes.defending, fullMark: 100 },
    { subject: 'Veloc.', A: prospect.attributes.speed, fullMark: 100 },
    { subject: 'Drible', A: prospect.attributes.dribbling, fullMark: 100 },
    { subject: 'Físico', A: prospect.attributes.physical, fullMark: 100 },
  ];

  // Mock evolution data if evolutionHistory is empty
  const chartData = prospect.evolutionHistory && prospect.evolutionHistory.length > 0
    ? prospect.evolutionHistory.map(h => ({
        date: new Date(h.date).toLocaleDateString('pt-BR', { month: 'short' }),
        overall: h.overall
      }))
    : [
        { date: 'Mês 1', overall: prospect.overall - 2 },
        { date: 'Mês 2', overall: prospect.overall - 1 },
        { date: 'Atual', overall: prospect.overall }
      ];

  const getMoraleLabel = (val: number) => {
    if (val >= 80) return { label: 'Feliz', color: 'text-emerald-400' };
    if (val >= 60) return { label: 'Motivado', color: 'text-primary' };
    if (val >= 40) return { label: 'Neutro', color: 'text-amber-400' };
    return { label: 'Insatisfeito', color: 'text-red-400' };
  };

  const moraleInfo = getMoraleLabel(prospect.morale ?? 60);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-primary/20 bg-background/95 backdrop-blur-xl">
        {/* Banner Section */}
        <div className="relative h-48 w-full bg-gradient-to-br from-primary/20 via-background to-accent/20 overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(37,99,235,0.1),transparent)]" />
          
          <div className="absolute bottom-0 left-0 w-full p-6 flex items-end gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-3xl bg-card border-2 border-primary/30 flex items-center justify-center text-6xl shadow-2xl">
                👤
              </div>
              <div className="absolute -top-3 -left-3">
                <Badge className="bg-primary text-primary-foreground font-black text-lg px-3 py-1 rounded-xl shadow-lg">
                  {prospect.position}
                </Badge>
              </div>
              {prospect.rarity === 'Craque geracional' && (
                <div className="absolute -top-3 -right-3 animate-pulse">
                  <Crown className="h-8 w-8 text-amber-400 fill-amber-400" />
                </div>
              )}
            </div>

            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black tracking-tight">{prospect.name}</h2>
                {prospect.rarity !== 'Comum' && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 uppercase font-black text-[10px]">
                    {prospect.rarity}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><Flag className="h-4 w-4" /> {prospect.nationality}</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {prospect.age} anos</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-400" /> OVR {prospect.overall}</span>
                <span className="text-muted-foreground/30">•</span>
                <span className={`flex items-center gap-1.5 ${potInfo.color}`}>{potInfo.emoji} Potencial {prospect.potential}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={() => onPromote(prospect.id)} className="gap-2 bg-primary hover:bg-primary/90 font-bold px-6">
                <ArrowUpCircle className="h-4 w-4" /> Subir Profissional
              </Button>
              <Button variant="outline" onClick={() => onSell(prospect.id)} className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 font-bold">
                Dispensar / Vender
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto">
              <TabsTrigger value="info" className="gap-2 px-4 py-2"><User className="h-4 w-4" /> Info & Atributos</TabsTrigger>
              <TabsTrigger value="development" className="gap-2 px-4 py-2"><TrendingUp className="h-4 w-4" /> Desenvolvimento</TabsTrigger>
              <TabsTrigger value="training" className="gap-2 px-4 py-2"><Dumbbell className="h-4 w-4" /> Treinamento</TabsTrigger>
              <TabsTrigger value="contract" className="gap-2 px-4 py-2"><ShieldCheck className="h-4 w-4" /> Contrato & Moral</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Personal Details */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-2"><Ruler className="h-3.5 w-3.5" /> Altura</span>
                      <span className="text-sm font-bold">{prospect.height ?? 175} cm</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-2"><Weight className="h-3.5 w-3.5" /> Peso</span>
                      <span className="text-sm font-bold">{prospect.weight ?? 70} kg</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-2"><Footprints className="h-3.5 w-3.5" /> Pé Dominante</span>
                      <span className="text-sm font-bold">{prospect.dominantFoot ?? 'Destro'}</span>
                    </div>
                    <div className="flex flex-col p-3 rounded-xl bg-card border border-border/50">
                      <span className="text-xs text-muted-foreground mb-2 flex items-center gap-2"><Award className="h-3.5 w-3.5" /> Posições</span>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">{prospect.position}</Badge>
                        {prospect.secondaryPositions?.map(p => (
                          <Badge key={p} variant="outline">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-2"><Coins className="h-3.5 w-3.5" /> Valor de Mercado</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-400">{formatMoney(Number(prospect.marketValue))}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Estimado com base em potencial e idade</p>
                  </div>
                </div>

                {/* Radar Chart */}
                <div className="md:col-span-1 flex flex-col items-center justify-center p-4 bg-card rounded-2xl border border-border/50">
                   <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 w-full">Equilíbrio de Atributos</h3>
                   <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                        <Radar
                          name="Atributos"
                          dataKey="A"
                          stroke="#2563eb"
                          fill="#2563eb"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                   </div>
                </div>

                {/* Main Stats Grid */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Atributos Técnicos</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(prospect.attributes).filter(([k, v]) => v != null && k !== 'goalkeeping').slice(0, 8).map(([key, val]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                          <span>{key === 'shooting' ? 'Finalização' : key === 'passing' ? 'Passe' : key === 'speed' ? 'Velocidade' : key === 'defending' ? 'Defesa' : key === 'physical' ? 'Físico' : key === 'dribbling' ? 'Drible' : key}</span>
                          <span className={Number(val) >= 70 ? 'text-emerald-400' : Number(val) >= 50 ? 'text-primary' : 'text-amber-400'}>{val}</span>
                        </div>
                        <Progress value={Number(val)} className="h-1" />
                      </div>
                    ))}
                    {/* Extra Attributes */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                        <span>Interceptação</span>
                        <span className="text-primary">{prospect.interception ?? 50}</span>
                      </div>
                      <Progress value={prospect.interception ?? 50} className="h-1" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                        <span>Inteligência Tática</span>
                        <span className="text-primary">{prospect.tacticalIQ ?? 50}</span>
                      </div>
                      <Progress value={prospect.tacticalIQ ?? 50} className="h-1" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="development" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="game-card p-6 border-border/50">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-6"><BarChart3 className="h-4 w-4 text-primary" /> Curva de Crescimento (OVR)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorOvr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" fontSize={10} />
                        <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="overall" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorOvr)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="space-y-4">
                  <div className="p-6 rounded-2xl bg-card border border-border/50">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Target className="h-4 w-4 text-primary" /> Previsão de Potencial</h3>
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center">
                         <span className="text-2xl font-black">{prospect.potential}</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Baseado na evolução atual e genética, este jogador tem 
                          <strong className="text-foreground"> alta probabilidade </strong> de atingir o nível 
                          <strong className="text-primary uppercase ml-1">{potInfo.label}</strong>.
                        </p>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="bg-primary/5 text-primary">Estilo: {prospect.personality}</Badge>
                          <Badge variant="secondary" className="bg-amber-500/5 text-amber-400">Pico: 23-25 anos</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-card border border-border/50">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Newspaper className="h-4 w-4 text-primary" /> Notícias & Relatórios</h3>
                    <div className="space-y-3">
                      <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">🎓</div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Relatório Mensal</p>
                          <p className="text-[10px] text-muted-foreground">Jogador mostra dedicação excepcional nos treinos de finalização.</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center shrink-0">🔥</div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Interesse de Clubes</p>
                          <p className="text-[10px] text-muted-foreground">Clubes da série B começam a observar o desenvolvimento do jovem.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="training" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl bg-card border border-border/50">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-6"><Dumbbell className="h-4 w-4 text-primary" /> Foco de Treinamento</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['Geral', 'Finalização', 'Passe', 'Físico'].map(focus => (
                        <Button 
                          key={focus}
                          variant={prospect.trainingFocus === focus.toLowerCase() ? 'default' : 'outline'}
                          className="h-12 font-bold"
                          onClick={() => {}} // Handle set focus
                        >
                          {focus}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-card border border-border/50">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-6"><TrendingUp className="h-4 w-4 text-primary" /> Intensidade</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['Leve', 'Moderado', 'Pesado'].map(intensity => (
                        <Button 
                          key={intensity}
                          variant={prospect.trainingIntensity === intensity.toLowerCase() ? 'default' : 'outline'}
                          className={`h-10 text-[10px] font-bold ${intensity === 'Pesado' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : ''}`}
                          onClick={() => {}} // Handle set intensity
                        >
                          {intensity}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3 text-center">Treinos pesados evoluem mais rápido, mas aumentam o cansaço.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="game-card p-6 border-border/50">
                    <h3 className="text-sm font-bold mb-6">Status Físico</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-yellow-400" /> Energia</span>
                          <span>{prospect.energy ?? 100}%</span>
                        </div>
                        <Progress value={prospect.energy ?? 100} className="h-2 bg-background/50" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-2"><Heart className="h-3.5 w-3.5 text-red-400" /> Resistência</span>
                          <span>{prospect.staminaStat ?? 50}/99</span>
                        </div>
                        <Progress value={prospect.staminaStat ?? 50} className="h-2 bg-background/50" />
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                         <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">Cansaço Acumulado</p>
                         <p className="text-lg font-bold text-red-400">{prospect.fatigue ?? 0}%</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contract" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-primary" /> Vínculo com o Clube</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-xs text-muted-foreground">Status do Contrato</span>
                      <Badge className="bg-primary/10 text-primary border-primary/30 uppercase text-[10px] font-black">
                        {prospect.contractStatus ?? 'Base'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-xs text-muted-foreground">Expectativa</span>
                      <span className="text-sm font-bold text-foreground italic">"{prospect.playerExpectation ?? 'Evoluir e estrear no profissional'}"</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-xs text-muted-foreground">Tempo na Academia</span>
                      <span className="text-sm font-bold">{prospect.monthsInAcademy ?? 0} meses</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-2"><Heart className="h-4 w-4 text-red-400" /> Clima & Moral</h3>
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className={`text-4xl font-black mb-1 ${moraleInfo.color}`}>{prospect.morale ?? 60}</div>
                    <div className={`text-sm font-bold uppercase tracking-widest ${moraleInfo.color}`}>{moraleInfo.label}</div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-center gap-3">
                       <Info className="h-4 w-4 text-primary shrink-0" />
                       <p className="text-[10px] text-muted-foreground">
                        Jogadores com moral alta evoluem mais rápido e têm menos chances de pedir para sair.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
