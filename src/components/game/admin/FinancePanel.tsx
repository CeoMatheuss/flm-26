import { useEffect, useMemo, useState } from 'react';
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
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-clubs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ scope: 'Mundial' }),
        });
        const result = await res.json();
        if (mounted && Array.isArray(result.clubs)) setAllClubs(result.clubs);
      } catch {
        // autocomplete é opcional
      } finally {
        if (mounted) setLoadingClubs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || selected?.club_name.toLowerCase() === q) return [];
    return allClubs
      .filter(c => c.club_name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, allClubs, selected]);

  /** Função única e isolada para adicionar/remover dinheiro. */
  const addMoneyToClub = async (targetUserId: string, value: number, clubLabel: string) => {
    const { data, error } = await supabase.rpc('admin_add_money_to_club', {
      p_target_user_id: targetUserId,
      p_amount: value,
    });
    if (error) {
      throw new Error(error.message || 'Falha ao ajustar saldo');
    }
    const result = (data as any) || {};
    return {
      newBudget: Number(result.new_budget) || 0,
      delta: Number(result.delta) || value,
      clubName: result.club_name || clubLabel,
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

        <Input
          type="number"
          placeholder="Valor em R$ (use negativo para descontar)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="text-xs h-8"
        />
        <p className="text-[10px] text-muted-foreground">
          Limite: ±R$ 1.000.000.000 por operação. Ação registrada em admin_logs e o jogador é notificado.
        </p>

        <Button
          size="sm"
          className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={submit}
          disabled={busy || !selected}
        >
          {busy ? 'Processando…' : 'Confirmar'}
        </Button>

        {lastResult && (
          <div className="mt-2 p-2 rounded-md bg-muted/40 border text-[10px] space-y-0.5">
            <p className="font-semibold text-emerald-400">
              {lastResult.delta >= 0 ? '✔ Crédito aplicado' : '⚠ Débito aplicado'}
            </p>
            <p>Clube: <span className="font-medium">{lastResult.club}</span></p>
            <p>Operação: <span className="font-mono">{lastResult.delta >= 0 ? '+' : ''}R$ {lastResult.delta.toLocaleString('pt-BR')}</span></p>
            <p>Novo saldo: <span className="font-mono font-semibold">R$ {lastResult.newBudget.toLocaleString('pt-BR')}</span></p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
