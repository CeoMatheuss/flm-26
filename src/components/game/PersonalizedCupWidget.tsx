import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Calendar, Clock, ArrowRight, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId?: string;
  onOpenTournament?: (id: string) => void;
}

export function PersonalizedCupWidget({ userId, onOpenTournament }: Props) {
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) return;
    const { data: teamEntry } = await supabase
      .from('national_cup_teams')
      .select('cup_id')
      .eq('user_id', userId)
      .eq('eliminated', false)
      .maybeSingle();

    if (teamEntry) {
      const { data: match } = await supabase
        .from('national_cup_matches')
        .select(`
          *,
          cup:national_cups(name),
          home:national_cup_teams!home_team_id(club_name, club_logo),
          away:national_cup_teams!away_team_id(club_name, club_logo)
        `)
        .eq('cup_id', teamEntry.cup_id)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (match) setNextMatch(match);
      else setNextMatch(null);
    } else {
      setNextMatch(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel('cup-widget-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'national_cup_matches' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  if (loading || !nextMatch) return null;

  return (
    <Card className="game-card border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
      <CardHeader className="py-2 px-3 border-b border-border/50">
        <CardTitle className="text-[10px] uppercase tracking-wider text-primary flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Trophy className="h-3 w-3" /> {nextMatch.cup?.name}</span>
          <Badge variant="outline" className="text-[8px] h-4">PRÓXIMO JOGO</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 min-w-0 space-y-1">
            <div className="w-8 h-8 mx-auto flex items-center justify-center bg-muted/30 rounded-full text-lg">
              {nextMatch.home?.club_logo || '🛡️'}
            </div>
            <p className="text-[9px] font-black truncate">{nextMatch.home?.club_name}</p>
          </div>
          <div className="px-3 flex flex-col items-center">
            <span className="text-[10px] font-black text-muted-foreground italic">vs</span>
          </div>
          <div className="text-center flex-1 min-w-0 space-y-1">
            <div className="w-8 h-8 mx-auto flex items-center justify-center bg-muted/30 rounded-full text-lg">
              {nextMatch.away?.club_logo || '🛡️'}
            </div>
            <p className="text-[9px] font-black truncate">{nextMatch.away?.club_name}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 bg-background/40 p-1.5 rounded-lg border border-border/50">
            <Calendar className="h-3 w-3 text-primary" />
            <span className="text-[9px] font-bold">{new Date(nextMatch.scheduled_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background/40 p-1.5 rounded-lg border border-border/50">
            <Clock className="h-3 w-3 text-primary" />
            <span className="text-[9px] font-bold">12:00</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground bg-muted/20 p-1 rounded">
          <Landmark className="h-2.5 w-2.5" />
          <span className="truncate">Estádio do Mandante</span>
        </div>

        <Button 
          variant="default" 
          size="sm" 
          className="w-full h-7 text-[10px] gap-1.5 font-bold uppercase"
          onClick={() => onOpenTournament && onOpenTournament(nextMatch.cup_id)}
        >
          Abrir Copa <ArrowRight className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
