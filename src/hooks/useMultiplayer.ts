import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MultiplayerLeague {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  max_members: number;
  status: string;
  season: number;
  current_round: number;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  club_name: string;
  club_logo: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  played: number;
  reputation: number;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  league_id: string;
  user_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface PrivateMessage {
  id: string;
  league_id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface TradeProposal {
  id: string;
  league_id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  proposal_type: string;
  player_name: string;
  player_data: any;
  price: number;
  loan_duration: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

export interface Rivalry {
  id: string;
  league_id: string;
  user_a: string;
  user_b: string;
  matches_played: number;
  user_a_wins: number;
  user_b_wins: number;
  draws: number;
  intensity: string;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useMultiplayer(userId: string, displayName: string) {
  const [leagues, setLeagues] = useState<MultiplayerLeague[]>([]);
  const [currentLeague, setCurrentLeague] = useState<MultiplayerLeague | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [proposals, setProposals] = useState<TradeProposal[]>([]);
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user's leagues
  const loadLeagues = useCallback(async () => {
    const { data: memberOf } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', userId);

    if (memberOf && memberOf.length > 0) {
      const ids = memberOf.map(m => m.league_id);
      const { data } = await supabase
        .from('multiplayer_leagues')
        .select('*')
        .in('id', ids);
      setLeagues((data as MultiplayerLeague[]) || []);
    } else {
      setLeagues([]);
    }
  }, [userId]);

  useEffect(() => { loadLeagues(); }, [loadLeagues]);

  // Create league
  const createLeague = useCallback(async (name: string, clubName: string) => {
    setLoading(true);
    const code = generateCode();
    const { data, error } = await supabase
      .from('multiplayer_leagues')
      .insert([{ name, code, owner_id: userId }])
      .select()
      .single();

    if (error) { toast.error('Erro ao criar liga'); setLoading(false); return; }

    await supabase.from('league_members').insert([{
      league_id: data.id, user_id: userId, club_name: clubName, club_logo: '⚽',
    }]);

    toast.success(`Liga criada! Código: ${code}`);
    await loadLeagues();
    setLoading(false);
  }, [userId, loadLeagues]);

  // Join league
  const joinLeague = useCallback(async (code: string, clubName: string) => {
    setLoading(true);
    const { data: league } = await supabase
      .from('multiplayer_leagues')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (!league) { toast.error('Liga não encontrada'); setLoading(false); return; }

    const { error } = await supabase.from('league_members').insert([{
      league_id: league.id, user_id: userId, club_name: clubName, club_logo: '⚽',
    }]);

    if (error) { toast.error('Erro ao entrar na liga'); setLoading(false); return; }
    toast.success(`Entrou na liga: ${league.name}`);
    await loadLeagues();
    setLoading(false);
  }, [userId, loadLeagues]);

  // Enter league
  const enterLeague = useCallback(async (league: MultiplayerLeague) => {
    setCurrentLeague(league);

    const [membersRes, chatRes, pmRes, proposalsRes, rivalriesRes] = await Promise.all([
      supabase.from('league_members').select('*').eq('league_id', league.id).order('points', { ascending: false }),
      supabase.from('chat_messages').select('*').eq('league_id', league.id).order('created_at', { ascending: true }).limit(100),
      supabase.from('private_messages').select('*').eq('league_id', league.id).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: true }),
      supabase.from('trade_proposals').select('*').eq('league_id', league.id).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }),
      supabase.from('rivalries').select('*').eq('league_id', league.id),
    ]);

    setMembers((membersRes.data as LeagueMember[]) || []);
    setChatMessages((chatRes.data as ChatMessage[]) || []);
    setPrivateMessages((pmRes.data as PrivateMessage[]) || []);
    setProposals((proposalsRes.data as TradeProposal[]) || []);
    setRivalries((rivalriesRes.data as Rivalry[]) || []);

    // Subscribe to realtime
    const channel = supabase.channel(`league-${league.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `league_id=eq.${league.id}` },
        (payload) => setChatMessages(prev => [...prev, payload.new as ChatMessage]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `league_id=eq.${league.id}` },
        (payload) => {
          const msg = payload.new as PrivateMessage;
          if (msg.sender_id === userId || msg.receiver_id === userId) {
            setPrivateMessages(prev => [...prev, msg]);
            if (msg.receiver_id === userId) toast.info(`📩 Mensagem de ${msg.sender_name}`);
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_proposals', filter: `league_id=eq.${league.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const p = payload.new as TradeProposal;
            if (p.sender_id === userId || p.receiver_id === userId) {
              setProposals(prev => [p, ...prev]);
              if (p.receiver_id === userId) toast.info(`📋 Nova proposta de ${p.sender_name}`);
            }
          } else if (payload.eventType === 'UPDATE') {
            setProposals(prev => prev.map(p => p.id === (payload.new as TradeProposal).id ? payload.new as TradeProposal : p));
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'league_members', filter: `league_id=eq.${league.id}` },
        () => {
          supabase.from('league_members').select('*').eq('league_id', league.id).order('points', { ascending: false })
            .then(({ data }) => setMembers((data as LeagueMember[]) || []));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const leaveLeague = useCallback(() => { setCurrentLeague(null); }, []);

  // Send chat
  const sendChat = useCallback(async (content: string) => {
    if (!currentLeague || !content.trim()) return;
    await supabase.from('chat_messages').insert([{
      league_id: currentLeague.id, user_id: userId, sender_name: displayName, content: content.trim(),
    }]);
  }, [currentLeague, userId, displayName]);

  // Send private message
  const sendPrivateMessage = useCallback(async (receiverId: string, content: string) => {
    if (!currentLeague || !content.trim()) return;
    await supabase.from('private_messages').insert([{
      league_id: currentLeague.id, sender_id: userId, receiver_id: receiverId, sender_name: displayName, content: content.trim(),
    }]);
  }, [currentLeague, userId, displayName]);

  // Send trade proposal
  const sendProposal = useCallback(async (receiverId: string, playerName: string, price: number, type: string, message?: string, loanDuration?: number) => {
    if (!currentLeague) return;
    await supabase.from('trade_proposals').insert([{
      league_id: currentLeague.id, sender_id: userId, receiver_id: receiverId,
      sender_name: displayName, proposal_type: type, player_name: playerName,
      price, loan_duration: loanDuration || null, message: message || null,
    }]);
    toast.success('Proposta enviada!');
  }, [currentLeague, userId, displayName]);

  // Respond to proposal
  const respondProposal = useCallback(async (proposalId: string, accept: boolean) => {
    await supabase.from('trade_proposals').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', proposalId);
    setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: accept ? 'accepted' : 'rejected' } : p));
    toast.success(accept ? 'Proposta aceita!' : 'Proposta rejeitada.');
  }, []);

  return {
    leagues, currentLeague, members, chatMessages, privateMessages, proposals, rivalries, loading,
    createLeague, joinLeague, enterLeague, leaveLeague,
    sendChat, sendPrivateMessage, sendProposal, respondProposal,
  };
}
