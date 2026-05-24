import { useEffect, useState, useMemo, useCallback } from 'react';
// @ts-ignore
import useSound from 'use-sound';

import { Club, Player } from '@/types/game';
import { GameEvent } from '@/types/events';
import { Infrastructure, getStadiumCapacity } from '@/types/infrastructure';
import { ClubProfile } from '@/types/clubProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, DollarSign, Star, Shield, TrendingUp, TrendingDown, Flame, Heart, Zap, Swords, Building2, Activity, Calendar, User, Instagram, GraduationCap, Dumbbell, Stethoscope, Landmark, Loader2, FileText, CheckCircle2, XCircle, MinusCircle, Globe, RefreshCcw, Bell, Wallet, AlertTriangle } from 'lucide-react';
import { calculateStadiumEconomy, safeNumber } from '@/match/stadiumEconomyEngine';

import { ClubShield } from './ClubShield';
import { PersonalizedCupWidget } from './PersonalizedCupWidget';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { NewspaperCard } from './NewspaperCard';
import { MatchDashboardCard } from './MatchDashboardCard';
import { TournamentDashboardCard } from './TournamentDashboardCard';
import { WorldCupTeaser } from './WorldCupTeaser';

import { SeasonStartWidget } from './SeasonStartWidget';
import { WaitingListPanel } from './WaitingListPanel';
import { BallonDorTeaserWidget } from './BallonDorTeaserWidget';
import { motion, AnimatePresence } from 'framer-motion';


// Logic for standing sync
function LeagueStandingsMini({ userId }: { userId?: string }) {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: teamData } = await supabase.from('world_teams').select('id, league_id').eq('user_id', userId).maybeSingle();
      if (teamData && teamData.league_id) {
        setMyTeamId(teamData.id);
        const { data: table } = await supabase
          .from('world_league_table')
          .select('*, world_teams(name)')
          .eq('league_id', teamData.league_id)
          .order('points', { ascending: false })
          .order('wins', { ascending: false })
          .order('goals_for', { ascending: false })
          .limit(5);
        if (table) setStandings(table);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (standings.length === 0) return null;

  return (
    <Card className="game-card">
      <CardHeader className="py-2 px-3 border-b border-border/50">
        <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Trophy className="h-3 w-3 text-emerald-400" /> Top 5 Liga
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/30">
          {standings.map((s, i) => (
            <div 
              key={s.id} 
              className={`flex items-center justify-between px-3 py-1.5 text-[10px] cursor-pointer hover:bg-accent/30 transition-colors group ${s.team_id === myTeamId ? 'bg-primary/5' : ''}`}
              onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: s.world_teams?.name } }))}
            >
              <div className="flex items-center gap-2">
                <span className={`font-bold w-3 ${s.team_id === myTeamId ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                <span className={`truncate max-w-[100px] group-hover:text-primary transition-colors ${s.team_id === myTeamId ? 'font-black text-primary' : ''}`}>
                  {s.team_id === myTeamId ? 'Seu Time' : (s.world_teams?.name || `Time ${i + 1}`)}
                </span>
              </div>
              <span className={`font-bold ${s.team_id === myTeamId ? 'text-primary' : 'text-muted-foreground'}`}>{s.points} pts</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


function GlobalRankingMini({ userId }: { userId?: string }) {
  const [me, setMe] = useState<any>(null);
  const [pos, setPos] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: all } = await supabase
        .from('global_ranking')
        .select('*')
        .order('ranking_points', { ascending: false });
      
      if (all) {
        const index = all.findIndex(r => r.user_id === userId);
        if (index >= 0) {
          setMe(all[index]);
          setPos(index + 1);
        }
      }
      setLoading(false);
    };
    load();
  }, [userId]);


  if (loading || !me) return null;



  const variation = me.prev_position ? me.prev_position - pos! : 0;

  return (
    <Card className="game-card border-primary/20 bg-gradient-to-br from-primary/10 to-transparent overflow-hidden">
      <CardHeader className="py-2 px-3 border-b border-white/5 bg-white/5">
        <CardTitle className="text-[10px] uppercase tracking-wider text-primary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3" /> Ranking Mundial
          </div>
          {variation !== 0 && (
            <div className={`flex items-center gap-0.5 text-[8px] ${variation > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {variation > 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
              {Math.abs(variation)}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-black italic tracking-tighter leading-none">#{pos}</p>
            <p className="text-[9px] text-muted-foreground uppercase mt-1">Sua posição global</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary leading-none">{me.ranking_points}</p>
            <p className="text-[9px] text-muted-foreground uppercase mt-1">Pontos Ranking</p>
          </div>
        </div>
        <div className="mt-3 flex gap-1 justify-center">
          {me.recent_form?.slice(0, 5).map((res: string, i: number) => (
            <div 
              key={i}
              className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white
                ${res === 'V' ? 'bg-emerald-500' : res === 'E' ? 'bg-amber-500' : 'bg-red-500'}`}
            >
              {res}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  club: Club;
  events: GameEvent[];
  infrastructure?: Infrastructure;
  onOpenNewspaper?: () => void;
  onGoToFriendly?: () => void;
  userId?: string;
  onOpenTournament?: (tournamentId: string) => void;
  onOpenWorldCup?: () => void;
  onExploreOtherModes?: () => void;

  clubProfile?: ClubProfile;
  season?: number;
  currentWeek?: number;
  totalWeeks?: number;
  onViewClub?: (clubName: string) => void;
  onGoToSquad?: () => void;
  onRestAll?: () => void;
}

export function DashboardTab({ club, events, infrastructure, onOpenNewspaper, onGoToFriendly, userId, onOpenTournament, onOpenWorldCup, onExploreOtherModes, clubProfile, season, currentWeek, totalWeeks, onViewClub, onGoToSquad, onRestAll }: Props) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [dbPlayers, setDbPlayers] = useState<Player[]>(club.players || []);
  const [liveStats, setLiveStats] = useState<{ points: number; wins: number; draws: number; losses: number; rank?: number } | null>(null);
  
  const [membershipRevenue, setMembershipRevenue] = useState<{ amount: number; total: number } | null>(null);
  
  const fetchLiveStats = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: teamData } = await supabase.from('world_teams').select('id, league_id').eq('user_id', userId).maybeSingle();
      if (teamData) {
        const { data: statsData } = await supabase
          .from('world_league_table')
          .select('points, wins, draws, losses')
          .eq('team_id', teamData.id)
          .maybeSingle();
        
        if (statsData) {
          // Também busca a posição na tabela
          const { data: fullTable } = await supabase
            .from('world_league_table')
            .select('team_id')
            .eq('league_id', teamData.league_id)
            .order('points', { ascending: false })
            .order('wins', { ascending: false })
            .order('goals_for', { ascending: false });
          
          const rank = fullTable ? fullTable.findIndex(t => t.team_id === teamData.id) + 1 : undefined;
          
          setLiveStats({
            points: statsData.points,
            wins: statsData.wins,
            draws: statsData.draws,
            losses: statsData.losses,
            rank: rank && rank > 0 ? rank : undefined
          });
        }

        // Fetch Membership Revenue info
        const { data: membershipData } = await supabase
          .from('membership_revenue_history')
          .select('amount, member_total')
          .eq('club_id', teamData.id)
          .order('month_year', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (membershipData) {
          setMembershipRevenue({
            amount: Number(membershipData.amount),
            total: membershipData.member_total
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar stats da liga:', error);
    }
  }, [userId]);

  const { winStreak } = useMemo(() => {
    const playedMatches = club.matches.filter(m => m.played);
    let ws = 0;
    for (let i = playedMatches.length - 1; i >= 0; i--) {
      const r = playedMatches[i].result;
      if (!r) break;
      const isWin = playedMatches[i].isHome ? r.home > r.away : r.away > r.home;
      if (isWin) { ws++; }
      else break;
    }
    return { winStreak: ws };
  }, [club.matches]);

  const refreshDashboard = useCallback(async () => {
    setIsSyncing(true);
    // Dispara evento global para forçar hooks (useGame, etc) a recarregarem se necessário
    window.dispatchEvent(new CustomEvent('flm:refresh-game-state'));
    await fetchLiveStats();
    setLastSync(new Date());
    setTimeout(() => setIsSyncing(false), 1000);
  }, [fetchLiveStats]);

  // 🔄 Sincronização automática do elenco via Realtime
  useEffect(() => {
    if (!userId) return;

    const loadPlayers = async () => {
      const { data: teamData } = await supabase.from('clubs').select('id').eq('user_id', userId).maybeSingle();
      if (teamData) {
        const { data: playersData } = await supabase
          .from('world_players')
          .select('*')
          .eq('team_id', teamData.id);
        if (playersData) {
          const formatted = playersData.map((p: any) => ({
            ...p,
            attributes: typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes,
          }));
          setDbPlayers(formatted as Player[]);
        }
      }
    };

    loadPlayers();
    fetchLiveStats();

    const channel = supabase.channel(`dashboard-players-${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'world_players'
      }, () => {
        loadPlayers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchLiveStats]);

  // Sincronização automática via Realtime
  useEffect(() => {
    if (!userId) return;

    const channels = [
      supabase.channel('dashboard-sync-teams')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'world_teams', filter: `user_id=eq.${userId}` }, () => {
          refreshDashboard();
        }).subscribe(),
      supabase.channel('dashboard-sync-league')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'world_league_table' }, () => {
          refreshDashboard();
        }).subscribe(),
      supabase.channel('dashboard-sync-ranking')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'global_ranking', filter: `user_id=eq.${userId}` }, () => {
          refreshDashboard();
        }).subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [userId, refreshDashboard]);



  const tiredPlayers = club.players.filter(p => p.stamina < 45);
  const showFatigueWarning = tiredPlayers.length >= 3;

  const liveWins = liveStats?.wins ?? club.stats.wins;
  const liveDraws = liveStats?.draws ?? club.stats.draws;
  const liveLosses = liveStats?.losses ?? club.stats.losses;
  const playedMatchesCount = liveWins + liveDraws + liveLosses;
  const winRate = playedMatchesCount > 0 ? Math.round(((liveWins * 3 + liveDraws) / (playedMatchesCount * 3)) * 100) : 0;


  const last5 = club.matches.filter(m => m.played).slice(-5);
  const recentWins = last5.filter(m => m.result && (m.isHome ? m.result.home > m.result.away : m.result.away > m.result.home) && !(m as any).isFriendly).length;
  const recentLosses = last5.filter(m => m.result && (m.isHome ? m.result.home < m.result.away : m.result.away < m.result.home) && !(m as any).isFriendly).length;
  const fanMood = recentWins >= 4 ? 'Eufórica 🔥' : recentWins >= 3 ? 'Empolgada 😄' : recentWins >= 2 ? 'Animada 🙂' : recentLosses >= 5 ? 'Revoltada 😡' : recentLosses >= 4 ? 'Insatisfeita 😤' : recentLosses >= 3 ? 'Preocupada 😟' : 'Estável 😐';
  const fanMoodColor = recentWins >= 3 ? 'text-success' : recentLosses >= 4 ? 'text-destructive' : 'text-primary';

  const playedMatches = club.matches.filter(m => m.played && !(m as any).isFriendly);
  let streak = 0;
  let streakType: 'V' | 'E' | 'D' | '' = '';
  for (let i = playedMatches.length - 1; i >= 0; i--) {
    const r = playedMatches[i].result;
    if (!r) continue;
    const isHome = playedMatches[i].isHome;
    const outcome = (isHome ? r.home > r.away : r.away > r.home) ? 'V' : (r.home === r.away ? 'E' : 'D');
    if (streakType === '') streakType = outcome;
    if (outcome === streakType) streak++;
    else break;
  }
  const streakLabel = streak > 0 ? `${streak}${streakType} seguidas` : 'Nenhuma';

  const handleOpenProfile = (name?: string) => {
    if (!name) return;
    (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: name } }));
  };

  const recentEvents = [...events].slice(0, 8);
  const eventColors: Record<string, string> = {
    injury: 'border-l-warning bg-warning/5',
    offer: 'border-l-primary bg-primary/5',
    protest: 'border-l-destructive bg-destructive/5',
    bonus: 'border-l-success bg-success/5',
    discovery: 'border-l-primary bg-primary/5',
    scandal: 'border-l-warning bg-warning/5',
    player_upgrade: 'border-l-success bg-success/5',
    fan_rage: 'border-l-destructive bg-destructive/5',
    stadium_upgrade: 'border-l-primary bg-primary/5',
    transfer_in: 'border-l-primary bg-primary/5',
    transfer_out: 'border-l-warning bg-warning/5',
    record: 'border-l-warning bg-warning/5',
    captain: 'border-l-warning bg-warning/5',
    derby: 'border-l-warning bg-warning/5',
    weather: 'border-l-primary bg-primary/5',
    season_awards: 'border-l-warning bg-warning/5',
    player_unhappy: 'border-l-destructive bg-destructive/5',
  };

  function formatMoneyShort(val: number) {
    return `R$ ${val.toLocaleString('pt-BR')}`;
  }

  const stadiumLevel = infrastructure?.stadium?.level || 1;
  const stadiumCapacity = infrastructure ? getStadiumCapacity(stadiumLevel) : 0;
  const isMaxStadium = stadiumLevel >= (infrastructure?.stadium?.maxLevel || 15);
  const playersToUse = dbPlayers.length > 0 ? dbPlayers : club.players;
  const avgOvr = playersToUse.length > 0 ? Math.round(playersToUse.reduce((s, p) => s + (p.overall || 0), 0) / playersToUse.length) : 0;

  
  const stadiumEconomy = useMemo(() => {
    return calculateStadiumEconomy({
      fans: safeNumber(club.fans),
      reputation: safeNumber(club.reputation || 50),
      ticketPrice: safeNumber(club.ticketPrice || 30),
      winStreak: recentWins,
      loseStreak: recentLosses,
      importance: 'liga',
      stadiumCapacity: stadiumCapacity || 5000,
      stadiumLevel: stadiumLevel,
      vipUnits: Object.values((infrastructure as any)?.vipBoxesBuilt || {}).reduce((a: any, b: any) => a + (b || 0), 0) as number
    });
  }, [club.fans, club.reputation, club.ticketPrice, recentWins, recentLosses, stadiumCapacity, stadiumLevel, infrastructure]);

  const estMatchRevenue = stadiumEconomy.revenue.total;

  return (
    <div className="space-y-3 sm:space-y-4 pb-10">
      {/* Header Vivo com Status de Sincronização */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500/40'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Dashboard em Tempo Real {isSyncing && '• Sincronizando...'}
          </span>
        </div>
      </div>


      <AnimatePresence>
        <motion.div
          key="dashboard-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 sm:space-y-4"
        >

            {/* Membership Revenue Widget */}
            {membershipRevenue && (
              <Card className="border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase">Receita de Sócios</p>
                        <p className="text-lg font-black">{formatMoneyShort(membershipRevenue.amount)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">Mês Atual</p>
                      <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Pago
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

      {/* Fatigue Warning */}
      {showFatigueWarning && (
        <Card className="border-orange-500/50 bg-orange-500/10 animate-in fade-in slide-in-from-top-4 duration-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-orange-400 uppercase tracking-wider">Aviso de Fadiga</h3>
                  <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-400 bg-orange-500/10">
                    {tiredPlayers.length} Jogadores
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">Atenção: {tiredPlayers.length} jogadores estão fadigados.</p>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-8 text-[10px] border-orange-500/30 text-orange-400" onClick={onRestAll}>Descansar Elenco</Button>
                  <Button size="sm" className="h-8 text-[10px] bg-orange-500 hover:bg-orange-600 text-white" onClick={onGoToSquad}>Ir para Elenco</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Club Info Widget */}
      <Card className="game-card border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 cursor-pointer hover:scale-105 transition-transform" onClick={() => handleOpenProfile(club.name)}>
              <ClubShield club={club as any} size={64} />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h2 className="text-sm sm:text-base font-black truncate">{club.name}</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-primary" />
                  <span className="font-bold truncate">{clubProfile?.ownerName || '—'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-primary" />
                  <span className="font-bold truncate">{club.country || '—'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-primary" />
                  <span className="font-bold">{playersToUse.length} jog. (OVR {avgOvr})</span>
                </div>

                <div className="flex items-center gap-1 text-emerald-400">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-bold">{formatMoneyShort(club.budget)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Start & Waiting List */}
      {userId && <WaitingListPanel userId={userId} onExploreOtherModes={onExploreOtherModes} />}
      <SeasonStartWidget seasonNumber={season} userId={userId} />

      {/* Quick Stats Grid - Modern Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="game-card border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Trophy className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black italic tracking-tighter">{liveStats?.points ?? club.stats.points}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground">Pontos na Liga</p>
            {liveStats?.rank && (
              <Badge variant="outline" className="text-[8px] h-3 px-1 mt-1 border-primary/30 text-primary">
                {liveStats.rank}º Lugar
              </Badge>
            )}
          </CardContent>
        </Card>


        <Card className="game-card border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all group">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <DollarSign className="h-5 w-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xl font-black italic tracking-tighter text-emerald-400 truncate max-w-full">
              {formatMoneyShort(club.budget).replace('R$ ', '')}
            </p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground">Orçamento</p>
          </CardContent>
        </Card>

        <Card className="game-card border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all group">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Users className="h-5 w-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black italic tracking-tighter">{club.fans.toLocaleString()}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground">Fãs Ativos</p>
          </CardContent>
        </Card>

        <Card className="game-card border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all group">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-5 w-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black italic tracking-tighter">{avgOvr}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground">Média do Elenco</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <Card className="game-card border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-[10px] sm:text-xs uppercase tracking-widest text-primary flex items-center justify-between">
              🏆 Pontuação & Ranking <span className="text-[9px] font-mono text-muted-foreground">S{season}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {useMemo(() => {
              const currentPoints = liveStats?.points ?? club.stats.points;
              let boardGoal = 45; let goalLabel = "Top 10";
              if (avgOvr >= 80) { boardGoal = 85; goalLabel = "Título"; }
              else if (avgOvr >= 75) { boardGoal = 70; goalLabel = "Libertadores"; }
              else if (avgOvr >= 70) { boardGoal = 60; goalLabel = "Libertadores"; }
              const progress = Math.min(100, Math.max(0, (currentPoints / boardGoal) * 100));
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-black">{currentPoints}<span className="text-sm ml-1 text-muted-foreground">pts</span></p>
                      <Badge variant="outline" className="text-[10px] mt-1">Meta: {goalLabel}</Badge>
                    </div>
                    <Trophy className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              );
            }, [club.stats.points, liveStats?.points, avgOvr])}

          </CardContent>
        </Card>

        <Card className="game-card border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-500 flex items-center justify-between">
              ⭐ Prestígio <Badge variant="outline" className="text-[8px] h-4 border-amber-500/30">Nível {Math.floor(club.reputation / 20) + 1}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-black text-amber-500">{club.reputation}</p>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < Math.floor(club.reputation / 20) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
              </div>
              <Star className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <MatchDashboardCard club={club} userId={userId} onGoToFriendly={onGoToFriendly} onViewClub={onViewClub} stadiumLevel={stadiumLevel} />

      {/* Standings & Ranking Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LeagueStandingsMini userId={userId} />
        <GlobalRankingMini userId={userId} />
      </div>
      
      <WorldCupTeaser userId={userId} onOpenWorldCup={onOpenWorldCup} />


      <NewspaperCard onOpenFullPage={onOpenNewspaper} userId={userId} />

      {/* Infrastructure */}
      <Card className="game-card overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/20">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Infraestrutura
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Estádio', value: infrastructure?.stadium?.level || 1, max: infrastructure?.stadium?.maxLevel || 15, icon: '🏟️' },
              { label: 'CT', value: infrastructure?.trainingCenter?.level || 1, max: infrastructure?.trainingCenter?.maxLevel || 30, icon: '⚽' },
              { label: 'Fisio', value: infrastructure?.physiotherapy?.level || 1, max: infrastructure?.physiotherapy?.maxLevel || 10, icon: '🏥' },
              { label: 'Base', value: infrastructure?.youthAcademy?.level || 1, max: infrastructure?.youthAcademy?.maxLevel || 30, icon: '🎓' },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-1.5 p-3 rounded-xl bg-background/40 border border-white/5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold">{item.icon} {item.label}</span>
                  <span className="text-primary font-black">Lv.{item.value}</span>
                </div>
                <Progress value={(item.value / item.max) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last 5 Results */}
      {last5.length > 0 && (
        <Card className="game-card">
          <CardHeader className="py-2 px-4 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" /> Forma Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-2 justify-center">
              {last5.map((m, i) => {
                const r = m.result!;
                const win = m.isHome ? r.home > r.away : r.away > r.home;
                const draw = r.home === r.away;
                return (
                  <motion.div key={i} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-[10px] font-black border ${win ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : draw ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                    <span className="text-[8px] opacity-60">{win ? 'V' : draw ? 'E' : 'D'}</span>
                    <span>{r.home}-{r.away}</span>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Players */}
      <Card className="game-card">
        <CardHeader className="py-2 px-4 border-b border-white/5">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-amber-500" /> Melhores do Elenco
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {[...club.players].sort((a, b) => b.overall - a.overall).slice(0, 5).map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors">
              <span className="text-[10px] w-4 text-center font-bold text-muted-foreground">{i + 1}</span>
              <span className="text-[8px] font-black px-1 rounded bg-primary/20 text-primary">{p.position}</span>
              <span className="flex-1 text-xs truncate font-medium">{p.name}</span>
              <span className="text-xs font-black italic">{p.overall}</span>
            </div>
          ))}
        </CardContent>
      </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}