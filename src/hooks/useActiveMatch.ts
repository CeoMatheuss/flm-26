import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActiveMatchState {
  isInLiveMatch: boolean;
  matchId: string | null;
  liveMatchId: string | null;
  minute: number;
}

/**
 * Hook global que detecta se o usuário tem uma partida ao vivo em andamento.
 * Usa realtime + polling de fallback (30s) para garantir consistência.
 */
export function useActiveMatch() {
  const [state, setState] = useState<ActiveMatchState>({
    isInLiveMatch: false,
    matchId: null,
    liveMatchId: null,
    minute: 0,
  });
  const prevMatchIdRef = useRef<string | null>(null);

  const checkActive = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ isInLiveMatch: false, matchId: null, liveMatchId: null, minute: 0 });
      return;
    }

    const { data, error } = await supabase
      .from('live_matches')
      .select('id, match_id, current_minute, status')
      .eq('user_id', user.id)
      .eq('status', 'live')
      .lt('current_minute', 90)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setState({ isInLiveMatch: false, matchId: null, liveMatchId: null, minute: 0 });
      return;
    }

    if (data.id !== prevMatchIdRef.current) {
      const isNotificationEnabled = localStorage.getItem('flm-notifications-match') === 'true';
      if (isNotificationEnabled) {
        toast.info('🚀 Uma partida começou! Clique para assistir.', {
          duration: 6000,
          action: {
            label: 'Assistir',
            onClick: () => {
              // Assuming there's a way to navigate to the match tab.
              // In this project, tabs are often handled by state.
              window.dispatchEvent(new CustomEvent('flm:navigate-to-match', { detail: { matchId: data.id } }));
            }
          }
        });
      }
      prevMatchIdRef.current = data.id;
    }

    setState({
      isInLiveMatch: true,
      matchId: data.match_id,
      liveMatchId: data.id,
      minute: data.current_minute || 0,
    });
  }, []);

  useEffect(() => {
    checkActive();

    // Fallback polling (30s)
    const interval = setInterval(checkActive, 30000);

    // Realtime listener
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`active-match-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'live_matches', filter: `user_id=eq.${user.id}` },
          () => checkActive()
        )
        .subscribe();
    })();

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [checkActive]);

  return state;
}
