import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2, Calendar, Swords, MapPin, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ClubShield } from './ClubShield';

interface Props {
  userId: string;
}

export function CopasTab({ userId }: Props) {
  const [activeTab, setActiveTab] = useState('matches');
  const [cup, setCup] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Buscar copa do país do usuário (fallback para a primeira encontrada)
      const { data: save } = await supabase.from('game_saves').select('country').eq('user_id', userId).maybeSingle();
      const country = save?.country || 'Brasil';

      const { data: cupRow } = await supabase
        .from('national_cups')
        .select('*')
        .eq('country_code', country)
        .order('season', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cupRow) {
        setCup(cupRow);
        
        // 2. Buscar partidas
        const { data: cupMatches } = await supabase
          .from('national_cup_matches')
          .select(`
            id, round, bracket_pos, home_score, away_score, status, winner_team_id, scheduled_at, stadium,
            home:national_cup_teams!home_team_id(club_name, club_logo, user_id),
            away:national_cup_teams!away_team_id(club_name, club_logo, user_id)
          `)
          .eq('cup_id', cupRow.id)
          .order('round', { ascending: true })
          .order('bracket_pos', { ascending: true });
        
        if (cupMatches) setMatches(cupMatches);

        // 3. Buscar premiações do usuário
        const { data: cupPrizes } = await supabase
          .from('national_cup_prizes')
          .select('*, team:national_cup_teams!team_id(club_name)')
          .eq('cup_id', cupRow.id)
          .eq('team:national_cup_teams(user_id)', userId);
        
        if (cupPrizes) setPrizes(cupPrizes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const channel = supabase.channel('copas-v3-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'national_cup_matches' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
          <h3 className="text-lg font-bold">Nenhuma Copa Ativa</h3>
          <p className="text-sm text-muted-foreground">Aguardando início da temporada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> {cup.name}
        </h2>
        <Badge variant="secondary">Temporada {cup.season} • Rodada {cup.current_round}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="matches">Jogos</TabsTrigger>
          <TabsTrigger value="bracket">Chaveamento</TabsTrigger>
          <TabsTrigger value="prizes">Prêmios</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-3">
          {matches.filter(m => m.round === cup.current_round).map(m => {
            const isMine = m.home?.user_id === userId || m.away?.user_id === userId;
            return (
              <Card key={m.id} className={`bg-card/50 overflow-hidden ${isMine ? 'ring-1 ring-primary border-primary/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-1 w-1/3">
                      <ClubShield club={{ logoUrl: m.home?.club_logo } as any} size={40} />
                      <span className="text-[10px] font-bold truncate w-full text-center">{m.home?.club_name}</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black">{m.home_score ?? 0}</span>
                        <span className="text-xs text-muted-foreground font-bold italic">VS</span>
                        <span className="text-xl font-black">{m.away_score ?? 0}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] h-4 mt-1">12:00</Badge>
                    </div>

                    <div className="flex flex-col items-center gap-1 w-1/3">
                      <ClubShield club={{ logoUrl: m.away?.club_logo } as any} size={40} />
                      <span className="text-[10px] font-bold truncate w-full text-center">{m.away?.club_name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="bracket">
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max p-2">
              {[...Array(cup.total_rounds || 5)].map((_, i) => {
                const r = i + 1;
                const rMatches = matches.filter(m => m.round === r);
                if (rMatches.length === 0) return null;
                return (
                  <div key={r} className="w-48 space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-center text-muted-foreground">Fase {r}</h4>
                    {rMatches.map(m => (
                      <Card key={m.id} className="p-2 text-[9px] bg-muted/20">
                        <div className="flex justify-between">
                          <span className={m.winner_team_id === m.home_team_id ? 'font-bold text-primary' : ''}>{m.home?.club_name || 'TBD'}</span>
                          <span>{m.home_score ?? ''}</span>
                        </div>
                        <div className="flex justify-between border-t mt-1 pt-1">
                          <span className={m.winner_team_id === m.away_team_id ? 'font-bold text-primary' : ''}>{m.away?.club_name || 'TBD'}</span>
                          <span>{m.away_score ?? ''}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prizes">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" /> Seus Prêmios Acumulados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {prizes.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic">Nenhum prêmio recebido ainda.</div>
              ) : (
                <div className="divide-y">
                  {prizes.map(p => (
                    <div key={p.id} className="p-3 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{p.description}</span>
                      <span className="font-black text-emerald-500">+ R$ {(p.amount/1000).toFixed(0)}k</span>
                    </div>
                  ))}
                  <div className="p-3 bg-emerald-500/10 flex justify-between items-center font-black text-emerald-500">
                    <span>TOTAL</span>
                    <span>R$ {(prizes.reduce((s, p) => s + p.amount, 0) / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}