/**
 * rankingUpdater.ts — Atualiza global_ranking após cada partida.
 *
 * Motor ELO Simplificado:
 *   Pontos = BASE * PESO_COMPETIÇÃO * (1 + DIF_FORÇA / 50)
 */
import { supabase } from '@/integrations/supabase/client';

export type RankingCompetition = 'friendly' | 'league' | 'continental' | 'world';
export type RankingOutcome = 'win' | 'draw' | 'loss';

export interface RankingUpdateResult {
  deltaPoints: number;
  deltaFans: number;
  fanMessage?: string;
}


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

export async function updateGlobalRanking(input: UpdateInput): Promise<RankingUpdateResult> {
  const { userId, clubName, outcome, competition, competitionLabel, opponentStrength = 65, teamStrength = 65 } = input;
  if (!userId) return { deltaPoints: 0, deltaFans: 0 };

  // 1. Snapshot positions BEFORE points change to track variation
  try {
    await supabase.rpc('snapshot_ranking_positions');
  } catch (e) {
    console.error('Error snapshoting positions:', e);
  }

  const strengthDiff = opponentStrength - teamStrength;
  const strengthFactor = 1 + (strengthDiff / 50);
  
  const { data: row } = await supabase
    .from('global_ranking')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const currentStreak = row?.winning_streak ?? 0;
  const newStreak = outcome === 'win' ? currentStreak + 1 : 0;
  const streakMultiplier = outcome === 'win' ? (1 + (Math.min(newStreak, 5) * 0.05)) : 1;

  const delta = Math.round(BASE[outcome] * WEIGHT[competition] * strengthFactor * streakMultiplier);

  const recentForm = row?.recent_form ? [...(row.recent_form as any[])] : [];
  recentForm.unshift(outcome === 'win' ? 'V' : outcome === 'draw' ? 'E' : 'D');
  const truncatedForm = recentForm.slice(0, 5);

  const pointsHistory = row?.points_history ? [...(row.points_history as any[])] : [];
  pointsHistory.push({
    date: new Date().toISOString(),
    points: Math.max(0, (row?.ranking_points ?? 100) + delta),
    delta,
    competition: competitionLabel ?? 'Amistoso'
  });
  const truncatedHistory = pointsHistory.slice(-20);

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
      recent_form: truncatedForm,
      winning_streak: newStreak,
      points_history: truncatedHistory
    });
  } else {
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
        recent_form: truncatedForm,
        winning_streak: newStreak,
        points_history: truncatedHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);
  }

  // 🏆 NOVO: Sistema de Crescimento de Torcida Realista
  let deltaFans = 0;
  let fanMessage = '';
  try {
    const { calculateFanGrowth } = await import('./fanGrowthEngine');
    // Buscar dados atuais do clube para o cálculo
    const { data: club } = await supabase.from('clubs').select('fans, reputation').eq('user_id', userId).single();
    
    if (club) {
      const growth = calculateFanGrowth({
        currentFans: club.fans,
        reputation: club.reputation,
        outcome,
        importance: (competition === 'friendly' ? 'amistoso' : competition === 'league' ? 'liga' : competition === 'world' ? 'final' : 'liga') as any,
        homeGoals: input.outcome === 'win' ? 1 : 0, // Fallback simplificado
        awayGoals: input.outcome === 'loss' ? 1 : 0,
        isHome: true,
        recentForm: truncatedForm,
        opponentStrength,
        teamStrength
      });
      
      deltaFans = growth.delta;
      fanMessage = growth.message;

      // Atualizar clube
      await supabase.rpc('increment_club_fans' as any, { 
        _user_id: userId, 
        _delta: deltaFans 
      });
    }
  } catch (e) {
    console.error('Error calculating fan growth:', e);
  }

  return { deltaPoints: delta, deltaFans, fanMessage };
}
