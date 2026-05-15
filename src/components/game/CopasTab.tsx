import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2, Calendar, Swords, Globe, Play, Newspaper, BarChart3, TrendingUp, Info, Sparkles, DollarSign, RefreshCw, Star, MapPin, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ClubShield } from './ClubShield';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Maps a team row to a ClubShield-compatible object, ensuring the latest shield data is used.
const toShieldClub = (t: any) => {
  if (!t) return null;
  
  // Se t.shield_config for um objeto (vindo do RPC), extraímos as propriedades dele
  const shield = typeof t.shield_config === 'object' && t.shield_config !== null ? t.shield_config : {};
  
  return {
    ...t,
    logoUrl: t.club_logo || t.logo || t.logo_url || shield.logoUrl,
    shield_config: t.shield_config,
    shieldConfig: t.shield_config,
    shieldPattern: shield.pattern || shield.shieldPattern || t.shield_pattern || t.pattern,
    shieldShape: shield.shape || shield.shieldShape || t.shield_shape || t.shape,
    shieldIcon: shield.icon || shield.shieldIcon || t.shield_icon || t.icon,
    primaryColor: shield.primaryColor || t.primary_color || t.primaryColor,
    secondaryColor: shield.secondaryColor || t.secondary_color || t.secondaryColor,
    detailColor: shield.detailColor || t.detail_color || t.detailColor,
  };
};


function StatsSection({ title, stats, field, icon, label, isRating = false }: { title: string; stats: any[]; field: string; icon: React.ReactNode; label: string; isRating?: boolean }) {
  if (stats.length === 0) return null;
  
  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/50 rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-muted/20 pb-3">
        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/30">
          {stats.map((s, idx) => (
            <div key={s.id} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-muted-foreground w-4">{idx + 1}</span>
                <ClubShield club={toShieldClub(s.team) as any} size={32} />
                <div className="flex flex-col">
                  <span className="text-xs font-black group-hover:text-primary transition-colors">{s.player_name || s.player?.name}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">{s.team_name || s.team?.name}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-white">
                  {isRating ? Number(s[field] || 0).toFixed(1) : s[field] || 0}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground ml-1">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  userId: string;
}


export function CopasTab({ userId }: Props) {
  const [activeTab, setActiveTab] = useState('matches');
  const [cup, setCup] = useState<any>(null);
  const [allCups, setAllCups] = useState<any[]>([]);
  const [selectedCupId, setSelectedCupId] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [goalStats, setGoalStats] = useState<any[]>([]);
  const [assistStats, setAssistStats] = useState<any[]>([]);
  const [ratingStats, setRatingStats] = useState<any[]>([]);
  const [yellowStats, setYellowStats] = useState<any[]>([]);
  const [redStats, setRedStats] = useState<any[]>([]);
  const [cleanStats, setCleanStats] = useState<any[]>([]);
  const [motmStats, setMotmStats] = useState<any[]>([]);

  
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
        supabase.from('cup_player_stats').select('*, player:world_players(name), team:world_teams(*)').eq('cup_id', id).order('goals', { ascending: false }).limit(20)
      ]);

      let enhancedMatches = matchesRes.data || [];

      // Sincronizar escudos para todos os times envolvidos
      const teamNames = new Set<string>();
      enhancedMatches.forEach(m => {
        if (m.home?.club_name) teamNames.add(m.home.club_name);
        if (m.away?.club_name) teamNames.add(m.away.club_name);
      });
      if (statsRes.data) {
        statsRes.data.forEach(s => {
          if (s.team?.name) teamNames.add(s.team.name);
        });
      }

      const { data: shieldsData } = await supabase.rpc('get_club_shields_by_names', { _names: Array.from(teamNames) });
      const shieldByName = new Map<string, any>((shieldsData || []).map((s: any) => [s.club_name, s.shield]));

      // Aplicar escudos nos matches
      enhancedMatches = enhancedMatches.map(m => ({
        ...m,
        home: m.home ? { ...m.home, shield_config: shieldByName.get(m.home.club_name) || m.home.shield_config } : null,
        away: m.away ? { ...m.away, shield_config: shieldByName.get(m.away.club_name) || m.away.shield_config } : null
      }));
      setMatches(enhancedMatches);

      if (statsRes.data) {
        const enhancedStats = statsRes.data.map(s => ({
          ...s,
          team: {
            ...s.team,
            ...shieldByName.get(s.team?.name)
          }
        }));
        
        setGoalStats(enhancedStats.sort((a, b) => (b.goals || 0) - (a.goals || 0)).slice(0, 10));
        setAssistStats(enhancedStats.sort((a, b) => (b.assists || 0) - (a.assists || 0)).slice(0, 10));
        setRatingStats(enhancedStats.filter(s => (s.matches_played || 0) > 0).sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)).slice(0, 10));
        setYellowStats(enhancedStats.sort((a, b) => (b.yellow_cards || 0) - (a.yellow_cards || 0)).slice(0, 10));
        setRedStats(enhancedStats.sort((a, b) => (b.red_cards || 0) - (a.red_cards || 0)).slice(0, 10));
        setCleanStats(enhancedStats.sort((a, b) => (b.clean_sheets || 0) - (a.clean_sheets || 0)).slice(0, 10));
        setMotmStats(enhancedStats.sort((a, b) => (b.motm_count || 0) - (a.motm_count || 0)).slice(0, 10));

      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInitial(); }, [userId]);
  useEffect(() => { if (selectedCupId) loadCupData(selectedCupId); }, [selectedCupId, allCups]);

  // Realtime subscription for Cup updates
  useEffect(() => {
    if (!selectedCupId) return;
    const channel = supabase.channel(`cup-realtime-${selectedCupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'national_cup_matches', filter: `cup_id=eq.${selectedCupId}` }, () => {
        loadCupData(selectedCupId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cup_player_stats', filter: `cup_id=eq.${selectedCupId}` }, () => {
        loadCupData(selectedCupId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCupId]);

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
          isNationalCup: true,
          stadiumName: myMatch.home?.stadium_name || `Estádio do ${myMatch.home?.club_name}`,
          stadiumCapacity: myMatch.home?.stadium_capacity || 5000,
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
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => selectedCupId && loadCupData(selectedCupId)}
            className="h-8 w-8 text-zinc-500 hover:text-primary transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a1a] via-[#12122b] to-[#0a0a1a] border border-primary/30 p-4 md:p-8 shadow-2xl shadow-primary/10 group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none">
          <Trophy className="h-24 md:h-48 w-24 md:w-48 text-primary rotate-12" />
        </div>
        
        {/* Champion Spotlight - Show first if cup finished */}
        {cup.status === 'finished' && (
          <div className="absolute inset-0 bg-yellow-500/5 backdrop-blur-[2px] z-0" />
        )}

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="space-y-3 md:space-y-4 text-center lg:text-left w-full lg:w-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/30 mx-auto lg:mx-0">
              <Sparkles className="h-3 w-3" /> {cup.status === 'finished' ? 'Hall da Fama' : 'Competição de Elite'}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-sm uppercase">
              {cup.name}
            </h1>
            <p className="text-muted-foreground font-medium text-xs md:text-sm max-w-md mx-auto lg:mx-0">
              {cup.status === 'finished' 
                ? 'A glória foi alcançada. Confira o campeão e as estatísticas finais da temporada.'
                : `A glória eterna aguarda. ${cup.total_teams} clubes disputam fase a fase o troféu mais desejado do país.`
              }
            </p>
          </div>

          {cup.status === 'finished' ? (
             <div className="relative flex-shrink-0 animate-in zoom-in duration-700">
               {(() => {
                 const finalMatch = matches.find(m => m.round === cup.total_rounds);
                 const champion = finalMatch?.status === 'finished'
                   ? (finalMatch.winner_team_id === finalMatch.home_team_id ? finalMatch.home : finalMatch.away)
                   : null;
                 
                 if (!champion) return null;
                 
                 return (
                   <div className="flex flex-col items-center space-y-4">
                     <div className="relative">
                        <div className="absolute -inset-4 bg-yellow-500/20 rounded-full blur-2xl animate-pulse" />
                        <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-yellow-500/50 bg-[#0a0a1a] flex items-center justify-center p-4 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                          <ClubShield club={toShieldClub(champion) as any} size={80} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 h-10 w-10 md:h-12 md:w-12 bg-yellow-500 rounded-full flex items-center justify-center text-black border-4 border-[#0a0a1a] shadow-lg">
                          <Trophy className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                     </div>
                     <div className="text-center">
                       <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block mb-1">Grande Campeão</span>
                       <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">{champion.club_name}</h2>
                     </div>
                   </div>
                 );
               })()}
             </div>
          ) : myMatch && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-md w-full md:w-[320px] shadow-2xl overflow-hidden group/match shrink-0">
              <div className="bg-primary/20 py-2 px-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">SEU JOGO</span>
                  <div className="flex items-center gap-1 text-[8px] text-white/60 font-medium">
                    <MapPin className="h-2 w-2" />
                    <span className="truncate max-w-[120px]">{myMatch.home?.stadium_name || `Estádio do ${myMatch.home?.club_name}`}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-white/50 block">
                    {matchTimeMs ? new Date(myMatch.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--'}
                  </span>
                  <span className="text-[9px] font-mono text-white/70 block">
                    {matchTimeMs ? new Date(myMatch.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>
              </div>
              <CardContent className="p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-around gap-2">
                  <div className="flex flex-col items-center gap-2">
                    <ClubShield club={toShieldClub(myMatch.home) as any} size={48} />
                    <span className="text-[9px] md:text-[10px] font-bold text-white/80 truncate w-16 md:w-20 text-center">{myMatch.home?.club_name}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-black text-white/40 italic">VS</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <ClubShield club={toShieldClub(myMatch.away) as any} size={48} />
                    <span className="text-[9px] md:text-[10px] font-bold text-white/80 truncate w-16 md:w-20 text-center">{myMatch.away?.club_name}</span>
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
          {cup.status === 'finished' ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                <Trophy className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tighter">Aguardando Próxima Copa</h3>
                <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                  A competição atual chegou ao fim. Prepare seu elenco para os próximos desafios que virão em breve!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.filter(m => m.round === cup.current_round).map(m => (
                <MatchRow key={m.id} match={m} userId={userId} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bracket" className="outline-none">
          <div className="w-full rounded-3xl border border-border/50 bg-card/20 overflow-hidden">
            <ScrollArea className="w-full">
              <div className="relative flex gap-12 p-8 min-w-max items-stretch">
                {[...Array(cup.total_rounds)].map((_, i) => {
                  const r = i + 1;
                  const rMatches = matches.filter(match => match.round === r);
                  return (
                    <div key={r} className="w-56 space-y-6 flex flex-col relative">
                      <div className="flex flex-col items-center gap-2 mb-4">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] text-center">{getPhaseName(r, cup.total_rounds)}</span>
                        <div className="h-1.5 w-12 bg-primary/20 rounded-full" />
                      </div>
                      <div className="space-y-12 flex flex-col justify-around flex-1 py-4 relative">
                        {rMatches.length > 0 ? rMatches.map((m, idx) => (
                          <div key={m.id} className="relative group">
                            <BracketMatch match={m} userId={userId} />
                            {/* SVG Bracket Lines */}
                            {r < cup.total_rounds && (
                              <div className="absolute top-1/2 -right-12 w-12 h-[200%] pointer-events-none">
                                <svg className="w-full h-full" overflow="visible">
                                  <path 
                                    d={`M 0 0 L 24 0 L 24 ${idx % 2 === 0 ? '50%' : '-50%'} L 48 ${idx % 2 === 0 ? '50%' : '-50%'}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    className="text-border/40 group-hover:text-primary/40 transition-colors"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-dashed border-border/40 bg-card/20 p-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            A definir
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const finalMatch = matches.find(m => m.round === cup.total_rounds);
                  const champion = finalMatch?.status === 'finished'
                    ? (finalMatch.winner_team_id === finalMatch.home_team_id ? finalMatch.home : finalMatch.away)
                    : null;
                  return (
                    <div className="w-56 space-y-4 flex flex-col">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Campeão</span>
                        <div className="h-1.5 w-12 bg-yellow-500/30 rounded-full" />
                      </div>
                      <div className="flex-1 flex items-center justify-center py-4">
                        <div className={`relative w-full rounded-2xl border p-6 text-center space-y-4 shadow-2xl transition-all duration-500 ${champion ? 'border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent scale-110 ring-1 ring-yellow-500/30' : 'border-dashed border-border/40 bg-card/20'}`}>
                          <div className="flex justify-center">
                            <div className={`h-16 w-16 rounded-3xl flex items-center justify-center ${champion ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/40 animate-bounce' : 'bg-muted text-muted-foreground'}`}>
                              <Trophy className="h-8 w-8" />
                            </div>
                          </div>
                          {champion ? (
                            <>
                              <div className="flex justify-center">
                                <div className="p-2 bg-white/5 rounded-2xl border border-white/10">
                                  <ClubShield club={toShieldClub(champion) as any} size={56} />
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-black text-yellow-500 truncate uppercase">{champion.club_name}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Soberano</p>
                              </div>
                            </>
                          ) : (
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Aguardando a Glória</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="outline-none space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StatsSection title="Artilheiros" stats={goalStats} field="goals" icon={<Trophy className="h-4 w-4 text-yellow-500" />} label="GOLS" />
            <StatsSection title="Assistências" stats={assistStats} field="assists" icon={<Sparkles className="h-4 w-4 text-blue-400" />} label="AST" />
            <StatsSection title="Notas Médias" stats={ratingStats} field="avg_rating" icon={<Star className="h-4 w-4 text-orange-400" />} label="NOTA" isRating />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <StatsSection title="MOTM" stats={motmStats} field="motm_count" icon={<Star className="h-3 w-3 text-amber-400" />} label="🏆" />
            <StatsSection title="Clean Sheets" stats={cleanStats} field="clean_sheets" icon={<Shield className="h-3 w-3 text-emerald-400" />} label="🧤" />
            <StatsSection title="Amarelos" stats={yellowStats} field="yellow_cards" icon={<div className="h-3 w-2 bg-yellow-400 rounded-sm" />} label="🟨" />
            <StatsSection title="Vermelhos" stats={redStats} field="red_cards" icon={<div className="h-3 w-2 bg-red-500 rounded-sm" />} label="🟥" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card className="bg-primary/10 border-primary/20 rounded-3xl p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <Info className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase">Regulamento da Copa</h4>
                  <p className="text-[10px] text-muted-foreground font-medium mt-1">Partidas de mata-mata em jogo único. Em caso de empate no tempo normal, a decisão será nos pênaltis.</p>
                </div>
              </div>
            </Card>
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
          <ClubShield club={toShieldClub(match.home) as any} size={32} />
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
          <ClubShield club={toShieldClub(match.away) as any} size={32} />
        </div>
      </CardContent>
    </Card>
  );
}

function BracketMatch({ match, userId }: { match: any; userId: string }) {
  const isHomeWinner = match.winner_team_id === match.home_team_id;
  const isAwayWinner = match.winner_team_id === match.away_team_id;
  const isMine = match.home?.user_id === userId || match.away?.user_id === userId;
  const isLive = match.status === 'live';

  return (
    <div 
      className={`relative w-full rounded-2xl bg-[#0f0f1a] border border-white/5 p-3 space-y-2 transition-all hover:scale-[1.02] hover:border-primary/30 shadow-xl cursor-pointer overflow-hidden ${isMine ? 'ring-1 ring-primary/50 bg-primary/5' : ''}`}
      onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:open-match-details', { detail: { matchId: match.id } }))}
    >
      {isLive && (
        <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-[8px] font-black text-white uppercase tracking-widest rounded-bl-lg animate-pulse">
          AO VIVO
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ClubShield club={toShieldClub(match.home) as any} size={22} />
          <div className="flex flex-col truncate">
            <span className={`text-[10px] font-bold truncate ${isHomeWinner ? 'text-white' : 'text-muted-foreground'} ${isMine && match.home?.user_id === userId ? 'text-primary' : ''}`}>
              {match.home?.club_name || 'TBD'}
            </span>
            {match.home?.is_bot && <span className="text-[7px] font-black text-white/20 uppercase">BOT</span>}
          </div>
        </div>
        <span className={`text-[11px] font-black tabular-nums ${isHomeWinner ? 'text-primary' : 'text-white'}`}>{match.home_score ?? '-'}</span>
      </div>
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ClubShield club={toShieldClub(match.away) as any} size={22} />
          <div className="flex flex-col truncate">
            <span className={`text-[10px] font-bold truncate ${isAwayWinner ? 'text-white' : 'text-muted-foreground'} ${isMine && match.away?.user_id === userId ? 'text-primary' : ''}`}>
              {match.away?.club_name || 'TBD'}
            </span>
            {match.away?.is_bot && <span className="text-[7px] font-black text-white/20 uppercase">BOT</span>}
          </div>
        </div>
        <span className={`text-[11px] font-black tabular-nums ${isAwayWinner ? 'text-primary' : 'text-white'}`}>{match.away_score ?? '-'}</span>
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
