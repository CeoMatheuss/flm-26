import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Globe, Loader2, Star, BarChart3, Newspaper, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CupBracketView } from './CupBracketView';
import { ChampionshipsTab } from './ChampionshipsTab';

interface Props {
  userId: string;
  onOpenTournament: (id: string) => void;
}

export function CopasTab({ userId, onOpenTournament }: Props) {
  const [activeTab, setActiveTab] = useState('my-cup');
  const [myCupId, setMyCupId] = useState<string | null>(null);
  const [myCupType, setMyCupType] = useState<'national' | 'continental' | 'world_cup'>('national');
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);

  const loadMyCup = async () => {
    setLoading(true);
    const { data: national } = await supabase
      .from('cup_teams')
      .select('cup_id, cup_competitions(status)')
      .eq('user_id', userId)
      .neq('cup_competitions.status', 'finished')
      .maybeSingle();
    
    if (national) {
      setMyCupId(national.cup_id);
      setMyCupType('national');
      
      // Load current matches for this cup
      const { data: cupMatches } = await supabase
        .from('cup_matches')
        .select(`
          *,
          home_team:cup_teams!cup_matches_home_team_id_fkey(club_name, club_logo),
          away_team:cup_teams!cup_matches_away_team_id_fkey(club_name, club_logo)
        `)
        .eq('cup_id', national.cup_id)
        .order('round', { ascending: true });
      if (cupMatches) setMatches(cupMatches);
    } else {
      const { data: continental } = await supabase
        .from('continental_teams')
        .select('competition_id, continental_competitions(status)')
        .eq('user_id', userId)
        .neq('continental_competitions.status', 'finished')
        .maybeSingle();
      
      if (continental) {
        setMyCupId(continental.competition_id);
        setMyCupType('continental');
      } else {
        setActiveTab('world');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMyCup();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Sistema de Copas
          </h2>
          <TabsList className="bg-muted/50 p-1 overflow-x-auto max-w-full">
            <TabsTrigger value="my-cup" className="text-[10px] sm:text-xs px-2 sm:px-4">Minha Copa</TabsTrigger>
            <TabsTrigger value="world" className="text-[10px] sm:text-xs px-2 sm:px-4">Mundo</TabsTrigger>
            <TabsTrigger value="matches" className="text-[10px] sm:text-xs px-2 sm:px-4">Jogos</TabsTrigger>
            <TabsTrigger value="bracket" className="text-[10px] sm:text-xs px-2 sm:px-4">Chaveamento</TabsTrigger>
            <TabsTrigger value="stats" className="text-[10px] sm:text-xs px-2 sm:px-4">Artilheiros</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="my-cup" className="mt-0">
          {myCupId ? (
            <div className="space-y-6">
              {/* Header section with cup info */}
              <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center text-3xl">
                      🏆
                    </div>
                    <div>
                      <h3 className="text-2xl font-black">{matches[0]?.competition || 'Copa Ativa'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">Temporada Atual</Badge>
                        <Badge variant="outline">Mata-Mata</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Fase Atual</p>
                    <p className="text-lg font-black text-primary">{matches[0]?.stage || 'Oitavas'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Chaveamento Mata-Mata */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Árvore do Torneio
                </h4>
                <CupBracketView cupId={myCupId} cupType={myCupType} />
              </div>

              {/* Stats & News & History placeholders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-xs flex items-center gap-2"><Newspaper className="h-3.5 w-3.5" /> Últimas Notícias</CardTitle></CardHeader>
                  <CardContent className="text-[10px] text-muted-foreground italic">
                    Nenhuma notícia recente para esta competição.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-xs flex items-center gap-2"><Award className="h-3.5 w-3.5" /> Histórico de Campeões</CardTitle></CardHeader>
                  <CardContent className="text-[10px] text-muted-foreground italic">
                    Esta é a primeira edição desta competição.
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground/20" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Nenhuma Copa Ativa</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Seu clube não está inscrito em nenhuma copa no momento. Use o painel ADM para recomeçar as copas mundiais se necessário.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bracket" className="mt-0">
          {myCupId && <CupBracketView cupId={myCupId} cupType={myCupType} />}
        </TabsContent>

        <TabsContent value="world" className="mt-0">
          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-bold">Copas do Mundo & Continentes</h3>
              </div>
              <ChampionshipsTab />
            </section>
          </div>
        </TabsContent>

        <TabsContent value="matches" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Calendário Geral</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map(match => (
                <Card key={match.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-lg shrink-0">{match.home_team?.club_logo}</span>
                      <span className="text-sm font-bold truncate">{match.home_team?.club_name}</span>
                    </div>
                    <div className="flex flex-col items-center px-4 shrink-0">
                      <span className="text-lg font-black">{match.home_goals ?? '-'} x {match.away_goals ?? '-'}</span>
                      <Badge variant="outline" className="text-[8px] uppercase">12:00</Badge>
                    </div>
                    <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                      <span className="text-sm font-bold truncate text-right">{match.away_team?.club_name}</span>
                      <span className="text-lg shrink-0">{match.away_team?.club_logo}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-400" /> Prêmios Individuais
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-background/50 p-3 rounded-lg border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Artilheiro</p>
                  <p className="text-sm font-black mt-1">Nenhum</p>
                  <p className="text-[10px] text-primary">0 Gols</p>
                </div>
                <div className="bg-background/50 p-3 rounded-lg border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Assistências</p>
                  <p className="text-sm font-black mt-1">Nenhum</p>
                  <p className="text-[10px] text-blue-400">0 Assist.</p>
                </div>
                <div className="bg-background/50 p-3 rounded-lg border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Melhor Nota</p>
                  <p className="text-sm font-black mt-1">Nenhum</p>
                  <p className="text-[10px] text-emerald-400">Nota 0.0</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tabela de Premiação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded border border-border/30">
                    <span className="text-xs font-bold">Campeão</span>
                    <span className="text-xs font-black text-emerald-400">R$ 5.000.000</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded border border-border/30">
                    <span className="text-xs font-bold">Vice-Campeão</span>
                    <span className="text-xs font-black text-emerald-400">R$ 2.500.000</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded border border-border/30">
                    <span className="text-xs font-bold">Semifinalista</span>
                    <span className="text-xs font-black text-emerald-400">R$ 1.200.000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
