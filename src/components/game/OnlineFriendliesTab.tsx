import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Swords, Home, Plane, Search, Send, Check, XCircle, Clock,
  Trophy, RefreshCw, Calendar, Users, Building2
} from 'lucide-react';
import { toast } from 'sonner';

interface FriendlyInvite {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_club_name: string;
  receiver_club_name: string;
  sender_stadium: string;
  receiver_stadium: string;
  sender_stadium_capacity: number;
  receiver_stadium_capacity: number;
  home_team_id: string;
  match_date: string;
  status: string;
  match_result: { home_goals: number; away_goals: number } | null;
  created_at: string;
}

interface OnlineUser {
  user_id: string;
  display_name: string | null;
}

interface Props {
  userId: string;
  clubName: string;
  stadiumName: string;
  stadiumCapacity: number;
}

export function OnlineFriendliesTab({ userId, clubName, stadiumName, stadiumCapacity }: Props) {
  const [invites, setInvites] = useState<FriendlyInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<OnlineUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<OnlineUser | null>(null);
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [homeChoice, setHomeChoice] = useState<'me' | 'them'>('me');
  const [sending, setSending] = useState(false);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('friendly_invites')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setInvites(data as unknown as FriendlyInvite[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  // Realtime subscription for new invites
  useEffect(() => {
    const channel = supabase
      .channel('friendly-invites')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendly_invites',
      }, () => { loadInvites(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadInvites]);

  const searchPlayers = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) return;
    setSearching(true);
    // Search in game_saves for club names (stored in club_data)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .neq('user_id', userId)
      .ilike('display_name', `%${searchTerm.trim()}%`)
      .limit(10);
    setSearchResults(profiles || []);
    setSearching(false);
  };

  const sendInvite = async () => {
    if (!selectedOpponent) return toast.error('Selecione um adversário');
    if (!matchDate || !matchTime) return toast.error('Defina data e horário');

    const dateTime = new Date(`${matchDate}T${matchTime}:00`);
    if (isNaN(dateTime.getTime())) return toast.error('Data/horário inválido');
    if (dateTime.getTime() < Date.now()) return toast.error('A data deve ser no futuro');

    // Get opponent club data for stadium info
    const { data: oppSave } = await supabase
      .from('game_saves')
      .select('club_data')
      .eq('user_id', selectedOpponent.user_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const oppClubData = oppSave?.club_data as any;
    const oppClubName = oppClubData?.club?.name || selectedOpponent.display_name || 'Adversário';
    const oppStadiumName = oppClubData?.club?.stadiumName || 'Estádio';
    // Estimate capacity from infrastructure level
    const oppStadiumLevel = oppClubData?.infrastructure?.stadium?.level || 1;
    const stadiumCapacities: Record<number, number> = {
      1: 5000, 2: 8000, 3: 12000, 4: 18000, 5: 25000,
      6: 32000, 7: 40000, 8: 50000, 9: 60000, 10: 72000,
      11: 82000, 12: 90000, 13: 100000, 14: 110000, 15: 120000,
    };
    const oppCapacity = stadiumCapacities[oppStadiumLevel] || 5000;

    const homeTeamId = homeChoice === 'me' ? userId : selectedOpponent.user_id;

    setSending(true);
    const { error } = await supabase.from('friendly_invites').insert([{
      sender_id: userId,
      receiver_id: selectedOpponent.user_id,
      sender_club_name: clubName,
      receiver_club_name: oppClubName,
      sender_stadium: stadiumName,
      receiver_stadium: oppStadiumName,
      sender_stadium_capacity: stadiumCapacity,
      receiver_stadium_capacity: oppCapacity,
      home_team_id: homeTeamId,
      match_date: dateTime.toISOString(),
    }]);

    if (error) {
      toast.error('Erro ao enviar convite');
    } else {
      toast.success(`📩 Convite enviado para ${oppClubName}!`);
      setSelectedOpponent(null);
      setMatchDate('');
      setMatchTime('');
      setSearchTerm('');
      setSearchResults([]);
      loadInvites();
    }
    setSending(false);
  };

  const respondInvite = async (inviteId: string, accept: boolean) => {
    setLoading(true);
    const { error } = await supabase
      .from('friendly_invites')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', inviteId);
    if (error) toast.error('Erro ao responder');
    else toast.success(accept ? '✅ Amistoso aceito!' : '❌ Amistoso recusado');
    loadInvites();
    setLoading(false);
  };

  const cancelInvite = async (inviteId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('friendly_invites')
      .delete()
      .eq('id', inviteId);
    if (error) toast.error('Erro ao cancelar');
    else toast.success('Convite cancelado');
    loadInvites();
    setLoading(false);
  };

  const pendingReceived = invites.filter(i => i.status === 'pending' && i.receiver_id === userId);
  const pendingSent = invites.filter(i => i.status === 'pending' && i.sender_id === userId);
  const accepted = invites.filter(i => i.status === 'accepted');
  const played = invites.filter(i => i.status === 'played');
  const rejected = invites.filter(i => i.status === 'rejected');

  const getInviteTeams = (invite: FriendlyInvite) => {
    const isSender = invite.sender_id === userId;
    const myClub = isSender ? invite.sender_club_name : invite.receiver_club_name;
    const oppClub = isSender ? invite.receiver_club_name : invite.sender_club_name;
    const isHome = invite.home_team_id === userId;
    const homeClub = invite.home_team_id === invite.sender_id ? invite.sender_club_name : invite.receiver_club_name;
    const homeStadium = invite.home_team_id === invite.sender_id ? invite.sender_stadium : invite.receiver_stadium;
    const homeCapacity = invite.home_team_id === invite.sender_id ? invite.sender_stadium_capacity : invite.receiver_stadium_capacity;
    return { myClub, oppClub, isHome, homeClub, homeStadium, homeCapacity };
  };

  return (
    <div className="space-y-3">
      {/* Create Invite */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Marcar Amistoso Online
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search opponent */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Adversário</label>
            {selectedOpponent ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold flex-1">{selectedOpponent.display_name || 'Jogador'}</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[9px]" onClick={() => setSelectedOpponent(null)}>
                  <XCircle className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Input
                  placeholder="Buscar jogador por nome..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchPlayers()}
                  className="h-8 text-xs flex-1"
                />
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={searchPlayers} disabled={searching}>
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {searchResults.length > 0 && !selectedOpponent && (
              <div className="space-y-1 mt-1">
                {searchResults.map(u => (
                  <Button
                    key={u.user_id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs gap-2"
                    onClick={() => {
                      setSelectedOpponent(u);
                      setSearchResults([]);
                    }}
                  >
                    <Users className="h-3 w-3" />
                    <span className="truncate">{u.display_name || 'Jogador'}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Data</label>
              <Input
                type="date"
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Horário</label>
              <Input
                type="time"
                value={matchTime}
                onChange={e => setMatchTime(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Home team choice */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Mandante</label>
            <Select value={homeChoice} onValueChange={(v: 'me' | 'them') => setHomeChoice(v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Home className="h-3 w-3" /> {clubName} (Eu)
                  </div>
                </SelectItem>
                <SelectItem value="them" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Plane className="h-3 w-3" /> Adversário
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stadium preview */}
          {homeChoice === 'me' && (
            <div className="p-2 rounded-lg bg-muted/20 border border-border/50 text-xs space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <Building2 className="h-3 w-3 text-primary" /> 🏟️ {stadiumName}
              </div>
              <p className="text-[10px] text-muted-foreground">Capacidade: {stadiumCapacity.toLocaleString()} lugares</p>
            </div>
          )}

          <Button
            className="w-full h-9 text-xs font-semibold gap-2"
            onClick={sendInvite}
            disabled={sending || !selectedOpponent || !matchDate || !matchTime}
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Enviando...' : 'Enviar Convite'}
          </Button>
        </CardContent>
      </Card>

      {/* Pending Received */}
      {pendingReceived.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-400" />
              Convites Recebidos ({pendingReceived.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {pendingReceived.map(invite => {
                  const { oppClub, isHome, homeClub, homeStadium, homeCapacity } = getInviteTeams(invite);
                  return (
                    <div key={invite.id} className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold">{oppClub} quer jogar!</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[8px] gap-1">
                              {isHome ? <Home className="h-2.5 w-2.5" /> : <Plane className="h-2.5 w-2.5" />}
                              {isHome ? 'Casa' : 'Fora'}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground">
                              <Calendar className="h-2.5 w-2.5 inline mr-0.5" />
                              {new Date(invite.match_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 rounded bg-muted/20 text-[10px] space-y-0.5">
                        <p className="font-semibold">{homeClub} (Mandante) vs {homeClub === oppClub ? clubName : oppClub}</p>
                        <p className="text-muted-foreground">🏟️ {homeStadium} • {homeCapacity.toLocaleString()} lugares</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={() => respondInvite(invite.id, true)} disabled={loading}>
                          <Check className="h-3 w-3" /> Aceitar
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1 h-7 text-[10px] gap-1" onClick={() => respondInvite(invite.id, false)} disabled={loading}>
                          <XCircle className="h-3 w-3" /> Recusar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Pending Sent */}
      {pendingSent.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-400" />
              Convites Enviados ({pendingSent.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {pendingSent.map(invite => {
                  const { oppClub, homeStadium, homeCapacity, homeClub } = getInviteTeams(invite);
                  return (
                    <div key={invite.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/50">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">vs {oppClub}</p>
                        <p className="text-[9px] text-muted-foreground">
                          🏟️ {homeStadium} ({homeCapacity.toLocaleString()}) • {new Date(invite.match_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        <Badge variant="outline" className="text-[8px] mt-0.5">{homeClub} (Mandante)</Badge>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[9px] text-destructive" onClick={() => cancelInvite(invite.id)} disabled={loading}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Accepted / Calendar */}
      {accepted.length > 0 && (
        <Card className="border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              Calendário de Amistosos ({accepted.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1.5">
                {accepted.map(invite => {
                  const { oppClub, isHome, homeClub, homeStadium, homeCapacity } = getInviteTeams(invite);
                  return (
                    <div key={invite.id} className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        {isHome ? <Home className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <Plane className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {homeClub} (Mandante) vs {homeClub === clubName ? oppClub : clubName}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            🏟️ {homeStadium} • {homeCapacity.toLocaleString()} lugares
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            📅 {new Date(invite.match_date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                          </p>
                        </div>
                        <Badge className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shrink-0">
                          ✅ Confirmado
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Played History */}
      {played.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5" /> Histórico Online ({played.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {played.map(invite => {
                  const { oppClub, isHome, homeStadium, homeCapacity } = getInviteTeams(invite);
                  const result = invite.match_result;
                  return (
                    <div key={invite.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 text-xs">
                      {isHome ? <Home className="h-3 w-3 text-emerald-400 shrink-0" /> : <Plane className="h-3 w-3 text-blue-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="truncate block font-medium">vs {oppClub}</span>
                        <span className="text-[8px] text-muted-foreground">🏟️ {homeStadium} ({homeCapacity.toLocaleString()})</span>
                      </div>
                      {result && (
                        <span className="font-bold font-mono px-1.5 py-0.5 rounded bg-muted/50">
                          {result.home_goals} - {result.away_goals}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Refresh */}
      <div className="text-center">
        <Button size="sm" variant="ghost" onClick={loadInvites} disabled={loading} className="text-[10px] gap-1">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>
    </div>
  );
}
