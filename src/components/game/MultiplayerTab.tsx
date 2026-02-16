import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, MessageSquare, Send, ArrowLeft, Users, Trophy, Handshake, Swords, Plus, LogIn, Copy, Check, CalendarDays, Shield, Play, RefreshCw, Flag, Award } from 'lucide-react';
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
  clubPlayers?: any[];
  clubTactics?: any;
  onCreateLeague: (name: string, clubName: string) => void;
  onJoinLeague: (code: string, clubName: string) => void;
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
  if (!props.currentLeague) {
    return <LeagueLobby {...props} />;
  }
  return <LeagueView {...props} />;
}

function LeagueLobby({ leagues, loading, onCreateLeague, onJoinLeague, onEnterLeague }: Props) {
  const [newName, setNewName] = useState('');
  const [newClub, setNewClub] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinClub, setJoinClub] = useState('');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> CRIAR LIGA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Nome da liga" value={newName} onChange={e => setNewName(e.target.value)} maxLength={50} />
            <Input placeholder="Nome do seu clube" value={newClub} onChange={e => setNewClub(e.target.value)} maxLength={50} />
            <Button className="w-full" size="sm" disabled={loading || !newName || !newClub}
              onClick={() => { onCreateLeague(newName, newClub); setNewName(''); setNewClub(''); }}>
              Criar Liga
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><LogIn className="h-4 w-4" /> ENTRAR EM LIGA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Código da liga" value={joinCode} onChange={e => setJoinCode(e.target.value)} className="uppercase" />
            <Input placeholder="Nome do seu clube" value={joinClub} onChange={e => setJoinClub(e.target.value)} maxLength={50} />
            <Button className="w-full" size="sm" disabled={loading || !joinCode || !joinClub}
              onClick={() => { onJoinLeague(joinCode, joinClub); setJoinCode(''); setJoinClub(''); }}>
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>

      {leagues.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">SUAS LIGAS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leagues.map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div>
                  <p className="font-semibold text-sm">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Código: {l.code} • T{l.season} •{' '}
                    <span className={l.season_status === 'in_progress' ? 'text-emerald-400' : l.season_status === 'finished' ? 'text-amber-400' : 'text-muted-foreground'}>
                      {l.season_status === 'registration' ? '📝 Inscrições' : l.season_status === 'in_progress' ? '⚽ Em andamento' : l.season_status === 'finished' ? '🏆 Finalizada' : l.season_status}
                    </span>
                  </p>
                </div>
                <Button size="sm" onClick={() => onEnterLeague(l)}>Entrar</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onLeaveLeague}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="font-bold text-lg">{currentLeague!.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Código: {currentLeague!.code}</span>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={copyCode}>
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Badge variant="outline" className="text-[10px]">T{currentLeague!.season}</Badge>
              <Badge variant={seasonStatus === 'in_progress' ? 'default' : 'secondary'} className="text-[10px]">
                {seasonStatus === 'registration' ? '📝 Inscrições' : seasonStatus === 'in_progress' ? `⚽ Rodada ${currentLeague!.current_round}` : '🏆 Finalizada'}
              </Badge>
            </div>
          </div>
        </div>
        <Badge variant="outline">{members.length} managers</Badge>
      </div>

      <Tabs defaultValue="standings">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-card/50">
          <TabsTrigger value="standings" className="gap-1 text-xs"><Trophy className="h-3 w-3" /> Tabela</TabsTrigger>
          <TabsTrigger value="matches" className="gap-1 text-xs"><CalendarDays className="h-3 w-3" /> Jogos</TabsTrigger>
          <TabsTrigger value="squad" className="gap-1 text-xs"><Shield className="h-3 w-3" /> Elenco</TabsTrigger>
          <TabsTrigger value="chat" className="gap-1 text-xs"><Globe className="h-3 w-3" /> Chat</TabsTrigger>
          <TabsTrigger value="private" className="gap-1 text-xs"><MessageSquare className="h-3 w-3" /> PM</TabsTrigger>
          <TabsTrigger value="proposals" className="gap-1 text-xs"><Handshake className="h-3 w-3" /> Trades</TabsTrigger>
          <TabsTrigger value="awards" className="gap-1 text-xs"><Award className="h-3 w-3" /> Prêmios</TabsTrigger>
          <TabsTrigger value="rivalries" className="gap-1 text-xs"><Swords className="h-3 w-3" /> Rival</TabsTrigger>
          {isOwner && <TabsTrigger value="admin" className="gap-1 text-xs"><Flag className="h-3 w-3" /> Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="standings">
          <StandingsView members={members} userId={userId} />
        </TabsContent>
        <TabsContent value="matches">
          <MatchesView matches={leagueMatches} members={members} userId={userId} currentRound={currentLeague!.current_round} />
        </TabsContent>
        <TabsContent value="squad">
          <SquadSyncView
            userId={userId}
            leagueSquads={leagueSquads}
            members={members}
            clubPlayers={clubPlayers}
            clubTactics={clubTactics}
            mySquadSynced={mySquadSynced}
            onSync={onSyncSquad}
          />
        </TabsContent>
        <TabsContent value="chat">
          <ChatView messages={chatMessages} userId={userId} onSend={onSendChat} />
        </TabsContent>
        <TabsContent value="private">
          <PrivateChatView messages={privateMessages} members={members} userId={userId} onSend={onSendPrivateMessage} />
        </TabsContent>
        <TabsContent value="proposals">
          <ProposalsView proposals={proposals} members={members} userId={userId} onSend={onSendProposal} onRespond={onRespondProposal} />
        </TabsContent>
        <TabsContent value="rivalries">
          <RivalriesView rivalries={rivalries} members={members} userId={userId} />
        </TabsContent>
        <TabsContent value="awards">
          <AwardsView leagueMatches={leagueMatches} members={members} />
        </TabsContent>
        {isOwner && (
          <TabsContent value="admin">
            <AdminView
              league={currentLeague!}
              members={members}
              leagueSquads={leagueSquads}
              leagueMatches={leagueMatches}
              loading={loading}
              onStartSeason={onStartSeason}
              onSimulateRound={onSimulateRound}
              onEndSeason={onEndSeason}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// === STANDINGS ===
function StandingsView({ members, userId }: { members: LeagueMember[]; userId: string }) {
  const sorted = [...members].sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Clube</TableHead>
              <TableHead className="text-center w-10">J</TableHead>
              <TableHead className="text-center w-10">V</TableHead>
              <TableHead className="text-center w-10">E</TableHead>
              <TableHead className="text-center w-10">D</TableHead>
              <TableHead className="text-center w-10">GP</TableHead>
              <TableHead className="text-center w-10">GC</TableHead>
              <TableHead className="text-center w-10">SG</TableHead>
              <TableHead className="text-center w-12 font-bold">P</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((m, i) => {
              const isBot = m.user_id.startsWith('bot_');
              return (
              <TableRow key={m.id} className={m.user_id === userId ? 'bg-primary/10 font-semibold' : ''}>
                <TableCell className={i < 4 ? 'text-emerald-400 font-bold' : ''}>{i + 1}</TableCell>
                <TableCell>
                  <span className="mr-1">{m.club_logo}</span> {m.club_name}
                  {isBot && <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">BOT</Badge>}
                </TableCell>
                <TableCell className="text-center">{m.played}</TableCell>
                <TableCell className="text-center">{m.wins}</TableCell>
                <TableCell className="text-center">{m.draws}</TableCell>
                <TableCell className="text-center">{m.losses}</TableCell>
                <TableCell className="text-center">{m.goals_for}</TableCell>
                <TableCell className="text-center">{m.goals_against}</TableCell>
                <TableCell className="text-center">{m.goals_for - m.goals_against}</TableCell>
                <TableCell className="text-center font-bold">{m.points}</TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// === MATCHES VIEW ===
function MatchesView({ matches, members, userId, currentRound }: { matches: LeagueMatch[]; members: LeagueMember[]; userId: string; currentRound: number }) {
  const [selectedRound, setSelectedRound] = useState(currentRound || 1);
  const getClub = (uid: string) => members.find(m => m.user_id === uid)?.club_name || '?';
  const getLogo = (uid: string) => members.find(m => m.user_id === uid)?.club_logo || '⚽';
  
  const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
  const roundMatches = matches.filter(m => m.round === selectedRound);

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma partida agendada.</p>
          <p className="text-xs text-muted-foreground mt-1">O dono da liga precisa iniciar a temporada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Round selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map(r => {
          const allPlayed = matches.filter(m => m.round === r).every(m => m.status === 'played');
          const isCurrent = r === currentRound;
          return (
            <Button key={r} size="sm" variant={selectedRound === r ? 'default' : 'outline'}
              onClick={() => setSelectedRound(r)}
              className={`text-xs shrink-0 ${isCurrent && selectedRound !== r ? 'border-primary/50' : ''}`}>
              R{r}
              {allPlayed && <Check className="h-3 w-3 ml-1 text-emerald-400" />}
            </Button>
          );
        })}
      </div>

      {/* Matches for selected round */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">RODADA {selectedRound}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {roundMatches.map(m => {
            const isMyMatch = m.home_user_id === userId || m.away_user_id === userId;
            return (
              <div key={m.id} className={`p-3 rounded-lg border ${isMyMatch ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm">{getLogo(m.home_user_id)}</span>
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
                    <span className="text-sm">{getLogo(m.away_user_id)}</span>
                  </div>
                </div>
                {/* Match events */}
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
      {/* My squad sync */}
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

      {/* Other members' squads */}
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
                    <span>{m.club_logo}</span>
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
  const syncedCount = leagueSquads.length;
  const totalRounds = leagueMatches.length > 0 ? Math.max(...leagueMatches.map(m => m.round)) : 0;
  const currentRound = league.current_round;
  const currentRoundPlayed = leagueMatches.filter(m => m.round === currentRound).every(m => m.status === 'played');
  const allMatchesPlayed = leagueMatches.length > 0 && leagueMatches.every(m => m.status === 'played');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Flag className="h-4 w-4" /> ADMINISTRAÇÃO DA LIGA</CardTitle>
        <CardDescription className="text-xs">
          Gerencie temporadas, rodadas e o calendário da liga.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1">
          <p className="text-xs font-semibold">📊 Status da Liga</p>
          <p className="text-xs text-muted-foreground">
            Membros: {members.length} • Elencos sincronizados: {syncedCount}/{members.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Temporada: {league.season} • Status: {seasonStatus === 'registration' ? 'Inscrições' : seasonStatus === 'in_progress' ? 'Em andamento' : 'Finalizada'}
          </p>
          {totalRounds > 0 && (
            <p className="text-xs text-muted-foreground">
              Rodadas: {currentRound}/{totalRounds} • Partidas jogadas: {leagueMatches.filter(m => m.status === 'played').length}/{leagueMatches.length}
            </p>
          )}
        </div>

        {/* Actions based on season_status */}
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
                Simular Rodada {currentRound}
              </Button>
            ) : currentRound < totalRounds ? (
              <Button className="w-full" disabled={loading} onClick={() => onSimulateRound?.(currentRound + 1)}>
                <Swords className="h-4 w-4 mr-2" />
                Simular Rodada {currentRound + 1}
              </Button>
            ) : null}

            {allMatchesPlayed && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                <p className="text-sm font-bold text-emerald-400">🏆 Temporada Completa!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Campeão: {[...members].sort((a, b) => b.points - a.points)[0]?.club_name || '?'}
                </p>
              </div>
            )}
          </div>
        )}

        {(seasonStatus === 'finished' || allMatchesPlayed) && (
          <Button className="w-full" variant="outline" disabled={loading} onClick={onEndSeason}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Encerrar e Iniciar Nova Temporada
          </Button>
        )}
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
function AwardsView({ leagueMatches, members }: { leagueMatches: LeagueMatch[]; members: LeagueMember[] }) {
  // Calculate top scorers and assisters from match_data events
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

  return (
    <div className="space-y-4">
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
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">{getClubName(r.user_a)} vs {getClubName(r.user_b)}</span>
              <span className={`text-xs font-bold ${getIntensityColor(r.intensity)}`}>{getIntensityLabel(r.intensity)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {r.matches_played} jogos • {getClubName(r.user_a)}: {r.user_a_wins}V • {getClubName(r.user_b)}: {r.user_b_wins}V • Empates: {r.draws}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
