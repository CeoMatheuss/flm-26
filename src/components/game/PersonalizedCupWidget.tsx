import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Swords, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId?: string;
  onGoToMatches?: () => void;
  onOpenTournament?: (id: string) => void;
}

export function PersonalizedCupWidget({ userId, onOpenTournament }: Props) {
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: teamEntry } = await supabase
        .from('national_cup_teams')
        .select('cup_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (teamEntry) {
        const { data: match } = await supabase
          .from('national_cup_matches')
          .select(`
            *,
            cup:national_cups(name),
            home:national_cup_teams!home_team_id(club_name),
            away:national_cup_teams!away_team_id(club_name)
          `)
          .eq('cup_id', teamEntry.cup_id)
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (match) setNextMatch(match);
      }
      setLoading(false);
    };
    load();
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
          <div className="text-center flex-1 min-w-0">
            <p className="text-[10px] font-black truncate">{nextMatch.home?.club_name}</p>
          </div>
          <div className="px-3">
            <span className="text-[10px] font-black text-muted-foreground">VS</span>
          </div>
          <div className="text-center flex-1 min-w-0">
            <p className="text-[10px] font-black truncate">{nextMatch.away?.club_name}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-2 bg-background/40 p-2 rounded-lg border border-border/50">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] font-bold">{new Date(nextMatch.scheduled_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] font-bold">12:00</span>
          </div>
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
