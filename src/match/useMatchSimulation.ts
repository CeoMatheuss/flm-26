import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isHighlightEvent } from '@/components/game/HighlightMiniCanvas';

export interface SimEvent {
  minute: number;
  type: string;
  description: string;
  team: 'home' | 'away' | 'neutral';
  playerName?: string;
  assistName?: string;
  goalType?: string;
  isGoal?: boolean;
  staminaData?: Record<string, number>;
  momentPhase?: string;
  priority?: string;
}

export interface MatchStats {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  passes: [number, number];
  tackles: [number, number];
  saves: [number, number];
  offsides: [number, number];
}

const EMPTY_STATS: MatchStats = {
  possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
  corners: [0, 0], fouls: [0, 0], yellowCards: [0, 0],
  redCards: [0, 0], passes: [0, 0], tackles: [0, 0],
  saves: [0, 0], offsides: [0, 0],
};

export interface MatchState {
  phase: 'idle' | 'loading' | 'live' | 'halftime' | 'finished' | 'error';
  currentMinute: number;
  progress: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  visibleEvents: SimEvent[];
  latestEvent: SimEvent | null;
  stats: MatchStats;
  stadiumName: string;
  stadiumCapacity: number;
  attendance: number;
  matchDbId: string | null;
  errorMsg: string | null;
  competition: string;
  isHome: boolean;
  currentMoment: string;
  playerStamina: Record<string, number>;
  assistantTips: SimEvent[];
  onAnimationComplete?: () => void;
}

const INITIAL: MatchState = {
  phase: 'idle',
  currentMinute: 0,
  progress: 0,
  homeTeam: '',
  awayTeam: '',
  homeGoals: 0,
  awayGoals: 0,
  visibleEvents: [],
  latestEvent: null,
  stats: { ...EMPTY_STATS },
  stadiumName: '',
  stadiumCapacity: 0,
  attendance: 0,
  matchDbId: null,
  errorMsg: null,
  competition: '',
  isHome: true,
  currentMoment: 'equilíbrio',
  playerStamina: {},
  assistantTips: [],
  
};

interface MatchData {
  allEvents: SimEvent[];
  startTime: number;
  durationMs: number;
  maxMinute: number;
  finalHomeGoals: number;
  finalAwayGoals: number;
  stats: MatchStats;
  homeTeam: string;
  awayTeam: string;
  stadiumName: string;
  stadiumCapacity: number;
  attendance: number;
  matchDbId: string;
  competition: string;
  isHome: boolean;
}

const TICK_MS = 300;

type Subscriber = () => void;
const subscribers = new Set<Subscriber>();
let intervalHandle: number | null = null;
let lastTickAt = 0;

function runAllSubscribers() {
  lastTickAt = Date.now();
  for (const fn of Array.from(subscribers)) {
    try { fn(); } catch (e) { console.error('[MatchLoop] subscriber threw:', e); }
  }
}

function ensureGlobalLoopRunning() {
  if (intervalHandle == null) {
    intervalHandle = window.setInterval(runAllSubscribers, TICK_MS);
  }
}

function stopGlobalLoopIfIdle() {
  if (subscribers.size > 0) return;
  if (intervalHandle != null) { clearInterval(intervalHandle); intervalHandle = null; }
}

function subscribeToLoop(fn: Subscriber): () => void {
  subscribers.add(fn);
  lastTickAt = Date.now();
  ensureGlobalLoopRunning();
  return () => {
    subscribers.delete(fn);
    stopGlobalLoopIfIdle();
  };
}

export function useMatchSimulation() {
  const [state, setState] = useState<MatchState>(INITIAL);
  
  const dataRef = useRef<MatchData | null>(null);
  const nextVisibleEventIdxRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const persistedRef = useRef(false);
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  const computeStatsFromEvents = useCallback((events: SimEvent[]): MatchStats => {
    const s: MatchStats = { 
      ...EMPTY_STATS, 
      possession: [50, 50], 
      shots: [0, 0], 
      shotsOnTarget: [0, 0], 
      corners: [0, 0], 
      fouls: [0, 0], 
      yellowCards: [0, 0], 
      redCards: [0, 0], 
      passes: [0, 0], 
      tackles: [0, 0], 
      saves: [0, 0], 
      offsides: [0, 0] 
    };
    
    let homeActions = 0, awayActions = 0;
    
    for (const ev of events) {
      const idx = ev.team === 'home' ? 0 : ev.team === 'away' ? 1 : -1;
      if (idx === -1) continue;
      
      const opp = idx === 0 ? 1 : 0;
      if (ev.team === 'home') homeActions++; else if (ev.team === 'away') awayActions++;
      
      const isEvGoal = ev.isGoal === true || ev.type === 'goal' || ev.description.toUpperCase().includes('GOL');
      if (isEvGoal && ev.type !== 'penalty_shootout') { 
        s.shots[idx]++; 
        s.shotsOnTarget[idx]++; 
      }
      
      switch (ev.type) {
        case 'woodwork': s.shots[idx]++; s.shotsOnTarget[idx]++; break;
        case 'great_save': s.shots[idx]++; s.shotsOnTarget[idx]++; s.saves[opp]++; break;
        case 'corner_danger': s.corners[idx]++; break;
        case 'offside_trap': s.offsides[idx]++; break;
        case 'long_shot_miss': case 'header_miss': s.shots[idx]++; break;
        case 'yellow_card': s.fouls[idx]++; s.yellowCards[idx]++; break;
        case 'red_card': s.fouls[idx]++; s.redCards[idx]++; break;
        case 'dangerous_foul': s.fouls[opp]++; break;
        case 'midfield_foul': case 'foul': s.fouls[idx]++; break;
        case 'tackle': s.tackles[opp]++; break;
        case 'penalty_miss': s.shots[idx]++; s.shotsOnTarget[idx]++; s.saves[opp]++; break;
        case 'possession': case 'dribble_ok': case 'through_ball': case 'crossing': case 'long_pass': case 'pressing': s.passes[idx]++; break;
        case 'counter_attack': case 'free_kick_near': s.shots[idx]++; s.shotsOnTarget[idx]++; s.saves[opp]++; break;
      }
    }
    
    const total = homeActions + awayActions;
    if (total > 0) s.possession = [Math.round((homeActions / total) * 100), Math.round((awayActions / total) * 100)];
    return s;
  }, []);

  const recalculateScoreFromEvents = useCallback((events: SimEvent[]) => {
    let hG = 0, aG = 0;
    for (const ev of events) {
      const isEvGoal = ev.isGoal === true || ev.type === 'goal' || ev.description.toUpperCase().includes('GOL');
      if (isEvGoal && ev.type !== 'penalty_shootout') {
        if (ev.team === 'home') hG++;
        else if (ev.team === 'away') aG++;
      }
    }
    return { hG, aG };
  }, []);

  const getAtmosphereDescription = (event: SimEvent, attendance: number, capacity: number): string => {
    const occupancy = capacity > 0 ? attendance / capacity : 0;
    const isBigCrowd = attendance > 15000 || occupancy > 0.85;
    const isGoodCrowd = attendance > 5000 || occupancy > 0.6;
    const isEmpty = occupancy < 0.25 && capacity > 3000;
    
    // Frases de clima geral baseadas na lotação real (conforme dados de torcida)
    if (event.type === 'kickoff') {
      if (isBigCrowd) return `${event.description} O estádio está lotado! Clima de decisão com ${attendance.toLocaleString()} torcedores presentes.`;
      if (isEmpty) return `${event.description} Público reduzido hoje no estádio. Pouco mais de ${attendance.toLocaleString()} presentes.`;
      return `${event.description} Bom público presente para acompanhar o espetáculo.`;
    }

    if (event.isGoal) {
      if (isBigCrowd) return `${event.description} O estádio VEM ABAIXO! A vibração de ${attendance.toLocaleString()} torcedores é absoluta!`;
      if (isEmpty) return `${event.description} Comemoração ecoa nas arquibancadas com grandes espaços vazios.`;
      if (isGoodCrowd) return `${event.description} A torcida faz a festa e comemora muito o gol!`;
      return `${event.description} Celebração contida dos poucos torcedores presentes.`;
    }
    
    if (event.type === 'great_save') {
      if (isBigCrowd) return `${event.description} Um suspiro coletivo toma o estádio lotado! Que defesa!`;
      return `${event.description} Aplausos da torcida reconhecem a intervenção do goleiro.`;
    }
    
    if (event.type === 'woodwork' || event.type === 'miss') {
      if (isBigCrowd) return `${event.description} O estádio quase explode! Muita pressão da torcida!`;
      if (isGoodCrowd) return `${event.description} Lamento nas arquibancadas. Passou muito perto!`;
      return `${event.description} A chance perdida não empolga os presentes.`;
    }
    
    return event.description;
  };

  const processMatchEvent = useCallback((event: SimEvent, currentVisibleEvents: SimEvent[]) => {
    // 1. Identificar se o evento é um gol
    const isGoal = event.isGoal === true || event.type === 'goal' || event.description.toUpperCase().includes('GOL');
    
    // 2. Usar ID único do evento para evitar duplicidade
    const eventId = `${event.minute}-${event.type}-${event.team}-${event.playerName || ''}`;
    if (notifiedEventsRef.current.has(eventId)) {
      console.log("[DUPLICATE EVENT IGNORED]", eventId);
      return null;
    }
    
    // 3. Marcar como processado
    notifiedEventsRef.current.add(eventId);

    // 4. Acumular eventos e garantir ordem
    const allEvents = [...currentVisibleEvents, event].sort((a, b) => {
      if (a.minute !== b.minute) return a.minute - b.minute;
      return 0;
    });
    
    // 5. Calcular placares DERIVADOS da lista de eventos (Fonte única da verdade)
    const { hG, aG } = recalculateScoreFromEvents(allEvents);

    if (isGoal) {
      console.log("[GOAL EVENT]", eventId);
      console.log("[PLACAR ATUALIZADO]", { homeScore: hG, awayScore: aG });
    }
    
    console.log("[NOVO EVENTO]", event);
    console.log("[TOTAL EVENTOS]", allEvents.length);

    return { hG, aG, visibleEvents: allEvents };
  }, [recalculateScoreFromEvents]);

  const stopTick = useCallback(() => {
    if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
  }, []);

  const tick = useCallback(() => {
    const data = dataRef.current;
    if (!data || isAnimatingRef.current || state.phase === 'finished') return;

    const now = Date.now();
    const virtualElapsed = (now - data.startTime);
    const progress = Math.min(1, Math.max(0, virtualElapsed / data.durationMs));
    const currentMinute = Math.min(data.maxMinute, Math.floor(progress * data.maxMinute));
    const isComplete = virtualElapsed >= data.durationMs;

    const nextEvent = data.allEvents[nextVisibleEventIdxRef.current];
    
    // Se a partida deveria estar encerrada, forçar encerramento e não processar mais nada
    if (isComplete) {
      console.log("[MATCH] Partida encerrada pelo cronômetro.");
      stopTick();
      setState(prev => ({
        ...prev,
        phase: 'finished',
        currentMinute: data.maxMinute,
        progress: 1,
        homeGoals: Math.max(prev.homeGoals, data.finalHomeGoals),
        awayGoals: Math.max(prev.awayGoals, data.finalAwayGoals),
        onAnimationComplete: () => { isAnimatingRef.current = false; },
      }));
      
      if (!persistedRef.current) {
        persistedRef.current = true;
        supabase.from('live_matches')
          .update({ status: 'finished', current_minute: data.maxMinute })
          .eq('id', data.matchDbId)
          .then(() => {});
      }
      return;
    }

    if (nextEvent && nextEvent.minute <= currentMinute) {
      const result = processMatchEvent(nextEvent, state.visibleEvents);
      
      if (result) {
        const { hG, aG, visibleEvents } = result;
        nextVisibleEventIdxRef.current++;
        
        // Se o evento processado for o apito final, travar imediatamente
        const isFinalWhistle = nextEvent.type === 'final_whistle';
        
        if (isHighlightEvent(nextEvent.type)) isAnimatingRef.current = true;

        const stats = computeStatsFromEvents(visibleEvents);
        const stamina = visibleEvents.filter(e => e.staminaData).pop()?.staminaData || {};
        const moment = visibleEvents.filter(e => e.momentPhase).pop()?.momentPhase || 'equilíbrio';

        nextEvent.description = getAtmosphereDescription(nextEvent, data.attendance, data.stadiumCapacity);

        setState(prev => ({
          ...prev,
          phase: isFinalWhistle ? 'finished' : prev.phase,
          currentMinute: nextEvent.minute,
          progress,
          homeGoals: hG,
          awayGoals: aG,
          visibleEvents,
          latestEvent: nextEvent,
          stats,
          stadiumName: data.stadiumName,
          stadiumCapacity: data.stadiumCapacity,
          attendance: data.attendance,
          currentMoment: moment,
          playerStamina: stamina,
          assistantTips: visibleEvents.filter(e => e.type === 'assistant_tip'),
          onAnimationComplete: () => { isAnimatingRef.current = false; },
        }));

        if (isFinalWhistle) {
          console.log("[MATCH] Apito final detectado nos eventos.");
          stopTick();
          if (!persistedRef.current) {
            persistedRef.current = true;
            supabase.from('live_matches')
              .update({ status: 'finished', current_minute: nextEvent.minute })
              .eq('id', data.matchDbId)
              .then(() => {});
          }
        }
      }
      return;
    }

    let phase: MatchState['phase'] = 'live';
    if (currentMinute >= 45 && currentMinute <= 46) phase = 'halftime';

    setState(prev => ({ 
      ...prev, 
      phase, 
      currentMinute, 
      progress, 
      stadiumName: data.stadiumName,
      stadiumCapacity: data.stadiumCapacity,
      attendance: data.attendance,
      onAnimationComplete: () => { isAnimatingRef.current = false; },
    }));
  }, [computeStatsFromEvents, state.visibleEvents, processMatchEvent, stopTick, getAtmosphereDescription]);

  const startTick = useCallback(() => {
    if (unsubscribeRef.current) return;
    unsubscribeRef.current = subscribeToLoop(() => tick());
    tick();
  }, [tick]);

  const hydrateMatchRow = useCallback((data: any): boolean => {
    if (!data) return false;
    const events = (data.events as any as SimEvent[]) || [];
    const startTime = new Date(data.started_at || data.created_at || Date.now()).getTime();
    const durationMs = (data.duration_seconds || 720) * 1000;
    const maxMinute = events.length > 0 ? Math.max(90, ...events.map(e => Number(e.minute) || 0)) : 90;
    const elapsed = Math.max(0, Date.now() - startTime);
    const progress = Math.min(1, elapsed / durationMs);
    const currentMinute = data.status === 'finished' ? maxMinute : Math.floor(progress * maxMinute);
    
    // Filtra eventos visíveis com base no minuto atual
    const visibleEvents = events.filter(e => (Number(e.minute) || 0) <= currentMinute);
    
    // Recalcula o placar a partir dos eventos visíveis (Fonte Única da Verdade)
    const { hG: homeGoals, aG: awayGoals } = recalculateScoreFromEvents(visibleEvents);

    dataRef.current = {
      allEvents: events,
      startTime,
      durationMs,
      maxMinute,
      finalHomeGoals: data.home_goals || 0,
      finalAwayGoals: data.away_goals || 0,
      stats: (data.stats as any) || EMPTY_STATS,
      homeTeam: data.home_team,
      awayTeam: data.away_team,
      stadiumName: data.stadium_name,
      stadiumCapacity: data.stadium_capacity || 0,
      attendance: data.attendance || 0,
      matchDbId: data.id,
      competition: data.competition || 'Amistoso',
      isHome: data.is_home,
    };

    persistedRef.current = data.status === 'finished';
    nextVisibleEventIdxRef.current = visibleEvents.length;
    
    // Popula o Set de eventos notificados para evitar duplicação no tick
    notifiedEventsRef.current = new Set(visibleEvents.map(ev => `${ev.minute}-${ev.type}-${ev.team}-${ev.playerName || ''}`));

    setState(s => ({
      ...s,
      phase: data.status === 'finished' || progress >= 1 ? 'finished' : currentMinute >= 45 && currentMinute <= 46 ? 'halftime' : 'live',
      currentMinute,
      progress,
      homeTeam: data.home_team || '',
      awayTeam: data.away_team || '',
      homeGoals: data.status === 'finished' ? Math.max(data.home_goals || 0, homeGoals) : homeGoals,
      awayGoals: data.status === 'finished' ? Math.max(data.away_goals || 0, awayGoals) : awayGoals,
      visibleEvents,
      latestEvent: visibleEvents[visibleEvents.length - 1] || null,
      stats: visibleEvents.length ? computeStatsFromEvents(visibleEvents) : ((data.stats as any) || EMPTY_STATS),
      stadiumName: data.stadium_name || '',
      stadiumCapacity: data.stadium_capacity || 0,
      attendance: data.attendance || 0,
      matchDbId: data.id,
      errorMsg: null,
      competition: data.competition || 'Amistoso',
      isHome: data.is_home,
    }));
    
    if (data.status !== 'finished' && progress < 1) startTick();
    return true;
  }, [computeStatsFromEvents, recalculateScoreFromEvents, startTick]);

  const loadMatch = useCallback(async (matchDbId: string): Promise<boolean> => {
    setState(s => ({ ...s, phase: 'loading' }));
    const { data, error } = await supabase.from('live_matches').select('*').eq('id', matchDbId).maybeSingle();
    
    if (error || !data) {
      setState(s => ({ ...s, phase: 'error', errorMsg: error?.message || 'Partida não encontrada ou já encerrada.' }));
      return false;
    }

    let patchedData: any = data;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sharedId = (data as any).shared_match_id || (data as any).match_id;
      if (user && sharedId) {
        const { data: homeUserId } = await supabase.rpc('resolve_home_user_for_match' as any, { _match_id: String(sharedId) });
        if (homeUserId) patchedData = { ...data, is_home: homeUserId === user.id };
      }
    } catch { /* fallback: keep stored perspective */ }

    return hydrateMatchRow(patchedData);
  }, [hydrateMatchRow]);

  const startMatch = useCallback(async (params: any) => {
    setState(s => ({ ...s, phase: 'loading' }));
    try {
      const { data, error } = await supabase.functions.invoke('start-match', { body: params });
      if (error || !data?.success) {
        const msg = error?.message || data?.error || 'Erro ao iniciar partida no servidor.';
        console.error('[startMatch] failed', { error, data });
        setState(s => ({ ...s, phase: 'error', errorMsg: msg }));
        return { success: false, error: msg };
      }
      const ok = await loadMatch(data.matchDbId);
      if (!ok) {
        // loadMatch já setou phase='error' internamente
        return { success: false, error: 'Falha ao carregar partida criada.' };
      }
      return { success: true };
    } catch (e: any) {
      console.error('[startMatch] exception', e);
      setState(s => ({ ...s, phase: 'error', errorMsg: e?.message || 'Erro inesperado ao iniciar partida.' }));
      return { success: false, error: e?.message };
    }
  }, [loadMatch]);

  const findActiveMatch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('live_matches').select('id').eq('status', 'live').order('started_at', { ascending: false }).limit(1).maybeSingle();
    if (data) return loadMatch(data.id);
    return false;
  }, [loadMatch]);

  const destroy = useCallback(() => { stopTick(); dataRef.current = null; }, [stopTick]);

  const onAnimationComplete = useCallback(() => { isAnimatingRef.current = false; }, []);
  return { state, startMatch, loadMatch, loadMatchSnapshot: hydrateMatchRow, findActiveMatch, destroy, onAnimationComplete };
}
