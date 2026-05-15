import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Wallet, X, ArrowUpRight, ArrowDownRight, History, CheckCircle2, Loader2, Key, AlertCircle, RefreshCw } from 'lucide-react';

type Club = {
  user_id: string;
  name: string;
  logo: string | null;
  budget: number;
};

type FinanceLog = {
  id: string;
  amount: number;
  reason: string | null;
  created_at: string;
  target_user_id: string;
  target?: { display_name: string | null } | null;
};

const QUICK_VALUES = [
  { label: '+100K', v: 100_000 },
  { label: '+500K', v: 500_000 },
  { label: '+1M', v: 1_000_000 },
  { label: '+10M', v: 10_000_000 },
  { label: '-1M', v: -1_000_000 },
];

/**
 * 💰 Painel Financeiro Admin V3 — refeito do zero.
 * Busca direta na tabela clubs + RPC execute_admin_money_transfer.
 */
export function FinancePanel() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Club | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{ name: string; newBudget: number; delta: number } | null>(null);
  const [logs, setLogs] = useState<FinanceLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{ loading: boolean; success?: boolean; message?: string; error?: string }>({ loading: false });

  // Carrega lista de clubes (uma vez)
  const loadClubs = useCallback(async () => {
    setLoadingClubs(true);
    // 1) Tenta a tabela `clubs` (legado)
    const [{ data: clubsData }, { data: savesData, error: savesErr }] = await Promise.all([
      supabase.from('clubs').select('user_id, name, logo_url, budget'),
      supabase.from('game_saves').select('user_id, club_data'),
    ]);

    if (savesErr) {
      toast.error('Erro ao carregar clubes: ' + savesErr.message);
      setLoadingClubs(false);
      return;
    }

    const map = new Map<string, Club>();

    (clubsData || []).forEach((c: any) => {
      if (!c?.user_id) return;
      map.set(c.user_id, {
        user_id: c.user_id,
        name: c.name || 'Sem nome',
        logo: c.logo_url || null,
        budget: Number(c.budget) || 0,
      });
    });

    (savesData || []).forEach((s: any) => {
      const club = s?.club_data?.club || s?.club_data || {};
      const name = club?.name;
      if (!s?.user_id || !name) return;
      // game_saves prevalece (é a fonte real do save online)
      map.set(s.user_id, {
        user_id: s.user_id,
        name,
        logo: club?.logoUrl || club?.logo_url || club?.logo || null,
        budget: Number(club?.budget) || 0,
      });
    });

    const list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    setClubs(list);
    setLoadingClubs(false);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from('admin_finance_logs')
      .select('id, amount, reason, created_at, target_user_id, target:target_user_id(display_name)')
      .order('created_at', { ascending: false })
      .limit(15);
    if (data) setLogs(data as any);
    setLoadingLogs(false);
  }, []);

  const validateToken = async () => {
    setTokenStatus({ loading: true });
    try {
      const { data, error } = await supabase.functions.invoke('validate-mercadopago-token');
      if (error) throw error;
      
      if (data.success) {
        setTokenStatus({ loading: false, success: true, message: `Conectado: ${data.app_name || 'App Mercado Pago'}` });
        toast.success('Token validado com sucesso!');
      } else {
        setTokenStatus({ loading: false, success: false, error: data.error });
        toast.error('Erro na validação do token');
      }
    } catch (err: any) {
      console.error(err);
      setTokenStatus({ loading: false, success: false, error: 'Erro ao chamar função de validação.' });
      toast.error('Falha na comunicação com o servidor');
    }
  };

  useEffect(() => {
    loadClubs();
    loadLogs();
  }, [loadClubs, loadLogs]);

  // Filtragem em tempo real com sugestões iniciais
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    // Se não houver busca e nenhum clube selecionado, mostra todos como sugestão
    if (!q && !selected) {
      return clubs;
    }
    
    // Se houver busca, filtra por nome ou user_id
    if (q) {
      // Se houver um clube selecionado e o texto da busca for exatamente o nome dele, não mostra dropdown
      if (selected && selected.name.toLowerCase() === q) return [];
      
      return clubs
        .filter(c => 
          c.name?.toLowerCase().includes(q) || 
          c.user_id.toLowerCase().includes(q)
        )
        .slice(0, 10);
    }

    return [];
  }, [search, clubs, selected]);

  const handleSelect = (club: Club) => {
    setSelected(club);
    setSearch(club.name);
    setLastResult(null);
  };

  const handleClear = () => {
    setSelected(null);
    setSearch('');
    setAmount('');
    setReason('');
    setLastResult(null);
  };

  const submit = async (overrideAmount?: number) => {
    if (busy) return;
    if (!selected) {
      toast.error('Selecione um clube primeiro.');
      return;
    }
    const value = Math.trunc(overrideAmount ?? Number(amount));
    if (!Number.isFinite(value) || value === 0) {
      toast.error('Informe um valor diferente de zero.');
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('execute_admin_money_transfer', {
        p_target_id: selected.user_id,
        p_value: value,
        p_description: reason.trim() || (value > 0 ? 'Aporte administrativo' : 'Retirada administrativa'),
      });

      if (error) throw error;

      const result = (data as any) || {};
      const newBudget = Number(result.current_balance) || 0;

      toast.success(
        value > 0
          ? `+R$ ${value.toLocaleString('pt-BR')} entregues ao ${selected.name}`
          : `-R$ ${Math.abs(value).toLocaleString('pt-BR')} retirados do ${selected.name}`
      );

      setLastResult({ name: selected.name, newBudget, delta: value });
      setAmount('');
      setReason('');
      // Atualiza saldo local do clube
      setClubs(prev => prev.map(c => c.user_id === selected.user_id ? { ...c, budget: newBudget } : c));
      setSelected(prev => prev ? { ...prev, budget: newBudget } : null);
      loadLogs();
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || 'Falha ao processar'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Wallet className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Tesouro Administrativo</h3>
          <p className="text-[10px] text-muted-foreground">{clubs.length} clubes ativos no sistema</p>
        </div>
        <Button size="sm" variant="ghost" onClick={loadClubs} disabled={loadingClubs} className="text-xs">
          {loadingClubs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Atualizar'}
        </Button>
      </div>

      {/* BUSCA */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-3">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
            1. Buscar Clube
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={loadingClubs ? 'Carregando…' : 'Digite o nome do clube ou ID do usuário…'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              className="pl-10 h-10 bg-background"
              autoComplete="off"
              disabled={loadingClubs}
            />
            {selected && (
              <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            )}

            {filtered.length > 0 && !selected && (
              <div className="absolute z-50 mt-2 w-full max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-2xl">
                <div className="px-3 py-1.5 border-b border-border bg-muted/30">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">
                    {search ? 'Resultados da busca' : 'Sugestões de times'}
                  </span>
                </div>
                {filtered.map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => handleSelect(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left border-b border-border/40 last:border-0"
                  >
                    <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-base shrink-0 overflow-hidden">
                      {c.logo && (c.logo.startsWith('http') || c.logo.startsWith('/'))
                        ? <img src={c.logo} alt="" className="w-full h-full object-cover" />
                        : <span>{c.logo || '⚽'}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {c.user_id.slice(0, 13)}… • R$ {c.budget.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0">Selecionar</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!search && !selected && filtered.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic px-1">
              Digite ao menos 1 caractere para filtrar ou selecione uma sugestão abaixo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* CLUBE SELECIONADO + AÇÃO */}
      {selected && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                {selected.logo && (selected.logo.startsWith('http') || selected.logo.startsWith('/'))
                  ? <img src={selected.logo} alt="" className="w-full h-full object-cover" />
                  : <span>{selected.logo || '⚽'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest">Clube selecionado</p>
                <h4 className="text-base font-black text-foreground truncate">{selected.name}</h4>
                <p className="text-xs text-muted-foreground">
                  Saldo: <span className="font-mono font-bold text-foreground">R$ {selected.budget.toLocaleString('pt-BR')}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                2. Valor Rápido
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_VALUES.map(q => (
                  <Button
                    key={q.label}
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold h-8"
                    disabled={busy}
                    onClick={() => submit(q.v)}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                3. Valor Personalizado
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Valor (ex: 5000000)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 sm:col-span-1"
                />
                <Input
                  placeholder="Motivo (opcional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 sm:col-span-2"
                />
              </div>
              <Button
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
                onClick={() => submit()}
                disabled={busy || !amount}
              >
                {busy
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando…</>
                  : <>{Number(amount) >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />} Confirmar Operação</>}
              </Button>
            </div>

            {lastResult && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 animate-in zoom-in-95">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-400">Operação concluída</p>
                  <p className="text-muted-foreground">
                    {lastResult.delta > 0 ? '+' : ''}R$ {lastResult.delta.toLocaleString('pt-BR')} → {lastResult.name}
                  </p>
                  <p className="text-muted-foreground">
                    Novo saldo: <span className="font-mono font-bold text-foreground">R$ {lastResult.newBudget.toLocaleString('pt-BR')}</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* HISTÓRICO */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <History className="h-3.5 w-3.5" />
              Histórico de Transações
            </h4>
            <Badge variant="outline" className="text-[9px]">Últimas 15</Badge>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {loadingLogs ? (
              <p className="text-xs text-center py-6 text-muted-foreground">Carregando…</p>
            ) : logs.length === 0 ? (
              <p className="text-xs text-center py-6 text-muted-foreground italic">Nenhuma transação registrada.</p>
            ) : (
              logs.map((log) => {
                const positive = log.amount >= 0;
                return (
                  <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {positive ? '+' : ''}R$ {log.amount.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        → {log.target?.display_name || log.target_user_id.slice(0, 12) + '…'}
                        {log.reason ? <span className="italic opacity-70"> • {log.reason}</span> : null}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
      {/* MERCADO PAGO VALIDATION */}
      <Card className={`border-${tokenStatus.success ? 'emerald' : tokenStatus.error ? 'red' : 'amber'}-500/20 bg-muted/10`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className={`h-4 w-4 ${tokenStatus.success ? 'text-emerald-500' : tokenStatus.error ? 'text-red-500' : 'text-amber-500'}`} />
              <h4 className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">
                Status Mercado Pago
              </h4>
            </div>
            {tokenStatus.success && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] uppercase font-black">Ativo</Badge>
            )}
          </div>

          <div className="bg-black/20 rounded-xl p-3 border border-white/5">
            {tokenStatus.loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                Testando conexão com a API do Mercado Pago...
              </div>
            ) : tokenStatus.success ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                {tokenStatus.message}
              </div>
            ) : tokenStatus.error ? (
              <div className="flex items-start gap-2 text-xs text-red-400 font-medium leading-tight">
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                {tokenStatus.error}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground italic">
                O token não foi testado nesta sessão. Clique para validar a integração.
              </div>
            )}
          </div>

          <Button 
            size="sm" 
            variant="outline" 
            className="w-full h-9 text-[10px] font-bold uppercase gap-2 bg-background hover:bg-muted"
            onClick={validateToken}
            disabled={tokenStatus.loading}
          >
            {tokenStatus.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Testar Conexão do Token
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
