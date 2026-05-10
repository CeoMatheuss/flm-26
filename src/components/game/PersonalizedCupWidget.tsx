import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Swords, Calendar, BarChart3, ChevronRight, Loader2, Globe, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CupCompetition {
  id: string;
  name: string;
  cup_type: 'national' | 'continental' | 'world_cup';
  status: string;
  current_round: number;
  total_rounds: number;
  continent?: string;
  country?: string;
  current_phase?: string;
}

interface CupMatch {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round: number;
  status: string;
  scheduled_at: string;
  home_goals: number | null;
  away_goals: number | null;
  home_team_name?: string;
  away_team_name?: string;
  home_team_logo?: string;
  away_team_logo?: string;
}

interface CupTeam {
  id: string;
  club_name: string;
  club_logo: string;
  eliminated: boolean;
  user_id: string | null;
}

interface Props {
  userId: string;
  onOpenCompetition: (id: string, type: string) => void;
  onGoToMatches: () => void;
}

export function PersonalizedCupWidget({ userId, onOpenCompetition, onGoToMatches }: Props) {
  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState<CupCompetition | null>(null);
  const [playerTeam, setPlayerTeam] = useState<CupTeam | null>(null);
  const [nextMatch, setNextMatch] = useState<CupMatch | null>(null);
  const [isEliminated, setIsEliminated] = useState(false);
  const [isChampion, setIsChampion] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadCompetition();
  }, [userId]);

  const loadCompetition = async () => {
    setLoading(true);
    try {
      // 1. Procurar em Copas Nacionais
      const { data: nationalTeam } = await supabase
        .from('cup_teams')
        .select('*, cup_competitions(*)')
        .eq('user_id', userId)
        .neq('cup_competitions.status', 'finished')
        .maybeSingle();

      if (nationalTeam && nationalTeam.cup_competitions) {
        setPlayerTeam(nationalTeam as any);
        setCompetition(nationalTeam.cup_competitions as any);
        setIsEliminated(nationalTeam.eliminated);
        
        const { data: matches } = await supabase
          .from('cup_matches')
          .select('*, home_team:cup_teams!cup_matches_home_team_id_fkey(*), away_team:cup_teams!cup_matches_away_team_id_fkey(*)')
          .eq('cup_id', nationalTeam.cup_id)
          .or(`home_team_id.eq.${nationalTeam.id},away_team_id.eq.${nationalTeam.id}`)
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true })
          .limit(1);

        if (matches && matches.length > 0) {
          const m = matches[0];
          setNextMatch({
            ...m,
            home_team_name: m.home_team?.club_name,
            away_team_name: m.away_team?.club_name,
            home_team_logo: m.home_team?.club_logo,
            away_team_logo: m.away_team?.club_logo,
          } as any);
        }

        // Verificar se é campeão (se a competição acabou e ele não foi eliminado)
        if (nationalTeam.cup_competitions.status === 'finished' && !nationalTeam.eliminated) {
          setIsChampion(true);
        }
      } else {
        // 2. Procurar em Continentais
        const { data: continentalTeam } = await supabase
          .from('continental_teams')
          .select('*, continental_competitions(*)')
          .eq('user_id', userId)
          .neq('continental_competitions.status', 'finished')
          .maybeSingle();

        if (continentalTeam && continentalTeam.continental_competitions) {
          setPlayerTeam({
            id: continentalTeam.id,
            club_name: continentalTeam.club_name,
            club_logo: continentalTeam.club_logo,
            eliminated: continentalTeam.eliminated,
            user_id: continentalTeam.user_id
          } as any);
          
          const comp = continentalTeam.continental_competitions;
          setCompetition({
            id: comp.id,
            name: `Continental ${comp.continent}`,
            cup_type: 'continental',
            status: comp.status,
            current_round: comp.current_round,
            total_rounds: 7, // Default for continental
          } as any);
          setIsEliminated(continentalTeam.eliminated);

          const { data: matches } = await supabase
            .from('continental_matches')
            .select('*, home_team:continental_teams!continental_matches_home_team_id_fkey(*), away_team:continental_teams!continental_matches_away_team_id_fkey(*)')
            .eq('competition_id', comp.id)
            .or(`home_team_id.eq.${continentalTeam.id},away_team_id.eq.${continentalTeam.id}`)
            .eq('status', 'scheduled')
            .order('scheduled_at', { ascending: true })
            .limit(1);

          if (matches && matches.length > 0) {
            const m = matches[0];
            setNextMatch({
              ...m,
              home_team_name: m.home_team?.club_name,
              away_team_name: m.away_team?.club_name,
              home_team_logo: m.home_team?.club_logo,
              away_team_logo: m.away_team?.club_logo,
            } as any);
          }

          // Verificar se é campeão
          if (continentalTeam.continental_competitions.status === 'finished' && !continentalTeam.eliminated) {
            setIsChampion(true);
          }
        }
      }
    } catch (e) {
      console.error('Error loading cup widget:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="game-card-accent border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!competition) return null;

  const opponentName = nextMatch 
    ? (nextMatch.home_team_id === playerTeam?.id ? nextMatch.away_team_name : nextMatch.home_team_name)
    : 'TBD';
  const opponentLogo = nextMatch
    ? (nextMatch.home_team_id === playerTeam?.id ? nextMatch.away_team_logo : nextMatch.home_team_logo)
    : '⚽';

  const roundLabels: Record<number, string> = {
    1: 'Fase 3',
    2: 'Oitavas',
    3: 'Quartas',
    4: 'Semi',
    5: 'Final'
  };

  const phaseName = competition.current_phase || roundLabels[competition.current_round] || `Fase ${competition.current_round}`;

  const getStatusIcon = () => {
    if (isChampion) return <Trophy className="h-10 w-10 text-yellow-400 animate-bounce" />;
    if (isEliminated) return <Swords className="h-10 w-10 text-muted-foreground/30" />;
    return <Trophy className="h-10 w-10 text-primary opacity-20" />;
  };

  const getCompetitionIcon = () => {
    switch(competition.cup_type) {
      case 'world_cup': return <Globe className="h-4 w-4 text-blue-400" />;
      case 'continental': return <Star className="h-4 w-4 text-purple-400" />;
      default: return <Trophy className="h-4 w-4 text-orange-400" />;
    }
  };

  return (
    <Card className="game-card-accent border-primary/20 bg-gradient-to-br from-primary/10 via-background to-accent/5 overflow-hidden">
      <CardHeader className="section-header pb-1 px-4 pt-4">
        <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          {getCompetitionIcon()} {competition.name}
          <Badge variant="outline" className={`text-[8px] ml-auto ${isEliminated ? 'text-destructive' : 'text-primary'}`}>
            {isEliminated ? 'Eliminado' : isChampion ? 'Campeão 🏆' : 'Em Busca da Glória'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className="flex items-center gap-4">
          <div className="shrink-0 flex items-center justify-center">
            {getStatusIcon()}
          </div>
          
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Fase Atual</span>
              <span className="text-xs font-black text-primary">{phaseName}</span>
            </div>
            
            {!isEliminated && !isChampion && nextMatch && (
              <div className="bg-muted/30 rounded-lg p-2.5 space-y-2 border border-border/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{opponentLogo}</span>
                    <div className="min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Próximo Rival</p>
                      <p className="text-xs font-bold truncate">{opponentName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Data</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-foreground">
                      <Calendar className="h-2.5 w-2.5 text-primary" />
                      {format(new Date(nextMatch.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isEliminated && (
              <p className="text-[10px] text-muted-foreground italic bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                Você foi eliminado desta competição. Foque nas outras competições ou aguarde a próxima temporada.
              </p>
            )}

            {isChampion && (
              <div className="bg-yellow-500/10 p-2.5 rounded-lg border border-yellow-500/20 text-center space-y-1">
                <p className="text-xs font-black text-yellow-500 uppercase">✨ CAMPEÃO ✨</p>
                <p className="text-[10px] text-muted-foreground">O troféu agora brilha na sua galeria!</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <Button 
            variant="outline" 
            className="h-8 text-[9px] gap-1 px-2 border-border/40 bg-muted/20 hover:bg-primary/10"
            onClick={onGoToMatches}
          >
            <Calendar className="h-3 w-3" /> Ver Jogos
          </Button>
          <Button 
            variant="outline" 
            className="h-8 text-[9px] gap-1 px-2 border-border/40 bg-muted/20 hover:bg-primary/10"
            onClick={() => onOpenCompetition(competition.id, competition.cup_type)}
          >
            <BarChart3 className="h-3 w-3" /> Ver Chaveamento
          </Button>
          <Button 
            variant="outline" 
            className="h-8 text-[9px] gap-1 px-2 border-border/40 bg-muted/20 hover:bg-primary/10"
            onClick={() => onOpenCompetition(competition.id, competition.cup_type)}
          >
            <Trophy className="h-3 w-3" /> Ver Estatísticas
          </Button>
          <Button 
            className="h-8 text-[9px] gap-1 px-2 bg-primary hover:bg-primary/90 text-white font-bold"
            onClick={onGoToMatches}
          >
            <ChevronRight className="h-3 w-3" /> Ir para Partida
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
