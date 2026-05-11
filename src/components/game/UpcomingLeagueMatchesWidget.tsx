import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { ClubShield } from './ClubShield';
import { supabase } from '@/integrations/supabase/client';

export function UpcomingLeagueMatchesWidget() {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_next_match', { _user_id: user.id });
      
      if (!error && data && data.length > 0) {
        setMatch(data[0]);
      } else {
        setMatch(null);
      }
      setLoading(false);
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Card><CardContent className="p-4 text-xs">Carregando...</CardContent></Card>;
  if (!match) return null;

  const date = new Date(match.scheduled_at);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarDays className="w-4 h-4 text-primary" />
          Próximo Jogo da Liga
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="font-bold text-primary">{match.league_name}</span>
          <span>Rodada {match.round}</span>
        </div>
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="text-center flex-1 flex flex-col items-center gap-1">
            <ClubShield club={{ logoUrl: match.home_team_logo } as any} size={32} />
            <p className="text-[10px] font-bold truncate max-w-[80px]">{match.home_team_name}</p>
          </div>
          <Badge variant="outline" className="text-[10px] font-black shrink-0">VS</Badge>
          <div className="text-center flex-1 flex flex-col items-center gap-1">
            <ClubShield club={{ logoUrl: match.away_team_logo } as any} size={32} />
            <p className="text-[10px] font-bold truncate max-w-[80px]">{match.away_team_name}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 text-[9px] bg-background/50 rounded-lg py-2">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary" />
            <span className="font-bold">
              {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às 19:30
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-2.5 h-2.5" />
            <span>{match.stadium_name || (match.is_home ? 'Sua Arena' : 'Estádio Local')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
