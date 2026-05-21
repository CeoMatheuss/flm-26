/**
 * rankingUpdater.ts — Atualiza global_ranking após cada partida.
 *
 * Motor ELO Simplificado:
 *   Pontos = BASE * PESO_COMPETIÇÃO * (1 + DIF_FORÇA / 50)
 */
import { supabase } from '@/integrations/supabase/client';

export type RankingCompetition = 'friendly' | 'league' | 'continental' | 'world';
export type RankingOutcome = 'win' | 'draw' | 'loss';

const WEIGHT: Record<RankingCompetition, number> = {
  friendly: 0.5,
  league: 1.0,
  continental: 1.6,
  world: 2.0,
};

const BASE: Record<RankingOutcome, number> = {
  win: 20,
  draw: 5,
  loss: -15,
};

interface UpdateInput {
  userId: string;
  clubName: string;
  outcome: RankingOutcome;
  competition: RankingCompetition;
  competitionLabel?: string;
  opponentStrength?: number;
  teamStrength?: number;
}

export async function updateGlobalRanking(input: UpdateInput): Promise<void> {
  const { userId, clubName, outcome, competition, competitionLabel, opponentStrength = 65, teamStrength = 65 } = input;
  if (!userId) return;

  const strengthDiff = opponentStrength - teamStrength;
  const strengthFactor = 1 + (strengthDiff / 50);
  const delta = Math.round(BASE[outcome] * WEIGHT[competition] * strengthFactor);

  const { data: row } = await supabase
    .from('global_ranking')
    .select('id, ranking_points, games_played, wins, draws, losses')
    .eq('user_id', userId)
    .maybeSingle();

  if (!row) {
    await supabase.from('global_ranking').insert({
      user_id: userId,
      club_name: clubName,
      ranking_points: Math.max(0, 100 + delta),
      games_played: 1,
      wins: outcome === 'win' ? 1 : 0,
      draws: outcome === 'draw' ? 1 : 0,
      losses: outcome === 'loss' ? 1 : 0,
      last_change: delta,
      current_competition: competitionLabel ?? 'Amistoso',
    });
    return;
  }

  await supabase
    .from('global_ranking')
    .update({
      club_name: clubName,
      ranking_points: Math.max(0, (row.ranking_points ?? 100) + delta),
      games_played: (row.games_played ?? 0) + 1,
      wins: (row.wins ?? 0) + (outcome === 'win' ? 1 : 0),
      draws: (row.draws ?? 0) + (outcome === 'draw' ? 1 : 0),
      losses: (row.losses ?? 0) + (outcome === 'loss' ? 1 : 0),
      last_change: delta,
      current_competition: competitionLabel ?? 'Amistoso',
      updated_at: new Date().toISOString()
    })
    .eq('id', row.id);
}
