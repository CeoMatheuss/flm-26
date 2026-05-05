import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerAutoSim } from '@/hooks/useAutoSimulator';

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
  country: string;
  auto_created: boolean;
  league_type: string;
  total_rounds: number;
  division?: number;
  round_interval_hours: number;
  season_start: string | null;
  season_end: string | null;
  created_at: string;
  tier?: string;
  tier_level?: number;
  match_time?: string;
  season_month?: number;
  season_year?: number;
}

export interface LeagueMember {
  id: string; // This is league_members.id (team_id in view)
  league_id: string;
  user_id?: string;
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
  budget: number;
  joined_at: string;
  position?: number;
  goals_diff?: number;
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
  scheduled_at: string | null;
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

// Generate round-robin schedule for members with dates and times
function generateRoundRobin(memberIds: string[], totalRounds: number, startDate: Date, matchTime: string): { round: number; home: string; away: string; scheduled_at: string }[] {
  const ids = [...memberIds];
  if (ids.length % 2 !== 0) ids.push('BOT'); // Standardized placeholder
  const n = ids.length;
  const matches: { round: number; home: string; away: string; scheduled_at: string }[] = [];
  
  const baseRounds = n - 1;
  
  for (let round = 0; round < totalRounds; round++) {
    const cycleRound = round % (baseRounds * 2);
    const isReturn = cycleRound >= baseRounds;
    const baseR = isReturn ? cycleRound - baseRounds : cycleRound;
    const rotated = [ids[0], ...ids.slice(1)];
    
    for (let r = 0; r < baseR; r++) {
      const last = rotated.pop()!;
      rotated.splice(1, 0, last);
    }
    
    // Calculate date for this round
    const matchDate = new Date(startDate);
    matchDate.setDate(matchDate.getDate() + round);
    const [hours, minutes] = matchTime.split(':').map(Number);
    matchDate.setHours(hours || 19, minutes || 0, 0, 0);

    for (let i = 0; i < n / 2; i++) {
      const home = rotated[i];
      const away = rotated[n - 1 - i];
      if (home === 'BOT' || away === 'BOT') continue;
      matches.push({
        round: round + 1,
        home: isReturn ? away : home,
        away: isReturn ? home : away,
        scheduled_at: matchDate.toISOString(),
      });
    }
  }
  return matches;
}

// Simulate a PvP match based on squad overall ratings
function simulatePvPMatch(homeSquad: any[], awaySquad: any[]) {
  const homeOvr = homeSquad.length > 0 ? homeSquad.slice(0, 11).reduce((s: number, p: any) => s + (p.overall || 50), 0) / Math.min(11, homeSquad.length) : 50;
  const awayOvr = awaySquad.length > 0 ? awaySquad.slice(0, 11).reduce((s: number, p: any) => s + (p.overall || 50), 0) / Math.min(11, awaySquad.length) : 50;
  
  const homeAdv = 1.08;
  const homeStr = homeOvr * homeAdv;
  const awayStr = awayOvr;
  const totalStr = homeStr + awayStr;
  const homeChance = homeStr / totalStr;
  
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

export function useMultiplayer(userId: string, displayName: string, clubName?: string, clubCountry?: string) {
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
  const [autoJoining, setAutoJoining] = useState(false);

  // Auto-assign player to a league based on country
  const autoJoinLeague = useCallback(async () => {
    if (!clubName || !clubCountry || autoJoining) return;
    setAutoJoining(true);
    try {
      const { data: leagueId, error } = await supabase.rpc('auto_assign_league', {
        _user_id: userId,
        _club_name: clubName,
        _country: clubCountry,
      });

      if (error) {
        console.error('Auto-assign error:', error);
        toast.error('Erro ao entrar na liga automaticamente');
        setAutoJoining(false);
        return;
      }

      if (leagueId) {
        const { data: league } = await supabase
          .from('multiplayer_leagues')
          .select('*')
          .eq('id', leagueId)
          .single();

        if (league) {
          await loadLeagues();
          await enterLeague(league as unknown as MultiplayerLeague);
        }
      }
    } catch (e) {
      console.error('Auto-join error:', e);
    }
    setAutoJoining(false);
  }, [userId, clubName, clubCountry, autoJoining]);

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
      setLeagues((data as unknown as MultiplayerLeague[]) || []);
    } else {
      setLeagues([]);
    }
  }, [userId]);

  // Auto-join on mount if club info is available
  useEffect(() => {
    if (clubName && clubCountry) {
      autoJoinLeague();
    } else {
      loadLeagues();
    }
  }, [clubName, clubCountry]);

  // Enter league
  const enterLeague = useCallback(async (league: MultiplayerLeague) => {
    setCurrentLeague(league);

    const [membersRes, chatRes, pmRes, proposalsRes, rivalriesRes, matchesRes, squadsRes] = await Promise.all([
      supabase.from('league_standings').select('*').eq('league_id', league.id).order('position', { ascending: true }),
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
          supabase.from('league_standings').select('*').eq('league_id', league.id).order('position', { ascending: true })
            .then(({ data }) => setMembers((data as any[]) || []));
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

  // Sync squad to league (includes club metadata for profile viewing)
  const syncSquad = useCallback(async (players: any[], tactics: any, clubMeta?: any) => {
    if (!currentLeague) return;
    
    const squadPayload = clubMeta ? { players, clubMeta } : players;
    
    const { data: existing } = await supabase
      .from('league_squads')
      .select('id')
      .eq('league_id', currentLeague.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('league_squads')
        .update({ squad_data: squadPayload, tactics_data: tactics, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('league_squads')
        .insert([{ league_id: currentLeague.id, user_id: userId, squad_data: squadPayload, tactics_data: tactics }]);
    }
  }, [currentLeague, userId]);

  // Start season (owner only) - now with 30 rounds and date scheduling
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

    const syncedCount = leagueSquads.length;
    if (syncedCount < members.length) {
      toast.error(`${members.length - syncedCount} membro(s) ainda não sincronizou o elenco!`);
      return;
    }

    setLoading(true);
    const memberIds = members.map(m => m.user_id || m.id); // Ensure we catch bot IDs
    const numRounds = currentLeague.total_rounds || 30;
    
    // Get fixed match time by division
    const division = (currentLeague as any).division || 1;
    const matchTime = division === 1 ? "19:30" : division === 2 ? "20:00" : "21:00";
    
    const now = new Date();
    const schedule = generateRoundRobin(memberIds, numRounds, now, matchTime);
    
    const seasonEnd = new Date(now);
    seasonEnd.setDate(seasonEnd.getDate() + numRounds);

    const matchInserts = schedule.map(s => ({
      league_id: currentLeague.id,
      round: s.round,
      home_user_id: s.home,
      away_user_id: s.away,
      scheduled_at: s.scheduled_at,
      status: 'scheduled',
    }));

    await supabase.from('league_matches').insert(matchInserts);

    // Kick off simulations IMMEDIATELY — no waiting, no lobby, no joined flags.
    triggerAutoSim();

    await supabase.from('multiplayer_leagues')
      .update({ 
        season_status: 'in_progress', 
        current_round: 1,
        season_start: now.toISOString(),
        season_end: seasonEnd.toISOString(),
      })
      .eq('id', currentLeague.id);

    setCurrentLeague(prev => prev ? { 
      ...prev, 
      season_status: 'in_progress', 
      current_round: 1,
      season_start: now.toISOString(),
      season_end: seasonEnd.toISOString(),
    } : null);
    
    for (const m of members) {
      await supabase.from('league_members')
        .update({ points: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, played: 0 })
        .eq('id', m.id);
    }

    toast.success(`Temporada iniciada! ${numRounds} rodadas (1 por dia). ${schedule.length} partidas geradas.`);
    setLoading(false);
    await enterLeague(currentLeague);
  }, [currentLeague, userId, members, leagueSquads, enterLeague]);

  // Simulate a round (owner triggers)
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
      
      const result = simulatePvPMatch(homeSquad, awaySquad);
      
      await supabase.from('league_matches')
        .update({
          home_goals: result.homeGoals,
          away_goals: result.awayGoals,
          match_data: { events: result.events },
          status: 'played',
          played_at: new Date().toISOString(),
        })
        .eq('id', match.id);
      
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
    
    const totalRounds = currentLeague.total_rounds || 30;
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
    await enterLeague(currentLeague);
  }, [currentLeague, userId, leagueMatches, leagueSquads, members, enterLeague]);

  // End season and redistribute
  const endSeason = useCallback(async () => {
    if (!currentLeague || currentLeague.owner_id !== userId) return;
    
    setLoading(true);
    
    // Call the redistribute function for beginner tournaments
    if (currentLeague.league_type === 'beginner') {
      await supabase.rpc('redistribute_beginners', { _country: currentLeague.country });
      toast.success('Jogadores do torneio de iniciantes redistribuídos para ligas principais!');
    }
    
    // Use the server-side end season function
    await supabase.rpc('end_season_redistribute', { _league_id: currentLeague.id });

    setCurrentLeague(prev => prev ? {
      ...prev,
      season: prev.season + 1,
      season_status: 'registration',
      current_round: 0,
    } : null);

    toast.success(`Temporada ${currentLeague.season} encerrada! Jogadores redistribuídos.`);
    setLoading(false);
    await loadLeagues();
  }, [currentLeague, userId, loadLeagues]);

  // Get season info for display
  const getSeasonInfo = useCallback(() => {
    if (!currentLeague) return null;
    const totalRounds = currentLeague.total_rounds || 30;
    const currentRound = currentLeague.current_round || 0;
    const daysRemaining = totalRounds - currentRound;
    const isTransitionDay = currentRound >= totalRounds && currentLeague.season_status === 'finished';
    
    return {
      totalRounds,
      currentRound,
      daysRemaining,
      isTransitionDay,
      leagueType: currentLeague.league_type || 'main',
      seasonStart: currentLeague.season_start,
      seasonEnd: currentLeague.season_end,
    };
  }, [currentLeague]);

  return {
    leagues, currentLeague, members, chatMessages, privateMessages, proposals, rivalries,
    leagueMatches, leagueSquads, loading, autoJoining,
    loadLeagues, enterLeague, leaveLeague,
    sendChat, sendPrivateMessage, sendProposal, respondProposal,
    syncSquad, startSeason, simulateRound, endSeason,
    getSeasonInfo,
  };
}
