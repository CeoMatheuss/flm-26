import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Check if user has active Premium status (30-day window from activated_at). */
export function usePremiumStatus(userId?: string) {
  const [isPremium, setIsPremium] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const check = async () => {
      const { data } = await supabase
        .from('premium_users')
        .select('activated_at, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      if (data) {
        const activatedAt = new Date(data.activated_at).getTime();
        const remaining = 30 * 24 * 60 * 60 * 1000 - (Date.now() - activatedAt);
        if (remaining > 0) {
          setIsPremium(true);
          setDaysLeft(Math.ceil(remaining / (24 * 60 * 60 * 1000)));
        } else {
          setIsPremium(false);
        }
      } else {
        setIsPremium(false);
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [userId]);

  return { isPremium, daysLeft };
}
