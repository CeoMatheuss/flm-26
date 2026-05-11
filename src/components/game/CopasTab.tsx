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
  const [activeTab, setActiveTab] = useState('bracket');
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
          .select('id, cup_id, team_id, amount, description, team:national_cup_teams!team_id(club_name, user_id)')
          .eq('cup_id', cupRow.id);
        
        const filteredPrizes = (cupPrizes || []).filter((p: any) => p.team?.user_id === userId);
        if (filteredPrizes) setPrizes(filteredPrizes);
        
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

  const nextMatch = matches.find(m => m.status === 'scheduled' || m.status === 'live');
  const myNextMatch = matches.find(
    m => (m.status === 'scheduled' || m.status === 'live') &&
         (m.home?.user_id === userId || m.away?.user_id === userId)
  );
  const highlight = myNextMatch || nextMatch;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      {/* Header Estilizado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-background to-background border border-primary/20 p-6">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Trophy className="h-32 w-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary animate-pulse" />
              <h2 className="text-2xl font-black tracking-tight">{cup.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Temporada {cup.season} • {cup.total_rounds ? `${cup.total_rounds} Fases` : 'Mata-Mata Global'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Fase {cup.current_round}
            </Badge>
            {cup.status === 'finished' && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                Finalizada
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Destaque do Próximo Jogo */}
      {highlight && (
        <Card className="game-card border-primary/30 shadow-lg shadow-primary/5">
          <CardHeader className="py-2 px-4 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Swords className="h-3 w-3" /> {myNextMatch ? 'SEU PRÓXIMO DESAFIO' : 'PRÓXIMO JOGO DA RODADA'}
              </span>
              <Badge variant="outline" className="text-[9px] h-5 bg-background font-mono">
                {new Date(highlight.scheduled_at).toLocaleDateString()} • 12:00
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <div className={`p-1 rounded-full ${highlight.home?.user_id === userId ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                  <ClubShield club={{ logoUrl: highlight.home?.club_logo } as any} size={56} />
                </div>
                <span className={`text-xs sm:text-sm font-black truncate w-full text-center ${highlight.home?.user_id === userId ? 'text-primary' : ''}`}>
                  {highlight.home?.club_name}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="px-4 py-1 rounded-full bg-muted font-black text-xs italic tracking-tighter">VS</div>
                <div className="h-px w-8 bg-border"></div>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <div className={`p-1 rounded-full ${highlight.away?.user_id === userId ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                  <ClubShield club={{ logoUrl: highlight.away?.club_logo } as any} size={56} />
                </div>
                <span className={`text-xs sm:text-sm font-black truncate w-full text-center ${highlight.away?.user_id === userId ? 'text-primary' : ''}`}>
                  {highlight.away?.club_name}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 p-1 bg-muted/50 rounded-xl mb-6">
          <TabsTrigger value="matches" className="rounded-lg font-bold text-xs uppercase tracking-tight">Jogos</TabsTrigger>
          <TabsTrigger value="bracket" className="rounded-lg font-bold text-xs uppercase tracking-tight">Chaveamento</TabsTrigger>
          <TabsTrigger value="prizes" className="rounded-lg font-bold text-xs uppercase tracking-tight">Prêmios</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-4 outline-none">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Partidas da Rodada {cup.current_round}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matches.filter(m => m.round === cup.current_round).map(m => {
              const isMine = m.home?.user_id === userId || m.away?.user_id === userId;
              return (
                <Card key={m.id} className={`bg-card/40 transition-all hover:border-primary/30 ${isMine ? 'ring-1 ring-primary border-primary/50 bg-primary/5' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ClubShield club={{ logoUrl: m.home?.club_logo } as any} size={32} />
                        <span className={`text-xs font-bold truncate ${m.home?.user_id === userId ? 'text-primary' : ''}`}>{m.home?.club_name}</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center min-w-[60px]">
                        <span className="text-lg font-black tracking-tight tabular-nums">
                          {m.status === 'finished' ? `${m.home_score} - ${m.away_score}` : 'vs'}
                        </span>
                        {m.status === 'scheduled' && <span className="text-[8px] font-bold text-muted-foreground">12:00</span>}
                      </div>

                      <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                        <span className={`text-xs font-bold truncate text-right ${m.away?.user_id === userId ? 'text-primary' : ''}`}>{m.away?.club_name}</span>
                        <ClubShield club={{ logoUrl: m.away?.club_logo } as any} size={32} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="bracket" className="outline-none">
          <div className="relative overflow-x-auto rounded-xl border bg-card/20 pb-4">
            <div className="flex gap-6 p-6 min-w-max">
              {[...Array(cup.total_rounds || 6)].map((_, i) => {
                const r = i + 1;
                const rMatches = matches.filter(m => m.round === r);
                if (rMatches.length === 0 && r > cup.current_round + 1) return null;
                return (
                  <div key={r} className="w-56 space-y-6">
                    <div className="text-center space-y-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Fase {r}</h4>
                      <div className="h-1 w-8 bg-primary/20 mx-auto rounded-full"></div>
                    </div>
                    <div className="space-y-4">
                      {rMatches.length > 0 ? rMatches.map(m => (
                        <div key={m.id} className="relative group">
                          <Card className={`p-3 text-[10px] bg-card/60 border-l-4 transition-all hover:scale-105 hover:shadow-xl ${m.winner_team_id ? 'border-l-emerald-500' : 'border-l-primary/30'} ${m.home?.user_id === userId || m.away?.user_id === userId ? 'ring-1 ring-primary' : ''}`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className={`font-bold truncate max-w-[80px] ${m.winner_team_id === m.home_team_id ? 'text-primary' : m.home?.user_id === userId ? 'text-primary' : 'text-muted-foreground'}`}>
                                {m.home?.club_name || 'TBD'}
                              </span>
                              <span className="font-black tabular-nums">{m.home_score ?? ''}</span>
                            </div>
                            <div className="h-px w-full bg-border/50 my-1"></div>
                            <div className="flex justify-between items-center">
                              <span className={`font-bold truncate max-w-[80px] ${m.winner_team_id === m.away_team_id ? 'text-primary' : m.away?.user_id === userId ? 'text-primary' : 'text-muted-foreground'}`}>
                                {m.away?.club_name || 'TBD'}
                              </span>
                              <span className="font-black tabular-nums">{m.away_score ?? ''}</span>
                            </div>
                          </Card>
                        </div>
                      )) : (
                        <div className="h-20 border-2 border-dashed border-border/30 rounded-xl flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-tighter italic">Aguardando</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prizes" className="outline-none">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="py-4 border-b border-emerald-500/10">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-emerald-500 uppercase tracking-tight">
                <DollarSign className="h-5 w-5" /> Saldo de Premiações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {prizes.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium italic">Aumente sua força e avance de fase para receber prêmios.</p>
                </div>
              ) : (
                <div className="divide-y divide-emerald-500/10">
                  {prizes.map(p => (
                    <div key={p.id} className="p-4 flex justify-between items-center bg-background/40">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold uppercase tracking-tight">{p.description}</span>
                        <p className="text-[10px] text-muted-foreground">Pago via Federação Nacional</p>
                      </div>
                      <span className="font-black text-emerald-500 text-sm">+ R$ {(p.amount/1000).toFixed(0)}k</span>
                    </div>
                  ))}
                  <div className="p-6 bg-emerald-500/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <span className="text-xs font-black uppercase tracking-wider text-emerald-600">Total Acumulado</span>
                    </div>
                    <span className="font-black text-xl text-emerald-600 tabular-nums">R$ {(prizes.reduce((s, p) => s + p.amount, 0) / 1000).toFixed(0)}k</span>
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