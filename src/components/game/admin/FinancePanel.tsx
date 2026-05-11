import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Wallet, ChevronRight, X, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';

type ClubOption = { user_id: string; club_name: string; club_logo: string };

/**
 * 💰 FINANCEIRO — Painel isolado, único responsável por ajustar saldo de clubes.
 *
 * Não compartilha lógica nem estado com outros sistemas (premium, gift, personalização).
 * Chama diretamente a RPC `admin_add_money_to_club` (SECURITY DEFINER, lock atômico).
 * Trava de execução dupla via flag local `busy`.
 */
export function FinancePanel() {
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{ club: string; newBudget: number; delta: number } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Carrega clubes uma vez para autocomplete
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingClubs(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: clubs, error } = await supabase
          .from('clubs')
          .select('user_id, name, logo_url')
          .order('name', { ascending: true });
        
        if (mounted && clubs) {
          const formatted = clubs.map(c => ({
            user_id: c.user_id,
            club_name: c.name,
            club_logo: c.logo_url || '⚽'
          }));
          setAllClubs(formatted);
        }
      } catch {
        // autocomplete é opcional
      } finally {
        if (mounted) setLoadingClubs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from('admin_finance_logs')
      .select(`
        *,
        admin:admin_id(display_name),
        target:target_user_id(display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(15);
    if (data) setLogs(data);
    setLoadingLogs(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || selected?.club_name.toLowerCase() === q) return [];
    return allClubs
      .filter(c => c.club_name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, allClubs, selected]);

  /** Função única e isolada para adicionar/remover dinheiro. */
  const addMoneyToClub = async (targetUserId: string, value: number, clubLabel: string) => {
    const { data, error } = await supabase.rpc('execute_admin_money_transfer', {
      p_target_id: targetUserId,
      p_value: value,
      p_description: reason || 'Ajuste administrativo direto'
    });
    
    if (error) {
      throw new Error(error.message || 'Falha ao ajustar saldo');
    }
    
    const result = (data as any) || {};
    return {
      newBudget: Number(result.current_balance) || 0,
      delta: Number(result.difference) || value,
      clubName: result.club || clubLabel,
    };
  };

  const submit = async () => {
    if (busy) return;                             // trava execução dupla
    if (!selected) { toast.error('❌ Selecione um clube na busca.'); return; }
    const value = Math.trunc(Number(amount));
    if (!Number.isFinite(value) || value === 0) {
      toast.error('❌ Informe um valor diferente de zero.'); return;
    }

    setBusy(true);
    try {
      const r = await addMoneyToClub(selected.user_id, value, selected.club_name);
      toast.success(
        value >= 0
          ? `✔ R$ ${value.toLocaleString('pt-BR')} adicionado ao ${r.clubName}`
          : `✔ R$ ${Math.abs(value).toLocaleString('pt-BR')} descontado do ${r.clubName}`
      );
      setLastResult({ club: r.clubName, newBudget: r.newBudget, delta: r.delta });
      setAmount('');
      setReason('');
      loadLogs();
    } catch (e: any) {
      toast.error(`❌ ${e?.message || 'Erro ao ajustar saldo'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-emerald-500/20 bg-zinc-900/60 shadow-2xl overflow-hidden">
      <div className="bg-emerald-500/10 p-4 border-b border-emerald-500/20">
        <CardTitle className="text-base flex items-center gap-3 text-white italic font-black uppercase tracking-tighter">
          <Wallet className="h-5 w-5 text-emerald-400" />
          Aporte Financeiro Admin
        </CardTitle>
        <p className="text-[10px] text-emerald-400/60 font-bold uppercase mt-1">Gerenciamento de capital dos clubes</p>
      </div>
      
      <CardContent className="p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Localizar Clube Destino</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <Search className="h-4 w-4" />
            </div>
            <Input
              placeholder={loadingClubs ? 'Carregando banco de dados...' : 'Digite o nome do clube ou ID...'}
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
              className="pl-10 h-11 bg-black/40 border-white/10 text-white font-bold placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all"
              autoComplete="off"
            />
            
            {suggestions.length > 0 && !selected && (
              <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 shadow-2xl backdrop-blur-xl">
                <div className="p-2 border-b border-white/5 bg-white/5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase px-2 italic">Resultados Encontrados ({suggestions.length})</span>
                </div>
                {suggestions.map(c => (
                  <button
                    key={c.user_id}
                    type="button"
                    onClick={() => { setSelected(c); setSearch(c.club_name); }}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-lg group-hover:border-emerald-500/30 transition-all">
                      {c.club_logo && (c.club_logo.startsWith('http') || c.club_logo.startsWith('/')) ? (
                        <img src={c.club_logo} className="w-5 h-5 object-contain" alt="" />
                      ) : (
                        <span>{c.club_logo || '⚽'}</span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-xs text-white uppercase italic truncate group-hover:text-emerald-400 transition-colors">{c.club_name}</span>
                      <span className="text-[9px] text-zinc-500 font-mono truncate uppercase tracking-tighter">ID: {c.user_id}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 ml-auto text-zinc-700 group-hover:text-emerald-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-black/40 border border-emerald-500/20 flex items-center justify-center text-2xl shadow-inner">
              {selected.club_logo && (selected.club_logo.startsWith('http') || selected.club_logo.startsWith('/')) ? (
                <img src={selected.club_logo} className="w-8 h-8 object-contain" alt="" />
              ) : (
                <span>{selected.club_logo || '⚽'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest italic">Clube Selecionado</p>
              <p className="text-base font-black text-white uppercase italic truncate">{selected.club_name}</p>
              <p className="text-[9px] text-zinc-500 font-mono truncate uppercase">UID: {selected.user_id}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/5"
              onClick={() => { setSelected(null); setSearch(''); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 italic">Montante (R$)</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="Ex: 5000000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-11 bg-black/40 border-white/10 text-white font-black italic placeholder:text-zinc-700 focus:border-emerald-500/50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600">BRL</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 italic">Justificativa</label>
            <Input
              placeholder="Ex: Premiação Copa"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="h-11 bg-black/40 border-white/10 text-white font-bold placeholder:text-zinc-700 focus:border-emerald-500/50"
            />
          </div>
        </div>

        <Button
          size="lg"
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-tighter italic shadow-lg shadow-emerald-500/10 group transition-all"
          onClick={submit}
          disabled={busy || !selected}
        >
          {busy ? (
            <span className="flex items-center gap-2 italic">Processando Camada de Dados...</span>
          ) : (
            <span className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              Executar Transferência de Crédito
            </span>
          )}
        </Button>

        {lastResult && (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase italic">Operação Realizada</span>
            </div>
            <p className="text-xs text-white">O saldo do <span className="font-black italic uppercase text-emerald-400">{lastResult.club}</span> foi atualizado.</p>
            <p className="text-[11px] text-zinc-400 mt-1">Novo Montante em Caixa: <span className="font-black text-white italic tracking-tight">R$ {lastResult.newBudget.toLocaleString('pt-BR')}</span></p>
          </div>
        )}

        <div className="pt-6 border-t border-white/5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black text-white italic uppercase tracking-widest flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-zinc-500" />
              Log de Auditoria Financeira
            </h4>
            <Badge variant="outline" className="text-[8px] font-black border-white/10 text-zinc-500 uppercase">Tempo Real</Badge>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {loadingLogs ? (
              <div className="py-10 text-center opacity-20 italic text-xs uppercase font-black">Sincronizando Histórico...</div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center opacity-20 italic text-xs uppercase font-black">Nenhum registro encontrado</div>
            ) : (
              logs.map(log => {
                const isPositive = log.amount >= 0;
                return (
                  <div key={log.id} className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors flex flex-col gap-2 group">
                    <div className="flex justify-between items-center">
                      <div className={`flex items-center gap-1.5 font-black italic text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {isPositive ? '+' : ''}R$ {log.amount?.toLocaleString('pt-BR')}
                      </div>
                      <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">
                        {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] font-bold text-zinc-300 uppercase italic truncate">
                        Destino: <span className="text-white group-hover:text-emerald-400 transition-colors">{log.target?.display_name || 'Clube ID ' + log.target_user_id.slice(0,8)}</span>
                      </p>
                      <p className="text-[9px] text-zinc-500 italic truncate font-medium">
                        Motivo: {log.reason || 'Sem descrição oficial'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
