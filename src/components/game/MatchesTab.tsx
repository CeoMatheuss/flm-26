import { Match, Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Check, Home, Swords, Trophy, Clock, Calendar, Ban, Plane, Search, Globe } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeagueTeam } from '@/types/league';
import { OnlineFriendliesTab } from './OnlineFriendliesTab';

interface Props {
  matches: Match[];
  clubName: string;
  stadiumName: string;
  alreadyPlayedToday: boolean;
  lastFriendlyDate: string;
  leagueTeams: LeagueTeam[];
  players: Player[];
  teamStrength: number;
  tactics: TacticsConfig;
  onSimulate: (id: string) => void;
  onGenerateFriendly: () => void;
  onGenerateFriendlyVs: (teamName: string) => void;
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

export function MatchesTab({ matches, clubName, stadiumName, alreadyPlayedToday, lastFriendlyDate, leagueTeams, players, teamStrength, tactics, onSimulate, onGenerateFriendly, onGenerateFriendlyVs, userId, stadiumCapacity }: Props) {
  const navigate = useNavigate();
  const canGenerate = !alreadyPlayedToday;
  const nextMatch = matches.find(m => !m.played);
  const playedMatches = matches.filter(m => m.played);
  const timeUntilReset = useMemo(() => alreadyPlayedToday ? getTimeUntilReset(lastFriendlyDate) : '', [alreadyPlayedToday, lastFriendlyDate]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const filteredTeams = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return leagueTeams
      .filter(t => t.name !== clubName && t.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5);
  }, [searchTerm, leagueTeams, clubName]);

  const goToMatch = (match: Match) => {
    const opp = leagueTeams.find(t => t.name === match.opponent);
    navigate('/match', {
      state: {
        homeTeam: match.isHome ? clubName : match.opponent,
        awayTeam: match.isHome ? match.opponent : clubName,
        homePlayers: players,
        homeStrength: teamStrength,
        awayStrength: opp?.strength || 65,
        matchId: match.id,
        tactics,
        stadiumName: match.stadium || stadiumName,
        stadiumCapacity: match.stadiumCapacity || stadiumCapacity,
        isHome: match.isHome ?? true,
      },
    });
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
      </TabsList>

      <TabsContent value="bot">
      <div className="space-y-3">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary" /> Amistoso Diário vs BOT
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

          {/* Last match info */}
          {lastFriendlyDate && alreadyPlayedToday && (
            <div className="flex items-center gap-2 p-2 rounded bg-muted/20 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Último: {formatDate(lastFriendlyDate)} às {formatTime(lastFriendlyDate)}</span>
            </div>
          )}

          {/* Next match or generate */}
          {nextMatch ? (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-border/30">
                  <Badge variant="secondary" className="text-[9px] gap-1">⚽ Amistoso</Badge>
                  <Badge variant="outline" className="text-[9px] gap-1">
                    {nextMatch.isHome ? <Home className="h-2.5 w-2.5" /> : <Plane className="h-2.5 w-2.5" />}
                    {nextMatch.isHome ? 'Casa' : 'Fora'}
                  </Badge>
                  {formatTime(nextMatch.date) && (
                    <Badge variant="outline" className="text-[9px] gap-1">
                      <Clock className="h-2.5 w-2.5" /> {formatTime(nextMatch.date)}
                    </Badge>
                  )}
                </div>
                {/* Stadium info */}
                <div className="text-[10px] text-muted-foreground mb-2 space-y-0.5">
                  <div className="flex items-center gap-1">🏟️ {nextMatch.stadium || stadiumName}</div>
                  {nextMatch.stadiumCapacity && (
                    <div className="text-[9px] text-muted-foreground/60">Capacidade: {nextMatch.stadiumCapacity.toLocaleString()} lugares</div>
                  )}
                  <div className="text-[9px]">
                    <span className="font-medium">{nextMatch.isHome ? clubName : nextMatch.opponent}</span>
                    <span className="text-muted-foreground/50"> (Mandante) vs </span>
                    <span>{nextMatch.isHome ? nextMatch.opponent : clubName}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-medium truncate">{nextMatch.isHome ? clubName : nextMatch.opponent}</span>
                    <span className="text-[10px] text-muted-foreground">vs</span>
                    <span className="text-xs sm:text-sm truncate">{nextMatch.isHome ? nextMatch.opponent : clubName}</span>
                  </div>
                  <Button size="sm" onClick={() => goToMatch(nextMatch)} className="h-7 px-3 text-xs gap-1">
                    <Play className="h-3 w-3" /> Jogar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <Button onClick={onGenerateFriendly} disabled={!canGenerate} className="w-full gap-2">
                <Swords className="h-4 w-4" />
                {alreadyPlayedToday ? 'Volte amanhã' : 'Gerar Amistoso Aleatório'}
              </Button>

              {/* Invite by club name */}
              {canGenerate && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowInvite(!showInvite)} className="w-full gap-2 text-xs">
                    <Search className="h-3.5 w-3.5" />
                    Convidar Clube Específico
                  </Button>
                  {showInvite && (
                    <div className="space-y-1.5">
                      <Input
                        placeholder="Buscar por nome do clube..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-8 text-xs"
                      />
                      {filteredTeams.map(team => (
                        <Button
                          key={team.name}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs gap-2"
                          onClick={() => {
                            onGenerateFriendlyVs(team.name);
                            setShowInvite(false);
                            setSearchTerm('');
                          }}
                        >
                          <span>{team.logo}</span>
                          <span className="truncate">{team.name}</span>
                          <Badge variant="outline" className="ml-auto text-[8px]">OVR ~{team.strength}</Badge>
                        </Button>
                      ))}
                      {searchTerm.trim() && filteredTeams.length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-1">Nenhum clube encontrado</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            ⚽ 1 amistoso por dia • 🏟️ mando de campo • 📈 entrosamento
          </p>
        </CardContent>
      </Card>

      {/* History */}
      {playedMatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5" /> Histórico ({playedMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[...playedMatches].reverse().map((match) => {
              const resultColor = match.result
                ? match.result.home > match.result.away ? 'text-emerald-400' : match.result.home < match.result.away ? 'text-destructive' : 'text-primary'
                : '';
              return (
                <div key={match.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 text-xs">
                  {match.isHome ? <Home className="h-3 w-3 text-emerald-400 shrink-0" /> : <Plane className="h-3 w-3 text-blue-400 shrink-0" />}
                  <div className="flex flex-col w-16 shrink-0">
                    <span className="text-muted-foreground font-mono text-[10px]">{formatDate(match.date)}</span>
                    <span className="text-muted-foreground/60 font-mono text-[9px]">{formatTime(match.date)}</span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{match.opponent}</span>
                    {match.stadium && (
                      <span className="text-[8px] text-muted-foreground/50 truncate">
                        🏟️ {match.stadium}{match.stadiumCapacity ? ` (${match.stadiumCapacity.toLocaleString()})` : ''}
                      </span>
                    )}
                  </div>
                  {match.result && (
                    <span className={`font-bold font-mono px-1.5 py-0.5 rounded bg-muted/50 ${resultColor}`}>
                      {match.result.home} - {match.result.away}
                    </span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
      </TabsContent>

      <TabsContent value="online">
        <OnlineFriendliesTab
          userId={userId}
          clubName={clubName}
          stadiumName={stadiumName || 'Arena'}
          stadiumCapacity={stadiumCapacity}
        />
      </TabsContent>
    </Tabs>
  );
}