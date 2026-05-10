import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CupCompetition {
  id: string;
  name: string;
  cup_type: string;
  country: string | null;
  format: string;
  status: string;
  current_round: number;
  total_rounds: number;
}

interface CupMatch {
  id: string;
  cup_id: string;
  round: number;
  leg: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
}

interface CupTeam {
  id: string;
  cup_id: string;
  club_name: string;
  club_logo: string;
  eliminated: boolean;
  is_bot: boolean;
  user_id: string | null;
}

interface Props {
  cupId: string;
  cupType?: 'national' | 'continental' | 'world_cup';
  onBack?: () => void;
}

export function CupBracketView({ cupId, cupType = 'national', onBack }: Props) {
  const [cup, setCup] = useState<CupCompetition | null>(null);
  const [matches, setMatches] = useState<CupMatch[]>([]);
  const [teams, setTeams] = useState<CupTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCupData();
  }, [cupId]);

  const loadCupData = async () => {
    setLoading(true);
    let cupRes, matchesRes, teamsRes;

    if (cupType === 'continental') {
      [cupRes, matchesRes, teamsRes] = await Promise.all([
        supabase.from('continental_competitions').select('*').eq('id', cupId).single(),
        supabase.from('continental_matches').select('*').eq('competition_id', cupId).order('round', { ascending: true }),
        supabase.from('continental_teams').select('*').eq('competition_id', cupId),
      ]);
    } else if (cupType === 'world_cup') {
      [cupRes, matchesRes, teamsRes] = await Promise.all([
        supabase.from('club_world_cups').select('*').eq('id', cupId).single(),
        supabase.from('club_world_cup_matches').select('*').eq('cup_id', cupId).order('round', { ascending: true }),
        supabase.from('club_world_cup_teams').select('*').eq('cup_id', cupId),
      ]);
    } else {
      [cupRes, matchesRes, teamsRes] = await Promise.all([
        supabase.from('cup_competitions').select('*').eq('id', cupId).single(),
        supabase.from('cup_matches').select('*').eq('cup_id', cupId).order('round', { ascending: true }),
        supabase.from('cup_teams').select('*').eq('cup_id', cupId),
      ]);
    }

    if (cupRes.data) setCup(cupRes.data as unknown as CupCompetition);
    if (matchesRes.data) setMatches(matchesRes.data as unknown as CupMatch[]);
    if (teamsRes.data) setTeams(teamsRes.data as unknown as CupTeam[]);
    setLoading(false);
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'TBD';
    const team = teams.find(t => t.id === teamId);
    return team ? `${team.club_logo} ${team.club_name}` : 'TBD';
  };

  const roundNames: Record<number, string> = {
    1: 'Fase 3',
    2: 'Oitavas de Final',
    3: 'Quartas de Final',
    4: 'Semifinal',
    5: 'Final',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Carregando copa...
        </CardContent>
      </Card>
    );
  }

  if (!cup) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Copa não encontrada
        </CardContent>
      </Card>
    );
  }

  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground text-sm">
            ← Voltar
          </button>
        )}
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          {cup.name}
        </h2>
        <Badge variant={cup.status === 'in_progress' ? 'default' : 'secondary'} className="text-[10px]">
          {cup.status === 'pending' ? 'Pendente' : cup.status === 'in_progress' ? 'Em Andamento' : 'Finalizada'}
        </Badge>
      </div>

      {rounds.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Chaveamento ainda não foi definido
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {rounds.map(round => {
            const roundMatches = matches.filter(m => m.round === round);
            return (
              <div key={round} className="min-w-[200px] space-y-2">
                <h3 className="text-xs font-bold text-center text-muted-foreground uppercase">
                  {roundMatches[0]?.round_name || `Rodada ${round}`}
                </h3>
                <div className="space-y-2">
                  {roundMatches.map(match => (
                    <Card key={match.id} className={`border ${match.status === 'played' ? 'border-primary/30' : 'border-border'}`}>
                      <CardContent className="p-2 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate flex-1">{getTeamName(match.home_team_id)}</span>
                          <span className="font-bold text-sm mx-2">
                            {match.home_goals !== null ? match.home_goals : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate flex-1">{getTeamName(match.away_team_id)}</span>
                          <span className="font-bold text-sm mx-2">
                            {match.away_goals !== null ? match.away_goals : '-'}
                          </span>
                        </div>
                        {match.leg > 1 && (
                          <p className="text-[9px] text-muted-foreground text-center">Volta</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Teams list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Participantes ({teams.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-3">
            {teams.map(team => (
              <div
                key={team.id}
                className={`flex items-center gap-1.5 text-xs p-1.5 rounded ${team.eliminated ? 'opacity-40 line-through' : ''}`}
              >
                <span>{team.club_logo}</span>
                <span className="truncate">{team.club_name}</span>
                {team.is_bot && <Badge variant="outline" className="text-[8px] px-1">Bot</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
