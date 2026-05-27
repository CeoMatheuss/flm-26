import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, Database, Shield, Lock } from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
}

export function DiagnosticOverlay({ onClose }: { onClose: () => void }) {
  const [results, setResults] = useState<DiagnosticResult[]>([
    { name: 'Conexão com a Internet', status: 'pending', message: 'Verificando...' },
    { name: 'Supabase API', status: 'pending', message: 'Verificando...' },
    { name: 'Autenticação (Auth)', status: 'pending', message: 'Verificando...' },
    { name: 'Banco de Dados (Leitura)', status: 'pending', message: 'Verificando...' },
    { name: 'Tabela: Perfil', status: 'pending', message: 'Verificando...' },
    { name: 'Tabela: Clube', status: 'pending', message: 'Verificando...' },
  ]);
  const [running, setRunning] = useState(true);

  const runDiagnostics = async () => {
    setRunning(true);
    const newResults: DiagnosticResult[] = [...results].map(r => ({ ...r, status: 'pending', message: 'Verificando...' }));
    setResults(newResults);

    const updateResult = (name: string, status: DiagnosticResult['status'], message: string, duration?: number) => {
      setResults(prev => prev.map(r => r.name === name ? { ...r, status, message, duration } : r));
    };

    // 1. Internet
    updateResult('Conexão com a Internet', window.navigator.onLine ? 'success' : 'error', window.navigator.onLine ? 'Conectado' : 'Sem internet');

    // 2. Supabase API (Ping)
    const t0 = performance.now();
    try {
      const response = await fetch(import.meta.env.VITE_SUPABASE_URL, { method: 'GET', mode: 'no-cors' });
      updateResult('Supabase API', 'success', 'Alcançável', Math.round(performance.now() - t0));
    } catch (e) {
      updateResult('Supabase API', 'error', 'Inalcançável (CORS ou Down)');
    }

    // 3. Auth
    const t1 = performance.now();
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      updateResult('Autenticação (Auth)', 'success', data.session ? 'Sessão ativa' : 'Pronto para login', Math.round(performance.now() - t1));
    } catch (e: any) {
      updateResult('Autenticação (Auth)', 'error', e.message || 'Erro no serviço de Auth');
    }

    // 4. Database (Generic)
    const t2 = performance.now();
    try {
      // Usamos um timeout curto para não travar o diagnostic
      const dbPromise = supabase.from('profiles').select('count', { count: 'exact', head: true });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
      
      const { error } = await Promise.race([dbPromise, timeoutPromise]) as any;
      if (error) throw error;
      updateResult('Banco de Dados (Leitura)', 'success', 'Respondendo', Math.round(performance.now() - t2));
    } catch (e: any) {
      updateResult('Banco de Dados (Leitura)', 'error', e.message === 'Timeout' ? 'Servidor sobrecarregado (Timeout 5s)' : 'Erro de conexão SQL');
    }

    // 5. Profile Table
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        const { error } = await supabase.from('profiles').select('id').eq('user_id', session.session.user.id).maybeSingle();
        updateResult('Tabela: Perfil', error ? 'error' : 'success', error ? 'Erro de RLS ou Tabela' : 'Acessível');
      } else {
        updateResult('Tabela: Perfil', 'warning', 'Requer login para testar');
      }
    } catch (e) {
      updateResult('Tabela: Perfil', 'error', 'Falha ao testar');
    }

    // 6. Club Table
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        const { error } = await supabase.from('clubs').select('id').eq('user_id', session.session.user.id).maybeSingle();
        updateResult('Tabela: Clube', error ? 'error' : 'success', error ? 'Erro de RLS ou Tabela' : 'Acessível');
      } else {
        updateResult('Tabela: Clube', 'warning', 'Requer login para testar');
      }
    } catch (e) {
      updateResult('Tabela: Clube', 'error', 'Falha ao testar');
    }

    setRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-lg border-border/50 shadow-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Diagnóstico do Sistema
          </CardTitle>
          {!running && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <XCircle className="w-5 h-5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground mb-4">
            Relatório técnico sobre a saúde da conexão e do banco de dados do FLM 26.
          </p>
          
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/10">
                <div className="flex items-center gap-3">
                  {r.status === 'pending' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                  {r.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {r.status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
                  {r.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm font-medium">{r.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-bold ${
                    r.status === 'success' ? 'text-emerald-500' : 
                    r.status === 'error' ? 'text-destructive' : 
                    r.status === 'warning' ? 'text-amber-500' : 'text-muted-foreground'
                  }`}>
                    {r.message.toUpperCase()}
                  </span>
                  {r.duration && <span className="text-[9px] text-muted-foreground/50">{r.duration}ms</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex gap-2">
            <Button 
              className="flex-1 gap-2" 
              onClick={runDiagnostics} 
              disabled={running}
            >
              <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Testando...' : 'Repetir Testes'}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
              disabled={running}
            >
              Fechar
            </Button>
          </div>
          
          {results.some(r => r.status === 'error') && (
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 mt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-destructive uppercase">Problemas Detectados</p>
                  <p className="text-[10px] text-destructive/80 leading-relaxed">
                    O servidor Supabase está enfrentando latência ou quedas parciais. Isso pode causar o travamento no "Entrando...". 
                    Recomendamos tentar novamente em alguns minutos ou limpar o cache do navegador.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
