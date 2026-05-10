import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Globe, Loader2, Star } from 'lucide-react';
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
                      <h3 className="text-2xl font-black">Copa Nacional</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">Temporada Atual</Badge>
                        <Badge variant="outline">Eliminatórias</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Próximo Desafio</p>
                    <p className="text-lg font-black text-primary">Oitavas de Final</p>
                  </div>
                </CardContent>
              </Card>

              {/* Current matches in the cup */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" /> Jogos Recentes & Agendados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.filter(m => m.round === 1).map(match => (
                    <Card key={match.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-lg">{match.home_team?.club_logo}</span>
                          <span className="text-sm font-bold truncate">{match.home_team?.club_name}</span>
                        </div>
                        <div className="flex flex-col items-center px-4">
                          <span className="text-lg font-black">{match.home_goals ?? '-'} x {match.away_goals ?? '-'}</span>
                          <Badge variant="outline" className="text-[8px] uppercase">{match.status === 'finished' ? 'Final' : 'Agendado'}</Badge>
                        </div>
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <span className="text-sm font-bold truncate text-right">{match.away_team?.club_name}</span>
                          <span className="text-lg">{match.away_team?.club_logo}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground/20" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Nenhuma Copa Ativa</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Seu clube não está inscrito em nenhuma copa nacional ou continental no momento.
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
            <h3 className="text-lg font-bold">Todos os Jogos das Copas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map(match => (
                <Card key={match.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg">{match.home_team?.club_logo}</span>
                      <span className="text-sm font-bold truncate">{match.home_team?.club_name}</span>
                    </div>
                    <div className="flex flex-col items-center px-4">
                      <span className="text-lg font-black">{match.home_goals ?? '-'} x {match.away_goals ?? '-'}</span>
                      <Badge variant="outline" className="text-[8px] uppercase">12:00</Badge>
                    </div>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <span className="text-sm font-bold truncate text-right">{match.away_team?.club_name}</span>
                      <span className="text-lg">{match.away_team?.club_logo}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <div className="py-12 text-center text-muted-foreground">
            Estatísticas detalhadas estarão disponíveis ao fim da primeira fase.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
