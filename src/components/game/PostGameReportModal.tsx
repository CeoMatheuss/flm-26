import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Star, Target, Shield, Zap, DollarSign, Heart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface ReportData {
  general: {
    competition: string;
    userTeam: string;
    oppTeam: string;
    userGoals: number;
    oppGoals: number;
    resultType: string;
    isHome: boolean;
  };
  positives: string[];
  negatives: string[];
  highlights: {
    bestPlayer: { name: string; position: string; rating: number; goals: number; assists: number } | null;
    worstPlayer: { name: string; position: string; rating: number } | null;
    topScorer: { name: string; goals: number } | null;
    topAssister: { name: string; assists: number } | null;
    manOfTheMatch: string | undefined;
  };
  tactical: string[];
  tacticalImpact?: Array<{ side: 'home'|'away'|'both'; name: string; impact: string; kind: string; detail?: string }>;
  impacts: {
    moraleChange: number;
    rankingChange: number;
    attendance: number;
    revenue: number;
    fatigue: number;
    fansChange?: number;
    fanMessage?: string;
  };
}

interface AggregateInfo {
  homeTeam: string;
  awayTeam: string;
  leg1Home: number;
  leg1Away: number;
  leg2Home: number;
  leg2Away: number;
  aggHome: number;
  aggAway: number;
  advanced: 'home' | 'away';
  tieBreaker: 'aggregate' | 'extra_time' | 'penalties';
  shootoutHome?: number;
  shootoutAway?: number;
  summary: string;
}

interface Props {
  matchDbId: string;
  onClose: () => void;
}

export function PostGameReportModal({ matchDbId, onClose }: Props) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [aggregate, setAggregate] = useState<AggregateInfo | null>(null);
  const [result, setResult] = useState<string>('draw');
  const [rankingImpact, setRankingImpact] = useState(0);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: history } = await supabase
        .from('match_history')
        .select('id, home_team, away_team, home_goals, away_goals')
        .eq('live_match_id', matchDbId)
        .maybeSingle();

      if (!history) { setLoading(false); return; }

      setHomeTeam(history.home_team);
      setAwayTeam(history.away_team);
      setHomeGoals(history.home_goals);
      setAwayGoals(history.away_goals);

      const { data: reportRow } = await supabase
        .from('match_reports')
        .select('*')
        .eq('match_history_id', history.id)
        .maybeSingle();

      if (reportRow) {
        const rd = reportRow.report_data as any;
        setReport(rd as ReportData);
        setAggregate((rd?.aggregate as AggregateInfo) ?? null);
        setResult(reportRow.result);
        setRankingImpact(reportRow.ranking_impact);
      }
      setLoading(false);
    };
    load();
  }, [matchDbId]);

  if (loading) return null;
  if (!report) return null;

  const resultLabel = result === 'win' ? 'VITÓRIA' : result === 'loss' ? 'DERROTA' : 'EMPATE';
  const resultColor = result === 'win' ? 'text-emerald-400' : result === 'loss' ? 'text-red-400' : 'text-yellow-400';
  const resultBg = result === 'win' ? 'bg-emerald-500/10 border-emerald-500/30' : result === 'loss' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30';

  const tieBreakerLabel = aggregate
    ? aggregate.tieBreaker === 'penalties' ? `Pênaltis ${aggregate.shootoutHome}x${aggregate.shootoutAway}`
    : aggregate.tieBreaker === 'extra_time' ? 'Prorrogação'
    : 'Placar agregado'
    : '';

  const advancedName = aggregate
    ? (aggregate.advanced === 'home' ? aggregate.homeTeam : aggregate.awayTeam)
    : '';

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-2" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">📊 Relatório Pós-Jogo</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-3">
            {/* Score */}
            <div className={`p-4 rounded-xl border text-center ${resultBg}`}>
              <p className="text-xs text-muted-foreground mb-1">{report.general.competition}</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm font-bold">{homeTeam}</span>
                <span className="text-2xl font-black font-mono">{homeGoals} x {awayGoals}</span>
                <span className="text-sm font-bold">{awayTeam}</span>
              </div>
              <Badge className={`mt-2 ${resultColor} border-current`} variant="outline">{resultLabel}</Badge>
            </div>

            {/* Aggregate (two-legged knockout only) */}
            {aggregate && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5 text-amber-400">
                    🔁 Confronto Ida e Volta — Placar Agregado
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="text-center">
                      <p className="text-muted-foreground">Ida</p>
                      <p className="font-mono font-bold">{aggregate.leg1Home} x {aggregate.leg1Away}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Volta</p>
                      <p className="font-mono font-bold">{aggregate.leg2Home} x {aggregate.leg2Away}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Agregado</p>
                      <p className="font-mono font-black text-amber-400">{aggregate.aggHome} x {aggregate.aggAway}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-center pt-1 border-t border-amber-500/20">
                    <p>
                      <span className="text-muted-foreground">Critério: </span>
                      <span className="font-semibold">{tieBreakerLabel}</span>
                    </p>
                    <p className="mt-1 font-bold text-emerald-400">🏆 {advancedName} avança</p>
                  </div>
                </CardContent>
              </Card>
            )}


            {/* Ranking Impact */}
            <div className="flex items-center justify-center gap-2">
              {rankingImpact > 0 ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : rankingImpact < 0 ? <TrendingDown className="h-4 w-4 text-red-400" /> : null}
              <span className={`text-sm font-bold ${rankingImpact > 0 ? 'text-emerald-400' : rankingImpact < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                Ranking: {rankingImpact > 0 ? '+' : ''}{rankingImpact} pts
              </span>
            </div>

            {/* Positives */}
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5 text-emerald-400"><Target className="h-3.5 w-3.5" /> Pontos Positivos</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                {report.positives.map((p, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">✅ {p}</p>
                ))}
              </CardContent>
            </Card>

            {/* Negatives */}
            {report.negatives.length > 0 && (
              <Card className="border-red-500/20">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5 text-red-400"><Shield className="h-3.5 w-3.5" /> Pontos a Melhorar</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1">
                  {report.negatives.map((n, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground">⚠️ {n}</p>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Individual Highlights */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-yellow-400" /> Destaques Individuais</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {report.highlights.bestPlayer && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-1 opacity-10"><Star className="w-8 h-8 text-amber-500" /></div>
                      <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">⭐ Melhor</p>
                      <p className="text-xs font-bold truncate">{report.highlights.bestPlayer.name}</p>
                      <p className="text-[10px] font-mono font-bold text-amber-400">Nota {report.highlights.bestPlayer.rating.toFixed(1)}</p>
                      {(report.highlights.bestPlayer.goals > 0 || report.highlights.bestPlayer.assists > 0) && (
                        <p className="text-[9px] text-emerald-400 mt-0.5">{report.highlights.bestPlayer.goals}⚽ {report.highlights.bestPlayer.assists}🅰️</p>
                      )}
                    </div>
                  )}
                  {report.highlights.worstPlayer && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-red-400 font-black uppercase tracking-widest">📉 A melhorar</p>
                      <p className="text-xs font-bold truncate">{report.highlights.worstPlayer.name}</p>
                      <p className="text-[10px] font-mono text-red-400 opacity-80">Nota {report.highlights.worstPlayer.rating.toFixed(1)}</p>
                    </div>
                  )}
                  {report.highlights.topScorer && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-primary font-black uppercase tracking-widest">⚽ Artilheiro</p>
                      <p className="text-xs font-bold truncate">{report.highlights.topScorer.name}</p>
                      <p className="text-[10px] text-primary font-bold">{report.highlights.topScorer.goals} gol(s)</p>
                    </div>
                  )}
                  {report.highlights.topAssister && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">🅰️ Garçom</p>
                      <p className="text-xs font-bold truncate">{report.highlights.topAssister.name}</p>
                      <p className="text-[10px] text-blue-400 font-bold">{report.highlights.topAssister.assists} assist.</p>
                    </div>
                  )}
                </div>
                {report.highlights.manOfTheMatch && (
                  <div className="mt-2 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 italic">
                        Craque do Jogo: {report.highlights.manOfTheMatch}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tactical Analysis */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Análise Tática</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                {report.tactical.map((t, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">📋 {t}</p>
                ))}
                {report.tacticalImpact && report.tacticalImpact.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Impacto tático mensurado</p>
                    {report.tacticalImpact.map((f, i) => (
                      <div key={i} className="text-[10px] flex items-start gap-1.5">
                        <span className={`px-1 rounded text-[9px] font-bold ${f.side==='home'?'bg-emerald-500/20 text-emerald-300':f.side==='away'?'bg-red-500/20 text-red-300':'bg-blue-500/20 text-blue-300'}`}>{f.side==='home'?'NÓS':f.side==='away'?'ADV':'JOGO'}</span>
                        <span className="flex-1"><span className="font-medium">{f.name}</span> <span className="text-amber-300">{f.impact}</span>{f.detail && <span className="block text-[9px] text-muted-foreground italic">{f.detail}</span>}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Impacts */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-pink-400" /> Impactos</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span>😊 Moral:</span>
                    <span className={report.impacts.moraleChange > 0 ? 'text-emerald-400' : report.impacts.moraleChange < 0 ? 'text-red-400' : 'text-muted-foreground'}>
                      {report.impacts.moraleChange > 0 ? '+' : ''}{report.impacts.moraleChange}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📊 Ranking:</span>
                    <span className={report.impacts.rankingChange > 0 ? 'text-emerald-400' : report.impacts.rankingChange < 0 ? 'text-red-400' : 'text-muted-foreground'}>
                      {report.impacts.rankingChange > 0 ? '+' : ''}{report.impacts.rankingChange} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Bilheteria: FL${(report.impacts.revenue / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>🏟️ Público: {report.impacts.attendance.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>😓 Desgaste: -{report.impacts.fatigue}%</span>
                  </div>
                  {report.impacts.fansChange !== undefined && (
                    <div className="flex items-center gap-1 col-span-2 pt-1 border-t border-white/5">
                      <Users className="h-3 w-3 text-primary" />
                      <span className="font-bold">Torcida: </span>
                      <span className={report.impacts.fansChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {report.impacts.fansChange > 0 ? '+' : ''}{report.impacts.fansChange.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-muted-foreground italic ml-1">— {report.impacts.fanMessage}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={onClose}>Fechar Relatório</Button>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
