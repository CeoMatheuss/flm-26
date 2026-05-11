import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2, Calendar, Swords, Globe, Play, Newspaper, BarChart3, TrendingUp, Info, Sparkles, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ClubShield } from './ClubShield';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  userId: string;
}

export function CopasTab({ userId }: Props) {
  const [activeTab, setActiveTab] = useState('matches');
  const [cup, setCup] = useState<any>(null);
  const [allCups, setAllCups] = useState<any[]>([]);
  const [selectedCupId, setSelectedCupId] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  const loadInitial = async () => {
    try {
      const { data: cups } = await supabase.from('national_cups').select('*').order('name', { ascending: true });
      if (cups && cups.length > 0) {
        setAllCups(cups);
        
        // Find user's cup by country first
        const { data: save } = await supabase.from('game_saves').select('club_data').eq('user_id', userId).maybeSingle();
        const clubData = save?.club_data as any;
        const userCountry = clubData?.club?.country || 'Brasil';
        
        // Priority 1: Cup where user is participating
        const { data: userParticipation } = await supabase
          .from('national_cup_teams')
          .select('cup_id')
          .eq('user_id', userId)
          .maybeSingle();

        let initialCupId = null;
        if (userParticipation) {
          initialCupId = userParticipation.cup_id;
        } else {
          // Priority 2: Cup of user's country
          const countryCup = cups.find(c => c.country_code === userCountry);
          initialCupId = countryCup ? countryCup.id : cups[0].id;
        }

        setSelectedCupId(initialCupId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCupData = async (id: string) => {
    setLoading(true);
    try {
      const currentCup = allCups.find(c => c.id === id);
      if (!currentCup) return;
      setCup(currentCup);

      const [matchesRes, statsRes] = await Promise.all([
        supabase.from('national_cup_matches').select('*, home:national_cup_teams!home_team_id(*), away:national_cup_teams!away_team_id(*)').eq('cup_id', id).order('round', { ascending: true }).order('bracket_pos', { ascending: true }),
        supabase.from('cup_player_stats').select('*, player:world_players(name), team:world_teams(name, logo)').eq('cup_id', id).order('goals', { ascending: false }).limit(10)
      ]);

      if (matchesRes.data) setMatches(matchesRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInitial(); }, [userId]);
  useEffect(() => { if (selectedCupId) loadCupData(selectedCupId); }, [selectedCupId, allCups]);

  const navigate = useNavigate();
  const myMatch = matches.find(m => (m.status === 'scheduled' || m.status === 'live') && (m.home?.user_id === userId || m.away?.user_id === userId));

  // Janela de horário: só permite entrar 5 min antes até 60 min depois do scheduled_at
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const matchTimeMs = myMatch?.scheduled_at ? new Date(myMatch.scheduled_at).getTime() : 0;
  const minutesUntilMatch = matchTimeMs ? Math.round((matchTimeMs - now) / 60000) : 0;
  const canPlayNow = !!myMatch && matchTimeMs > 0 && now >= matchTimeMs - 5 * 60_000 && now <= matchTimeMs + 60 * 60_000;

  const handlePlayMatch = () => {
    if (!myMatch) return;
    if (!canPlayNow) {
      return;
    }
    navigate('/', {
      replace: true,
      state: {
        playTournamentMatch: {
          matchId: myMatch.id,
          tournamentMatchId: myMatch.id,
          opponentName: myMatch.home?.user_id === userId ? myMatch.away?.club_name : myMatch.home?.club_name,
          opponentStrength: myMatch.home?.user_id === userId ? myMatch.away?.strength : myMatch.home?.strength,
          isHome: myMatch.home?.user_id === userId,
          competition: cup.name,
          tieBreaker: 'both',
          isNationalCup: true
        },
      },
    });
  };

  if (loading && !cup) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!cup) return <div className="py-20 text-center text-muted-foreground">Nenhuma copa disponível.</div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20 px-2">
      {/* Header Select */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 bg-card/40 p-1.5 pr-4 rounded-full border border-border/50 backdrop-blur-sm">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Globe className="h-4 w-4" />
          </div>
          <Select value={selectedCupId || ''} onValueChange={setSelectedCupId}>
            <SelectTrigger className="bg-transparent border-none font-black text-xs h-7 w-[180px] focus:ring-0">
              <SelectValue placeholder="Escolher Competição" />
            </SelectTrigger>
            <SelectContent className="bg-card/95 border-border/50 backdrop-blur-md">
              {allCups.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs font-bold focus:bg-primary/10">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
           <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[10px] py-1 px-3 uppercase tracking-widest">
            TEMPORADA {cup.season}
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20 font-black text-[10px] py-1 px-3 uppercase tracking-widest">
            {cup.status === 'in_progress' ? `RODADA ${cup.current_round}` : 'FINALIZADA'}
          </Badge>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a1a] via-[#12122b] to-[#0a0a1a] border border-primary/30 p-8 shadow-2xl shadow-primary/10 group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
          <Trophy className="h-48 w-48 text-primary rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/30">
              <Sparkles className="h-3 w-3" /> Competição de Elite
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-sm uppercase">
              {cup.name}
            </h1>
            <p className="text-muted-foreground font-medium text-sm max-w-md">
              A glória eterna aguarda. {cup.total_teams} clubes disputam fase a fase o troféu mais desejado do país.
            </p>
          </div>

          {myMatch && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-md w-full md:w-[320px] shadow-2xl overflow-hidden group/match">
              <div className="bg-primary/20 py-2 px-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">SEU JOGO</span>
                <span className="text-[9px] font-mono text-white/50">
                  {matchTimeMs ? new Date(myMatch.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-around gap-2">
                  <div className="flex flex-col items-center gap-2">
                    <ClubShield club={{ logoUrl: myMatch.home?.club_logo } as any} size={48} />
                    <span className="text-[10px] font-bold text-white/80 truncate w-20 text-center">{myMatch.home?.club_name}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-black text-white/40 italic">VS</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <ClubShield club={{ logoUrl: myMatch.away?.club_logo } as any} size={48} />
                    <span className="text-[10px] font-bold text-white/80 truncate w-20 text-center">{myMatch.away?.club_name}</span>
                  </div>
                </div>
                <Button
                  onClick={handlePlayMatch}
                  disabled={!canPlayNow}
                  className="w-full h-9 bg-primary hover:bg-primary/80 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="h-3 w-3 mr-2" />
                  {canPlayNow
                    ? 'ENTRAR EM CAMPO'
                    : minutesUntilMatch > 0
                      ? `LIBERA EM ${minutesUntilMatch < 60 ? `${minutesUntilMatch}MIN` : `${Math.floor(minutesUntilMatch/60)}H${minutesUntilMatch%60}M`}`
                      : 'JANELA ENCERRADA'}
                </Button>
                {!canPlayNow && (
                  <p className="text-[9px] text-center text-white/40 font-mono uppercase tracking-wider">
                    Disponível 5min antes do horário oficial
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex items-center justify-start gap-1 p-1 bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl mb-6 overflow-x-auto no-scrollbar">
          <TabsTrigger value="matches" className="tab-trigger-modern"><Calendar className="h-3.5 w-3.5" /> Jogos</TabsTrigger>
          <TabsTrigger value="bracket" className="tab-trigger-modern"><TrendingUp className="h-3.5 w-3.5" /> Chaveamento</TabsTrigger>
          <TabsTrigger value="stats" className="tab-trigger-modern"><BarChart3 className="h-3.5 w-3.5" /> Estatísticas</TabsTrigger>
          <TabsTrigger value="prizes" className="tab-trigger-modern"><DollarSign className="h-3.5 w-3.5" /> Premiação</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="animate-in slide-in-from-bottom-2 duration-500 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.filter(m => m.round === cup.current_round).map(m => (
              <MatchRow key={m.id} match={m} userId={userId} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bracket" className="outline-none">
          <div className="w-full rounded-3xl border border-border/50 bg-card/20 overflow-hidden">
            <ScrollArea className="w-full">
              <div className="flex gap-4 md:gap-12 p-4 md:p-8 min-w-max">
                {[...Array(cup.total_rounds)].map((_, i) => {
                  const r = i + 1;
                  const rMatches = matches.filter(match => match.round === r);
                  return (
                    <div key={r} className="w-48 md:w-64 space-y-4 md:y-8">
                      <div className="flex flex-col items-center gap-1 md:gap-2">
                        <span className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-[0.1em] md:tracking-[0.2em]">{getPhaseName(r, cup.total_rounds)}</span>
                        <div className="h-1 w-8 md:h-1.5 md:w-12 bg-primary/20 rounded-full" />
                      </div>
                      <div className="space-y-3 md:space-y-6 flex flex-col justify-around h-full py-2 md:py-4">
                        {rMatches.map(m => (
                          <BracketMatch key={m.id} match={m} userId={userId} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="outline-none space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/40 backdrop-blur-sm border-border/50 rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" /> Artilheiros da Copa
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {stats.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {stats.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group">
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black text-muted-foreground w-4">{idx + 1}</span>
                          <ClubShield club={{ logoUrl: s.team?.logo } as any} size={32} />
                          <div className="flex flex-col">
                            <span className="text-xs font-black group-hover:text-primary transition-colors">{s.player?.name}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{s.team?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-sm font-black text-white">{s.goals}</span>
                            <span className="text-[9px] font-bold text-muted-foreground ml-1">GOLS</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-xs text-muted-foreground font-bold">Nenhum dado registrado nesta fase.</div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-primary/10 border-primary/20 rounded-3xl p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Info className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase">Regulamento</h4>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1">Partidas de mata-mata em jogo único com prorrogação e pênaltis em caso de empate.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>


        <TabsContent value="prizes" className="outline-none">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <PrizeCard label="Participação" amount="100.000" />
              <PrizeCard label="Fase 1" amount="250.000" />
              <PrizeCard label="Fase 2" amount="500.000" />
              <PrizeCard label="Fase 3" amount="500.000" />
              <PrizeCard label="Oitavas" amount="1.000.000" />
              <PrizeCard label="Quartas" amount="2.000.000" />
              <PrizeCard label="Semifinal" amount="5.000.000" />
              <PrizeCard label="Campeão" amount="10.000.000" highlight="gold" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
               <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-3xl p-6 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">Melhor Ataque</h4>
                    <p className="text-[10px] text-muted-foreground font-bold mt-1">Bônus de R$ 500.000 ao final da competição.</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/20 rounded-3xl p-6 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">Melhor Defesa</h4>
                    <p className="text-[10px] text-muted-foreground font-bold mt-1">Bônus de R$ 500.000 ao final da competição.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <style>{`
        .tab-trigger-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 1rem;
          transition: all 0.3s;
        }
        .tab-trigger-modern[data-state='active'] {
          background-color: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}

function MatchRow({ match, userId }: { match: any; userId: string }) {
  const isMine = match.home?.user_id === userId || match.away?.user_id === userId;
  return (
    <Card className={`bg-card/40 backdrop-blur-sm transition-all hover:scale-[1.01] overflow-hidden group border-border/50 ${isMine ? 'ring-1 ring-primary border-primary/40 bg-primary/5' : ''}`}>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ClubShield club={{ logoUrl: match.home?.club_logo } as any} size={32} />
          <span className={`text-xs font-black truncate group-hover:text-primary transition-colors cursor-pointer ${match.home?.user_id === userId ? 'text-primary' : ''}`} onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: match.home?.club_name } }))}>
            {match.home?.club_name}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center min-w-[70px]">
          {match.status === 'finished' ? (
            <div className="flex flex-col items-center">
              <span className="text-base font-black tracking-tighter tabular-nums">
                {match.home_score} - {match.away_score}
              </span>
              {(match.home_penalties !== null || match.away_penalties !== null) && (
                <span className="text-[8px] font-bold text-muted-foreground uppercase">({match.home_penalties}-{match.away_penalties} PEN)</span>
              )}
            </div>
          ) : (
            <div className="px-3 py-0.5 rounded-full bg-muted font-black text-[9px] uppercase tracking-wider text-muted-foreground">vs</div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
          <span className={`text-xs font-black truncate text-right group-hover:text-primary transition-colors cursor-pointer ${match.away?.user_id === userId ? 'text-primary' : ''}`} onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: match.away?.club_name } }))}>
            {match.away?.club_name}
          </span>
          <ClubShield club={{ logoUrl: match.away?.club_logo } as any} size={32} />
        </div>
      </CardContent>
    </Card>
  );
}

function BracketMatch({ match, userId }: { match: any; userId: string }) {
  const isHomeWinner = match.winner_team_id === match.home_team_id;
  const isAwayWinner = match.winner_team_id === match.away_team_id;
  const isMine = match.home?.user_id === userId || match.away?.user_id === userId;

  return (
    <div className={`relative w-full rounded-2xl bg-card/60 border border-border/50 p-3 space-y-2 transition-all hover:scale-105 shadow-xl ${isMine ? 'ring-1 ring-primary' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ClubShield club={{ logoUrl: match.home?.club_logo } as any} size={20} />
          <span className={`text-[10px] font-bold truncate cursor-pointer hover:text-primary ${isHomeWinner ? 'text-white' : 'text-muted-foreground'}`} onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: match.home?.club_name } }))}>
            {match.home?.club_name || 'TBD'}
          </span>
        </div>
        <span className="text-[10px] font-black tabular-nums">{match.home_score ?? ''}</span>
      </div>
      <div className="h-px w-full bg-border/20" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ClubShield club={{ logoUrl: match.away?.club_logo } as any} size={20} />
          <span className={`text-[10px] font-bold truncate cursor-pointer hover:text-primary ${isAwayWinner ? 'text-white' : 'text-muted-foreground'}`} onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: match.away?.club_name } }))}>
            {match.away?.club_name || 'TBD'}
          </span>
        </div>
        <span className="text-[10px] font-black tabular-nums">{match.away_score ?? ''}</span>
      </div>
    </div>
  );
}

function PrizeCard({ label, amount, highlight }: { label: string; amount: string; highlight?: 'gold' | 'silver' }) {
  return (
    <div className={`p-4 rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 ${
      highlight === 'gold' ? 'bg-yellow-500/10 border-yellow-500/30' : 
      highlight === 'silver' ? 'bg-slate-400/10 border-slate-400/30' : 
      'bg-card/40 border-border/50'
    }`}>
      <span className="text-[10px] font-black uppercase text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <DollarSign className={`h-3 w-3 ${highlight === 'gold' ? 'text-yellow-500' : 'text-primary'}`} />
        <span className={`text-sm font-black tracking-tight ${highlight === 'gold' ? 'text-yellow-500' : 'text-white'}`}>{amount}</span>
      </div>
    </div>
  );
}

function getPhaseName(round: number, total: number) {
  const rem = total - round;
  if (rem === 0) return "Final";
  if (rem === 1) return "Semifinal";
  if (rem === 2) return "Quartas de Final";
  if (rem === 3) return "Oitavas de Final";
  return `Fase ${round}`;
}
