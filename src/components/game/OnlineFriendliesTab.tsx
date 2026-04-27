import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Swords, Home, Plane, Search, Send, Check, XCircle, Clock,
  Trophy, RefreshCw, Calendar, Users, Building2, Play
} from 'lucide-react';
import { toast } from 'sonner';
import type { Player } from '@/types/game';
import type { TacticsConfig } from '@/types/tactics';
import { MatchLobbyScreen } from './MatchLobbyScreen';
import { triggerAutoSim } from '@/hooks/useAutoSimulator';

type TieBreaker = 'none' | 'extra_time' | 'penalties' | 'both';

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
  tie_breaker?: TieBreaker;
  created_at: string;
}

const TIE_BREAKER_LABELS: Record<TieBreaker, { label: string; emoji: string; short: string }> = {
  none: { label: 'Tempo normal (sem desempate)', emoji: '⏱️', short: 'Sem desempate' },
  extra_time: { label: 'Prorrogação se empatar (30 min extra)', emoji: '⏰', short: 'Prorrogação' },
  penalties: { label: 'Pênaltis direto se empatar', emoji: '🎯', short: 'Pênaltis' },
  both: { label: 'Prorrogação + Pênaltis (mata-mata oficial)', emoji: '🏆', short: 'Prorrogação + Pênaltis' },
};

interface OnlineUser {
  user_id: string;
  display_name: string | null;
  is_online?: boolean;
}

interface Props {
  userId: string;
  clubName: string;
  stadiumName: string;
  stadiumCapacity: number;
  players?: Player[];
  teamStrength?: number;
  tactics?: TacticsConfig;
  fans?: number;
}

export function OnlineFriendliesTab({ userId, clubName, stadiumName, stadiumCapacity, players, teamStrength, tactics, fans }: Props) {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<FriendlyInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<OnlineUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<OnlineUser | null>(null);
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [homeChoice, setHomeChoice] = useState<'me' | 'them'>('me');
  const [tieBreaker, setTieBreaker] = useState<TieBreaker>('none');
  const [sending, setSending] = useState(false);
  const [openSlots, setOpenSlots] = useState<Array<{ id: string; user_id: string; club_name: string; stadium_name: string; stadium_capacity: number; created_at: string; status: string }>>([]);
  const [creatingSlot, setCreatingSlot] = useState(false);
  // Lobby state
  const [lobbyInvite, setLobbyInvite] = useState<FriendlyInvite | null>(null);
  // Anti-spam: ids de slots em processo de aceite (evita clique duplo)
  const [acceptingSlotIds, setAcceptingSlotIds] = useState<Set<string>>(new Set());

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

  useEffect(() => { loadInvites(); loadOpenSlots(); }, [loadInvites]);

  const loadOpenSlots = async () => {
    const { data } = await supabase
      .from('open_friendly_slots')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setOpenSlots(data as any[]);
  };

  const createOpenSlot = async () => {
    setCreatingSlot(true);
    const existing = openSlots.find(s => s.user_id === userId);
    if (existing) {
      toast.error('Você já tem uma partida aberta!');
      setCreatingSlot(false);
      return;
    }
    const { error } = await supabase.from('open_friendly_slots').insert([{
      user_id: userId,
      club_name: clubName,
      stadium_name: stadiumName,
      stadium_capacity: stadiumCapacity,
    }]);
    if (error) toast.error('Erro ao criar partida aberta');
    else { toast.success('⚽ Partida aberta criada! Aguardando adversário...'); loadOpenSlots(); }
    setCreatingSlot(false);
  };

  const acceptOpenSlot = async (slot: typeof openSlots[0]) => {
    if (slot.user_id === userId) return toast.error('Não pode aceitar sua própria partida');
    // Trava local — impede clique duplo no mesmo botão
    if (acceptingSlotIds.has(slot.id)) return;
    setAcceptingSlotIds(prev => new Set(prev).add(slot.id));
    // Remove otimisticamente da UI
    setOpenSlots(prev => prev.filter(s => s.id !== slot.id));

    // Aceite atômico no servidor (SECURITY DEFINER) — apenas o primeiro vence
    const { data, error } = await supabase.rpc('accept_open_friendly_slot' as any, { _slot_id: slot.id });

    if (error) {
      const msg = String((error as any)?.message || '');
      if (msg.includes('SLOT_ALREADY_TAKEN')) {
        toast.error('⚠️ Este amistoso acabou de ser aceito por outro jogador.');
      } else if (msg.includes('CANNOT_ACCEPT_OWN_SLOT')) {
        toast.error('Você não pode aceitar sua própria partida.');
      } else if (msg.includes('SLOT_NOT_FOUND')) {
        toast.error('Este amistoso não existe mais.');
      } else {
        toast.error('Erro ao aceitar — tente novamente');
      }
      // Recarrega estado real do servidor
      await loadOpenSlots();
    } else {
      toast.success(`✅ Amistoso aceito contra ${slot.club_name}! Entrando no lobby...`);
      triggerAutoSim(); // simula imediatamente em background como fallback
      await Promise.all([loadInvites(), loadOpenSlots()]);
      // Abre lobby imediatamente — busca o invite recém-criado pela RPC
      const inviteId = (data as any)?.invite_id;
      if (inviteId) {
        const { data: inv } = await supabase
          .from('friendly_invites')
          .select('*')
          .eq('id', inviteId)
          .maybeSingle();
        if (inv) setLobbyInvite(inv as unknown as FriendlyInvite);
      }
    }
    setAcceptingSlotIds(prev => { const n = new Set(prev); n.delete(slot.id); return n; });
  };

  const cancelMySlot = async () => {
    await supabase.from('open_friendly_slots').delete().eq('user_id', userId);
    toast.success('Partida aberta cancelada');
    loadOpenSlots();
  };

  // Realtime: convites + slots abertos (servidor é fonte única de verdade)
  // Quando um convite enviado pelo usuário muda de 'pending' → 'accepted',
  // abrimos o lobby automaticamente (sem precisar voltar à tela de amistosos).
  const autoOpenedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const invitesChannel = supabase
      .channel('friendly-invites-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendly_invites' }, (payload: any) => {
        loadInvites();
        // Auto-open lobby for the SENDER whose invite was just accepted
        const newRow = payload?.new as FriendlyInvite | undefined;
        const oldRow = payload?.old as FriendlyInvite | undefined;
        if (
          newRow &&
          newRow.status === 'accepted' &&
          (!oldRow || oldRow.status !== 'accepted') &&
          newRow.sender_id === userId &&
          !autoOpenedRef.current.has(newRow.id)
        ) {
          autoOpenedRef.current.add(newRow.id);
          toast.success(`🎮 ${newRow.receiver_club_name} aceitou! Entrando no lobby...`);
          setLobbyInvite(newRow);
        }
      })
      .subscribe();
    const slotsChannel = supabase
      .channel('open-friendly-slots-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_friendly_slots' }, () => loadOpenSlots())
      .subscribe();
    return () => {
      supabase.removeChannel(invitesChannel);
      supabase.removeChannel(slotsChannel);
    };
  }, [loadInvites, userId]);

  const searchPlayers = useCallback(async (rawTerm?: string) => {
    const term = (rawTerm ?? searchTerm).trim();
    if (term.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    // 1) Busca direta por substring (case-insensitive)
    const { data: directHits } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .neq('user_id', userId)
      .ilike('display_name', `%${term}%`)
      .order('display_name', { ascending: true })
      .limit(10);

    let combined = (directHits || []) as Array<{ user_id: string; display_name: string | null }>;

    // 2) Se vier pouco resultado, busca aproximada (prefixo de cada token + similaridade)
    if (combined.length < 5 && term.length >= 2) {
      const firstChar = term[0];
      const { data: fuzzyHits } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .neq('user_id', userId)
        .ilike('display_name', `%${firstChar}%`)
        .limit(40);
      // Levenshtein simples para classificar
      const dist = (a: string, b: string): number => {
        const al = a.length, bl = b.length;
        if (!al) return bl; if (!bl) return al;
        const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
        for (let i = 0; i <= al; i++) dp[i][0] = i;
        for (let j = 0; j <= bl; j++) dp[0][j] = j;
        for (let i = 1; i <= al; i++) for (let j = 1; j <= bl; j++) {
          dp[i][j] = a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        }
        return dp[al][bl];
      };
      const lower = term.toLowerCase();
      const scored = (fuzzyHits || [])
        .filter(p => p.display_name)
        .map(p => {
          const name = (p.display_name || '').toLowerCase();
          const minScore = name.split(/\s+/).reduce((m, tok) => Math.min(m, dist(lower, tok.slice(0, lower.length + 1))), Infinity);
          return { p, score: Math.min(dist(lower, name.slice(0, lower.length)), minScore) };
        })
        .filter(x => x.score <= Math.max(2, Math.floor(term.length / 3)))
        .sort((a, b) => a.score - b.score)
        .slice(0, 10)
        .map(x => x.p);
      // Mescla sem duplicar
      const seen = new Set(combined.map(c => c.user_id));
      for (const f of scored) if (!seen.has(f.user_id)) { combined.push(f); seen.add(f.user_id); }
    }

    // Fetch presence for found users
    const userIds = combined.map(p => p.user_id);
    let presenceMap: Record<string, boolean> = {};
    if (userIds.length > 0) {
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen')
        .in('user_id', userIds);
      (presenceData || []).forEach(p => {
        const lastSeen = new Date(p.last_seen).getTime();
        const twoMinAgo = Date.now() - 2 * 60 * 1000;
        presenceMap[p.user_id] = p.is_online && lastSeen > twoMinAgo;
      });
    }

    setSearchResults(combined.slice(0, 12).map(p => ({
      ...p,
      is_online: presenceMap[p.user_id] || false,
    })));
    setSearching(false);
  }, [searchTerm, userId]);

  // Autocomplete em tempo real (debounce 250ms) — começa com 1 char
  useEffect(() => {
    if (selectedOpponent) return;
    const term = searchTerm.trim();
    if (term.length < 1) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(() => { searchPlayers(term); }, 250);
    return () => clearTimeout(handle);
  }, [searchTerm, selectedOpponent, searchPlayers]);

  const sendInvite = async () => {
    if (!selectedOpponent) return toast.error('Selecione um adversário');
    if (!matchDate || !matchTime) return toast.error('Defina data e horário');

    const dateTime = new Date(`${matchDate}T${matchTime}:00`);
    if (isNaN(dateTime.getTime())) return toast.error('Data/horário inválido');
    if (dateTime.getTime() < Date.now()) return toast.error('A data deve ser no futuro');

    // Get opponent stadium info via SECURITY DEFINER RPC (no broad save access)
    const { data: oppInfo } = await supabase
      .rpc('get_user_stadium_info', { _user_id: selectedOpponent.user_id });

    const oppRow = Array.isArray(oppInfo) ? (oppInfo[0] as any) : (oppInfo as any);
    const oppClubName = oppRow?.club_name || selectedOpponent.display_name || 'Adversário';
    const oppStadiumName = oppRow?.stadium_name || 'Estádio';
    const oppStadiumLevel = oppRow?.stadium_level || 1;
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
      tie_breaker: tieBreaker,
    }] as any);

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
    // Anti-spam: só aceita/recusa se ainda estiver pendente
    const { data: updated, error } = await supabase
      .from('friendly_invites')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', inviteId)
      .eq('status', 'pending')
      .select();

    if (error) {
      toast.error('Erro ao responder');
    } else if (!updated || updated.length === 0) {
      toast.info('⚠️ Este convite já foi respondido.');
    } else {
      toast.success(accept ? '✅ Amistoso aceito! Entrando no lobby...' : '❌ Amistoso recusado');
      if (accept) {
        triggerAutoSim(); // simula imediatamente em background como fallback
        // Abre lobby imediatamente — sem precisar voltar à tela de amistosos
        const acceptedInvite = updated[0] as unknown as FriendlyInvite;
        setLobbyInvite(acceptedInvite);
      }
    }
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

  // Lobby overlay — short-circuit render
  if (lobbyInvite) {
    const { oppClub, isHome, homeStadium, homeCapacity } = getInviteTeams(lobbyInvite);
    const oppCapacity = lobbyInvite.home_team_id === lobbyInvite.sender_id ? lobbyInvite.sender_stadium_capacity : lobbyInvite.receiver_stadium_capacity;
    const startMatch = () => {
      navigate('/match', {
        state: {
          homeTeam: isHome ? clubName : oppClub,
          awayTeam: isHome ? oppClub : clubName,
          homePlayers: players,
          homeStrength: teamStrength || 60,
          awayStrength: teamStrength || 60,
          matchId: `friendly-${lobbyInvite.id}`,
          tactics: tactics || { formation: '4-4-2' },
          stadiumName: homeStadium,
          stadiumCapacity: isHome ? stadiumCapacity : (oppCapacity || 5000),
          isHome,
          competition: 'Amistoso Online',
          fans: fans || 1000,
          tieBreaker: lobbyInvite.tie_breaker || 'none',
        },
      });
    };
    return (
      <MatchLobbyScreen
        matchType="friendly"
        matchId={lobbyInvite.id}
        userId={userId}
        myClub={clubName}
        oppClub={oppClub}
        onReady={startMatch}
        onAutoSimulated={() => { toast.info('🤖 Partida será simulada automaticamente em breve'); setLobbyInvite(null); }}
        onCancel={() => setLobbyInvite(null)}
      />
    );
  }

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
                  placeholder="Digite parte do nome (ex: Pal → Palmeiras)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchPlayers(searchTerm)}
                  className="h-8 text-xs flex-1"
                />
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => searchPlayers(searchTerm)} disabled={searching}>
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
                    <span className={`h-2 w-2 rounded-full shrink-0 ${u.is_online ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                    <span className="truncate">{u.display_name || 'Jogador'}</span>
                    <span className={`text-[8px] ml-auto ${u.is_online ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                      {u.is_online ? 'Online' : 'Offline'}
                    </span>
                  </Button>
                ))}
              </div>
            )}
            {!selectedOpponent && searchTerm.trim().length >= 1 && !searching && searchResults.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic px-1 mt-1">
                Nenhum jogador encontrado. Tente outras letras ou verifique a grafia.
              </p>
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

          {/* Tie breaker (extra time / penalties) */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">⚽ Em caso de empate</label>
            <Select value={tieBreaker} onValueChange={(v: TieBreaker) => setTieBreaker(v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIE_BREAKER_LABELS) as TieBreaker[]).map(k => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {TIE_BREAKER_LABELS[k].emoji} {TIE_BREAKER_LABELS[k].label}
                  </SelectItem>
                ))}
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
                  const matchTs = new Date(invite.match_date).getTime();
                  const now = Date.now();
                  const minsUntil = Math.floor((matchTs - now) / 60000);
                  // Open the play window from 5 min before scheduled time, valid for 2h after
                  const canPlay = minsUntil <= 5 && minsUntil >= -120;
                  const playLater = minsUntil > 5;

                  const handlePlay = () => {
                    if (!players || players.length === 0) {
                      toast.error('Carregando elenco... aguarde um instante e tente novamente.');
                      return;
                    }
                    // Open lobby first — both players sync up before navigating to /match
                    setLobbyInvite(invite);
                  };

                  const tb = (invite.tie_breaker || 'none') as TieBreaker;

                  return (
                    <div key={invite.id} className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
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
                      {tb !== 'none' && (
                        <Badge variant="outline" className="text-[9px] gap-1">
                          {TIE_BREAKER_LABELS[tb].emoji} {TIE_BREAKER_LABELS[tb].short}
                        </Badge>
                      )}
                      {canPlay ? (
                        <Button size="sm" onClick={handlePlay} className="w-full h-8 text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700">
                          <Play className="h-3.5 w-3.5" /> ⚽ JOGAR AGORA (lance por lance)
                        </Button>
                      ) : playLater ? (
                        <p className="text-[9px] text-center text-muted-foreground italic">
                          ⏳ Botão "Jogar" liberado 5 min antes do horário ({minsUntil > 60 ? `~${Math.floor(minsUntil / 60)}h ${minsUntil % 60}min` : `${minsUntil}min`})
                        </p>
                      ) : (
                        <p className="text-[9px] text-center text-muted-foreground italic">
                          ⌛ Janela expirada
                        </p>
                      )}
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

      {/* Open Friendly Slots */}
      <Card className="border-emerald-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Swords className="h-4 w-4 text-emerald-400" />
            Partidas Abertas
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Publique que quer jogar — o primeiro que aceitar fecha o amistoso!</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {openSlots.filter(s => s.user_id !== userId).length > 0 ? (
            <div className="space-y-1.5">
              {openSlots.filter(s => s.user_id !== userId).map(slot => (
                <div key={slot.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{slot.club_name}</p>
                    <p className="text-[9px] text-muted-foreground">🏟️ {slot.stadium_name} ({slot.stadium_capacity.toLocaleString()})</p>
                  </div>
                  <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => acceptOpenSlot(slot)} disabled={loading}>
                    <Check className="h-3 w-3" /> Aceitar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma partida aberta no momento</p>
          )}

          {openSlots.find(s => s.user_id === userId) ? (
            <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={cancelMySlot}>
              <XCircle className="h-3 w-3" /> Cancelar Minha Partida Aberta
            </Button>
          ) : (
            <Button size="sm" className="w-full text-xs gap-1" onClick={createOpenSlot} disabled={creatingSlot}>
              <Swords className="h-3 w-3" /> {creatingSlot ? 'Criando...' : '⚽ Criar Partida Aberta'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Refresh */}
      <div className="text-center">
        <Button size="sm" variant="ghost" onClick={() => { loadInvites(); loadOpenSlots(); }} disabled={loading} className="text-[10px] gap-1">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>
    </div>
  );
}
