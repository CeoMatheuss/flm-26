import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarDays, Clock, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UpcomingMatch {
  match_id: string;
  league_id: string;
  league_name: string;
  flag_emoji: string;
  division: number;
  matchday: number;
  total_matchdays: number;
  kickoff_at: string;
  kickoff_hour: number;
  kickoff_minute: number;
  home_name: string;
  away_name: string;
}

const fmtHM = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

export function UpcomingLeagueMatchesWidget() {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Próximo jogo de cada liga (limitado a 30 ligas para o widget)
      const { data: leagues } = await supabase
        .from('world_leagues')
        .select(
          'id, league_name, flag_emoji, division, total_matchdays, kickoff_hour, kickoff_minute',
        )
        .eq('status', 'in_progress')
        .order('kickoff_hour', { ascending: true })
        .limit(60);

      if (!leagues || leagues.length === 0) {
        if (mounted) {
          setMatches([]);
          setLoading(false);
        }
        return;
      }

      const leagueIds = leagues.map((l) => l.id);
      const nowIso = new Date().toISOString();

      // Próximos matches agendados
      const { data: rows } = await supabase
        .from('world_matches')
        .select(
          'id, league_id, matchday, kickoff_at, home_team:home_team_id(club_name), away_team:away_team_id(club_name)',
        )
        .in('league_id', leagueIds)
        .eq('status', 'scheduled')
        .gte('kickoff_at', nowIso)
        .order('kickoff_at', { ascending: true })
        .limit(120);

      const byLeague = new Map<string, any>();
      for (const r of rows ?? []) {
        if (!byLeague.has(r.league_id)) byLeague.set(r.league_id, r);
      }

      const merged: UpcomingMatch[] = [];
      for (const l of leagues) {
        const m = byLeague.get(l.id);
        if (!m) continue;
        merged.push({
          match_id: m.id,
          league_id: l.id,
          league_name: l.league_name,
          flag_emoji: l.flag_emoji,
          division: l.division,
          matchday: m.matchday,
          total_matchdays: l.total_matchdays,
          kickoff_at: m.kickoff_at,
          kickoff_hour: l.kickoff_hour,
          kickoff_minute: l.kickoff_minute ?? 0,
          home_name: (m.home_team as any)?.club_name ?? '?',
          away_name: (m.away_team as any)?.club_name ?? '?',
        });
      }

      merged.sort(
        (a, b) =>
          new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
      );

      if (mounted) {
        setMatches(merged);
        setLoading(false);
      }
    };

    load();
    const channel = supabase
      .channel('upcoming-league-matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'world_matches' },
        load,
      )
      .subscribe();
    const interval = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const renderItem = (m: UpcomingMatch, compact = false) => (
    <div
      key={m.match_id}
      className={
        compact
          ? 'shrink-0 w-56 p-2.5 rounded-md border bg-card/60 snap-start'
          : 'p-3 rounded-md border bg-card/40'
      }
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{m.flag_emoji}</span>
        <span className="text-[11px] font-semibold truncate flex-1">
          {m.league_name}
        </span>
        <Badge variant="outline" className="text-[9px] py-0 px-1">
          D{m.division}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
        <Clock className="w-3 h-3" />
        {fmtHM(m.kickoff_hour, m.kickoff_minute)} BRT
        <span>· {fmtDay(m.kickoff_at)}</span>
        <span className="ml-auto">
          R{m.matchday}/{m.total_matchdays}
        </span>
      </div>
      <div className="text-xs font-medium truncate">
        {m.home_name} <span className="text-muted-foreground">vs</span>{' '}
        {m.away_name}
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="w-4 h-4 text-primary" />
            Próximos Jogos das Ligas
            {!loading && (
              <Badge variant="secondary" className="text-[10px]">
                {matches.length}
              </Badge>
            )}
          </CardTitle>
          {matches.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setOpen(true)}
            >
              <Maximize2 className="w-3 h-3" /> Ver tudo
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum jogo agendado nas ligas mundiais.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory -mx-1 px-1">
              {matches.slice(0, 20).map((m) => renderItem(m, true))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Calendário Completo das Ligas Mundiais
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {matches.map((m) => renderItem(m, false))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
