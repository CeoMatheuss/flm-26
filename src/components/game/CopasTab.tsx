import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2, Calendar, Swords, BarChart3, Newspaper, Award, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
  onOpenTournament?: (id: string) => void;
}

export function CopasTab({ userId }: Props) {
  const [activeTab, setActiveTab] = useState('matches');
  const [cup, setCup] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: teamEntry } = await supabase
        .from('national_cup_teams')
        .select('cup_id, national_cups(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (teamEntry && teamEntry.national_cups) {
        setCup(teamEntry.national_cups);
        
        const { data: cupMatches } = await supabase
          .from('national_cup_matches')
          .select(`
            *,
            home:national_cup_teams!home_team_id(club_name, club_logo),
            away:national_cup_teams!away_team_id(club_name, club_logo)
          `)
          .eq('cup_id', teamEntry.cup_id)
          .order('round', { ascending: true })
          .order('bracket_pos', { ascending: true });
        
        if (cupMatches) setMatches(cupMatches);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cup) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/20" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Nenhuma Copa Encontrada</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              As copas nacionais são geradas automaticamente no dia 10 de cada temporada. Jogos iniciam dia 11 às 12:00.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> {cup.name}
        </h2>
        <Badge variant="secondary">Temporada {cup.season}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 mb-4 grid grid-cols-3">
          <TabsTrigger value="bracket" className="text-xs">Chaveamento</TabsTrigger>
          <TabsTrigger value="matches" className="text-xs">Jogos</TabsTrigger>
          <TabsTrigger value="info" className="text-xs">Premiações</TabsTrigger>
        </TabsList>

        <TabsContent value="bracket" className="mt-0">
          <div className="w-full overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-[800px] p-4">
              {[1, 2, 3, 4, 5].map((round) => {
                const roundMatches = matches.filter(m => m.round === round);
                if (roundMatches.length === 0) return null;
                return (
                  <div key={round} className="flex-1 space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground text-center mb-4 border-b border-border/50 pb-1">
                      Fase {round}
                    </h4>
                    {roundMatches.map(m => (
                      <Card key={m.id} className={`border-l-4 ${m.status === 'finished' ? 'border-l-emerald-500' : 'border-l-primary/30'} bg-card/40`}>
                        <CardContent className="p-2 space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold truncate max-w-[80px]">{m.home?.club_name || 'TBD'}</span>
                            <span className="font-black">{m.home_score ?? 0}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold truncate max-w-[80px]">{m.away?.club_name || 'TBD'}</span>
                            <span className="font-black">{m.away_score ?? 0}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="matches" className="mt-0 space-y-3">
          {matches.map(m => (
            <Card key={m.id} className="bg-card/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg w-8 h-8 flex items-center justify-center bg-muted/30 rounded-full">{m.home?.club_logo || '🛡️'}</span>
                  <span className="text-xs font-bold truncate">{m.home?.club_name}</span>
                </div>
                <div className="flex flex-col items-center px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">{m.home_score ?? 0}</span>
                    <span className="text-xs text-muted-foreground">x</span>
                    <span className="text-sm font-black">{m.away_score ?? 0}</span>
                  </div>
                  <span className="text-[8px] text-muted-foreground uppercase">{new Date(m.scheduled_at).toLocaleDateString()} 12:00</span>
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-xs font-bold truncate">{m.away?.club_name}</span>
                  <span className="text-lg w-8 h-8 flex items-center justify-center bg-muted/30 rounded-full">{m.away?.club_logo || '🛡️'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="info" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tabela de Premiações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs border-b pb-1">
                <span className="text-muted-foreground">Vitória na Fase</span>
                <span className="font-bold text-emerald-500">R$ 50.000</span>
              </div>
              <div className="flex justify-between text-xs border-b pb-1">
                <span className="text-muted-foreground">Bônus Campeão</span>
                <span className="font-bold text-emerald-500">R$ 1.000.000</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic mt-4">
                * As premiações são pagas automaticamente ao avançar de fase.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
