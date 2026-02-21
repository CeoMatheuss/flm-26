import { useState, useCallback, useMemo } from 'react';
import { LeaguesOverview } from './LeaguesOverview';
import { ShieldCrest, ShieldShape, ShieldPattern } from './ShieldCrest';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, MessageSquare, Send, Users, Trophy, Handshake, Swords, Copy, Check, CalendarDays, Shield, Play, RefreshCw, Flag, Award, Loader2, Clock, Star, Zap } from 'lucide-react';
import { generatePlayer } from '@/utils/playerGenerator';
import type { Player } from '@/types/game';
import type { MultiplayerLeague, LeagueMember, ChatMessage, PrivateMessage, TradeProposal, Rivalry, LeagueMatch, LeagueSquad } from '@/hooks/useMultiplayer';

interface Props {
  userId: string;
  leagues: MultiplayerLeague[];
  currentLeague: MultiplayerLeague | null;
  members: LeagueMember[];
  chatMessages: ChatMessage[];
  privateMessages: PrivateMessage[];
  proposals: TradeProposal[];
  rivalries: Rivalry[];
  leagueMatches: LeagueMatch[];
  leagueSquads: LeagueSquad[];
  loading: boolean;
  autoJoining?: boolean;
  clubPlayers?: any[];
  clubTactics?: any;
  clubShield?: {
    primaryColor: string;
    secondaryColor: string;
    pattern: string;
    shape: string;
  };
  onEnterLeague: (league: MultiplayerLeague) => void;
  onLeaveLeague: () => void;
  onSendChat: (content: string) => void;
  onSendPrivateMessage: (receiverId: string, content: string) => void;
  onSendProposal: (receiverId: string, playerName: string, price: number, type: string, message?: string, loanDuration?: number) => void;
  onRespondProposal: (proposalId: string, accept: boolean) => void;
  onSyncSquad?: (players: any[], tactics: any) => void;
  onStartSeason?: () => void;
  onSimulateRound?: (round: number) => void;
  onEndSeason?: () => void;
}

export function MultiplayerTab(props: Props) {
  if (props.autoJoining) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Entrando na liga online...</p>
        <p className="text-xs text-muted-foreground/60">Você será colocado automaticamente na liga do seu país</p>
      </div>
    );
  }

  if (!props.currentLeague) {
    return <LeagueLobby {...props} />;
  }
  return <LeagueView {...props} />;
}

function LeagueLobby({ leagues, loading, onEnterLeague }: Props) {
  const [showAllLeagues, setShowAllLeagues] = useState(false);
  const mainLeagues = leagues.filter(l => (l as any).league_type !== 'beginner');
  const beginnerLeagues = leagues.filter(l => (l as any).league_type === 'beginner');
  const currentCountry = leagues.length > 0 ? (leagues[0] as any).country || 'Brasil' : 'Brasil';
  const clubName = leagues.length > 0 ? '' : '';

  if (showAllLeagues) {
    return <LeaguesOverview currentCountry={currentCountry} clubName={clubName} onBack={() => setShowAllLeagues(false)} />;
  }

  return (
    <div className="space-y-4">
      {/* Season Info Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Sistema de Ligas Online</h3>
              <p className="text-xs text-muted-foreground">
                📅 30 rodadas por temporada (1 rodada = 1 dia) • Dia 31 = transição entre temporadas
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                🏟️ Ligas criadas automaticamente pelo servidor • Redistribuição ao final de cada temporada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {leagues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Carregando sua liga...</p>
            <p className="text-xs text-muted-foreground mt-1">Você será atribuído automaticamente a uma liga do seu país.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {mainLeagues.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4" /> LIGAS PRINCIPAIS</CardTitle>
                <CardDescription className="text-xs">30 rodadas • 1 rodada por dia • Redistribuição automática</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {mainLeagues.map(l => (
                  <LeagueCard key={l.id} league={l} onEnter={() => onEnterLeague(l)} />
                ))}
              </CardContent>
            </Card>
          )}

          {beginnerLeagues.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /> TORNEIO DE INICIANTES</CardTitle>
                <CardDescription className="text-xs">Jogadores novos ou que entraram no meio da temporada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {beginnerLeagues.map(l => (
                  <LeagueCard key={l.id} league={l} onEnter={() => onEnterLeague(l)} isBeginner />
                ))}
              </CardContent>
            </Card>
          )}

          <Button variant="outline" className="w-full gap-2" onClick={() => setShowAllLeagues(true)}>
            <Globe className="h-4 w-4" /> Ver Mais Ligas
          </Button>
        </>
      )}
    </div>
  );
}

function LeagueCard({ league, onEnter, isBeginner }: { league: MultiplayerLeague; onEnter: () => void; isBeginner?: boolean }) {
  const l = league as any;
  const totalRounds = l.total_rounds || 30;
  const currentRound = l.current_round || 0;
  const daysLeft = totalRounds - currentRound;
  const division = l.division || 1;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${isBeginner ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/50 border-border/50'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{l.name}</p>
          {isBeginner && <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">Iniciantes</Badge>}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">DIV {division}</Badge>
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">T{l.season}</span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{l.country}</span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className={`text-xs ${l.season_status === 'in_progress' ? 'text-emerald-400' : l.season_status === 'finished' ? 'text-amber-400' : 'text-muted-foreground'}`}>
            {l.season_status === 'registration' ? '📝 Inscrições' : l.season_status === 'in_progress' ? `⚽ Rodada ${currentRound}/${totalRounds}` : l.season_status === 'finished' ? '🏆 Finalizada' : l.season_status}
          </span>
          {l.season_status === 'in_progress' && daysLeft > 0 && (
            <>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" /> {daysLeft}d restantes
              </span>
            </>
          )}
        </div>
      </div>
      <Button size="sm" onClick={onEnter} className="shrink-0">Entrar</Button>
    </div>
  );
}

function LeagueView(props: Props) {
  const { currentLeague, members, chatMessages, privateMessages, proposals, rivalries, leagueMatches, leagueSquads, userId,
    loading, clubPlayers, clubTactics,
    onLeaveLeague, onSendChat, onSendPrivateMessage, onSendProposal, onRespondProposal,
    onSyncSquad, onStartSeason, onSimulateRound, onEndSeason } = props;
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(currentLeague!.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOwner = currentLeague!.owner_id === userId;
  const seasonStatus = (currentLeague as any)?.season_status || 'registration';
  const mySquadSynced = leagueSquads.some(s => s.user_id === userId);
  const leagueType = (currentLeague as any)?.league_type || 'main';
  const totalRounds = (currentLeague as any)?.total_rounds || 30;

  return (
    <div className="space-y-4">
      {/* League Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">{currentLeague!.name}</h2>
            {leagueType === 'beginner' && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                <Star className="h-3 w-3 mr-0.5" /> Iniciantes
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Código: {currentLeague!.code}</span>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={copyCode}>
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </Button>
            <Badge variant="outline" className="text-[10px]">DIV {(currentLeague as any).division || 1}</Badge>
            <Badge variant="outline" className="text-[10px]">T{currentLeague!.season}</Badge>
            <Badge variant="outline" className="text-[10px]">{totalRounds} rodadas</Badge>
            <Badge variant={seasonStatus === 'in_progress' ? 'default' : 'secondary'} className="text-[10px]">
              {seasonStatus === 'registration' ? '📝 Inscrições' : seasonStatus === 'in_progress' ? `⚽ Rodada ${currentLeague!.current_round}/${totalRounds}` : '🏆 Finalizada'}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-9">{members.length}/{currentLeague!.max_members}</Badge>
        </div>
      </div>

      {/* Season Progress Bar */}
      {seasonStatus === 'in_progress' && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Progresso da Temporada</span>
            <span>{currentLeague!.current_round}/{totalRounds} dias</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all" 
              style={{ width: `${(currentLeague!.current_round / totalRounds) * 100}%` }} 
            />
          </div>
        </div>
      )}

      <Tabs defaultValue="standings">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-card/50">
          <TabsTrigger value="standings" className="gap-1 text-xs"><Trophy className="h-3 w-3" /> Tabela</TabsTrigger>
          <TabsTrigger value="matches" className="gap-1 text-xs"><CalendarDays className="h-3 w-3" /> Jogos</TabsTrigger>
          <TabsTrigger value="chat" className="gap-1 text-xs"><Globe className="h-3 w-3" /> Chat</TabsTrigger>
          <TabsTrigger value="awards" className="gap-1 text-xs"><Award className="h-3 w-3" /> Prêmios</TabsTrigger>
          <TabsTrigger value="rivalries" className="gap-1 text-xs"><Swords className="h-3 w-3" /> Rival</TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          <StandingsView members={members} userId={userId} division={(currentLeague as any).division || 1} leagueMatches={leagueMatches} clubShield={props.clubShield} />
        </TabsContent>
        <TabsContent value="matches">
          <MatchesView matches={leagueMatches} members={members} userId={userId} currentRound={currentLeague!.current_round} totalRounds={totalRounds} />
        </TabsContent>
        <TabsContent value="chat">
          <ChatView messages={chatMessages} userId={userId} onSend={onSendChat} />
        </TabsContent>
        <TabsContent value="rivalries">
          <RivalriesView rivalries={rivalries} members={members} userId={userId} />
        </TabsContent>
        <TabsContent value="awards">
          <AwardsView leagueMatches={leagueMatches} members={members} division={(currentLeague as any).division || 1} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === TEAM COLOR HELPER ===
function getTeamColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
}

// === BOT SQUAD CARD ===
const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};
const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

function BotSquadCard({ teamName, reputation }: { teamName: string; reputation: number }) {
  const squad = useMemo(() => {
    const strength = Math.max(40, Math.min(85, reputation));
    const minOvr = Math.max(40, strength - 15);
    const maxOvr = Math.min(95, strength + 5);
    const posCount: [Player['position'], number][] = [
      ['GOL', 2], ['ZAG', 4], ['LAT', 3], ['VOL', 3], ['MEI', 4], ['ATA', 4],
    ];
    const players: Player[] = [];
    for (const [pos, count] of posCount) {
      for (let i = 0; i < count; i++) {
        players.push(generatePlayer([minOvr, maxOvr], [18, 34], pos));
      }
    }
    return players.sort((a, b) => {
      const pA = posOrder.indexOf(a.position);
      const pB = posOrder.indexOf(b.position);
      if (pA !== pB) return pA - pB;
      return b.overall - a.overall;
    });
  }, [teamName, reputation]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" /> Elenco
          <Badge variant="outline" className="text-[9px] ml-2">OVR oculto</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {squad.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 hover:bg-muted/40 transition-colors">
              <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
              <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
              <span className="text-[10px] text-muted-foreground">{p.age} anos</span>
              <span className="text-xs font-bold w-8 text-right text-muted-foreground">???</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// === STANDINGS ===
function StandingsView({ members, userId, division, leagueMatches, clubShield }: { members: LeagueMember[]; userId: string; division: number; leagueMatches: LeagueMatch[]; clubShield?: { primaryColor: string; secondaryColor: string; pattern: string; shape: string } }) {
  const [selectedTeam, setSelectedTeam] = useState<LeagueMember | null>(null);
  const sorted = [...members].sort((a, b) => 
    b.points - a.points || 
    (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against) || 
    b.goals_for - a.goals_for ||
    a.losses - b.losses
  );
  
  const baseRewards = [20,17,14.5,12.5,11,10,9.2,8.4,7.8,7.2,6.6,6,5.4,4.8,4.2,3.6,3,2.4,1.8,1.2];
  const getDivisor = (d: number) => d === 1 ? 1 : d === 2 ? 2 : d === 3 ? 4 : 10;
  const getExpectedReward = (pos: number) => {
    const idx = Math.min(pos, 20) - 1;
    const val = baseRewards[idx] / getDivisor(division);
    return val >= 1 ? `${val.toFixed(1)}M` : `${(val * 1000).toFixed(0)}k`;
  };

  const getLast5 = (uid: string) => {
    const played = leagueMatches
      .filter(m => m.status === 'played' && (m.home_user_id === uid || m.away_user_id === uid))
      .sort((a, b) => (b.round || 0) - (a.round || 0))
      .slice(0, 5);
    return played.map(m => {
      const isHome = m.home_user_id === uid;
      const myGoals = isHome ? (m.home_goals ?? 0) : (m.away_goals ?? 0);
      const oppGoals = isHome ? (m.away_goals ?? 0) : (m.home_goals ?? 0);
      if (myGoals > oppGoals) return 'W';
      if (myGoals === oppGoals) return 'D';
      return 'L';
    }).reverse();
  };

  const totalTeams = sorted.length;
  const getZone = (pos: number) => {
    if (pos <= 1) return 'title';
    if (pos <= 6) return 'continental';
    if (pos > totalTeams - 4 && totalTeams > 8) return 'relegation';
    return 'none';
  };

  const getZoneBorder = (zone: string) => {
    if (zone === 'title') return 'border-l-2 border-l-emerald-500';
    if (zone === 'continental') return 'border-l-2 border-l-blue-500';
    if (zone === 'relegation') return 'border-l-2 border-l-rose-500';
    return '';
  };

  const getZoneIcon = (zone: string) => {
    if (zone === 'title') return '🟢';
    if (zone === 'continental') return '🔵';
    if (zone === 'relegation') return '🔴';
    return '';
  };

  // Team detail panel
  if (selectedTeam) {
    const teamPos = sorted.findIndex(m => m.id === selectedTeam.id) + 1;
    const teamLast5 = getLast5(selectedTeam.user_id);
    const sg = selectedTeam.goals_for - selectedTeam.goals_against;
    const winRate = selectedTeam.played > 0 ? Math.round((selectedTeam.wins / selectedTeam.played) * 100) : 0;
    const isBot = selectedTeam.user_id.startsWith('bot_');

    // Get all matches for this team
    const teamMatches = leagueMatches
      .filter(m => m.home_user_id === selectedTeam.user_id || m.away_user_id === selectedTeam.user_id)
      .sort((a, b) => (a.round || 0) - (b.round || 0));

    return (
      <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={() => setSelectedTeam(null)} className="gap-1.5 text-xs">
          ← Voltar à Tabela
        </Button>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              {selectedTeam.user_id === userId && clubShield ? (
                <ShieldCrest
                  primaryColor={clubShield.primaryColor}
                  secondaryColor={clubShield.secondaryColor}
                  pattern={clubShield.pattern}
                  shape={clubShield.shape as ShieldShape}
                  size={36}
                />
              ) : (
                <ShieldCrest
                  primaryColor={getTeamColor(selectedTeam.club_name)}
                  secondaryColor="#ffffff"
                  pattern="solid"
                  shape="classic"
                  size={36}
                />
              )}
              <div className="flex-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {selectedTeam.club_name}
                  {isBot && <Badge variant="secondary" className="text-[8px]">BOT</Badge>}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {teamPos}º lugar • {getZone(teamPos) === 'title' ? '🟢 Zona de Título' : getZone(teamPos) === 'continental' ? '🔵 Zona Continental' : getZone(teamPos) === 'relegation' ? '🔴 Zona de Rebaixamento' : 'Meio da tabela'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-muted/30 rounded p-2 text-center">
                <p className="text-lg font-bold">{selectedTeam.points}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Pontos</p>
              </div>
              <div className="bg-muted/30 rounded p-2 text-center">
                <p className="text-lg font-bold text-emerald-400">{selectedTeam.wins}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Vitórias</p>
              </div>
              <div className="bg-muted/30 rounded p-2 text-center">
                <p className={`text-lg font-bold ${sg > 0 ? 'text-emerald-400' : sg < 0 ? 'text-rose-400' : ''}`}>{sg > 0 ? `+${sg}` : sg}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Saldo</p>
              </div>
              <div className="bg-muted/30 rounded p-2 text-center">
                <p className="text-lg font-bold">{winRate}%</p>
                <p className="text-[9px] text-muted-foreground uppercase">Aprov.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-muted/20 rounded p-1.5 text-center text-xs">
                <span className="text-muted-foreground">J</span> <span className="font-bold ml-1">{selectedTeam.played}</span>
              </div>
              <div className="bg-muted/20 rounded p-1.5 text-center text-xs">
                <span className="text-muted-foreground">GP</span> <span className="font-bold ml-1">{selectedTeam.goals_for}</span>
              </div>
              <div className="bg-muted/20 rounded p-1.5 text-center text-xs">
                <span className="text-muted-foreground">GC</span> <span className="font-bold ml-1">{selectedTeam.goals_against}</span>
              </div>
            </div>

            {/* Form */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Forma:</span>
              <div className="flex gap-0.5">
                {teamLast5.length === 0 ? <span className="text-[10px] text-muted-foreground">—</span> : teamLast5.map((r, ri) => (
                  <span key={ri} className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                    r === 'W' ? 'bg-emerald-500/20 text-emerald-400' : r === 'D' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>{r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Histórico de Jogos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {teamMatches.filter(m => m.status === 'played').length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogo disputado ainda</p>
            ) : teamMatches.filter(m => m.status === 'played').map(m => {
              const isHome = m.home_user_id === selectedTeam.user_id;
              const oppId = isHome ? m.away_user_id : m.home_user_id;
              const opp = members.find(mb => mb.user_id === oppId);
              const myGoals = isHome ? (m.home_goals ?? 0) : (m.away_goals ?? 0);
              const oppGoals = isHome ? (m.away_goals ?? 0) : (m.home_goals ?? 0);
              const result = myGoals > oppGoals ? 'V' : myGoals === oppGoals ? 'E' : 'D';
              const resultColor = result === 'V' ? 'text-emerald-400' : result === 'D' ? 'text-rose-400' : 'text-amber-400';
              return (
                <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 text-xs">
                  <span className="text-muted-foreground font-mono w-6">R{m.round}</span>
                  <span className={`font-bold w-4 ${resultColor}`}>{result}</span>
                  <span className="font-mono">{myGoals} - {oppGoals}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="truncate font-medium">{opp?.club_name || '???'}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Bot Squad */}
        {isBot && <BotSquadCard teamName={selectedTeam.club_name} reputation={selectedTeam.reputation} />}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead>Clube</TableHead>
              <TableHead className="text-center w-9">PTS</TableHead>
              <TableHead className="text-center w-8">J</TableHead>
              <TableHead className="text-center w-8">V</TableHead>
              <TableHead className="text-center w-8">E</TableHead>
              <TableHead className="text-center w-8">D</TableHead>
              <TableHead className="text-center w-8">GP</TableHead>
              <TableHead className="text-center w-8">GC</TableHead>
              <TableHead className="text-center w-8">SG</TableHead>
              <TableHead className="text-center w-24">Últ. 5</TableHead>
              <TableHead className="text-right w-16">Prêmio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((m, i) => {
              const isBot = m.user_id.startsWith('bot_');
              const pos = i + 1;
              const zone = getZone(pos);
              const last5 = getLast5(m.user_id);
              const sg = m.goals_for - m.goals_against;
              
              return (
              <TableRow 
                key={m.id} 
                className={`${m.user_id === userId ? 'bg-primary/10 font-semibold' : ''} ${getZoneBorder(zone)} cursor-pointer hover:bg-muted/40 transition-colors`}
                onClick={() => setSelectedTeam(m)}
              >
                <TableCell className="text-center text-xs">
                  <span className="flex items-center justify-center gap-0.5">
                    {getZoneIcon(zone)} {pos}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {m.user_id === userId && clubShield ? (
                      <ShieldCrest
                        primaryColor={clubShield.primaryColor}
                        secondaryColor={clubShield.secondaryColor}
                        pattern={clubShield.pattern}
                        shape={clubShield.shape as ShieldShape}
                        size={18}
                      />
                    ) : (
                      <ShieldCrest
                        primaryColor={getTeamColor(m.club_name)}
                        secondaryColor="#ffffff"
                        pattern="solid"
                        shape="classic"
                        size={18}
                      />
                    )}
                    <span className="text-xs font-semibold truncate max-w-[120px] text-primary hover:underline">{m.club_name}</span>
                    {isBot && <Badge variant="secondary" className="text-[7px] px-0.5 py-0 h-3">BOT</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-center text-xs font-bold">{m.points}</TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{m.played}</TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{m.wins}</TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{m.draws}</TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{m.losses}</TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{m.goals_for}</TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{m.goals_against}</TableCell>
                <TableCell className={`text-center text-xs font-semibold ${sg > 0 ? 'text-emerald-400' : sg < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>{sg > 0 ? `+${sg}` : sg}</TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-0.5 justify-center">
                    {last5.length === 0 ? <span className="text-[10px] text-muted-foreground">—</span> : last5.map((r, ri) => (
                      <span key={ri} className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold ${
                        r === 'W' ? 'bg-emerald-500/20 text-emerald-400' : r === 'D' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>{r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}</span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right text-[10px] text-emerald-400 font-mono">
                  {getExpectedReward(pos)}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Legend */}
        <div className="flex gap-3 px-3 py-2 border-t border-border/50 text-[10px] text-muted-foreground">
          <span>🟢 Título</span>
          <span>🔵 Continental</span>
          <span>🔴 Rebaixamento</span>
          
        </div>
      </CardContent>
    </Card>
  );
}

// === MATCHES VIEW ===
function MatchesView({ matches, members, userId, currentRound, totalRounds }: { matches: LeagueMatch[]; members: LeagueMember[]; userId: string; currentRound: number; totalRounds: number }) {
  const [selectedRound, setSelectedRound] = useState(currentRound || 1);
  const getClub = (uid: string) => members.find(m => m.user_id === uid)?.club_name || '?';
  const getLogo = (_uid: string) => '';
  
  const maxRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : totalRounds;
  const roundMatches = matches.filter(m => m.round === selectedRound);

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma partida agendada.</p>
          <p className="text-xs text-muted-foreground mt-1">A temporada será iniciada pelo servidor em data fixa.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {Array.from({ length: maxRound }, (_, i) => i + 1).map(r => {
          const allPlayed = matches.filter(m => m.round === r).every(m => m.status === 'played');
          const isCurrent = r === currentRound;
          return (
            <Button key={r} size="sm" variant={selectedRound === r ? 'default' : 'outline'}
              onClick={() => setSelectedRound(r)}
              className={`text-xs shrink-0 ${isCurrent && selectedRound !== r ? 'border-primary/50' : ''}`}>
              D{r}
              {allPlayed && <Check className="h-3 w-3 ml-1 text-emerald-400" />}
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            DIA {selectedRound} DE {totalRounds}
            {selectedRound === currentRound && <Badge className="text-[9px]">Hoje</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {roundMatches.map(m => {
            const isMyMatch = m.home_user_id === userId || m.away_user_id === userId;
            return (
              <div key={m.id} className={`p-3 rounded-lg border ${isMyMatch ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    
                    <span className={`text-sm font-semibold truncate ${m.home_user_id === userId ? 'text-primary' : ''}`}>
                      {getClub(m.home_user_id)}
                    </span>
                  </div>
                  <div className="px-3 text-center shrink-0">
                    {m.status === 'played' ? (
                      <span className="text-lg font-bold">{m.home_goals} - {m.away_goals}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">VS</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className={`text-sm font-semibold truncate ${m.away_user_id === userId ? 'text-primary' : ''}`}>
                      {getClub(m.away_user_id)}
                    </span>
                    
                  </div>
                </div>
                {m.status === 'played' && m.match_data?.events && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    {(m.match_data.events as any[]).map((ev: any, i: number) => (
                      <p key={i} className="text-[10px] text-muted-foreground">
                        {ev.minute}' ⚽ {ev.playerName} ({ev.team === 'home' ? getClub(m.home_user_id) : getClub(m.away_user_id)})
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// === SQUAD SYNC VIEW ===
function SquadSyncView({ userId, leagueSquads, members, clubPlayers, clubTactics, mySquadSynced, onSync }: {
  userId: string; leagueSquads: LeagueSquad[]; members: LeagueMember[];
  clubPlayers?: any[]; clubTactics?: any; mySquadSynced: boolean;
  onSync?: (players: any[], tactics: any) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> SINCRONIZAR MEU ELENCO
          </CardTitle>
          <CardDescription className="text-xs">
            Envie seu elenco atual e táticas para a liga online. Necessário antes de iniciar a temporada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant={mySquadSynced ? 'default' : 'destructive'} className="text-xs">
              {mySquadSynced ? '✅ Sincronizado' : '❌ Não sincronizado'}
            </Badge>
            {clubPlayers && onSync && (
              <Button size="sm" onClick={() => onSync(clubPlayers, clubTactics)} className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                {mySquadSynced ? 'Atualizar Elenco' : 'Sincronizar Agora'}
              </Button>
            )}
          </div>
          {clubPlayers && (
            <p className="text-xs text-muted-foreground mt-2">
              {clubPlayers.length} jogadores serão enviados • OVR médio: {clubPlayers.length > 0 ? Math.round(clubPlayers.reduce((s, p) => s + p.overall, 0) / clubPlayers.length) : 0}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">ELENCOS DA LIGA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map(m => {
            const squad = leagueSquads.find(s => s.user_id === m.user_id);
            const players = squad?.squad_data || [];
            const avgOvr = players.length > 0 ? Math.round(players.reduce((s: number, p: any) => s + (p.overall || 0), 0) / players.length) : 0;
            const isMe = m.user_id === userId;
            return (
              <div key={m.id} className={`p-3 rounded-lg border ${isMe ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{m.club_name}</span>
                    {isMe && <Badge variant="outline" className="text-[10px]">Você</Badge>}
                  </div>
                  <div className="text-right">
                    {squad ? (
                      <div>
                        <p className="text-xs font-semibold">{players.length} jogadores</p>
                        <p className="text-[10px] text-muted-foreground">OVR médio: {avgOvr}</p>
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Não sincronizado</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// === ADMIN VIEW ===
function AdminView({ league, members, leagueSquads, leagueMatches, loading, onStartSeason, onSimulateRound, onEndSeason }: {
  league: MultiplayerLeague; members: LeagueMember[]; leagueSquads: LeagueSquad[];
  leagueMatches: LeagueMatch[]; loading: boolean;
  onStartSeason?: () => void; onSimulateRound?: (round: number) => void; onEndSeason?: () => void;
}) {
  const seasonStatus = (league as any).season_status || 'registration';
  const leagueType = (league as any).league_type || 'main';
  const totalRounds = (league as any).total_rounds || 30;
  const syncedCount = leagueSquads.length;
  const currentRound = league.current_round;
  const currentRoundPlayed = leagueMatches.filter(m => m.round === currentRound).every(m => m.status === 'played');
  const allMatchesPlayed = leagueMatches.length > 0 && leagueMatches.every(m => m.status === 'played');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Flag className="h-4 w-4" /> ADMINISTRAÇÃO DA LIGA</CardTitle>
        <CardDescription className="text-xs">
          {leagueType === 'beginner' ? 'Torneio de Iniciantes — Jogadores serão redistribuídos ao final' : `Liga Principal — ${totalRounds} rodadas (1/dia)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1">
          <p className="text-xs font-semibold">📊 Status</p>
          <p className="text-xs text-muted-foreground">
            Tipo: {leagueType === 'beginner' ? '⭐ Torneio Iniciantes' : '🏆 Liga Principal'} • Membros: {members.length}/{league.max_members}
          </p>
          <p className="text-xs text-muted-foreground">
            Elencos sincronizados: {syncedCount}/{members.length} • Temporada: {league.season}
          </p>
          <p className="text-xs text-muted-foreground">
            Status: {seasonStatus === 'registration' ? 'Inscrições' : seasonStatus === 'in_progress' ? `Em andamento (dia ${currentRound}/${totalRounds})` : 'Finalizada'}
          </p>
          {leagueMatches.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Partidas jogadas: {leagueMatches.filter(m => m.status === 'played').length}/{leagueMatches.length}
            </p>
          )}
        </div>

        {seasonStatus === 'registration' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Todos os membros devem sincronizar o elenco antes de iniciar.
            </p>
            <Button className="w-full" disabled={loading || syncedCount < members.length || members.length < 2}
              onClick={onStartSeason}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Temporada ({syncedCount}/{members.length} prontos)
            </Button>
          </div>
        )}

        {seasonStatus === 'in_progress' && (
          <div className="space-y-2">
            {!currentRoundPlayed ? (
              <Button className="w-full" disabled={loading} onClick={() => onSimulateRound?.(currentRound)}>
                <Swords className="h-4 w-4 mr-2" />
                Simular Dia {currentRound}
              </Button>
            ) : currentRound < totalRounds ? (
              <Button className="w-full" disabled={loading} onClick={() => onSimulateRound?.(currentRound + 1)}>
                <Swords className="h-4 w-4 mr-2" />
                Simular Dia {currentRound + 1}
              </Button>
            ) : null}

            {allMatchesPlayed && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                <p className="text-sm font-bold text-emerald-400">🏆 Temporada Completa!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Campeão: {[...members].sort((a, b) => b.points - a.points)[0]?.club_name || '?'}
                </p>
                {leagueType === 'beginner' && (
                  <p className="text-xs text-amber-400 mt-1">
                    ⭐ Jogadores serão redistribuídos para ligas principais
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {(seasonStatus === 'finished' || allMatchesPlayed) && (
          <Button className="w-full" variant="outline" disabled={loading} onClick={onEndSeason}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {leagueType === 'beginner' ? 'Encerrar e Redistribuir Jogadores' : 'Encerrar e Iniciar Nova Temporada'}
          </Button>
        )}

        {/* Day 31 Info */}
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <p className="text-xs font-semibold text-blue-400">📅 Calendário da Temporada</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            • Dias 1-{totalRounds}: 1 rodada por dia (partidas simuladas automaticamente)
          </p>
          <p className="text-[10px] text-muted-foreground">
            • Dia {totalRounds + 1}: Transição — sem jogos, reorganização e início da próxima temporada
          </p>
          <p className="text-[10px] text-muted-foreground">
            • Jogadores são redistribuídos automaticamente ao final de cada temporada
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// === CHAT ===
function ChatView({ messages, userId, onSend }: { messages: ChatMessage[]; userId: string; onSend: (c: string) => void }) {
  const [msg, setMsg] = useState('');
  const handleSend = () => { if (msg.trim()) { onSend(msg); setMsg(''); } };

  return (
    <Card>
      <CardContent className="p-3">
        <ScrollArea className="h-[400px] mb-3 pr-3">
          <div className="space-y-2">
            {messages.map(m => (
              <div key={m.id} className={`flex flex-col ${m.user_id === userId ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-muted-foreground">{m.sender_name}</span>
                <div className={`px-3 py-1.5 rounded-lg text-sm max-w-[80%] ${m.user_id === userId ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input placeholder="Mensagem..." value={msg} onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()} maxLength={500} />
          <Button size="icon" onClick={handleSend}><Send className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

// === PRIVATE CHAT ===
function PrivateChatView({ messages, members, userId, onSend }: {
  messages: PrivateMessage[]; members: LeagueMember[]; userId: string;
  onSend: (receiverId: string, content: string) => void;
}) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const others = members.filter(m => m.user_id !== userId);
  const filtered = selectedUser ? messages.filter(m => (m.sender_id === selectedUser || m.receiver_id === selectedUser)) : [];

  const handleSend = () => {
    if (msg.trim() && selectedUser) { onSend(selectedUser, msg); setMsg(''); }
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex gap-2 mb-3 flex-wrap">
          {others.map(m => {
            const unread = messages.filter(pm => pm.sender_id === m.user_id && pm.receiver_id === userId && !pm.read).length;
            return (
              <Button key={m.user_id} size="sm" variant={selectedUser === m.user_id ? 'default' : 'outline'}
                onClick={() => setSelectedUser(m.user_id)} className="text-xs relative">
                {m.club_name}
                {unread > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">{unread}</span>}
              </Button>
            );
          })}
        </div>

        {selectedUser ? (
          <>
            <ScrollArea className="h-[350px] mb-3 pr-3">
              <div className="space-y-2">
                {filtered.map(m => (
                  <div key={m.id} className={`flex flex-col ${m.sender_id === userId ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-muted-foreground">{m.sender_name}</span>
                    <div className={`px-3 py-1.5 rounded-lg text-sm max-w-[80%] ${m.sender_id === userId ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input placeholder="Mensagem privada..." value={msg} onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()} maxLength={500} />
              <Button size="icon" onClick={handleSend}><Send className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Selecione um técnico para conversar</p>
        )}
      </CardContent>
    </Card>
  );
}

// === PROPOSALS ===
function ProposalsView({ proposals, members, userId, onSend, onRespond }: {
  proposals: TradeProposal[]; members: LeagueMember[]; userId: string;
  onSend: (receiverId: string, playerName: string, price: number, type: string, message?: string, loanDuration?: number) => void;
  onRespond: (proposalId: string, accept: boolean) => void;
}) {
  const [receiverId, setReceiverId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('transfer');
  const [pMsg, setPMsg] = useState('');
  const others = members.filter(m => m.user_id !== userId);

  const handleSend = () => {
    if (!receiverId || !playerName || !price) return;
    onSend(receiverId, playerName, parseInt(price), type, pMsg || undefined);
    setPlayerName(''); setPrice(''); setPMsg('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">NOVA PROPOSTA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={receiverId} onChange={e => setReceiverId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Destinatário</option>
              {others.map(m => <option key={m.user_id} value={m.user_id}>{m.club_name}</option>)}
            </select>
            <select value={type} onChange={e => setType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="transfer">Transferência</option>
              <option value="loan">Empréstimo</option>
            </select>
          </div>
          <Input placeholder="Nome do jogador" value={playerName} onChange={e => setPlayerName(e.target.value)} maxLength={100} />
          <Input placeholder="Valor (R$)" type="number" value={price} onChange={e => setPrice(e.target.value)} min={0} />
          <Input placeholder="Mensagem (opcional)" value={pMsg} onChange={e => setPMsg(e.target.value)} maxLength={500} />
          <Button className="w-full" size="sm" onClick={handleSend} disabled={!receiverId || !playerName || !price}>
            Enviar Proposta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">PROPOSTAS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {proposals.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma proposta</p>}
          {proposals.map(p => {
            const isReceived = p.receiver_id === userId;
            const senderClub = members.find(m => m.user_id === p.sender_id)?.club_name || p.sender_name;
            return (
              <div key={p.id} className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">{p.player_name}</span>
                  <Badge variant={p.status === 'pending' ? 'outline' : p.status === 'accepted' ? 'default' : 'destructive'} className="text-[10px]">
                    {p.status === 'pending' ? 'Pendente' : p.status === 'accepted' ? 'Aceita' : 'Rejeitada'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isReceived ? `De: ${senderClub}` : `Para: ${members.find(m => m.user_id === p.receiver_id)?.club_name || '?'}`}
                  {' • '}{p.proposal_type === 'loan' ? 'Empréstimo' : 'Transferência'} • R$ {(p.price / 1000000).toFixed(2)}M
                </p>
                {p.message && <p className="text-xs italic">"{p.message}"</p>}
                {isReceived && p.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="default" className="text-xs h-7" onClick={() => onRespond(p.id, true)}>Aceitar</Button>
                    <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => onRespond(p.id, false)}>Rejeitar</Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// === AWARDS VIEW ===
function AwardsView({ leagueMatches, members, division }: { leagueMatches: LeagueMatch[]; members: LeagueMember[]; division: number }) {
  const playerStats: Record<string, { name: string; club: string; goals: number; assists: number }> = {};
  
  const getClub = (uid: string) => members.find(m => m.user_id === uid)?.club_name || '?';
  
  leagueMatches.filter(m => m.status === 'played' && m.match_data?.events).forEach(m => {
    const events = m.match_data.events as any[];
    events.forEach((ev: any) => {
      if (ev.type === 'goal') {
        const clubName = ev.team === 'home' ? getClub(m.home_user_id) : getClub(m.away_user_id);
        const key = `${ev.playerName}_${clubName}`;
        if (!playerStats[key]) playerStats[key] = { name: ev.playerName, club: clubName, goals: 0, assists: 0 };
        playerStats[key].goals++;
      }
    });
  });

  const topScorers = Object.values(playerStats).sort((a, b) => b.goals - a.goals).slice(0, 10);
  const sorted = [...members].sort((a, b) => b.points - a.points);

  const baseRewards = [20,17,14.5,12.5,11,10,9.2,8.4,7.8,7.2,6.6,6,5.4,4.8,4.2,3.6,3,2.4,1.8,1.2];
  const getDivisor = (d: number) => d === 1 ? 1 : d === 2 ? 2 : d === 3 ? 4 : 10;
  const divLabel = division === 1 ? 'Série A' : division === 2 ? 'Série B' : division === 3 ? 'Série C' : 'Série D';
  const fmt = (v: number) => v >= 1 ? `R$ ${v.toFixed(1)}M` : `R$ ${(v*1000).toFixed(0)}k`;

  return (
    <div className="space-y-4">
      {/* Financial Prize Table - Only current division */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">💰 PREMIAÇÕES — {divLabel}</CardTitle>
          <CardDescription className="text-xs">Valores distribuídos ao final da temporada</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-emerald-500/10">
                <TableHead className="text-xs h-8">Pos</TableHead>
                <TableHead className="text-xs h-8 text-right">Prêmio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baseRewards.map((val, i) => {
                const pos = i + 1;
                const reward = val / getDivisor(division);
                return (
                  <TableRow key={pos} className="border-emerald-500/10">
                    <TableCell className={`text-xs py-1 ${pos <= 3 ? 'font-bold' : ''}`}>
                      {pos === 1 ? '🥇 1º' : pos === 2 ? '🥈 2º' : pos === 3 ? '🥉 3º' : `${pos}º`}
                    </TableCell>
                    <TableCell className={`text-xs py-1 text-right ${pos === 1 ? 'text-emerald-400 font-bold' : ''}`}>{fmt(reward)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">⚽ ARTILHEIROS</CardTitle>
        </CardHeader>
        <CardContent>
          {topScorers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum gol registrado ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {topScorers.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold w-5 text-center">{i + 1}</span>
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.club}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{p.goals} ⚽</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">🏆 CLASSIFICAÇÃO FINAL</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length > 0 && sorted[0].played > 0 ? (
            <div className="space-y-1.5">
              {sorted.slice(0, 3).map((m, i) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <span className="text-sm font-semibold">{m.club_name}</span>
                  </div>
                  <span className="text-sm font-bold">{m.points} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Temporada não iniciada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// === RIVALRIES ===
function RivalriesView({ rivalries, members, userId }: { rivalries: Rivalry[]; members: LeagueMember[]; userId: string }) {
  const getClubName = (uid: string) => members.find(m => m.user_id === uid)?.club_name || '?';
  const getIntensityColor = (i: string) => i === 'intense' ? 'text-red-400' : i === 'friendly' ? 'text-emerald-400' : 'text-muted-foreground';
  const getIntensityLabel = (i: string) => i === 'intense' ? '🔥 Intensa' : i === 'friendly' ? '🤝 Amigável' : '⚖️ Neutra';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">RIVALIDADES</CardTitle>
        <CardDescription className="text-xs">Histórico de confrontos entre técnicos</CardDescription>
      </CardHeader>
      <CardContent>
        {rivalries.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma rivalidade registrada ainda. Jogue partidas para criar histórico!</p>}
        {rivalries.map(r => (
          <div key={r.id} className="p-3 rounded-lg bg-muted/50 border border-border/50 mb-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{getClubName(r.user_a)} vs {getClubName(r.user_b)}</div>
              <span className={`text-xs ${getIntensityColor(r.intensity)}`}>{getIntensityLabel(r.intensity)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {r.matches_played} jogos • {r.user_a_wins}V-{r.draws}E-{r.user_b_wins}D
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
