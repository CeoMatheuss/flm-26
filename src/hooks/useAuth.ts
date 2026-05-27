import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout to prevent infinite loading screen
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[useAuth] Verificação de sessão demorando muito, forçando carregamento finalizado.');
        setLoading(false);
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[useAuth] Auth state changed: ${_event}`, session?.user?.id);
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('[useAuth] GetSession error:', error);
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    }).catch(err => {
      console.error('[useAuth] GetSession fatal error:', err);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, loading, signOut };
}
