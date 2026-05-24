import { useState, useMemo } from 'react';
import { YouthProspect, getYouthTierByMonthlyCost, youthInvestmentTiers } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="bg-muted/50 p-2 px-3 rounded-lg flex items-center gap-2 w-full lg:w-auto">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-wider">Plantel da Base</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar jovem..." 
                className="pl-9 bg-card/40 border-border/30 h-10 sm:h-9 text-xs font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="w-full sm:w-auto bg-card/40 border border-border/30 rounded-md h-10 sm:h-9 px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none appearance-none sm:appearance-auto"
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

        <div className="space-y-4">
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
        </div>
      </div>

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
