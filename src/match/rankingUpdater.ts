/**
 * rankingUpdater.ts — Atualiza metadados de ranking após cada partida.
 *
 * IMPORTANTE: A pontuação (ranking_points) é calculada **exclusivamente** pelo
 * trigger `sync_global_ranking_from_match` no banco, a partir de match_history.
 * Este módulo cuida apenas de:
 *  - recent_form (V/E/D)
 *  - winning_streak
 *  - crescimento de torcida
 *
 * Regras de pontuação (servidor):
 *   Liga         V+3 / E+1 / D 0
 *   Copa         V+4 / E+2 / D 0
 *   Continental  V+6 / E+3 / D 0
 *   Mundial      V+10 / E+5 / D 0
 *   Amistoso     0
 *
 * Bônus por título (servidor): Liga +30, Copa +40, Continental +80, Mundial +150
 */
import { supabase } from '@/integrations/supabase/client';

export type RankingCompetition = 'friendly' | 'league' | 'continental' | 'world';
export type RankingOutcome = 'win' | 'draw' | 'loss';

export interface RankingUpdateResult {
  deltaPoints: number;
  deltaFans: number;
  fanMessage?: string;
}

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
  const { userId, outcome, competition, opponentStrength = 65, teamStrength = 65 } = input;
  if (!userId) return { deltaPoints: 0, deltaFans: 0 };

  // Snapshot posições para variação visual
  try {
    await supabase.rpc('snapshot_ranking_positions');
  } catch (e) {
    console.error('Error snapshoting positions:', e);
  }

  // Atualiza apenas form + streak (pontuação é do trigger)
  try {
    const { data: row } = await supabase
      .from('global_ranking')
      .select('id, recent_form, winning_streak')
      .eq('user_id', userId)
      .maybeSingle();

    const currentStreak = (row?.winning_streak as number) ?? 0;
    const newStreak = outcome === 'win' ? currentStreak + 1 : 0;
    const formArr = row?.recent_form ? [...(row.recent_form as any[])] : [];
    formArr.unshift(outcome === 'win' ? 'V' : outcome === 'draw' ? 'E' : 'D');
    const truncated = formArr.slice(0, 5);

    if (row?.id) {
      await supabase
        .from('global_ranking')
        .update({
          recent_form: truncated,
          winning_streak: newStreak,
        })
        .eq('id', row.id);
    }
  } catch (e) {
    console.error('Error updating ranking form/streak:', e);
  }

  // 🏆 Crescimento de torcida
  let deltaFans = 0;
  let fanMessage = '';
  try {
    const { calculateFanGrowth } = await import('./fanGrowthEngine');
    const { data: club } = await supabase.from('clubs').select('fans, reputation').eq('user_id', userId).single();

    if (club) {
      const growth = calculateFanGrowth({
        currentFans: club.fans,
        reputation: club.reputation,
        outcome,
        importance: (competition === 'friendly' ? 'amistoso' : competition === 'league' ? 'liga' : competition === 'world' ? 'final' : 'liga') as any,
        homeGoals: outcome === 'win' ? 1 : 0,
        awayGoals: outcome === 'loss' ? 1 : 0,
        isHome: true,
        recentForm: [],
        opponentStrength,
        teamStrength,
      });

      deltaFans = growth.delta;
      fanMessage = growth.message;

      await supabase.rpc('increment_club_fans' as any, {
        _user_id: userId,
        _delta: deltaFans,
      });
    }
  } catch (e) {
    console.error('Error calculating fan growth:', e);
  }

  return { deltaPoints: 0, deltaFans, fanMessage };
}
