import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePresence(userId: string) {
  useEffect(() => {
    if (!userId) return;

    const upsertPresence = async () => {
      await supabase.from('user_presence').upsert(
        { user_id: userId, last_seen: new Date().toISOString(), is_online: true },
        { onConflict: 'user_id' }
      );
    };

    upsertPresence();

    // Heartbeat every 60 seconds
    const interval = setInterval(upsertPresence, 60000);

    // On tab close, mark offline
    const handleBeforeUnload = () => {
      navigator.sendBeacon && supabase.from('user_presence').update({ is_online: false }).eq('user_id', userId);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.from('user_presence').update({ is_online: false }).eq('user_id', userId);
    };
  }, [userId]);
}
