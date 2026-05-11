import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  RefreshCw, 
  Zap, 
  Play, 
  Trash2, 
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NationalCup {
  id: string;
  name: string;
  country_code: string;
  season: number;
  status: 'scheduled' | 'in_progress' | 'finished';
  current_round: number;
  total_rounds: number;
}

interface CupMatch {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'finished';
  round: number;
  home_team?: { club_name: string; club_logo: string };
  away_team?: { club_name: string; club_logo: string };
}

export function CupsOverviewTab() {
  const [cups, setCups] = useState<NationalCup[]>([]);
  const [matches, setMatches] = useState<Record<string, CupMatch[]>>({});
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedCup, setExpandedCup] = useState<string | null>(null);

  const loadCups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('national_cups')
        .select('*')
        .order('country_code');
      
      if (error) throw error;
      setCups(data || []);
    } catch (e: any) {
      toast.error("Erro ao carregar copas");
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async (cupId: string) => {
    try {
      const { data: teams } = await supabase
        .from('national_cup_teams')
        .select('id, club_name, club_logo')
        .eq('cup_id', cupId);

      const teamMap = (teams || []).reduce((acc: any, t) => {
        acc[t.id] = t;
        return acc;
      }, {});

      const { data: mData, error } = await supabase
        .from('national_cup_matches')
        .select('*')
        .eq('cup_id', cupId)
        .order('round', { ascending: true });

      if (error) throw error;

      const formattedMatches = (mData || []).map(m => ({
        ...m,
        home_team: teamMap[m.home_team_id],
        away_team: teamMap[m.away_team_id]
      }));

      setMatches(prev => ({ ...prev, [cupId]: formattedMatches }));
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCups();
  }, []);

  const handleAction = async (action: string) => {
    const password = "ADM112828";
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('national-cup-manager', {
        body: { action, password }
      });

      if (error) throw error;
      
      toast.success(data.message || "Ação concluída");
      await loadCups();
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar ação");
    } finally {
      setProcessing(false);
    }
  };

  const toggleCup = (cupId: string) => {
    if (expandedCup === cupId) {
      setExpandedCup(null);
    } else {
      setExpandedCup(cupId);
      if (!matches[cupId]) {
        loadMatches(cupId);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Gerenciamento de Copas Nacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              onClick={() => handleAction('generate_all_national_cups')}
              disabled={processing || loading}
              className="gap-1.5 h-8 text-[11px]"
            >
              <Zap className="h-3.5 w-3.5" /> Gerar Todas as Copas
            </Button>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => handleAction('advance_phase')}
              disabled={processing || loading}
              className="gap-1.5 h-8 text-[11px]"
            >
              <Play className="h-3.5 w-3.5" /> Simular Rodada / Avançar
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleAction('reconcile_sync')}
              disabled={processing || loading}
              className="gap-1.5 h-8 text-[11px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${processing ? 'animate-spin' : ''}`} /> Sincronizar (Ativar dia 11)
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => {
                if(confirm("Deseja realmente REMOVER TODAS as copas?")) handleAction('reset_cups');
              }}
              disabled={processing || loading}
              className="gap-1.5 h-8 text-[11px]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Resetar Tudo
            </Button>
          </div>
          
          <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-[10px] text-amber-200/80 leading-tight">
              A geração de copas deve ocorrer no <b>Dia 10</b>. Elas entram em status 'scheduled' e são ativadas automaticamente pelo sistema no <b>Dia 11</b>. O sorteio da primeira fase é feito no momento da geração.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            Copas Ativas ({cups.length})
          </h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadCups} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="space-y-2 pr-4">
            {cups.length === 0 && !loading && (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <p className="text-xs text-muted-foreground">Nenhuma copa gerada ainda.</p>
              </div>
            )}

            {cups.map(cup => (
              <Collapsible 
                key={cup.id} 
                open={expandedCup === cup.id} 
                onOpenChange={() => toggleCup(cup.id)}
              >
                <Card className="overflow-hidden border-border/40">
                  <CollapsibleTrigger className="w-full">
                    <div className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {expandedCup === cup.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <div className="text-left">
                          <p className="text-xs font-bold">{cup.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                            {cup.country_code} · Season {cup.season}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] ${
                          cup.status === 'in_progress' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          cup.status === 'scheduled' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {cup.status === 'in_progress' ? 'Em Progresso' :
                           cup.status === 'scheduled' ? 'Agendada' : 'Finalizada'}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] bg-primary/5">
                          Rodada {cup.current_round}/{cup.total_rounds}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 border-t border-border/40 bg-muted/5">
                      <div className="mt-3 space-y-4">
                        {matches[cup.id] ? (
                          Array.from({ length: cup.total_rounds }).map((_, idx) => {
                            const roundNum = idx + 1;
                            const roundMatches = matches[cup.id].filter(m => m.round === roundNum);
                            if (roundMatches.length === 0) return null;

                            return (
                              <div key={roundNum} className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                                  <Calendar className="h-3 w-3" /> Rodada {roundNum}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {roundMatches.map(m => (
                                    <div key={m.id} className="p-2 rounded border border-border/40 bg-background/50 flex items-center justify-between">
                                      <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                        <span className="text-[10px] font-medium truncate">
                                          {m.home_team?.club_name || '...'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 px-2 shrink-0">
                                        <div className={`w-8 h-6 rounded flex items-center justify-center text-[11px] font-bold ${
                                          m.status === 'finished' ? 'bg-muted' : 'bg-primary/20 text-primary-foreground'
                                        }`}>
                                          {m.home_score ?? '-'}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">x</span>
                                        <div className={`w-8 h-6 rounded flex items-center justify-center text-[11px] font-bold ${
                                          m.status === 'finished' ? 'bg-muted' : 'bg-primary/20 text-primary-foreground'
                                        }`}>
                                          {m.away_score ?? '-'}
                                        </div>
                                      </div>
                                      <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                                        <span className="text-[10px] font-medium truncate text-right">
                                          {m.away_team?.club_name || '...'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-4 text-center">
                            <RefreshCw className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}