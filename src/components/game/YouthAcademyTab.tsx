import { useState, useMemo } from 'react';
import { YouthProspect, getYouthTierByMonthlyCost, youthInvestmentTiers } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Filter, GraduationCap, Coins, 
  Trophy, Info, Sparkles, ChevronRight,
  TrendingUp, Award, Clock, Newspaper, Dumbbell
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { useLiveMatchGuard } from './LiveMatchGuard';
import { YouthAcademyHeader } from './YouthAcademyHeader';
import { YouthPlayerCard } from './YouthPlayerCard';
import { YouthPlayerDetailModal } from './YouthPlayerDetailModal';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  prospects: YouthProspect[];
  academyLevel: number;
  academyUpgradeCompletesAt?: string;
  isPremium?: boolean;
  monthlyInvestment: number;
  budget: number;
  hasScouts: boolean;
  currentSeason: number;
  lastYouthGenAt?: string;
  onPromote: (id: string) => void;
  onSell: (id: string) => void;
  onEnrollCopinha: () => void;
  onSetInvestment: (amount: number) => void;
  onUpgradeAcademy?: () => void;
}

export function YouthAcademyTab({
  prospects, academyLevel, academyUpgradeCompletesAt, isPremium = false,
  monthlyInvestment, budget, hasScouts, currentSeason, lastYouthGenAt,
  onPromote: _onPromote, onSell: _onSell, onEnrollCopinha: _onEnrollCopinha, 
  onSetInvestment: _onSetInvestment, onUpgradeAcademy: _onUpgradeAcademy,
}: Props) {
  const { guard } = useLiveMatchGuard();
  const onPromote = guard(_onPromote);
  const onSell = guard(_onSell);
  const onEnrollCopinha = guard(_onEnrollCopinha);
  const onSetInvestment = guard(_onSetInvestment);
  const onUpgradeAcademy = _onUpgradeAcademy ? guard(_onUpgradeAcademy) : undefined;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<YouthProspect | null>(null);

  const currentTier = getYouthTierByMonthlyCost(monthlyInvestment);
  const copinhaUnlocked = currentSeason >= 2;
  const eligibleForCopinha = prospects.filter(p => p.age <= 20).length;

  const filteredProspects = useMemo(() => {
    return prospects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPos = filterPos === 'ALL' || p.position === filterPos;
      return matchesSearch && matchesPos;
    }).sort((a, b) => (b.potential || 0) - (a.potential || 0));
  }, [prospects, searchTerm, filterPos]);

  const avgPotential = prospects.length > 0 
    ? prospects.reduce((acc, p) => acc + (p.potential || 0), 0) / prospects.length 
    : 0;

  const isConstructing = !!academyUpgradeCompletesAt && new Date(academyUpgradeCompletesAt).getTime() > Date.now();
  const constructionProgress = (() => {
    if (!isConstructing || !academyUpgradeCompletesAt) return 0;
    const target = new Date(academyUpgradeCompletesAt).getTime();
    const start = target - 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - start;
    return Math.max(0, Math.min(100, (elapsed / (24 * 60 * 60 * 1000)) * 100));
  })();
  const constructionRemaining = (() => {
    if (!isConstructing || !academyUpgradeCompletesAt) return '';
    const diff = new Date(academyUpgradeCompletesAt).getTime() - Date.now();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  })();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <YouthAcademyHeader 
        lastYouthGenAt={lastYouthGenAt || new Date().toISOString()}
        totalPlayers={prospects.length}
        academyLevel={academyLevel}
        avgPotential={avgPotential}
        isConstructing={isConstructing}
        constructionRemaining={constructionRemaining}
        constructionProgress={constructionProgress}
      />

      <Tabs defaultValue="list" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="list" className="gap-2"><GraduationCap className="h-4 w-4" /> Elenco da Base</TabsTrigger>
            <TabsTrigger value="copinha" className="gap-2"><Trophy className="h-4 w-4" /> Copinha</TabsTrigger>
            <TabsTrigger value="news" className="gap-2"><Newspaper className="h-4 w-4" /> Notícias</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar jovem..." 
                className="pl-9 bg-card/40 border-border/30 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="bg-card/40 border border-border/30 rounded-md h-9 px-3 text-xs focus:ring-1 focus:ring-primary outline-none"
              value={filterPos}
              onChange={(e) => setFilterPos(e.target.value)}
            >
              <option value="ALL">Todas as Posições</option>
              <option value="GOL">Goleiros</option>
              <option value="ZAG">Zagueiros</option>
              <option value="LAT">Laterais</option>
              <option value="VOL">Volantes</option>
              <option value="MEI">Meias</option>
              <option value="ATA">Atacantes</option>
            </select>
          </div>
        </div>

        <TabsContent value="list" className="space-y-4 m-0">
          {!hasScouts && prospects.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-xs">
                Contrate um <strong>olheiro</strong> para revelar o potencial real e descobrir se você tem um craque geracional na base!
              </p>
              <Button size="sm" variant="outline" className="ml-auto shrink-0 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-[10px]">
                Ir para Staff
              </Button>
            </motion.div>
          )}

          {filteredProspects.length === 0 ? (
            <div className="text-center py-20 bg-card/20 rounded-2xl border-2 border-dashed border-border/20">
              <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-bold text-muted-foreground">Nenhum jovem encontrado</h3>
              <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-2">
                Sua academia ainda não gerou talentos para esta busca. Continue investindo!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredProspects.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <YouthPlayerCard 
                      prospect={p} 
                      onClick={setSelectedPlayer}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="investment" className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
          <Card className="game-card overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b border-border/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Plano de Investimento da Academia
              </CardTitle>
              <CardDescription>
                A qualidade dos jovens depende do Nível da Base. O investimento mensal determina a quantidade de talentos gerados.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {youthInvestmentTiers.map((t, idx) => {
                  const isActive = currentTier.tier === t.tier;
                  return (
                    <motion.button
                      key={t.tier}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => onSetInvestment(t.monthlyCost)}
                      className={`flex flex-col text-left rounded-2xl border transition-all p-5 relative overflow-hidden group ${
                        isActive
                          ? 'bg-primary/10 border-primary ring-1 ring-primary/30 shadow-[0_0_20px_rgba(37,99,235,0.15)]'
                          : 'bg-card/40 border-border/30 hover:border-primary/50 hover:bg-card/60'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 transition-colors'}`}>
                        {t.emoji}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t.label}</span>
                      <span className="text-xl font-black mb-1">
                        {formatMoney(t.monthlyCost)}
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">/mês</span>
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{t.description}</p>
                      
                      <div className="mt-auto pt-4 border-t border-border/10 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-primary flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3" /> +{t.qualityBonus}% Qualidade
                         </span>
                         {isActive && <Badge className="bg-primary text-primary-foreground text-[8px] font-bold px-2 py-0.5">ATIVO</Badge>}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copinha" className="m-0 animate-in fade-in slide-in-from-bottom-2">
           <Card className="game-card-accent border-amber-500/30 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Trophy className="h-48 w-48" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-amber-400" />
                  Copa São Paulo de Juniores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold">A maior vitrine do futebol de base</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        A Copinha é o momento onde os olheiros de todo o mundo estão de olho. 
                        Participar garante um boost imenso na evolução dos seus jogadores Sub-20.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-xl bg-card border border-border/50">
                          <p className="text-2xl font-black text-amber-400">{eligibleForCopinha}</p>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Elegíveis (≤20a)</p>
                       </div>
                       <div className="p-4 rounded-xl bg-card border border-border/50">
                          <p className="text-2xl font-black text-primary">{currentSeason >= 2 ? 'Aberta' : 'Bloqueada'}</p>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Status Inscrição</p>
                       </div>
                    </div>

                    <Button 
                      size="lg"
                      disabled={!copinhaUnlocked || eligibleForCopinha < 11}
                      onClick={onEnrollCopinha}
                      className="w-full gap-2 bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-700 hover:to-amber-500 text-black font-black"
                    >
                      <Trophy className="h-5 w-5" />
                      Inscrever na Copinha
                    </Button>
                    {!copinhaUnlocked && <p className="text-[10px] text-center text-muted-foreground">Disponível a partir da Temporada 2</p>}
                    {eligibleForCopinha < 11 && <p className="text-[10px] text-center text-red-400">Você precisa de pelo menos 11 jogadores Sub-20</p>}
                  </div>

                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800" 
                      className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
                      alt="Estádio lotado"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10">
                       <p className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                          <Sparkles className="h-3 w-3 text-amber-400" /> Benefícios da Vitória
                       </p>
                       <ul className="text-[10px] text-gray-300 space-y-1">
                          <li>• +15 OVR para os destaques do título</li>
                          <li>• Valor de mercado quadriplicado</li>
                          <li>• Reputação da base elevada ao máximo</li>
                       </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="news" className="m-0 animate-in fade-in slide-in-from-bottom-2">
           <Card className="game-card border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-primary" />
                  Mural da Academia
                </CardTitle>
                <CardDescription>
                  Fique por dentro do que acontece nos bastidores da nossa fábrica de talentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Automatic News Items */}
                  {[
                    { title: 'Treino de Finalização em Alta', text: 'Os atacantes da base mostraram pontaria afiada no coletivo de hoje.', date: 'Hoje', type: 'training' },
                    { title: 'Olheiro Impressionado', text: 'Um olheiro europeu foi visto nas arquibancadas observando nossos meias.', date: 'Ontem', type: 'market' },
                    { title: 'Exemplo de Conduta', text: 'A nova safra de jogadores tem se destacado pela disciplina e moral elevada.', date: '2 dias atrás', type: 'morale' }
                  ].map((news, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-all cursor-default group">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        news.type === 'training' ? 'bg-primary/20 text-primary' : 
                        news.type === 'market' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {news.type === 'training' ? <Dumbbell className="h-6 w-6" /> : 
                         news.type === 'market' ? <Search className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{news.title}</h4>
                          <span className="text-[10px] text-muted-foreground">{news.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{news.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      <YouthPlayerDetailModal 
        prospect={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        onPromote={(id) => { onPromote(id); setSelectedPlayer(null); }}
        onSell={(id) => { onSell(id); setSelectedPlayer(null); }}
      />
    </div>
  );
}
