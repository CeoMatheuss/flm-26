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
  const [userMatch, setUserMatch] = useState<UpcomingMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // 1. Get all active leagues
      const { data: leagues } = await supabase
        .from('world_leagues')
        .select('id, league_name, flag_emoji, division, total_matchdays, kickoff_hour, kickoff_minute')
        .eq('status', 'in_progress')
        .limit(100);

      if (!leagues || leagues.length === 0) {
        if (mounted) {
          setMatches([]);
          setLoading(false);
        }
        return;
      }

      const leagueIds = leagues.map((l) => l.id);
      const nowIso = new Date().toISOString();

      // 2. Fetch matches, deduplicating via SQL grouping if possible, but here we'll filter in JS
      // for better control over the "user match" logic.
      const { data: rows } = await supabase
        .from('world_matches')
        .select('id, league_id, matchday, kickoff_at, home_team_id, away_team_id, home_team:home_team_id(club_name, name), away_team:away_team_id(club_name, name)')
        .in('league_id', leagueIds)
        .eq('status', 'scheduled')
        .order('matchday', { ascending: true })
        .order('kickoff_at', { ascending: true })
        .limit(240);

      if (!rows) return;

      const leagueMap = new Map(leagues.map(l => [l.id, l]));
      
      // Deduplicate: only one match per league/round
      const seen = new Set<string>();
      const processed: UpcomingMatch[] = [];
      let playerMatch: UpcomingMatch | null = null;

      for (const r of rows) {
        const l = leagueMap.get(r.league_id);
        if (!l) continue;

        // Deduplicate: each team only 1 match per round
        const matchKey = `${r.league_id}-${r.matchday}-${r.home_team_id}`;
        if (seen.has(matchKey)) continue;
        seen.add(matchKey);
        seen.add(`${r.league_id}-${r.matchday}-${r.away_team_id}`);

        const m: UpcomingMatch = {
          match_id: r.id,
          league_id: l.id,
          league_name: l.league_name,
          flag_emoji: l.flag_emoji,
          division: l.division,
          matchday: r.matchday,
          total_matchdays: l.total_matchdays,
          kickoff_at: r.kickoff_at,
          kickoff_hour: 19, // Standard 19:30
          kickoff_minute: 30,
          home_name: (r.home_team as any)?.club_name || (r.home_team as any)?.name || '?',
          away_name: (r.away_team as any)?.club_name || (r.away_team as any)?.name || '?',
        };

        if (currentUserId && (r.home_team_id === currentUserId || r.away_team_id === currentUserId)) {
          if (!playerMatch) playerMatch = m;
        }

        processed.push(m);
      }

      if (mounted) {
        setMatches(processed);
        setUserMatch(playerMatch);
        setLoading(false);
      }
    };

    load();
    const channel = supabase.channel('upcoming-matches-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_matches' }, load)
      .subscribe();
    
    const interval = setInterval(load, 30_000); // Sync every 30s as requested
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
            Próximos Jogos
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
              Nenhum jogo agendado.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {userMatch && (
                <div className="border-b pb-2 mb-2">
                  <p className="text-[10px] font-bold text-primary uppercase mb-2">SEU PRÓXIMO JOGO</p>
                  {renderItem(userMatch, false)}
                </div>
              )}
              <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory -mx-1 px-1">
                {matches
                  .filter(m => m.match_id !== userMatch?.match_id)
                  .slice(0, 20)
                  .map((m) => renderItem(m, true))}
              </div>
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
