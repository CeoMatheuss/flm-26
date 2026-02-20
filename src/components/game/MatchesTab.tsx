import { Match, Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Check, Home, Swords, Clock, Calendar, Ban, Plane, Globe } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const nextMatch = matches.find(m => !m.played);
  const timeUntilReset = useMemo(() => alreadyPlayedToday ? getTimeUntilReset(lastFriendlyDate) : '', [alreadyPlayedToday, lastFriendlyDate]);

  const goToMatch = (match: Match) => {
    // BOT FC strength: use stored value or default 65
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
                      <Button size="sm" onClick={() => goToMatch(nextMatch)} className="h-7 px-3 text-xs gap-1">
                        <Play className="h-3 w-3" /> Jogar
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
