import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingMatchResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  stats?: any;
  competition: string;
  createdAt: string;
  isHome?: boolean;
}

const PREFIX = 'pending_match_result_';

function readPending(): { key: string; value: PendingMatchResult }[] {
  const out: { key: string; value: PendingMatchResult }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const value = JSON.parse(raw) as PendingMatchResult;
        if (value && value.matchId) out.push({ key, value });
      } catch { /* ignore corrupt entry */ }
    }
  } catch { /* ignore storage errors */ }
  return out;
}

/**
 * Flushes match results stored offline (in localStorage as `pending_match_result_*`)
 * to Supabase as soon as connectivity is restored. Runs:
 *  - Once on mount (if already online)
 *  - Whenever the browser fires the `online` event
 *  - Periodically every 60s as a safety net
 */
export function usePendingMatchFlush(userId: string | undefined) {
  const flushingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const flush = async () => {
      if (flushingRef.current) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

      const pending = readPending();
      if (pending.length === 0) return;

      flushingRef.current = true;
      let synced = 0;

      try {
        for (const { key, value } of pending) {
          // Skip very old entries (>7 days) — discard to avoid spam
          const age = Date.now() - new Date(value.createdAt).getTime();
          if (Number.isFinite(age) && age > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key);
            continue;
          }

          try {
            const isHome = value.isHome ?? true;
            const userGoals = isHome ? value.homeGoals : value.awayGoals;
            const oppGoals = isHome ? value.awayGoals : value.homeGoals;
            const result =
              userGoals > oppGoals ? 'win' : userGoals < oppGoals ? 'loss' : 'draw';

            // Insert into match_history for permanent record
            const { error: histErr } = await supabase.from('match_history').insert({
              user_id: userId,
              competition: value.competition,
              home_team: value.homeTeam,
              away_team: value.awayTeam,
              home_goals: value.homeGoals,
              away_goals: value.awayGoals,
              is_home: isHome,
              match_type: 'offline',
              stats: value.stats || {},
            });

            if (histErr) {
              console.warn('[PendingFlush] history insert failed:', histErr.message);
              continue; // keep entry, retry next time
            }

            // Lightweight notification so player sees offline result was synced
            await supabase.from('user_notifications').insert({
              user_id: userId,
              type: result === 'win' ? 'success' : result === 'loss' ? 'danger' : 'info',
              title: `📡 Resultado offline sincronizado`,
              message: `${value.homeTeam} ${value.homeGoals} x ${value.awayGoals} ${value.awayTeam} (${value.competition})`,
              icon: '📡',
            });

            localStorage.removeItem(key);
            synced++;
          } catch (err) {
            console.warn('[PendingFlush] sync error for', key, err);
            // keep entry for next attempt
          }
        }

        if (synced > 0) {
          toast.success(`📡 ${synced} resultado(s) offline sincronizado(s)`);
        }
      } finally {
        flushingRef.current = false;
      }
    };

    // Initial attempt
    flush();

    // Re-flush whenever the browser regains connectivity
    const onOnline = () => flush();
    window.addEventListener('online', onOnline);

    // Safety net: retry every 60s
    const interval = setInterval(flush, 60_000);

    return () => {
      window.removeEventListener('online', onOnline);
      clearInterval(interval);
    };
  }, [userId]);
}
