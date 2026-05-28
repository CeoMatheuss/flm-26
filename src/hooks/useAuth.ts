import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    const startTime = performance.now();
    console.log('[useAuth] Verificando sessão inicial...');
    
    try {
      // Timeout reduzido para 8s para falhar mais rápido e permitir retry ou skip
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_GET_SESSION')), 8000)
      );

      const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
      const duration = (performance.now() - startTime).toFixed(2);
      
      if (result && result.data) {
        const { session } = result.data;
        console.log(`[useAuth] Sessão carregada (${duration}ms):`, session?.user?.id || 'nenhuma');
        setSession(session);
      }
    } catch (err: any) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[useAuth] Latência na sessão (${duration}ms). Prosseguindo...`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety timeout total de 10s (caso tudo falhe)
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[useAuth] ⚠️ Segurança: Verificação de sessão demorando muito, forçando desbloqueio.');
        setLoading(false);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[useAuth] 🔄 Evento Auth: ${event}`, { 
        userId: session?.user?.id,
        timestamp: new Date().toISOString() 
      });
      
      if (mounted) {
        setSession(session);
        setLoading(false);
        
        if (event === 'SIGNED_IN') {
          console.log('[useAuth] ✅ Usuário entrou com sucesso.');
        } else if (event === 'SIGNED_OUT') {
          console.log('[useAuth] 🚪 Usuário saiu.');
          // Limpar caches locais se necessário
          // localStorage.removeItem('flm:club-cache');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[useAuth] 🔑 Token renovado.');
        }
      }
    });

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [checkSession]);

  const signOut = async () => {
    try {
      console.log('[useAuth] Iniciando logout...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      console.log('[useAuth] Logout concluído.');
    } catch (err) {
      console.error('[useAuth] Erro ao sair:', err);
      toast.error('Erro ao sair da conta. Limpando dados locais...');
      // Forçar limpeza se a API falhar
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return { session, loading, signOut, refreshSession: checkSession };
}
