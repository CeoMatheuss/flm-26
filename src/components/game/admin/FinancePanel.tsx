import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

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
        const res = await supabase.from('profiles').select('user_id, display_name');
        const { data: clubs } = await supabase.from('clubs').select('user_id, name');
        
        if (mounted && clubs) {
          const formatted = clubs.map(c => ({
            user_id: c.user_id,
            club_name: c.name,
            club_logo: '⚽'
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
    <Card className="border-emerald-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="text-emerald-400">💰</span>
          Adicionar Dinheiro ao Clube
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="relative">
          <Input
            placeholder={loadingClubs ? 'Carregando clubes…' : 'Buscar clube por nome (ex: Pal...)'}
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }}
            className="text-xs h-8"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
              {suggestions.map(c => (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => { setSelected(c); setSearch(c.club_name); }}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted flex items-center gap-2"
                >
                  <span className="shrink-0">{c.club_logo || '⚽'}</span>
                  <span className="font-medium truncate">{c.club_name}</span>
                  <span className="ml-auto text-[9px] text-muted-foreground font-mono truncate max-w-[100px]">
                    {c.user_id.slice(0, 8)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-base">{selected.club_logo || '⚽'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{selected.club_name}</p>
              <p className="text-[9px] text-muted-foreground font-mono truncate">{selected.user_id}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
              onClick={() => { setSelected(null); setSearch(''); }}>
              Trocar
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Valor (R$)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="text-xs h-8"
          />
          <Input
            placeholder="Motivo (ex: Evento, Bônus)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="text-xs h-8"
          />
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          O jogador receberá uma notificação no sino com o valor e o motivo.
        </p>

        <Button
          size="sm"
          className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          onClick={submit}
          disabled={busy || !selected}
        >
          {busy ? 'Processando…' : 'CONFIRMAR ENTREGA'}
        </Button>

        {lastResult && (
          <div className="mt-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] animate-in fade-in slide-in-from-top-1">
            <p className="font-semibold text-emerald-400">✔ Operação realizada com sucesso!</p>
            <p>Saldo atualizado de <span className="font-medium">{lastResult.club}</span>: <span className="font-mono font-bold text-emerald-300">R$ {lastResult.newBudget.toLocaleString('pt-BR')}</span></p>
          </div>
        )}

        <div className="pt-4 border-t border-white/5 mt-4">
          <h4 className="text-[11px] font-bold text-muted-foreground uppercase mb-2 tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Histórico Recente
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
            {loadingLogs ? (
              <p className="text-[10px] text-center py-2 text-muted-foreground">Carregando histórico...</p>
            ) : logs.length === 0 ? (
              <p className="text-[10px] text-center py-2 text-muted-foreground">Nenhuma transação recente.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-1.5 rounded bg-white/5 border border-white/5 flex flex-col gap-0.5">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold ${log.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {log.amount > 0 ? '+' : ''}R$ {log.amount?.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[8px] text-muted-foreground font-mono">
                      {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[9px] truncate">
                    Para: <span className="text-white">{log.target?.display_name || 'Clube ID ' + log.target_user_id.slice(0,8)}</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground italic truncate">
                    Motivo: {log.reason || 'Sem motivo'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
