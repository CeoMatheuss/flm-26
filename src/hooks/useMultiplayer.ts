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
  season_status: string;
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

export interface LeagueMatch {
  id: string;
  league_id: string;
  round: number;
  home_user_id: string;
  away_user_id: string;
  home_goals: number | null;
  away_goals: number | null;
  match_data: any;
  status: string;
  played_at: string | null;
  created_at: string;
}

export interface LeagueSquad {
  id: string;
  league_id: string;
  user_id: string;
  squad_data: any;
  tactics_data: any;
  updated_at: string;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate round-robin schedule for members
function generateRoundRobin(memberIds: string[]): { round: number; home: string; away: string }[] {
  const ids = [...memberIds];
  if (ids.length % 2 !== 0) ids.push('BYE');
  const n = ids.length;
  const rounds: { round: number; home: string; away: string }[] = [];
  
  for (let round = 0; round < (n - 1) * 2; round++) {
    const isReturn = round >= n - 1;
    const baseRound = isReturn ? round - (n - 1) : round;
    const rotated = [ids[0], ...ids.slice(1)];
    
    // Rotate for this round
    for (let r = 0; r < baseRound; r++) {
      const last = rotated.pop()!;
      rotated.splice(1, 0, last);
    }
    
    for (let i = 0; i < n / 2; i++) {
      const home = rotated[i];
      const away = rotated[n - 1 - i];
      if (home === 'BYE' || away === 'BYE') continue;
      rounds.push({
        round: round + 1,
        home: isReturn ? away : home,
        away: isReturn ? home : away,
      });
    }
  }
  return rounds;
}

// Simulate a PvP match based on squad overall ratings
function simulatePvPMatch(homeSquad: any[], awaySquad: any[], homeTactics: any, awayTactics: any) {
  const homeOvr = homeSquad.length > 0 ? homeSquad.slice(0, 11).reduce((s: number, p: any) => s + (p.overall || 50), 0) / Math.min(11, homeSquad.length) : 50;
  const awayOvr = awaySquad.length > 0 ? awaySquad.slice(0, 11).reduce((s: number, p: any) => s + (p.overall || 50), 0) / Math.min(11, awaySquad.length) : 50;
  
  const homeAdv = 1.08; // home advantage
  const homeStr = homeOvr * homeAdv;
  const awayStr = awayOvr;
  
  const totalStr = homeStr + awayStr;
  const homeChance = homeStr / totalStr;
  
  // Generate goals with poisson-like distribution
  const avgGoals = 2.7;
  const homeExpected = avgGoals * homeChance;
  const awayExpected = avgGoals * (1 - homeChance);
  
  const poissonRandom = (lambda: number) => {
    let L = Math.exp(-lambda), k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };
  
  const homeGoals = poissonRandom(homeExpected);
  const awayGoals = poissonRandom(awayExpected);
  
  // Generate match events
  const events: any[] = [];
  for (let i = 0; i < homeGoals; i++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const scorer = homeSquad.length > 0 ? homeSquad[Math.floor(Math.random() * Math.min(11, homeSquad.length))] : null;
    events.push({ type: 'goal', team: 'home', minute, playerName: scorer?.name || 'Jogador' });
  }
  for (let i = 0; i < awayGoals; i++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const scorer = awaySquad.length > 0 ? awaySquad[Math.floor(Math.random() * Math.min(11, awaySquad.length))] : null;
    events.push({ type: 'goal', team: 'away', minute, playerName: scorer?.name || 'Jogador' });
  }
  events.sort((a, b) => a.minute - b.minute);
  
  return { homeGoals, awayGoals, events };
}

export function useMultiplayer(userId: string, displayName: string) {
  const [leagues, setLeagues] = useState<MultiplayerLeague[]>([]);
  const [currentLeague, setCurrentLeague] = useState<MultiplayerLeague | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [proposals, setProposals] = useState<TradeProposal[]>([]);
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [leagueMatches, setLeagueMatches] = useState<LeagueMatch[]>([]);
  const [leagueSquads, setLeagueSquads] = useState<LeagueSquad[]>([]);
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

    // Check max members
    const { count } = await supabase
      .from('league_members')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', league.id);
    
    if (count !== null && count >= league.max_members) {
      toast.error('Liga está cheia!');
      setLoading(false);
      return;
    }

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

    const [membersRes, chatRes, pmRes, proposalsRes, rivalriesRes, matchesRes, squadsRes] = await Promise.all([
      supabase.from('league_members').select('*').eq('league_id', league.id).order('points', { ascending: false }),
      supabase.from('chat_messages').select('*').eq('league_id', league.id).order('created_at', { ascending: true }).limit(100),
      supabase.from('private_messages').select('*').eq('league_id', league.id).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: true }),
      supabase.from('trade_proposals').select('*').eq('league_id', league.id).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }),
      supabase.from('rivalries').select('*').eq('league_id', league.id),
      supabase.from('league_matches').select('*').eq('league_id', league.id).order('round', { ascending: true }),
      supabase.from('league_squads').select('*').eq('league_id', league.id),
    ]);

    setMembers((membersRes.data as LeagueMember[]) || []);
    setChatMessages((chatRes.data as ChatMessage[]) || []);
    setPrivateMessages((pmRes.data as PrivateMessage[]) || []);
    setProposals((proposalsRes.data as TradeProposal[]) || []);
    setRivalries((rivalriesRes.data as Rivalry[]) || []);
    setLeagueMatches((matchesRes.data as LeagueMatch[]) || []);
    setLeagueSquads((squadsRes.data as LeagueSquad[]) || []);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'league_matches', filter: `league_id=eq.${league.id}` },
        () => {
          supabase.from('league_matches').select('*').eq('league_id', league.id).order('round', { ascending: true })
            .then(({ data }) => setLeagueMatches((data as LeagueMatch[]) || []));
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'league_squads', filter: `league_id=eq.${league.id}` },
        () => {
          supabase.from('league_squads').select('*').eq('league_id', league.id)
            .then(({ data }) => setLeagueSquads((data as LeagueSquad[]) || []));
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

  // === NEW: Sync squad to league ===
  const syncSquad = useCallback(async (players: any[], tactics: any) => {
    if (!currentLeague) return;
    
    // Upsert squad data
    const { data: existing } = await supabase
      .from('league_squads')
      .select('id')
      .eq('league_id', currentLeague.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('league_squads')
        .update({ squad_data: players, tactics_data: tactics, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('league_squads')
        .insert([{ league_id: currentLeague.id, user_id: userId, squad_data: players, tactics_data: tactics }]);
    }
    toast.success('Elenco sincronizado com a liga!');
  }, [currentLeague, userId]);

  // === NEW: Start season (owner only) - generates round-robin schedule ===
  const startSeason = useCallback(async () => {
    if (!currentLeague) return;
    if (currentLeague.owner_id !== userId) {
      toast.error('Apenas o dono da liga pode iniciar a temporada');
      return;
    }
    
    if (members.length < 2) {
      toast.error('Mínimo de 2 membros para iniciar');
      return;
    }

    // Check all members synced their squads
    const syncedCount = leagueSquads.length;
    if (syncedCount < members.length) {
      toast.error(`${members.length - syncedCount} membro(s) ainda não sincronizou o elenco!`);
      return;
    }

    setLoading(true);
    const memberIds = members.map(m => m.user_id);
    const schedule = generateRoundRobin(memberIds);
    
    // Insert all matches
    const matchInserts = schedule.map(s => ({
      league_id: currentLeague.id,
      round: s.round,
      home_user_id: s.home,
      away_user_id: s.away,
      status: 'scheduled',
    }));

    await supabase.from('league_matches').insert(matchInserts);
    
    // Update league status
    await supabase.from('multiplayer_leagues')
      .update({ season_status: 'in_progress', current_round: 1 })
      .eq('id', currentLeague.id);

    setCurrentLeague(prev => prev ? { ...prev, season_status: 'in_progress', current_round: 1 } : null);
    
    // Reset all member stats
    for (const m of members) {
      await supabase.from('league_members')
        .update({ points: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, played: 0 })
        .eq('id', m.id);
    }

    toast.success(`Temporada iniciada! ${schedule.length} partidas geradas.`);
    setLoading(false);
    
    // Reload
    await enterLeague(currentLeague);
  }, [currentLeague, userId, members, leagueSquads, enterLeague]);

  // === NEW: Simulate a round (owner triggers) ===
  const simulateRound = useCallback(async (round: number) => {
    if (!currentLeague) return;
    if (currentLeague.owner_id !== userId) {
      toast.error('Apenas o dono pode simular rodadas');
      return;
    }

    const roundMatches = leagueMatches.filter(m => m.round === round && m.status === 'scheduled');
    if (roundMatches.length === 0) {
      toast.error('Nenhuma partida pendente nesta rodada');
      return;
    }

    setLoading(true);
    
    for (const match of roundMatches) {
      const homeSquadData = leagueSquads.find(s => s.user_id === match.home_user_id);
      const awaySquadData = leagueSquads.find(s => s.user_id === match.away_user_id);
      
      const homeSquad = homeSquadData?.squad_data || [];
      const awaySquad = awaySquadData?.squad_data || [];
      const homeTactics = homeSquadData?.tactics_data || {};
      const awayTactics = awaySquadData?.tactics_data || {};
      
      const result = simulatePvPMatch(homeSquad, awaySquad, homeTactics, awayTactics);
      
      // Update match
      await supabase.from('league_matches')
        .update({
          home_goals: result.homeGoals,
          away_goals: result.awayGoals,
          match_data: { events: result.events },
          status: 'played',
          played_at: new Date().toISOString(),
        })
        .eq('id', match.id);
      
      // Update standings
      const homePoints = result.homeGoals > result.awayGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;
      const awayPoints = result.awayGoals > result.homeGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;
      
      const homeMember = members.find(m => m.user_id === match.home_user_id);
      const awayMember = members.find(m => m.user_id === match.away_user_id);
      
      if (homeMember) {
        await supabase.from('league_members').update({
          played: homeMember.played + 1,
          wins: homeMember.wins + (homePoints === 3 ? 1 : 0),
          draws: homeMember.draws + (homePoints === 1 ? 1 : 0),
          losses: homeMember.losses + (homePoints === 0 ? 1 : 0),
          goals_for: homeMember.goals_for + result.homeGoals,
          goals_against: homeMember.goals_against + result.awayGoals,
          points: homeMember.points + homePoints,
        }).eq('id', homeMember.id);
      }
      
      if (awayMember) {
        await supabase.from('league_members').update({
          played: awayMember.played + 1,
          wins: awayMember.wins + (awayPoints === 3 ? 1 : 0),
          draws: awayMember.draws + (awayPoints === 1 ? 1 : 0),
          losses: awayMember.losses + (awayPoints === 0 ? 1 : 0),
          goals_for: awayMember.goals_for + result.awayGoals,
          goals_against: awayMember.goals_against + result.homeGoals,
          points: awayMember.points + awayPoints,
        }).eq('id', awayMember.id);
      }
    }
    
    // Advance round
    const totalRounds = Math.max(...leagueMatches.map(m => m.round));
    const nextRound = round < totalRounds ? round + 1 : round;
    const allPlayed = leagueMatches.every(m => m.status === 'played' || roundMatches.some(rm => rm.id === m.id));
    
    await supabase.from('multiplayer_leagues').update({
      current_round: nextRound,
      season_status: allPlayed ? 'finished' : 'in_progress',
    }).eq('id', currentLeague.id);

    setCurrentLeague(prev => prev ? {
      ...prev,
      current_round: nextRound,
      season_status: allPlayed ? 'finished' : 'in_progress',
    } : null);

    toast.success(`Rodada ${round} simulada!`);
    setLoading(false);
    
    // Reload data
    await enterLeague(currentLeague);
  }, [currentLeague, userId, leagueMatches, leagueSquads, members, enterLeague]);

  // === NEW: End season (owner) ===
  const endSeason = useCallback(async () => {
    if (!currentLeague || currentLeague.owner_id !== userId) return;
    
    setLoading(true);
    
    // Delete old matches
    await supabase.from('league_matches').delete().eq('league_id', currentLeague.id);
    
    // Increment season
    await supabase.from('multiplayer_leagues').update({
      season: currentLeague.season + 1,
      season_status: 'registration',
      current_round: 0,
    }).eq('id', currentLeague.id);

    setCurrentLeague(prev => prev ? {
      ...prev,
      season: prev.season + 1,
      season_status: 'registration',
      current_round: 0,
    } : null);

    toast.success(`Temporada ${currentLeague.season} encerrada! Nova temporada disponível.`);
    setLoading(false);
    await enterLeague({ ...currentLeague, season: currentLeague.season + 1, season_status: 'registration', current_round: 0 });
  }, [currentLeague, userId, enterLeague]);

  return {
    leagues, currentLeague, members, chatMessages, privateMessages, proposals, rivalries,
    leagueMatches, leagueSquads, loading,
    createLeague, joinLeague, enterLeague, leaveLeague,
    sendChat, sendPrivateMessage, sendProposal, respondProposal,
    syncSquad, startSeason, simulateRound, endSeason,
  };
}
