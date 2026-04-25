import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Globe, Star, Medal, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UpcomingMatch {
  competition_type: 'world_cup' | 'continental' | 'national_cup' | 'league';
  competition_name: string;
  priority: number;
  match_id: string;
  stage: string;
  home_club: string;
  away_club: string;
  is_home: boolean;
  scheduled_at: string;
}

interface Props {
  userId: string;
}

const COMPETITION_META: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  world_cup:    { icon: Globe,  label: 'Mundial',     color: 'text-yellow-500',   bg: 'bg-yellow-500/10 border-yellow-500/30' },
  continental:  { icon: Star,   label: 'Continental', color: 'text-purple-500',   bg: 'bg-purple-500/10 border-purple-500/30' },
  national_cup: { icon: Trophy, label: 'Copa',        color: 'text-orange-500',   bg: 'bg-orange-500/10 border-orange-500/30' },
  league:       { icon: Medal,  label: 'Liga',        color: 'text-blue-500',     bg: 'bg-blue-500/10 border-blue-500/30' },
};

export function GlobalCompetitionsWidget({ userId }: Props) {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    const load = async () => {
      const { data, error } = await supabase.rpc('get_user_upcoming_matches' as any, {
        _user_id: userId,
        _limit: 6,
      });
      if (!error && data) setMatches(data as UpcomingMatch[]);
      setLoading(false);
    };
    
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Próximos Jogos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Carregando...</CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Próximos Jogos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhuma partida agendada nas competições oficiais.
        </CardContent>
      </Card>
    );
  }

  // Agrupa por dia para mostrar o limite de 3/dia
  const matchesByDay: Record<string, UpcomingMatch[]> = {};
  for (const m of matches) {
    const day = new Date(m.scheduled_at).toISOString().split('T')[0];
    matchesByDay[day] = matchesByDay[day] || [];
    matchesByDay[day].push(m);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-4 h-4" />
          Próximos Jogos Oficiais
          <Badge variant="outline" className="ml-auto text-[10px]">
            Mundial &gt; Continental &gt; Copa &gt; Liga
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((m) => {
          const meta = COMPETITION_META[m.competition_type];
          const Icon = meta?.icon ?? Trophy;
          const date = new Date(m.scheduled_at);
          const opponent = m.is_home ? m.away_club : m.home_club;
          
          return (
            <div
              key={m.match_id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border ${meta?.bg ?? 'bg-muted/30'}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${meta?.color ?? ''}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">
                    {m.is_home ? '🏠' : '✈️'} vs {opponent}
                  </span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                    {m.stage}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {m.competition_name}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  {date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(date, { locale: ptBR, addSuffix: true })}
                </div>
              </div>
            </div>
          );
        })}
        
        {Object.entries(matchesByDay).some(([_, arr]) => arr.length >= 3) && (
          <div className="text-[10px] text-muted-foreground text-center pt-1 border-t">
            ⚠️ Você tem 3 jogos no mesmo dia. Cuidado com estamina e lesões!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
