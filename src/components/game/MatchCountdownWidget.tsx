import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId?: string;
}

interface NextMatchInfo {
  date: string;
  home: string;
  away: string;
  tournament: string;
}

/**
 * Widget compacto que exibe o tempo restante até o próximo jogo.
 * Atualiza a cada 1s e re-busca a partida sempre que o realtime sinaliza
 * mudanças em world_matches / national_cup_matches / league_matches.
 */
export function MatchCountdownWidget({ userId }: Props) {
  const [match, setMatch] = useState<NextMatchInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const load = async () => {
      const { data: teamData } = await supabase
        .from('world_teams')
        .select('id, name')
        .eq('user_id', userId)
        .maybeSingle();

      const candidates: NextMatchInfo[] = [];

      if (teamData) {
        const { data: wm } = await supabase
          .from('world_matches')
          .select(`scheduled_at, world_leagues(name),
            home_team:world_teams!world_matches_home_team_id_fkey(name),
            away_team:world_teams!world_matches_away_team_id_fkey(name)`)
          .or(`home_team_id.eq.${teamData.id},away_team_id.eq.${teamData.id}`)
          .in('status', ['scheduled', 'live'])
          .order('scheduled_at', { ascending: true })
          .limit(1);
        if (wm && wm[0]) {
          const m: any = wm[0];
          candidates.push({
            date: m.scheduled_at,
            home: m.home_team?.name || '—',
            away: m.away_team?.name || '—',
            tournament: m.world_leagues?.name || 'Liga',
          });
        }
      }

      const { data: cupTeam } = await supabase
        .from('national_cup_teams')
        .select('id')
        .eq('user_id', userId)
        .eq('eliminated', false);
      const cupIds = (cupTeam || []).map((r: any) => r.id);
      if (cupIds.length) {
        const { data: cm } = await supabase
          .from('national_cup_matches')
          .select(`scheduled_at, cup:national_cups(name),
            home:national_cup_teams!home_team_id(club_name),
            away:national_cup_teams!away_team_id(club_name)`)
          .or(`home_team_id.in.(${cupIds.join(',')}),away_team_id.in.(${cupIds.join(',')})`)
          .not('status', 'in', '("finished","played")')
          .order('scheduled_at', { ascending: true })
          .limit(1);
        if (cm && cm[0]) {
          const m: any = cm[0];
          candidates.push({
            date: m.scheduled_at,
            home: m.home?.club_name || '—',
            away: m.away?.club_name || '—',
            tournament: m.cup?.name || 'Copa',
          });
        }
      }

      candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (!cancelled) {
        setMatch(candidates[0] || null);
        setLoading(false);
      }
    };

    load();
    const ch = supabase
      .channel(`countdown-widget-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_matches' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'national_cup_matches' }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [userId]);

  useEffect(() => {
    if (!match?.date) {
      setTimeLeft('');
      return;
    }
    const tick = () => {
      const diff = new Date(match.date).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Iniciando...');
        return;
      }
      const total = Math.floor(diff / 1000);
      const d = Math.floor(total / 86400);
      const h = Math.floor((total % 86400) / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (d >= 1) setTimeLeft(`${d}d ${h}h ${String(m).padStart(2, '0')}m`);
      else if (h >= 1) setTimeLeft(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
      else setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match?.date]);

  if (loading || !match) return null;

  const dateLabel = new Date(match.date).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-full bg-primary/15 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Próximo Jogo • {match.tournament}
              </p>
              <p className="text-sm font-bold truncate">
                {match.home} <span className="text-muted-foreground">vs</span> {match.away}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3" /> {dateLabel}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Tempo restante
            </p>
            <p className="text-2xl font-black text-primary tabular-nums">
              {timeLeft || '--:--'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
