import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Globe, Loader2, Star } from 'lucide-react';
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

  useEffect(() => {
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
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="my-cup" className="text-xs px-4">Minha Copa</TabsTrigger>
            <TabsTrigger value="world" className="text-xs px-4">Mundo</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="my-cup" className="mt-0">
          {myCupId ? (
            <CupBracketView cupId={myCupId} cupType={myCupType} />
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
      </Tabs>
    </div>
  );
}
