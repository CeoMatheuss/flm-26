import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Globe, Star, Play, Clock, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ClubShield } from './ClubShield';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface WorldCupMatch {
  id: string;
  stage: string;
  home_team: any;
  away_team: any;
  home_goals: number;
  away_goals: number;
  home_penalty_goals: number;
  away_penalty_goals: number;
  status: string;
  scheduled_at: string;
  cup_id: string;
}

const toShieldClub = (t: any) => {
  if (!t) return null;
  const club = t.clubs || {};
  return {
    ...club,
    shield_config: club.shield_config,
    name: club.name
  };
};

export function WorldCupTab({ userId }: { userId: string }) {
  const [cup, setCup] = useState<any>(null);
  const [matches, setMatches] = useState<WorldCupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cupData } = await supabase
        .from('world_cup_competitions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cupData) {
        setCup(cupData);
        const { data: matchData } = await supabase
          .from('world_cup_matches')
          .select(`
            *,
            home_team:world_cup_teams!world_cup_matches_home_team_id_fkey(*, clubs(*)),
            away_team:world_cup_teams!world_cup_matches_away_team_id_fkey(*, clubs(*))
          `)
          .eq('cup_id', cupData.id)
          .order('scheduled_at', { ascending: true });
        
        if (matchData) setMatches(matchData as any[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userId]);

  const myMatch = matches.find(m => (m.status === 'scheduled' || m.status === 'live') && (m.home_team?.user_id === userId || m.away_team?.user_id === userId));

  const handlePlayMatch = () => {
    if (!myMatch) return;
    navigate('/match', {
      state: {
        matchId: myMatch.id,
        competition: 'Mundial de Clubes',
        isWorldCup: true,
        homeTeam: myMatch.home_team.clubs.name,
        awayTeam: myMatch.away_team.clubs.name,
        isHome: myMatch.home_team.user_id === userId
      }
    });
  };

  if (loading && !cup) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!cup) return (
    <div className="py-20 text-center space-y-4">
      <Globe className="h-12 w-12 text-muted-foreground/20 mx-auto" />
      <h3 className="text-lg font-bold">Nenhum Mundial Ativo</h3>
      <p className="text-sm text-muted-foreground">O Mundial de Clubes acontece em janelas específicas da temporada.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a1a] border border-yellow-500/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Globe className="h-32 w-32 text-yellow-500" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest border border-yellow-500/30">
            <Star className="h-3 w-3" /> Competição Mundial de Elite
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
            {cup.name}
          </h1>
          <p className="text-muted-foreground text-sm max-w-md">
            Os melhores clubes online do mundo disputam a glória eterna em formato eliminatório.
          </p>

          {myMatch && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-md max-w-sm mt-6">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-yellow-500">
                  <span>Próximo Desafio</span>
                  <Badge variant="outline" className="text-[8px] border-yellow-500/30">{myMatch.stage}</Badge>
                </div>
                <div className="flex items-center justify-around gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <ClubShield club={toShieldClub(myMatch.home_team) as any} size={48} />
                    <span className="text-[10px] font-bold text-white/80 truncate w-20 text-center">{myMatch.home_team.clubs.name}</span>
                  </div>
                  <span className="text-xs font-black text-white/40 italic">VS</span>
                  <div className="flex flex-col items-center gap-2">
                    <ClubShield club={toShieldClub(myMatch.away_team) as any} size={48} />
                    <span className="text-[10px] font-bold text-white/80 truncate w-20 text-center">{myMatch.away_team.clubs.name}</span>
                  </div>
                </div>
                <Button onClick={handlePlayMatch} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black text-xs uppercase tracking-widest">
                  <Play className="h-3 w-3 mr-2 fill-current" /> Começar Partida
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map(m => (
          <Card key={m.id} className={`bg-card/40 border-border/50 hover:border-yellow-500/30 transition-colors ${m.home_team?.user_id === userId || m.away_team?.user_id === userId ? 'ring-1 ring-yellow-500/40' : ''}`}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
               <div className="flex items-center gap-3 flex-1 min-w-0">
                  <ClubShield club={toShieldClub(m.home_team) as any} size={32} />
                  <span className="text-xs font-black truncate">{m.home_team.clubs.name}</span>
                </div>

                <div className="flex flex-col items-center justify-center min-w-[60px]">
                  {m.status === 'finished' ? (
                    <span className="text-sm font-black tabular-nums">{m.home_goals} - {m.away_goals}</span>
                  ) : (
                    <Badge variant="secondary" className="text-[8px] uppercase">{m.stage === 'quarter-finals' ? 'Quartas' : m.stage === 'semi-finals' ? 'Semi' : 'Final'}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                  <span className="text-xs font-black truncate text-right">{m.away_team.clubs.name}</span>
                  <ClubShield club={toShieldClub(m.away_team) as any} size={32} />
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
