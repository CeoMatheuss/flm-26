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
          <div className="text-center flex-1">
            <p className="text-xs font-bold truncate">{match.home_team_name}</p>
          </div>
          <Badge variant="outline" className="text-[10px] font-black">VS</Badge>
          <div className="text-center flex-1">
            <p className="text-xs font-bold truncate">{match.away_team_name}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-[10px] bg-background/50 rounded-full py-1">
          <Clock className="w-3 h-3" />
          <span className="font-bold">
            {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
