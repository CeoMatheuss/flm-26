import { Match, Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Check, Home, Swords, Clock, Calendar, Ban, Plane, Globe, Trophy, LogIn } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OnlineFriendliesTab } from './OnlineFriendliesTab';
import { MatchCalendarTab } from './MatchCalendarTab';

interface Props {
  matches: Match[];
  clubName: string;
  stadiumName: string;
  alreadyPlayedToday: boolean;
  lastFriendlyDate: string;
  players: Player[];
  teamStrength: number;
  tactics: TacticsConfig;
  onGenerateFriendly: () => void;
  userId: string;
  stadiumCapacity: number;
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return isoStr; }
}

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function getTimeUntilReset(lastFriendlyDate: string): string {
  if (!lastFriendlyDate) return '';
  const lastMatch = new Date(lastFriendlyDate);
  const resetTime = new Date(lastMatch.getTime() + 24 * 60 * 60 * 1000);
  const diff = resetTime.getTime() - Date.now();
  if (diff <= 0) return '0h 0min';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}min`;
}

export function MatchesTab({
  matches, clubName, stadiumName, alreadyPlayedToday, lastFriendlyDate,
  players, teamStrength, tactics, onGenerateFriendly, userId, stadiumCapacity
}: Props) {
  const navigate = useNavigate();
  const canGenerate = !alreadyPlayedToday;
  const canPlay = !alreadyPlayedToday;
  const nextMatch = matches.find(m => !m.played);
  const timeUntilReset = useMemo(() => alreadyPlayedToday ? getTimeUntilReset(lastFriendlyDate) : '', [alreadyPlayedToday, lastFriendlyDate]);

  // Tournament matches for this user
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([]);
  const [tournamentNames, setTournamentNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) return;
    const loadTournamentMatches = async () => {
      // Find user's tournament teams
      const { data: myTeams } = await supabase
        .from('custom_tournament_teams')
        .select('*')
        .eq('user_id', userId)
        .eq('eliminated', false);

      if (!myTeams || myTeams.length === 0) {
        setTournamentMatches([]);
        return;
      }

      setTournamentTeams(myTeams);
      const teamIds = myTeams.map(t => t.id);
      const tournamentIds = [...new Set(myTeams.map(t => t.tournament_id))];

      // Load tournament names
      const { data: tournaments } = await supabase
        .from('custom_tournaments')
        .select('id, name')
        .in('id', tournamentIds);

      if (tournaments) {
        const names: Record<string, string> = {};
        tournaments.forEach(t => { names[t.id] = t.name; });
        setTournamentNames(names);
      }

      // Find upcoming matches for this user
      const { data: upcomingMatches } = await supabase
        .from('custom_tournament_matches')
        .select('*')
        .eq('status', 'scheduled')
        .or(teamIds.map(id => `home_team_id.eq.${id},away_team_id.eq.${id}`).join(','))
        .order('scheduled_at', { ascending: true })
        .limit(10);

      if (upcomingMatches) {
        // Load all teams for these matches
        const allTeamIds = new Set<string>();
        upcomingMatches.forEach(m => {
          allTeamIds.add(m.home_team_id);
          allTeamIds.add(m.away_team_id);
        });
        const { data: matchTeams } = await supabase
          .from('custom_tournament_teams')
          .select('*')
          .in('id', [...allTeamIds]);

        const enriched = upcomingMatches.map(m => {
          const home = matchTeams?.find(t => t.id === m.home_team_id);
          const away = matchTeams?.find(t => t.id === m.away_team_id);
          const myTeam = myTeams.find(t => t.id === m.home_team_id || t.id === m.away_team_id);
          const isHome = myTeam?.id === m.home_team_id;
          return { ...m, homeName: home?.club_name || '???', awayName: away?.club_name || '???', homeStrength: home?.bot_strength || 60, awayStrength: away?.bot_strength || 60, isHome, myTeamId: myTeam?.id, opponentIsBot: isHome ? away?.is_bot : home?.is_bot };
        });
        setTournamentMatches(enriched);
      }
    };
    loadTournamentMatches();
    const interval = setInterval(loadTournamentMatches, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const goToMatch = (match: Match) => {
    const botStrength = (match as any).opponentStrength || 65;
    navigate('/match', {
      state: {
        homeTeam: match.isHome ? clubName : match.opponent,
        awayTeam: match.isHome ? match.opponent : clubName,
        homePlayers: players,
        homeStrength: teamStrength,
        awayStrength: botStrength,
        matchId: match.id,
        tactics,
        stadiumName: match.isHome ? stadiumName : (match.stadium || 'Estádio BOT FC'),
        stadiumCapacity: match.isHome ? stadiumCapacity : (match.stadiumCapacity || 10000),
        isHome: match.isHome ?? true,
      },
    });
  };

  const goToTournamentMatch = (tm: any) => {
    const isHome = tm.isHome;
    navigate('/match', {
      state: {
        homeTeam: isHome ? clubName : tm.homeName,
        awayTeam: isHome ? tm.awayName : clubName,
        homePlayers: players,
        homeStrength: teamStrength,
        awayStrength: isHome ? tm.awayStrength : tm.homeStrength,
        matchId: tm.id,
        tactics,
        stadiumName: isHome ? stadiumName : 'Estádio Adversário',
        stadiumCapacity: stadiumCapacity,
        isHome,
        competition: tournamentNames[tm.tournament_id] || 'Campeonato',
        tournamentMatchId: tm.id,
      },
    });
  };

  const getTimeUntilMatch = (scheduledAt: string): { text: string; isNow: boolean } => {
    const diff = new Date(scheduledAt).getTime() - Date.now();
    if (diff <= 0) return { text: 'AGORA!', isNow: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return { text: `${Math.floor(hours / 24)}d ${hours % 24}h`, isNow: false };
    return { text: `${hours}h ${mins}min`, isNow: false };
  };

  return (
    <Tabs defaultValue="bot" className="space-y-3">
      <TabsList className="w-full">
        <TabsTrigger value="bot" className="flex-1 text-xs gap-1.5">
          <Swords className="h-3.5 w-3.5" /> vs BOT
        </TabsTrigger>
        <TabsTrigger value="online" className="flex-1 text-xs gap-1.5">
          <Globe className="h-3.5 w-3.5" /> Online
        </TabsTrigger>
        <TabsTrigger value="calendar" className="flex-1 text-xs gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> Histórico
        </TabsTrigger>
      </TabsList>

      {/* ── VS BOT ─────────────────────────────────────────────── */}
      <TabsContent value="bot">
        <div className="space-y-3">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" /> Amistoso Diário vs BOT FC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Status */}
              <div className={`rounded-lg p-3 text-center ${alreadyPlayedToday ? 'bg-destructive/10 border border-destructive/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  {alreadyPlayedToday ? <Ban className="h-4 w-4 text-destructive" /> : <Check className="h-4 w-4 text-emerald-400" />}
                  <p className="text-sm font-bold">{alreadyPlayedToday ? 'Já jogou hoje' : 'Amistoso disponível!'}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {alreadyPlayedToday ? 'Volte amanhã para jogar outro' : 'Você pode jogar 1 amistoso por dia'}
                </p>
              </div>

              {/* Countdown */}
              {alreadyPlayedToday && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Clock className="h-4 w-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-300">Próximo amistoso em:</p>
                    <p className="text-sm font-bold text-blue-400">{timeUntilReset}</p>
                  </div>
                </div>
              )}

              {/* Last match */}
              {lastFriendlyDate && alreadyPlayedToday && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/20 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>Último: {formatDate(lastFriendlyDate)} às {formatTime(lastFriendlyDate)}</span>
                </div>
              )}

              {/* Play or generate */}
              {nextMatch ? (
                <Card className="border-primary/40 bg-primary/5">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-border/30">
                      <Badge variant="secondary" className="text-[9px] gap-1">🤖 Amistoso vs BOT FC</Badge>
                      <Badge variant="outline" className="text-[9px] gap-1">
                        {nextMatch.isHome ? <Home className="h-2.5 w-2.5" /> : <Plane className="h-2.5 w-2.5" />}
                        {nextMatch.isHome ? 'Casa' : 'Fora'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium">vs {nextMatch.opponent}</span>
                        {(nextMatch as any).opponentStrength && (
                          <Badge variant="outline" className="ml-2 text-[8px]">OVR ~{(nextMatch as any).opponentStrength}</Badge>
                        )}
                      </div>
                      <Button size="sm" onClick={() => goToMatch(nextMatch)} disabled={!canPlay} className="h-7 px-3 text-xs gap-1">
                        <Play className="h-3 w-3" /> {canPlay ? 'Jogar' : 'Bloqueado'}
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      🏟️ {nextMatch.stadium || stadiumName} • {nextMatch.isHome ? 'Mandante' : 'Visitante'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Button onClick={onGenerateFriendly} disabled={!canGenerate} className="w-full gap-2">
                  <Swords className="h-4 w-4" />
                  {alreadyPlayedToday ? 'Volte amanhã' : 'Jogar Amistoso vs BOT FC'}
                </Button>
              )}

              <p className="text-[10px] text-muted-foreground text-center">
                ⚽ 1 amistoso por dia • 🤖 BOT FC com força variável • 🏟️ mando aleatório
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── TOURNAMENT MATCHES ──────────────────────────── */}
        {tournamentMatches.length > 0 && (
          <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-warning" /> Jogos de Campeonato
                <Badge variant="outline" className="text-[8px] ml-auto">{tournamentMatches.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tournamentMatches.map(tm => {
                const timeInfo = getTimeUntilMatch(tm.scheduled_at);
                return (
                  <Card key={tm.id} className={`${timeInfo.isNow ? 'border-success/40 bg-success/5 animate-pulse' : 'border-border/30'}`}>
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-border/20">
                        <Badge variant="secondary" className="text-[8px] gap-1">
                          🏆 {tournamentNames[tm.tournament_id] || 'Campeonato'}
                        </Badge>
                        <Badge variant="outline" className="text-[8px] gap-1">
                          {tm.stage || `Rodada ${tm.round}`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className={`font-medium truncate ${tm.isHome ? 'text-primary' : ''}`}>{tm.homeName}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className={`font-medium truncate ${!tm.isHome ? 'text-primary' : ''}`}>{tm.awayName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] text-muted-foreground">
                              📅 {new Date(tm.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ⏰ {new Date(tm.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Badge variant={timeInfo.isNow ? 'default' : 'outline'} className={`text-[7px] ${timeInfo.isNow ? 'bg-success text-success-foreground' : ''}`}>
                              {timeInfo.isNow ? '🔴 AO VIVO' : `⏳ ${timeInfo.text}`}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={timeInfo.isNow ? 'default' : 'outline'}
                          onClick={() => goToTournamentMatch(tm)}
                          className={`h-7 px-3 text-xs gap-1 shrink-0 ${timeInfo.isNow ? 'bg-success hover:bg-success/90' : ''}`}
                        >
                          <LogIn className="h-3 w-3" />
                          {timeInfo.isNow ? 'Entrar' : 'Ver'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <p className="text-[9px] text-muted-foreground text-center">
                🏆 Jogos começam automaticamente no horário • Entre antes para jogar ao vivo!
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>




      {/* ── ONLINE ─────────────────────────────────────────────── */}
      <TabsContent value="online">
        <OnlineFriendliesTab
          userId={userId}
          clubName={clubName}
          stadiumName={stadiumName || 'Arena'}
          stadiumCapacity={stadiumCapacity}
        />
      </TabsContent>

      {/* ── HISTÓRICO / CALENDÁRIO ──────────────────────────────── */}
      <TabsContent value="calendar">
        <MatchCalendarTab userId={userId} clubName={clubName} />
      </TabsContent>
    </Tabs>
  );
}
