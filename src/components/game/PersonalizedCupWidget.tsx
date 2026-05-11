import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ClubShield } from './ClubShield';

interface Props {
  userId?: string;
  onOpenTournament?: (id: string) => void;
}

export function PersonalizedCupWidget({ userId, onOpenTournament }: Props) {
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) return;
    
    // 1. Buscar jogo da copa onde o usuário participa
    const { data: teamEntry } = await supabase
      .from('national_cup_teams')
      .select('cup_id')
      .eq('user_id', userId)
      .eq('eliminated', false)
      .maybeSingle();

    let query = supabase
      .from('national_cup_matches')
      .select(`
        id, round, status, scheduled_at, cup_id,
        cup:national_cups(name),
        home:national_cup_teams!home_team_id(*),
        away:national_cup_teams!away_team_id(*)
      `)
      .in('status', ['scheduled', 'live'])
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (teamEntry) {
      query = query.eq('cup_id', teamEntry.cup_id);
    }

    const { data: match } = await query.maybeSingle();
    
    if (match) {
      // Enhance with real player shields via RPC if they exist
      const teamNames = [match.home?.club_name, match.away?.club_name].filter(Boolean);
      const { data: shieldsData } = await supabase.rpc('get_club_shields_by_names', { _names: teamNames });
      const shieldByName = new Map<string, any>((shieldsData || []).map((s: any) => [s.club_name, s.shield]));

      const enhancedMatch = {
        ...match,
        home: { ...match.home, ...(shieldByName.get(match.home?.club_name) || {}) },
        away: { ...match.away, ...(shieldByName.get(match.away?.club_name) || {}) }
      };
      setNextMatch(enhancedMatch);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel('cup-widget-v3')
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
            <ClubShield club={nextMatch.home} size={32} />
            <p className="text-[9px] font-black truncate">{nextMatch.home?.club_name}</p>
          </div>
          <div className="px-3 flex flex-col items-center">
            <span className="text-[10px] font-black text-muted-foreground italic">vs</span>
          </div>
          <div className="text-center flex-1 min-w-0 space-y-1">
            <ClubShield club={nextMatch.away} size={32} />
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

        <Button 
          variant="default" 
          size="sm" 
          className="w-full h-7 text-[10px] gap-1.5 font-bold uppercase"
          onClick={() => onOpenTournament && onOpenTournament('copas')}
        >
          Ver Competição <ArrowRight className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}