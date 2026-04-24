import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Trophy, Zap, Clock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDismissibleWidget } from '@/hooks/useDismissibleWidget';

interface Props {
  seasonNumber?: number;
  userId?: string;
}

export function SeasonStartWidget({ seasonNumber = 1, userId }: Props) {
  // Persistência: dispensa permanente + expira automaticamente em 01/05/2026.
  const seasonStartTs = new Date(2026, 4, 1, 0, 0, 0).getTime();
  const { isVisible, dismiss } = useDismissibleWidget(
    `season_start_${seasonNumber}`,
    userId,
    { type: 'season_start', expiresAt: seasonStartTs },
    seasonNumber === 1,
  );
  const [timeLeft, setTimeLeft] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [nextMatch, setNextMatch] = useState<{ opponent: string; time: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const target = new Date(2026, 4, 1, 0, 0, 0);
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0) {
        setIsStarted(true);
        setTimeLeft('');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const loadExtra = async () => {
      // Count total tournament enrollments
      const { count } = await supabase
        .from('custom_tournament_teams')
        .select('*', { count: 'exact', head: true })
        .eq('is_bot', false);
      if (count !== null) setEnrolledCount(count);

      // Next scheduled match for user
      const { data: teams } = await supabase
        .from('custom_tournament_teams')
        .select('id')
        .eq('user_id', userId);
      
      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id);
        const { data: matches } = await supabase
          .from('custom_tournament_matches')
          .select('scheduled_at, home_team_id, away_team_id')
          .eq('status', 'scheduled')
          .or(teamIds.map(id => `home_team_id.eq.${id},away_team_id.eq.${id}`).join(','))
          .order('scheduled_at', { ascending: true })
          .limit(1);
        
        if (matches && matches.length > 0) {
          const m = matches[0];
          const oppId = teamIds.includes(m.home_team_id) ? m.away_team_id : m.home_team_id;
          const { data: oppTeam } = await supabase
            .from('custom_tournament_teams')
            .select('club_name')
            .eq('id', oppId)
            .maybeSingle();
          
          setNextMatch({
            opponent: oppTeam?.club_name || '???',
            time: m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'A definir',
          });
        }
      }
    };
    loadExtra();
  }, [userId]);

  if (seasonNumber > 1) return null;
  if (!isVisible) return null;

  return (
    <Card className="border-cyan-500/30 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(190 80% 50% / 0.06), hsl(var(--primary) / 0.03))' }}>
      <Button
        size="icon"
        variant="ghost"
        onClick={dismiss}
        aria-label="Fechar widget"
        className="absolute top-1.5 right-1.5 h-6 w-6 z-10 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg, hsl(190 80% 50% / 0.25), hsl(var(--primary) / 0.15))' }}>
            {isStarted ? (
              <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-cyan-400" />
            ) : (
              <CalendarDays className="h-7 w-7 sm:h-8 sm:w-8 text-cyan-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base sm:text-lg font-black">
                {isStarted ? '🏟️ Temporada em Andamento!' : '🏟️ Temporada vai Começar!'}
              </p>
              <Badge variant="outline" className="text-[10px] sm:text-xs border-cyan-500/30 text-cyan-400 shrink-0">
                T{seasonNumber}
              </Badge>
            </div>
            {isStarted ? (
              <div className="space-y-1 mt-1">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  A primeira temporada oficial já começou!
                </p>
                {nextMatch && (
                  <p className="text-xs sm:text-sm text-foreground">
                    ⚽ Próximo jogo: <span className="font-bold">{nextMatch.opponent}</span> — {nextMatch.time}
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Início oficial: <span className="font-bold text-foreground">01/05/2026</span>
                </p>
                {timeLeft && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm sm:text-base font-mono font-bold text-cyan-400">{timeLeft}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1">
                <Trophy className="h-3 w-3" /> Campeonatos
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
