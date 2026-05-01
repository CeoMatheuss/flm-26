import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveLeague {
  id: string;
  country: string;
  flag_emoji: string;
  division: number;
  league_name: string;
  kickoff_hour: number;
  kickoff_minute: number;
  current_matchday: number;
  total_matchdays: number;
  total_slots: number;
  status: 'pending' | 'in_progress' | 'finished';
  season: number;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'Aguardando',  cls: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30' },
  in_progress: { label: 'Em andamento', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  finished:    { label: 'Finalizado',  cls: 'bg-muted text-muted-foreground border-border' },
};

interface Props {
  onOpenLeagues?: () => void;
}

export function ActiveCompetitionsWidget({ onOpenLeagues }: Props) {
  const [leagues, setLeagues] = useState<ActiveLeague[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from('world_leagues')
        .select('id, country, flag_emoji, division, league_name, kickoff_hour, kickoff_minute, current_matchday, total_matchdays, total_slots, status, season')
        .in('status', ['pending', 'in_progress'])
        .order('kickoff_hour', { ascending: true })
        .order('country', { ascending: true });
      if (mounted) {
        setLeagues((data ?? []) as ActiveLeague[]);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel('active-competitions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_leagues' }, load)
      .subscribe();

    const interval = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fmtTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const grouped = leagues.reduce<Record<string, ActiveLeague[]>>((acc, l) => {
    const key = fmtTime(l.kickoff_hour, l.kickoff_minute ?? 0);
    (acc[key] ||= []).push(l);
    return acc;
  }, {});
  const timeKeys = Object.keys(grouped).sort();

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-4 h-4 text-primary" />
          Campeonatos Ativos
          {!loading && (
            <Badge variant="secondary" className="text-[10px]">
              {leagues.length}
            </Badge>
          )}
        </CardTitle>
        {onOpenLeagues && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onOpenLeagues}>
            Ver todos <ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : leagues.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma competição ativa no momento.</p>
        ) : (
          timeKeys.map((tk) => (
            <div key={tk} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <Clock className="w-3 h-3" />
                {tk} BRT
                <span className="text-[10px] font-normal normal-case opacity-60">
                  · {grouped[tk].length} ligas
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {grouped[tk].map((l) => {
                  const meta = STATUS_META[l.status] ?? STATUS_META.in_progress;
                  return (
                    <div
                      key={l.id}
                      className="flex items-center gap-2 p-2 rounded-md border bg-card/40 hover:bg-card/70 transition-colors"
                    >
                      <span className="text-lg shrink-0">{l.flag_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{l.league_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {l.country} · D{l.division} · {l.total_slots} times
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${meta.cls}`}>
                          {meta.label}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          R{l.current_matchday}/{l.total_matchdays}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
