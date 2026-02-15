import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, MessageSquare, Send, ArrowLeft, Users, Trophy, Handshake, Swords, Plus, LogIn, Copy, Check } from 'lucide-react';
import type { MultiplayerLeague, LeagueMember, ChatMessage, PrivateMessage, TradeProposal, Rivalry } from '@/hooks/useMultiplayer';

interface Props {
  userId: string;
  leagues: MultiplayerLeague[];
  currentLeague: MultiplayerLeague | null;
  members: LeagueMember[];
  chatMessages: ChatMessage[];
  privateMessages: PrivateMessage[];
  proposals: TradeProposal[];
  rivalries: Rivalry[];
  loading: boolean;
  onCreateLeague: (name: string, clubName: string) => void;
  onJoinLeague: (code: string, clubName: string) => void;
  onEnterLeague: (league: MultiplayerLeague) => void;
  onLeaveLeague: () => void;
  onSendChat: (content: string) => void;
  onSendPrivateMessage: (receiverId: string, content: string) => void;
  onSendProposal: (receiverId: string, playerName: string, price: number, type: string, message?: string, loanDuration?: number) => void;
  onRespondProposal: (proposalId: string, accept: boolean) => void;
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
            <Input placeholder="Nome da liga" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Nome do seu clube" value={newClub} onChange={e => setNewClub(e.target.value)} />
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
            <Input placeholder="Nome do seu clube" value={joinClub} onChange={e => setJoinClub(e.target.value)} />
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
                  <p className="text-xs text-muted-foreground">Código: {l.code} • T{l.season}</p>
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
  const { currentLeague, members, chatMessages, privateMessages, proposals, rivalries, userId,
    onLeaveLeague, onSendChat, onSendPrivateMessage, onSendProposal, onRespondProposal } = props;
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(currentLeague!.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onLeaveLeague}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="font-bold text-lg">{currentLeague!.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Código: {currentLeague!.code}</span>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={copyCode}>
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
        <Badge variant="outline">{members.length} managers</Badge>
      </div>

      <Tabs defaultValue="standings">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-card/50">
          <TabsTrigger value="standings" className="gap-1 text-xs"><Trophy className="h-3 w-3" /> Tabela</TabsTrigger>
          <TabsTrigger value="chat" className="gap-1 text-xs"><Globe className="h-3 w-3" /> Chat Global</TabsTrigger>
          <TabsTrigger value="private" className="gap-1 text-xs"><MessageSquare className="h-3 w-3" /> Privado</TabsTrigger>
          <TabsTrigger value="proposals" className="gap-1 text-xs"><Handshake className="h-3 w-3" /> Propostas</TabsTrigger>
          <TabsTrigger value="rivalries" className="gap-1 text-xs"><Swords className="h-3 w-3" /> Rivalidades</TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          <StandingsView members={members} userId={userId} />
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
      </Tabs>
    </div>
  );
}

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
            {sorted.map((m, i) => (
              <TableRow key={m.id} className={m.user_id === userId ? 'bg-primary/10 font-semibold' : ''}>
                <TableCell className={i < 4 ? 'text-emerald-400 font-bold' : ''}>{i + 1}</TableCell>
                <TableCell><span className="mr-1">{m.club_logo}</span> {m.club_name}</TableCell>
                <TableCell className="text-center">{m.played}</TableCell>
                <TableCell className="text-center">{m.wins}</TableCell>
                <TableCell className="text-center">{m.draws}</TableCell>
                <TableCell className="text-center">{m.losses}</TableCell>
                <TableCell className="text-center">{m.goals_for}</TableCell>
                <TableCell className="text-center">{m.goals_against}</TableCell>
                <TableCell className="text-center">{m.goals_for - m.goals_against}</TableCell>
                <TableCell className="text-center font-bold">{m.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

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
            onKeyDown={e => e.key === 'Enter' && handleSend()} />
          <Button size="icon" onClick={handleSend}><Send className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
                onKeyDown={e => e.key === 'Enter' && handleSend()} />
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
          <Input placeholder="Nome do jogador" value={playerName} onChange={e => setPlayerName(e.target.value)} />
          <Input placeholder="Valor (R$)" type="number" value={price} onChange={e => setPrice(e.target.value)} />
          <Input placeholder="Mensagem (opcional)" value={pMsg} onChange={e => setPMsg(e.target.value)} />
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
