import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Globe, Loader2, Star, BarChart3, Newspaper, Award, Calendar, Swords } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CupBracketView } from './CupBracketView';
import { toast } from 'sonner';

interface Props {
  userId: string;
  onOpenTournament?: (id: string) => void;
}

export function CopasTab({ userId }: Props) {
  const [activeTab, setActiveTab] = useState('my-cup');
  const [cup, setCup] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Buscar se o usuário está em alguma copa ativa
      const { data: teamEntry } = await supabase
        .from('national_cup_teams')
        .select('cup_id, national_cups(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (teamEntry && teamEntry.national_cups) {
        setCup(teamEntry.national_cups);
        
        // 2. Buscar confrontos desta copa
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
              As copas nacionais são geradas automaticamente no dia 10 de cada temporada.
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
        <TabsList className="bg-muted/50 p-1 mb-4">
          <TabsTrigger value="my-cup" className="text-xs">Chaveamento</TabsTrigger>
          <TabsTrigger value="matches" className="text-xs">Jogos</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="my-cup" className="mt-0">
          <CupBracketView cupId={cup.id} matches={matches} />
        </TabsContent>

        <TabsContent value="matches" className="mt-0">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <span className="text-[8px] text-muted-foreground uppercase">{new Date(m.scheduled_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="text-xs font-bold truncate">{m.away?.club_name}</span>
                      <span className="text-lg w-8 h-8 flex items-center justify-center bg-muted/30 rounded-full">{m.away?.club_logo || '🛡️'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground text-sm italic">
              Estatísticas da Copa em processamento...
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
