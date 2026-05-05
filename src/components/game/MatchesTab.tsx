import { Match, Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Play, Check, Home, Swords, Clock, Calendar, Plane, Globe, Trophy, LogIn, Shuffle, Scale, Users } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OnlineFriendliesTab } from './OnlineFriendliesTab';
import { MatchCalendarTab } from './MatchCalendarTab';
import { MatchLobbyScreen } from './MatchLobbyScreen';
import { simulateInstantFriendly, type InstantFriendlyResult } from '@/match/instantFriendly';
import { updateGlobalRanking } from '@/match/rankingUpdater';
import { toast } from 'sonner';

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
  fans: number;
  applyFanChange: (delta: number, sourceLabel?: string) => void;
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

export function MatchesTab({
  clubName, stadiumName,
  players, teamStrength, tactics, userId, stadiumCapacity, fans, applyFanChange,
}: Props) {
  const navigate = useNavigate();

  // Tournament matches for this user
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([]);
  const [tournamentNames, setTournamentNames] = useState<Record<string, string>>({});
  const [lobbyMatch, setLobbyMatch] = useState<any | null>(null);

  // Instant friendly state
  const [simulating, setSimulating] = useState<null | 'bot_balanced' | 'bot_random'>(null);
  const [lastResult, setLastResult] = useState<(InstantFriendlyResult & { mode: 'bot_balanced' | 'bot_random' }) | null>(null);

  useEffect(() => {
    if (!userId) return;
    const loadMatches = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Sincronizar estado da liga
      await supabase.rpc('sync_league_state', { _user_id: user.id });

      // Load Official World League matches
      const { data: userLeague } = await supabase
        .from('world_league_teams')
        .select('league_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userLeague?.league_id) {
        // Aba Jogos agora puxa diretamente de world_matches como fonte da verdade
        const { data: wm, error: wmErr } = await supabase
          .from('world_matches')
          .select(`
            id, 
            matchday, 
            kickoff_at, 
            status, 
            home_goals, 
            away_goals,
            home_team:world_league_teams!home_team_id(club_name, bot_strength), 
            away_team:world_league_teams!away_team_id(club_name, bot_strength)
          `)
          .eq('league_id', userLeague.league_id)
          .order('matchday', { ascending: true })
          .order('kickoff_at', { ascending: true });
        
        if (wmErr) {
          console.error('Erro ao buscar jogos da liga:', wmErr);
        } else if (wm) {
          const enriched = wm.map((m: any) => {
            const hName = m.home_team?.club_name || '???';
            const aName = m.away_team?.club_name || '???';
            const isHome = hName === clubName;
            return {
              ...m,
              homeName: hName,
              awayName: aName,
              homeStrength: m.home_team?.bot_strength || 60,
              awayStrength: m.away_team?.bot_strength || 60,
              isHome,
              isOfficial: true,
              scheduled_at: m.kickoff_at
            };
          });
          setTournamentMatches(enriched);
        }
      }

      // Load Custom Tournament matches (manter se houver)
    };
    loadMatches();
    const interval = setInterval(loadMatches, 60000);
    return () => clearInterval(interval);
  }, [userId, clubName]);

  const goToTournamentMatch = (tm: any) => {
    const isHome = tm.isHome;
    // Knockout stages enforce extra time + penalties (no draws allowed).
    const stageStr = String(tm.stage || '').toLowerCase();
    const isKnockout = stageStr && !stageStr.startsWith('grupo') && stageStr !== 'league' && stageStr !== 'liga' && stageStr !== 'group';
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
        fans: fans,
        tieBreaker: isKnockout ? 'both' : 'none',
      },
    });
  };

  const openTournamentMatch = (tm: any) => {
    if (tm.opponentIsBot) {
      goToTournamentMatch(tm);
      return;
    }
    setLobbyMatch(tm);
  };

  const getTimeUntilMatch = (scheduledAt: string): { text: string; isNow: boolean; isExpired: boolean } => {
    const scheduledTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const diff = scheduledTime - now;
    const WINDOW_MS = 1 * 60 * 1000; // 1 min window
    if (diff <= 0) {
      const elapsed = now - scheduledTime;
      if (elapsed >= WINDOW_MS) return { text: 'Simulada', isNow: false, isExpired: true };
      return { text: 'AO VIVO', isNow: true, isExpired: false };
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return { text: `${Math.floor(hours / 24)}d ${hours % 24}h`, isNow: false, isExpired: false };
    return { text: `${hours}h ${mins}min`, isNow: false, isExpired: false };
  };

  // ─────────── INSTANT FRIENDLY (vs BOT) ───────────
  const runInstantBot = async (mode: 'bot_balanced' | 'bot_random') => {
    if (simulating) return;
    if (!players || players.length === 0) {
      toast.error('Carregando elenco... aguarde um instante.');
      return;
    }
    setSimulating(mode);
    // Pequeno delay artificial só para feedback visual
    await new Promise(r => setTimeout(r, 500));
    const isHome = Math.random() < 0.6;
    const result = simulateInstantFriendly({
      mode,
      myClubName: clubName,
      myPlayers: players,
      currentFans: fans,
      isHome,
    });

    // Aplica torcida imediatamente no save
    applyFanChange(
      result.fanChange,
      mode === 'bot_balanced' ? 'Amistoso BOT (Equilibrado)' : 'Amistoso BOT (Aleatório)'
    );

    // Atualiza ranking global (amistoso vs BOT pesa metade)
    if (userId) {
      updateGlobalRanking({
        userId,
        clubName,
        outcome: result.outcome,
        competition: 'friendly',
        competitionLabel: 'Amistoso',
      }).catch(() => { /* silencioso */ });
    }

    setLastResult({ ...result, mode });
    setSimulating(null);
  };

  // Lobby overlay (5-min sync window) for human-vs-human tournament/league matches
  if (lobbyMatch) {
    const oppName = lobbyMatch.isHome ? lobbyMatch.awayName : lobbyMatch.homeName;
    return (
      <MatchLobbyScreen
        matchType="league"
        matchId={lobbyMatch.id}
        userId={userId}
        myClub={clubName}
        oppClub={oppName}
        onReady={() => { const m = lobbyMatch; setLobbyMatch(null); goToTournamentMatch(m); }}
        onAutoSimulated={() => setLobbyMatch(null)}
        onCancel={() => setLobbyMatch(null)}
      />
    );
  }

  return (
    <>
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

      {/* ── VS BOT (instantâneo, 2 modos) ─────────────────────────────── */}
      <TabsContent value="bot">
        <div className="space-y-3">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" /> Amistoso vs BOT — Início Instantâneo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[10px] text-muted-foreground">
                Sem espera. Sem horário. A partida é simulada na hora e a recompensa vem em <span className="font-semibold text-primary">crescimento de torcida</span>.
              </p>

              {/* Modo Equilibrado */}
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">Modo Equilibrado</p>
                      <p className="text-[10px] text-muted-foreground">BOT calibrado ao seu nível (variação ±2 OVR)</p>
                    </div>
                    <Badge variant="outline" className="text-[8px]">+50 / +20 / +5 👥</Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => runInstantBot('bot_balanced')}
                    disabled={simulating !== null}
                    className="w-full h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Play className="h-3 w-3" /> {simulating === 'bot_balanced' ? 'Simulando...' : 'Jogar Agora'}
                  </Button>
                </CardContent>
              </Card>

              {/* Modo Aleatório */}
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4 text-purple-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">Modo Aleatório</p>
                      <p className="text-[10px] text-muted-foreground">BOT entre OVR 40–90 • upset = muito mais torcida</p>
                    </div>
                    <Badge variant="outline" className="text-[8px]">até +400 👥</Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => runInstantBot('bot_random')}
                    disabled={simulating !== null}
                    className="w-full h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700"
                  >
                    <Play className="h-3 w-3" /> {simulating === 'bot_random' ? 'Simulando...' : 'Jogar Agora'}
                  </Button>
                </CardContent>
              </Card>

              <p className="text-[9px] text-muted-foreground text-center">
                ⚡ Simulação instantânea • 👥 Torcida cresce com vitórias e upsets • ⚠️ Derrotas fáceis penalizam
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── TOURNAMENT MATCHES ──────────────────────────── */}
        {tournamentMatches.length > 0 && (
          <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-transparent mt-3">
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
                  <Card key={tm.id} className={`${timeInfo.isNow ? 'border-success/40 bg-success/5 animate-pulse' : timeInfo.isExpired ? 'border-muted/30 opacity-60' : 'border-border/30'}`}>
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
                            <Badge variant={timeInfo.isExpired ? 'secondary' : timeInfo.isNow ? 'default' : 'outline'} className={`text-[7px] ${timeInfo.isNow ? 'bg-success text-success-foreground' : ''}`}>
                              {timeInfo.isExpired ? '⚙️ Simulada' : timeInfo.isNow ? `🔴 ${timeInfo.text}` : `⏳ ${timeInfo.text}`}
                            </Badge>
                          </div>
                        </div>
                        {timeInfo.isNow && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openTournamentMatch(tm)}
                            className="h-7 px-3 text-xs gap-1 shrink-0 bg-success hover:bg-success/90"
                          >
                            <LogIn className="h-3 w-3" /> Entrar
                          </Button>
                        )}
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
          players={players}
          teamStrength={teamStrength}
          tactics={tactics}
          fans={fans}
        />
      </TabsContent>

      {/* ── HISTÓRICO / CALENDÁRIO ──────────────────────────────── */}
      <TabsContent value="calendar">
        <MatchCalendarTab userId={userId} clubName={clubName} />
      </TabsContent>
    </Tabs>

    {/* ── MODAL DE RESULTADO INSTANTÂNEO ─────────────────────── */}
    <Dialog open={!!lastResult} onOpenChange={(open) => !open && setLastResult(null)}>
      <DialogContent className="sm:max-w-md">
        {lastResult && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {lastResult.mode === 'bot_balanced'
                  ? <><Scale className="h-4 w-4 text-emerald-400" /> Modo Equilibrado</>
                  : <><Shuffle className="h-4 w-4 text-purple-400" /> Modo Aleatório</>}
              </DialogTitle>
            </DialogHeader>

            {/* Placar */}
            <div className="text-center py-4 rounded-lg bg-gradient-to-br from-muted/40 to-transparent border border-border/50">
              <div className="grid grid-cols-3 items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-semibold truncate">{clubName}</p>
                  <p className="text-[9px] text-muted-foreground">Você</p>
                </div>
                <div className="text-3xl font-mono font-bold tabular-nums">
                  {lastResult.myGoals} <span className="text-muted-foreground">x</span> {lastResult.oppGoals}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold truncate">{lastResult.oppName}</p>
                  <p className="text-[9px] text-muted-foreground">BOT</p>
                </div>
              </div>
              <Badge
                className={`mt-3 ${
                  lastResult.outcome === 'win' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : lastResult.outcome === 'draw' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  : 'bg-destructive/20 text-destructive border-destructive/30'
                }`}
              >
                {lastResult.outcome === 'win' ? '🟢 Vitória' : lastResult.outcome === 'draw' ? '🟡 Empate' : '🔴 Derrota'}
              </Badge>
            </div>

            {/* Recompensa em torcida */}
            <div className={`p-3 rounded-lg border text-center ${
              lastResult.fanChange > 0
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : lastResult.fanChange < 0
                ? 'bg-destructive/5 border-destructive/30'
                : 'bg-muted/20 border-border/30'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-4 w-4" />
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Torcida</p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${
                lastResult.fanChange > 0 ? 'text-emerald-400'
                : lastResult.fanChange < 0 ? 'text-destructive'
                : 'text-muted-foreground'
              }`}>
                {lastResult.fanChange > 0 ? '+' : ''}{lastResult.fanChange.toLocaleString('pt-BR')}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {lastResult.fanChange > 0 ? 'novos torcedores conquistados' : lastResult.fanChange < 0 ? 'torcedores perdidos' : 'sem variação'}
              </p>
            </div>

            {/* Eventos / gols */}
            {lastResult.events.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 pt-1">
                {lastResult.events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-muted/20">
                    <Badge variant="outline" className="text-[8px] tabular-nums shrink-0">{ev.minute}'</Badge>
                    <span className="truncate">{ev.description}</span>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setLastResult(null)} className="w-full">Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
