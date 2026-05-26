import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, TrendingUp, Crown, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ATTR_PT: Record<string, string> = {
  speed: 'Velocidade', shooting: 'Finalização', passing: 'Passe',
  defending: 'Defesa', physical: 'Físico', dribbling: 'Drible',
  positioning: 'Posicionamento', heading: 'Cabeceio', vision: 'Visão',
  composure: 'Compostura', marking: 'Marcação', setPieces: 'Bola Parada',
  goalkeeping: 'Defesa GK',
};

interface HistoryRow {
  id: string;
  player_id: string;
  player_name: string;
  attribute: string;
  old_value: number;
  new_value: number;
  delta: number;
  week: number | null;
  season: number | null;
  focus: string | null;
  intensity: string | null;
  ct_level: number | null;
  premium_boost: boolean;
  age: number | null;
  stamina: number | null;
  source: string;
  created_at: string;
}

interface Props {
  userId?: string;
  playerId?: string;
  children?: React.ReactNode;
}

export function TrainingHistoryModal({ userId, playerId, children }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);

    let q = supabase
      .from('player_training_history' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(150);

    if (playerId) q = q.eq('player_id', playerId);

    q.then(({ data, error }) => {
      if (error) console.error('[TrainingHistory] erro:', error);
      setRows(((data ?? []) as unknown) as HistoryRow[]);
      setLoading(false);
    });
  }, [open, userId, playerId]);

  // Agrega por jogador para sumário
  const byPlayer = rows.reduce<Record<string, { name: string; total: number; count: number }>>((acc, r) => {
    const key = r.player_id;
    if (!acc[key]) acc[key] = { name: r.player_name, total: 0, count: 0 };
    acc[key].total += Number(r.delta) || (Number(r.new_value) - Number(r.old_value));
    acc[key].count += 1;
    return acc;
  }, {});
  const topPlayers = Object.entries(byPlayer)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <History className="w-4 h-4" /> Histórico
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-zinc-950 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            {playerId ? 'Histórico de Evolução do Jogador' : 'Histórico Geral de Treinos'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-white/40 text-sm">
            Nenhuma evolução registrada ainda. Configure foco de treino e aguarde os ciclos diários.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Resumo */}
            {!playerId && topPlayers.length > 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-amber-400" /> Top evoluções recentes
                </p>
                <div className="space-y-1">
                  {topPlayers.map(([id, p]) => (
                    <div key={id} className="flex justify-between text-xs">
                      <span className="font-bold text-white truncate">{p.name}</span>
                      <span className="text-emerald-400 font-black tabular-nums">+{p.total.toFixed(1)} pts · {p.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista detalhada */}
            <ScrollArea className="h-[420px] pr-2">
              <div className="space-y-1.5">
                {rows.map(r => {
                  const delta = Number(r.delta) || (Number(r.new_value) - Number(r.old_value));
                  return (
                    <div key={r.id} className="rounded-lg bg-white/5 border border-white/5 p-2.5 hover:border-emerald-500/20 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold text-white truncate">{r.player_name}</span>
                          {r.premium_boost && (
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-black tabular-nums">
                          +{delta.toFixed(1)} {ATTR_PT[r.attribute] || r.attribute}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-white/40 font-medium">
                        <span>
                          {r.old_value} → {r.new_value}
                          {r.focus && ` · ${r.focus}`}
                          {r.intensity && ` · ${r.intensity}`}
                        </span>
                        <span>
                          CT {r.ct_level ?? '?'} · {r.age ?? '?'}a · Fis {r.stamina ?? '?'}%
                        </span>
                      </div>
                      <p className="text-[9px] text-white/30 mt-0.5">
                        {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
